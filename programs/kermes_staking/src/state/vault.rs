use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub total_staked: u64,
    pub bump: u8,
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub name: String,
}

impl Vault {
    pub const LEN: usize = 8 + // discriminator
        8 + // total_staked
        1 + // bump
        32 + // owner (Pubkey)
        32 + // token_mint (Pubkey)
        4 + 32; // name (4 bytes for length + max 32 bytes for string)
}
