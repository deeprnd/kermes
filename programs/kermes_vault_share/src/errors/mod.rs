use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Invalid token account owner")]
    InvalidTokenAccount,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    #[msg("Unauthorized minter")]
    UnauthorizedMinter,
}
