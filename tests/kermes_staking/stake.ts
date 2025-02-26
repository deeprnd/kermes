import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { KermesStaking } from "../../target/types/kermes_staking";
import { describe, it } from "vitest";
import assert from "assert";
import {
  createUser,
  createMint,
  createTokenAccount,
  createVault,
  mintTokensToUser,
} from "../helpers";

describe("kermes-staking-stake", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KermesStaking as Program<KermesStaking>;

  const getRandomAmount = (max: number) =>
    max === 0 ? 0 : Math.floor(Math.random() * (max + 1));

  const generateRandomTestCase = (
    isToken1Token2022: boolean,
    isToken2Token2022: boolean,
    decimals1: number,
    decimals2: number,
    user1MaxToken1Amount: number,
    user1MaxToken2Amount: number,
    user2MaxToken1Amount: number,
    user2MaxToken2Amount: number,
    description: string,
  ) => {
    let user1Token1Amount = getRandomAmount(user1MaxToken1Amount);
    let user1Token1StakeAmount = getRandomAmount(user1Token1Amount);
    let user1Token2Amount = getRandomAmount(user1MaxToken2Amount);
    let user1Token2StakeAmount = getRandomAmount(user1Token2Amount);

    let user2Token1Amount = getRandomAmount(user2MaxToken1Amount);
    let user2Token1StakeAmount = getRandomAmount(user2Token1Amount);
    let user2Token2Amount = getRandomAmount(user2MaxToken2Amount);
    let user2Token2StakeAmount = getRandomAmount(user2Token2Amount);

    return {
      isToken1Token2022,
      isToken2Token2022,
      decimals1,
      decimals2,
      user1Token1Amount,
      user1Token1StakeAmount,
      user1Token2Amount,
      user1Token2StakeAmount,
      user2Token1Amount,
      user2Token1StakeAmount,
      user2Token2Amount,
      user2Token2StakeAmount,
      description,
    };
  };

  const testCases = [
    generateRandomTestCase(
      false,
      false,
      9,
      9,
      1000000000,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token and SPL Token with 2 users",
    ),
    generateRandomTestCase(
      false,
      true,
      9,
      9,
      1000000000,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token and SPL Token 2022 with 2 users",
    ),
    generateRandomTestCase(
      true,
      true,
      9,
      9,
      1000000000,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token 2022 and SPL Token 2022 with 2 users",
    ),
    generateRandomTestCase(
      false,
      false,
      9,
      9,
      0,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token and SPL Token with user not staking in one vault",
    ),
    generateRandomTestCase(
      false,
      true,
      9,
      9,
      0,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token and SPL Token 2022 with user not staking in one vault",
    ),
    generateRandomTestCase(
      true,
      true,
      9,
      9,
      0,
      1000000000,
      1000000000,
      1000000000,
      "SPL Token 2022 and SPL Token 2022 with user not staking in one vault",
    ),
    generateRandomTestCase(
      false,
      false,
      9,
      9,
      0,
      0,
      1000000000,
      1000000000,
      "SPL Token and SPL Token with a single user",
    ),
    generateRandomTestCase(
      false,
      true,
      9,
      9,
      0,
      0,
      1000000000,
      1000000000,
      "SPL Token and SPL Token 2022 with a single user",
    ),
    generateRandomTestCase(
      true,
      true,
      9,
      9,
      0,
      0,
      1000000000,
      1000000000,
      "SPL Token 2022 and SPL Token 2022 with a single user",
    ),
  ];

  it.each(testCases)(
    "Staking with $description",
    async ({
      isToken1Token2022,
      isToken2Token2022,
      decimals1,
      decimals2,
      user1Token1Amount,
      user1Token1StakeAmount,
      user1Token2Amount,
      user1Token2StakeAmount,
      user2Token1Amount,
      user2Token1StakeAmount,
      user2Token2Amount,
      user2Token2StakeAmount,
    }) => {
      // Create users
      const user1 = await createUser(provider);
      const user2 = await createUser(provider);

      // Create two mints (SPL and SPL2022)
      const minter1 = await createUser(provider);
      const minter2 = await createUser(provider);
      const mint1 = await createMint(
        provider,
        minter1,
        decimals1,
        isToken1Token2022,
      );
      const mint2 = await createMint(
        provider,
        minter2,
        decimals2,
        isToken2Token2022,
      );

      // Create token accounts for the users
      const user1TokenAccount1 = await createTokenAccount(
        provider,
        user1,
        mint1,
        isToken1Token2022,
      );
      const user1TokenAccount2 = await createTokenAccount(
        provider,
        user1,
        mint2,
        isToken2Token2022,
      );
      const user2TokenAccount1 = await createTokenAccount(
        provider,
        user2,
        mint1,
        isToken1Token2022,
      );
      const user2TokenAccount2 = await createTokenAccount(
        provider,
        user2,
        mint2,
        isToken2Token2022,
      );

      // Mint tokens into the user's token accounts if the amount is greater than 0
      if (user1Token1Amount > 0)
        await mintTokensToUser(
          provider,
          mint1,
          user1TokenAccount1,
          minter1,
          user1Token1Amount,
          isToken1Token2022,
        );
      if (user1Token2Amount > 0)
        await mintTokensToUser(
          provider,
          mint2,
          user1TokenAccount2,
          minter2,
          user1Token2Amount,
          isToken2Token2022,
        );
      if (user2Token1Amount > 0)
        await mintTokensToUser(
          provider,
          mint1,
          user2TokenAccount1,
          minter1,
          user2Token1Amount,
          isToken1Token2022,
        );
      if (user2Token2Amount > 0)
        await mintTokensToUser(
          provider,
          mint2,
          user2TokenAccount2,
          minter2,
          user2Token2Amount,
          isToken2Token2022,
        );

      // Create two vaults
      const vaultCurator1 = await createUser(provider);
      const vaultCurator2 = await createUser(provider);
      const { vault: vault1, vaultTokenAccount: vaultTokenAccount1 } =
        await createVault(
          provider,
          program,
          vaultCurator1,
          mint1,
          "Vault One",
          isToken1Token2022,
        );
      const { vault: vault2, vaultTokenAccount: vaultTokenAccount2 } =
        await createVault(
          provider,
          program,
          vaultCurator2,
          mint2,
          "Vault Two",
          isToken2Token2022,
        );

      // Stake in the first vault
      if (user1Token1StakeAmount)
        await program.methods
          .stake(new anchor.BN(user1Token1StakeAmount), 9)
          .accounts({
            vault: vault1,
            user: user1.publicKey,
            userStakedTokenAccount: user1TokenAccount1,
            vaultStakedTokenAccount: vaultTokenAccount1,
            stakedTokenMint: mint1,
            userVaultShareTokenAccount: user1TokenAccount1,
            vaultShareTokenMint: mint1,
            stakedTokenProgram: isToken1Token2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();

      if (user2Token1StakeAmount)
        await program.methods
          .stake(new anchor.BN(user2Token1StakeAmount), 9)
          .accounts({
            vault: vault1,
            user: user2.publicKey,
            userStakedTokenAccount: user2TokenAccount1,
            vaultStakedTokenAccount: vaultTokenAccount1,
            stakedTokenMint: mint1,
            userVaultShareTokenAccount: user2TokenAccount1,
            vaultShareTokenMint: mint1,
            stakedTokenProgram: isToken1Token2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
          })
          .signers([user2])
          .rpc();

      // Stake in the second vault
      if (user1Token2StakeAmount)
        await program.methods
          .stake(new anchor.BN(user1Token2StakeAmount), 9)
          .accounts({
            vault: vault2,
            user: user1.publicKey,
            userStakedTokenAccount: user1TokenAccount2,
            vaultStakedTokenAccount: vaultTokenAccount2,
            stakedTokenMint: mint2,
            userVaultShareTokenAccount: user1TokenAccount2,
            vaultShareTokenMint: mint2,
            stakedTokenProgram: isToken2Token2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();

      if (user2Token2StakeAmount)
        await program.methods
          .stake(new anchor.BN(user2Token2StakeAmount), 9)
          .accounts({
            vault: vault2,
            user: user2.publicKey,
            userStakedTokenAccount: user2TokenAccount2,
            vaultStakedTokenAccount: vaultTokenAccount2,
            stakedTokenMint: mint2,
            userVaultShareTokenAccount: user2TokenAccount2,
            vaultShareTokenMint: mint2,
            stakedTokenProgram: isToken2Token2022
              ? TOKEN_2022_PROGRAM_ID
              : TOKEN_PROGRAM_ID,
          })
          .signers([user2])
          .rpc();

      // Verify stakes
      const vault1Account = await program.account.vault.fetch(vault1);
      const vault2Account = await program.account.vault.fetch(vault2);
      assert.equal(
        vault1Account.totalStaked.toString(),
        (user1Token1StakeAmount + user2Token1StakeAmount).toString(),
      );
      assert.equal(
        vault2Account.totalStaked.toString(),
        (user1Token2StakeAmount + user2Token2StakeAmount).toString(),
      );
    },
  );
});
