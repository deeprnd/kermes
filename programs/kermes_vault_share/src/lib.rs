use anchor_lang::prelude::*;

mod errors;
mod events;
mod instructions;

pub use instructions::*;

declare_id!("9QZeymvqEZukDWVKTMv5S2BoL7bHKPUpnVv3cmmHE8J1");

#[program]
pub mod kermes_vault_share {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
        instructions::mint(ctx, amount)
    }
}
