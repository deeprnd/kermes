import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KermesStaking } from "../../target/types/kermes_staking";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  createAccount,
} from "@solana/spl-token";
import { describe, it } from "vitest";
import assert from "assert";

async function requestAirdrop(
  user: anchor.web3.Keypair,
  connection: anchor.web3.Connection,
) {
  const signature = await connection.requestAirdrop(
    user.publicKey,
    10 * anchor.web3.LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction({
    signature,
    blockhash: (await connection.getLatestBlockhash()).blockhash,
    lastValidBlockHeight: (await connection.getLatestBlockhash())
      .lastValidBlockHeight,
  });
}

describe("kermes-staking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KermesStaking as Program<KermesStaking>;

  async function createUsers() {
    const user1 = anchor.web3.Keypair.generate();
    const user2 = anchor.web3.Keypair.generate();

    await requestAirdrop(user1, provider.connection);
    await requestAirdrop(user2, provider.connection);

    const minter1 = anchor.web3.Keypair.generate();
    const minter2 = anchor.web3.Keypair.generate();
    const minter3 = anchor.web3.Keypair.generate();
    await requestAirdrop(minter1, provider.connection);
    await requestAirdrop(minter2, provider.connection);
    await requestAirdrop(minter3, provider.connection);

    const mint1Decimals = 9;
    const mint2Decimals = 9;
    const mint3Decimals = 9;

    // Create mints
    const mint1 = await createMint(
      provider.connection,
      minter1,
      minter1.publicKey,
      null,
      mint1Decimals,
    );
    const mint2 = await createMint(
      provider.connection,
      minter2,
      minter2.publicKey,
      null,
      mint2Decimals,
    );
    const mint3 = await createMint(
      provider.connection,
      minter3,
      minter3.publicKey,
      null,
      mint3Decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Create token accounts
    const user1Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint1,
      user1.publicKey,
    );
    const user1Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint2,
      user1.publicKey,
    );
    const user1Token3Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint3,
      user1.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const user2Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint1,
      user2.publicKey,
    );
    const user2Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint2,
      user2.publicKey,
    );
    const user2Token3Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint3,
      user2.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Mint initial tokens
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user1Token1Account,
      minter1,
      1000000000,
    );
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user2Token1Account,
      minter1,
      1500000000,
    );
    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user1Token2Account,
      minter2,
      2000000000,
    );
    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user2Token2Account,
      minter2,
      2500000000,
    );

    return {
      users: { user1, user2 },
      mints: {
        mint1: { mint: mint1, decimals: mint1Decimals },
        mint2: { mint: mint2, decimals: mint2Decimals },
        mint3: { mint: mint3, decimals: mint3Decimals },
      },
      tokenAccounts: {
        user1Token1Account,
        user1Token2Account,
        user1Token3Account,
        user2Token1Account,
        user2Token2Account,
        user2Token3Account,
      },
    };
  }

  async function createVaults(mint1: PublicKey, mint2: PublicKey) {
    const vaultCurator1 = anchor.web3.Keypair.generate();
    const vaultCurator2 = anchor.web3.Keypair.generate();
    await requestAirdrop(vaultCurator1, provider.connection);
    await requestAirdrop(vaultCurator2, provider.connection);

    const vault1Name = "Vault One";
    const vault2Name = "Vault Two";

    const [vault1] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        vaultCurator1.publicKey.toBuffer(),
        mint1.toBuffer(),
        Buffer.from(vault1Name),
      ],
      program.programId,
    );
    const [vault2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        vaultCurator2.publicKey.toBuffer(),
        mint2.toBuffer(),
        Buffer.from(vault2Name),
      ],
      program.programId,
    );

    const vault1TokenAccountKeypair = anchor.web3.Keypair.generate();
    const vault2TokenAccountKeypair = anchor.web3.Keypair.generate();
    const vault1TokenAccount = vault1TokenAccountKeypair.publicKey;
    const vault2TokenAccount = vault2TokenAccountKeypair.publicKey;

    await createAccount(
      provider.connection,
      vaultCurator1,
      mint1,
      vault1,
      vault1TokenAccountKeypair,
    );
    await createAccount(
      provider.connection,
      vaultCurator2,
      mint2,
      vault2,
      vault2TokenAccountKeypair,
    );

    await program.methods
      .initializeVault(vault1Name)
      .accounts({
        vault: vault1,
        payer: vaultCurator1.publicKey,
        tokenMint: mint1,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultCurator1])
      .rpc();

    await program.methods
      .initializeVault(vault2Name)
      .accounts({
        vault: vault2,
        payer: vaultCurator2.publicKey,
        tokenMint: mint2,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultCurator2])
      .rpc();

    return {
      vaults: { vault1, vault2 },
      vaultTokenAccounts: { vault1TokenAccount, vault2TokenAccount },
    };
  }

  it("Single user stakes tokens", async () => {
    const { users, mints, tokenAccounts } = await createUsers();
    const { vaults, vaultTokenAccounts } = await createVaults(
      mints.mint1.mint,
      mints.mint2.mint,
    );

    const stakeAmount = new anchor.BN(100000000);
    await program.methods
      .stake(stakeAmount, mints.mint1.decimals)
      .accounts({
        vault: vaults.vault1,
        user: users.user1.publicKey,
        userStakedTokenAccount: tokenAccounts.user1Token1Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault1TokenAccount,
        stakedTokenMint: mints.mint1.mint,
        userVaultShareTokenAccount: tokenAccounts.user1Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaults.vault1);
    assert.equal(vaultAccount.totalStaked.toString(), stakeAmount.toString());
  });

  it("Single user stakes in multiple vaults", async () => {
    const { users, mints, tokenAccounts } = await createUsers();
    const { vaults, vaultTokenAccounts } = await createVaults(
      mints.mint1.mint,
      mints.mint2.mint,
    );

    const stakeAmount1 = new anchor.BN(100000000);
    const stakeAmount2 = new anchor.BN(200000000);

    await program.methods
      .stake(stakeAmount1, mints.mint1.decimals)
      .accounts({
        vault: vaults.vault1,
        user: users.user1.publicKey,
        userStakedTokenAccount: tokenAccounts.user1Token1Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault1TokenAccount,
        stakedTokenMint: mints.mint1.mint,
        userVaultShareTokenAccount: tokenAccounts.user1Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    await program.methods
      .stake(stakeAmount2, mints.mint2.decimals)
      .accounts({
        vault: vaults.vault2,
        user: users.user1.publicKey,
        userStakedTokenAccount: tokenAccounts.user1Token2Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault2TokenAccount,
        stakedTokenMint: mints.mint2.mint,
        userVaultShareTokenAccount: tokenAccounts.user1Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    const vault1Account = await program.account.vault.fetch(vaults.vault1);
    const vault2Account = await program.account.vault.fetch(vaults.vault2);
    assert.equal(vault1Account.totalStaked.toString(), stakeAmount1.toString());
    assert.equal(vault2Account.totalStaked.toString(), stakeAmount2.toString());
  });

  it("Multiple users stake in multiple vaults", async () => {
    const { users, mints, tokenAccounts } = await createUsers();
    const { vaults, vaultTokenAccounts } = await createVaults(
      mints.mint1.mint,
      mints.mint2.mint,
    );

    // Define stake amounts for each user in each vault
    const user1Vault1Amount = new anchor.BN(100000000);
    const user1Vault2Amount = new anchor.BN(200000000);
    const user2Vault1Amount = new anchor.BN(150000000);
    const user2Vault2Amount = new anchor.BN(250000000);

    // User 1 stakes in vault 1
    await program.methods
      .stake(user1Vault1Amount, mints.mint1.decimals)
      .accounts({
        vault: vaults.vault1,
        user: users.user1.publicKey,
        userStakedTokenAccount: tokenAccounts.user1Token1Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault1TokenAccount,
        stakedTokenMint: mints.mint1.mint,
        userVaultShareTokenAccount: tokenAccounts.user1Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    // User 1 stakes in vault 2
    await program.methods
      .stake(user1Vault2Amount, mints.mint2.decimals)
      .accounts({
        vault: vaults.vault2,
        user: users.user1.publicKey,
        userStakedTokenAccount: tokenAccounts.user1Token2Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault2TokenAccount,
        stakedTokenMint: mints.mint2.mint,
        userVaultShareTokenAccount: tokenAccounts.user1Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    // User 2 stakes in vault 1
    await program.methods
      .stake(user2Vault1Amount, mints.mint1.decimals)
      .accounts({
        vault: vaults.vault1,
        user: users.user2.publicKey,
        userStakedTokenAccount: tokenAccounts.user2Token1Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault1TokenAccount,
        stakedTokenMint: mints.mint1.mint,
        userVaultShareTokenAccount: tokenAccounts.user2Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user2])
      .rpc();

    // User 2 stakes in vault 2
    await program.methods
      .stake(user2Vault2Amount, mints.mint2.decimals)
      .accounts({
        vault: vaults.vault2,
        user: users.user2.publicKey,
        userStakedTokenAccount: tokenAccounts.user2Token2Account,
        vaultStakedTokenAccount: vaultTokenAccounts.vault2TokenAccount,
        stakedTokenMint: mints.mint2.mint,
        userVaultShareTokenAccount: tokenAccounts.user2Token3Account,
        vaultShareTokenMint: mints.mint3.mint,
        stakedTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users.user2])
      .rpc();

    // Verify total staked amounts in each vault
    const vault1Account = await program.account.vault.fetch(vaults.vault1);
    const vault2Account = await program.account.vault.fetch(vaults.vault2);

    // Check vault1 total (user1 + user2)
    const expectedVault1Total = user1Vault1Amount.add(user2Vault1Amount);
    assert.equal(
      vault1Account.totalStaked.toString(),
      expectedVault1Total.toString(),
    );

    // Check vault2 total (user1 + user2)
    const expectedVault2Total = user1Vault2Amount.add(user2Vault2Amount);
    assert.equal(
      vault2Account.totalStaked.toString(),
      expectedVault2Total.toString(),
    );
  });
});
