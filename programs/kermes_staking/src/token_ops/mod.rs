use anchor_lang::prelude::*;
use anchor_spl::{token, token_2022};

pub trait SplTokenOperation {
    fn transfer<'info>(
        &self,
        from: AccountInfo<'info>,
        mint: AccountInfo<'info>,
        to: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        token_program: AccountInfo<'info>,
        amount: u64,
        decimals: u8,
    ) -> Result<()>;
}

pub struct SplToken;
pub struct SplToken2022;
impl SplTokenOperation for SplToken {
    fn transfer<'info>(
        &self,
        from: AccountInfo<'info>,
        _mint: AccountInfo<'info>,
        to: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        token_program: AccountInfo<'info>,
        amount: u64,
        _decimals: u8,
    ) -> Result<()> {
        token::transfer(
            CpiContext::new(
                token_program,
                token::Transfer {
                    from,
                    to,
                    authority,
                },
            ),
            amount,
        )
    }
}
impl SplTokenOperation for SplToken2022 {
    fn transfer<'info>(
        &self,
        from: AccountInfo<'info>,
        mint: AccountInfo<'info>,
        to: AccountInfo<'info>,
        authority: AccountInfo<'info>,
        token_program: AccountInfo<'info>,
        amount: u64,
        decimals: u8,
    ) -> Result<()> {
        token_2022::transfer_checked(
            CpiContext::new(
                token_program,
                token_2022::TransferChecked {
                    from,
                    mint,
                    to,
                    authority,
                },
            ),
            amount,
            decimals,
        )
    }
}
