use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Token mint doesn't match vault's token mint")]
    InvalidTokenMint,
    #[msg("Invalid token account owner")]
    InvalidTokenAccount,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
}
