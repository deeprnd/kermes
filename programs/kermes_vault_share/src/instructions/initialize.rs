use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize {}

pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
    Ok(())
}
