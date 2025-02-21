use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::extension::transfer_fee::TransferFee;

#[derive(Debug)]
pub struct SplTokenMetadata {
    pub mint: Pubkey,
    pub decimals: u8,
    pub transfer_fee: Option<TransferFee>,
    pub permanent_delegate: Option<Pubkey>,
}

impl SplTokenMetadata {
    pub fn try_from_account(account: &AccountInfo) -> Result<Self> {
        let data = account.data.borrow();
        let metadata = SplTokenMetadata {
            mint: Pubkey::from(*<&[u8; 32]>::try_from(&data[0..32]).unwrap()),
            decimals: data[32],
            transfer_fee: if data[33] == 1 {
                Some(TransferFee {
                    epoch: u64::from_le_bytes(
                        data[34..42]
                            .try_into()
                            .map_err(|_| ProgramError::InvalidAccountData)?,
                    )
                    .into(),
                    maximum_fee: u64::from_le_bytes(
                        data[42..50]
                            .try_into()
                            .map_err(|_| ProgramError::InvalidAccountData)?,
                    )
                    .into(),
                    transfer_fee_basis_points: u16::from_le_bytes(
                        data[50..52]
                            .try_into()
                            .map_err(|_| ProgramError::InvalidAccountData)?,
                    )
                    .into(),
                })
            } else {
                None
            },
            permanent_delegate: if data[42] == 1 {
                Some(Pubkey::from(*<&[u8; 32]>::try_from(&data[43..75]).unwrap()))
            } else {
                None
            },
        };
        Ok(metadata)
    }
}
