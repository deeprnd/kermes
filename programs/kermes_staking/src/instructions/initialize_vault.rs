use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token_2022;

#[derive(Accounts)]
#[instruction(vault_name: String)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = payer,
        space = Vault::LEN,
        seeds = [
            b"vault",
            payer.key().as_ref(),
            token_mint.key().as_ref(),
            vault_name.as_bytes()
        ],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: The token mint is verified by checking its owner is either the Token or Token2022 program.
    /// The program does not need to deserialize the mint account since it only uses the mint's public key.
    #[account(
        constraint = token_mint.to_account_info().owner == &token::ID || token_mint.to_account_info().owner == &token_2022::ID
    )]
    pub token_mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>, vault_name: String) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.total_staked = 0;
    vault.bump = ctx.bumps.vault;
    vault.owner = ctx.accounts.payer.key();
    vault.token_mint = ctx.accounts.token_mint.key();
    vault.name = vault_name;
    Ok(())
}
