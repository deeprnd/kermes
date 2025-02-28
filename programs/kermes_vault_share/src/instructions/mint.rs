use crate::errors::ErrorCode;
use crate::events::MintEvent;
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{self, MintTo, Token2022},
    token_interface::{Mint as TokenMint, TokenAccount},
};

#[event_cpi]
#[derive(Accounts)]
pub struct Mint<'info> {
    #[account(mut)]
    pub mint: InterfaceAccount<'info, TokenMint>,
    #[account(
        mut,
        constraint = user_token_account.mint == mint.key() @ ErrorCode::InvalidTokenMint,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: The authority is verified to be the mint authority of the vault_share_token_mint.
    pub mint_authority: Signer<'info>, // The mint authority
    pub token_program: Program<'info, Token2022>,
}

pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
    // Verify that the authority is the mint authority of the vault_share_token_mint
    if ctx.accounts.mint.mint_authority != Some(ctx.accounts.mint_authority.key()).into() {
        return Err(ErrorCode::UnauthorizedMinter.into());
    }

    token_2022::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
        ),
        amount,
    )?;

    emit_cpi!(MintEvent {
        recipient: ctx.accounts.user_token_account.owner,
        mint: ctx.accounts.mint.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
