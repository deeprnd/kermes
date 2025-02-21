use anchor_lang::prelude::*;

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
