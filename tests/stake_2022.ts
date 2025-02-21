import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kermes } from "../target/types/kermes";
import {
  TOKEN_2022_PROGRAM_ID,
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

describe("kermes with token-2022", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Kermes as Program<Kermes>;

  async function createUsers() {
    const user1 = anchor.web3.Keypair.generate();
    const user2 = anchor.web3.Keypair.generate();

    await requestAirdrop(user1, provider.connection);
    await requestAirdrop(user2, provider.connection);

    const minter1 = anchor.web3.Keypair.generate();
    const minter2 = anchor.web3.Keypair.generate();
    await requestAirdrop(minter1, provider.connection);
    await requestAirdrop(minter2, provider.connection);

    const mint1Decimals = 9;
    const mint2Decimals = 9;

    // Create mints with Token 2022
    const mint1 = await createMint(
      provider.connection,
      minter1,
      minter1.publicKey,
      null,
      mint1Decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const mint2 = await createMint(
      provider.connection,
      minter2,
      minter2.publicKey,
      null,
      mint2Decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Create token accounts with Token 2022
    const user1Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint1,
      user1.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const user1Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint2,
      user1.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const user2Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint1,
      user2.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const user2Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint2,
      user2.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Mint initial tokens with Token 2022
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user1Token1Account,
      minter1,
      1000000000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user2Token1Account,
      minter1,
      1500000000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user1Token2Account,
      minter2,
      2000000000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user2Token2Account,
      minter2,
      2500000000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      users: { user1, user2 },
      mints: {
        mint1: { mint: mint1, decimals: mint1Decimals },
        mint2: { mint: mint2, decimals: mint2Decimals },
      },
      tokenAccounts: {
        user1Token1Account,
        user1Token2Account,
        user2Token1Account,
        user2Token2Account,
      },
    };
  }

  async function createVaults(
    mint1: anchor.web3.PublicKey,
    mint2: anchor.web3.PublicKey,
  ) {
    const vaultCurator1 = anchor.web3.Keypair.generate();
    const vaultCurator2 = anchor.web3.Keypair.generate();
    await requestAirdrop(vaultCurator1, provider.connection);
    await requestAirdrop(vaultCurator2, provider.connection);

    const vault1Name = "Vault One 2022";
    const vault2Name = "Vault Two 2022";

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
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    await createAccount(
      provider.connection,
      vaultCurator2,
      mint2,
      vault2,
      vault2TokenAccountKeypair,
      undefined,
      TOKEN_2022_PROGRAM_ID,
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
        userTokenAccount: tokenAccounts.user1Token1Account,
        vaultTokenAccount: vaultTokenAccounts.vault1TokenAccount,
        tokenMint: mints.mint1.mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([users.user1])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaults.vault1);
    assert.equal(vaultAccount.totalStaked.toString(), stakeAmount.toString());
  });
});
