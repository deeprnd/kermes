use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, Transfer};
use anchor_spl::token_interface::TokenAccount;

declare_id!("3aWDZ2X82E8mx6ACPmKhmvsZUwXftQtQF9u9vTjnJ6FV"); // Replace with your program ID

#[program]
pub mod kermes {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.total_staked = 0;
        vault.bump = ctx.bumps.vault;
        vault.owner = ctx.accounts.payer.key();
        vault.token_mint = ctx.accounts.token_mint.key();
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        // Transfer tokens from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
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
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = payer,
        space = Vault::LEN,
        seeds = [b"vault", token_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// The mint of the token that will be staked in this vault
    pub token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        constraint = vault.token_mint == user_token_account.mint @ ErrorCode::InvalidTokenMint
    )]
    pub vault: Account<'info, Vault>,

    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.mint == vault.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub total_staked: u64,
    pub bump: u8,
    pub owner: Pubkey,
    pub token_mint: Pubkey,
}

impl Vault {
    pub const LEN: usize = 8 + // discriminator
        8 + // total_staked
        1 + // bump
        32 + // owner (Pubkey)
        32; // token_mint (Pubkey)
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Token mint doesn't match vault's token mint")]
    InvalidTokenMint,
    #[msg("Invalid token account owner")]
    InvalidTokenAccount,
}
