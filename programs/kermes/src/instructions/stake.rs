use crate::errors::ErrorCode;
use crate::events::StakeEvent;
use crate::state::Vault;
use crate::token_ops::{SplToken, SplToken2022, SplTokenOperation};
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token_2022;
use anchor_spl::token_interface::TokenAccount;

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        constraint = vault.token_mint == token_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub vault: Account<'info, Vault>,

    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidTokenAccount,
        constraint = user_token_account.mint == token_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.mint == token_mint.key() @ ErrorCode::InvalidTokenMint
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: The token mint is verified by checking its owner is either the Token or Token2022 program.
    /// The program does not need to deserialize the mint account since it only uses the mint's public key.
    #[account(
        constraint = token_mint.to_account_info().owner == &token::ID || token_mint.to_account_info().owner == &token_2022::ID
    )]
    pub token_mint: AccountInfo<'info>,

    /// CHECK: The token program is verified to be either the Token or Token2022 program.
    #[account(
        constraint = token_program.key == &token::ID || token_program.key == &token_2022::ID
    )]
    pub token_program: AccountInfo<'info>,
}

pub fn stake(ctx: Context<Stake>, amount: u64, decimals: u8) -> Result<()> {
    // Transfer tokens from user to vault
    let token: Box<dyn SplTokenOperation> = match *ctx.accounts.token_program.key {
        token::ID => Box::new(SplToken),
        token_2022::ID => Box::new(SplToken2022),
        _ => return err!(ErrorCode::InvalidTokenProgram),
    };

    token.transfer(
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.token_mint.to_account_info(),
        ctx.accounts.vault_token_account.to_account_info(),
        ctx.accounts.user.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount,
        decimals,
    )?;

    // Update total staked amount
    let vault = &mut ctx.accounts.vault;
    vault.total_staked = vault.total_staked.checked_add(amount).unwrap();

    emit!(StakeEvent {
        user: ctx.accounts.user.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
