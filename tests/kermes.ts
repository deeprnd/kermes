import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kermes } from "../target/types/kermes";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  createAssociatedTokenAccount, 
  mintTo,
  getOrCreateAssociatedTokenAccount,
  createAccount
} from "@solana/spl-token";
import { assert } from "chai";

async function requestAirdrop(user: anchor.web3.Keypair, connection: anchor.web3.Connection) {
  const signature = await connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction({
    signature,
    blockhash: (await connection.getLatestBlockhash()).blockhash,
    lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
  });
}

describe("kermes", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Kermes as Program<Kermes>;

  // create minter
  const minter1 = anchor.web3.Keypair.generate();
  const minter2 = anchor.web3.Keypair.generate();
  // create users
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  // create vault curators
  const vaultCurator1 = anchor.web3.Keypair.generate();
  const vaultCurator2 = anchor.web3.Keypair.generate();

  let mint1: anchor.web3.PublicKey;
  let mint2: anchor.web3.PublicKey;
  let user1Token1Account: anchor.web3.PublicKey;
  let user1Token2Account: anchor.web3.PublicKey;
  let user2Token1Account: anchor.web3.PublicKey;
  let user2Token2Account: anchor.web3.PublicKey;
  let vault1: anchor.web3.PublicKey;
  let vault2: anchor.web3.PublicKey;
  let vault1TokenAccount: anchor.web3.PublicKey;
  let vault2TokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to users
    
    await requestAirdrop(user1, provider.connection);
    await requestAirdrop(user2, provider.connection);
    await requestAirdrop(minter1, provider.connection);
    await requestAirdrop(minter2, provider.connection);
    await requestAirdrop(vaultCurator1, provider.connection);
    await requestAirdrop(vaultCurator2, provider.connection);
    
   // Create two different mints
    mint1 = await createMint(
      provider.connection,
      minter1,
      minter1.publicKey,
      null,
      9
    );
    mint2 = await createMint(
      provider.connection,
      minter2,
      minter2.publicKey,
      null,
      9
    );

    // Create token accounts for both users
    user1Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint1,
      user1.publicKey
    );
    user1Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint2,
      user1.publicKey
    );
    
    user2Token1Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint1,
      user2.publicKey
    );
    user2Token2Account = await createAssociatedTokenAccount(
      provider.connection,
      user2,
      mint2,
      user2.publicKey
    );

    // Mint tokens to users
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user1Token1Account,
      minter1,
      1000000000
    );
    await mintTo(
      provider.connection,
      minter1,
      mint1,
      user2Token1Account,
      minter1,
      1500000000
    );

    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user1Token2Account,
      minter2,
      2000000000
    );
    await mintTo(
      provider.connection,
      minter2,
      mint2,
      user2Token2Account,
      minter2,
      2500000000
    );

    // Create vaults for each token
    [vault1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultCurator1.publicKey.toBuffer(), mint1.toBuffer()],
      program.programId
    );
    [vault2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultCurator2.publicKey.toBuffer(), mint2.toBuffer()],
      program.programId
    );

    // Create vault token accounts
    const vault1TokenAccountKeypair = anchor.web3.Keypair.generate();
    const vault2TokenAccountKeypair = anchor.web3.Keypair.generate();
    vault1TokenAccount = vault1TokenAccountKeypair.publicKey;
    vault2TokenAccount = vault2TokenAccountKeypair.publicKey;

    await createAccount(provider.connection, vaultCurator1, mint1, vault1, vault1TokenAccountKeypair);
    await createAccount(provider.connection, vaultCurator2, mint2, vault2, vault2TokenAccountKeypair);

    // Initialize vaults
    await program.methods
      .initializeVault()
      .accounts({
        vault: vault1,
        payer: vaultCurator1.publicKey,
        tokenMint: mint1,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultCurator1])
      .rpc();

    await program.methods
      .initializeVault()
      .accounts({
        vault: vault2,
        payer: vaultCurator2.publicKey,
        tokenMint: mint2,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultCurator2])
      .rpc();
  });

  it("Stakes tokens", async () => {
    const stakeAmount = new anchor.BN(100000000);

    await program.methods
      .stake(stakeAmount)
      .accounts({
        vault,
        user: provider.wallet.publicKey,
        userTokenAccount,
        vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vault);
    assert.equal(vaultAccount.totalStaked.toString(), stakeAmount.toString());
  });

  it("Multiple users stake different tokens in different vaults", async () => {
    // User 1 stakes token1 in vault1
    const user1Stake1Amount = new anchor.BN(100000000);
    await program.methods
      .stake(user1Stake1Amount)
      .accounts({
        vault: vault1,
        user: user1.publicKey,
        userTokenAccount: user1Token1Account,
        vaultTokenAccount: vault1TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // User 1 stakes token2 in vault2
    const user1Stake2Amount = new anchor.BN(200000000);
    await program.methods
      .stake(user1Stake2Amount)
      .accounts({
        vault: vault2,
        user: user1.publicKey,
        userTokenAccount: user1Token2Account,
        vaultTokenAccount: vault2TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // User 2 stakes token1 in vault1
    const user2Stake1Amount = new anchor.BN(150000000);
    await program.methods
      .stake(user2Stake1Amount)
      .accounts({
        vault: vault1,
        user: user2.publicKey,
        userTokenAccount: user2Token1Account,
        vaultTokenAccount: vault1TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    // User 2 stakes token2 in vault2
    const user2Stake2Amount = new anchor.BN(250000000);
    await program.methods
      .stake(user2Stake2Amount)
      .accounts({
        vault: vault2,
        user: user2.publicKey,
        userTokenAccount: user2Token2Account,
        vaultTokenAccount: vault2TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    // Verify vault1 total (token1)
    const vault1Account = await program.account.vault.fetch(vault1);
    assert.equal(
      vault1Account.totalStaked.toString(),
      user1Stake1Amount.add(user2Stake1Amount).toString()
    );

    // Verify vault2 total (token2)
    const vault2Account = await program.account.vault.fetch(vault2);
    assert.equal(
      vault2Account.totalStaked.toString(),
      user1Stake2Amount.add(user2Stake2Amount).toString()
    );
  });
});
