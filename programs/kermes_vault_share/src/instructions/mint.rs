use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{self, MintTo, Token2022},
    token_interface::TokenAccount,
};

#[derive(Accounts)]
pub struct Mint<'info> {
    /// CHECK: The token program is verified to be Token2022 program.
    #[account(
        mut,
        constraint = mint.key == &token_2022::ID
    )]
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: The authority is verified to be the kermes_staking program.
    // TODO: fix the constraint
    /* #[account(
        constraint = authority.key() == &kermes_staking::ID @ ErrorCode::UnauthorizedMinter
    )]*/
    pub authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token2022>,
}

pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
    token_2022::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
