use anchor_lang::prelude::*;

#[event]
pub struct MintEvent {
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
