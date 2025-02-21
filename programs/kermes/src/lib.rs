use anchor_lang::prelude::*;

mod errors;
mod events;
mod instructions;
mod state;
mod token_ops;

pub use instructions::*;

declare_id!("3aWDZ2X82E8mx6ACPmKhmvsZUwXftQtQF9u9vTjnJ6FV"); // Replace with your program ID

#[program]
pub mod kermes {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, vault_name: String) -> Result<()> {
        instructions::initialize_vault(ctx, vault_name)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64, decimals: u8) -> Result<()> {
        instructions::stake(ctx, amount, decimals)
    }
}
