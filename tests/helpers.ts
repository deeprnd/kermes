import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint as createSPLMint,
  createAssociatedTokenAccount,
  createAccount,
  mintTo,
} from "@solana/spl-token";

// Helper function to request an airdrop
export async function requestAirdrop(
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

// Create a single user
export async function createUser(provider: anchor.AnchorProvider) {
  const user = anchor.web3.Keypair.generate();
  await requestAirdrop(user, provider.connection);
  return user;
}

// Create a single mint (either SPL or SPL2022)
export async function createMint(
  provider: anchor.AnchorProvider,
  payer: anchor.web3.Keypair,
  decimals: number,
  isToken2022: boolean = false,
) {
  let mint;
  if (isToken2022) {
    mint = await createSPLMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
  } else {
    mint = await createSPLMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      decimals,
    );
  }

  return mint;
}

// Create a single token account for a user and mint
export async function createTokenAccount(
  provider: anchor.AnchorProvider,
  user: anchor.web3.Keypair,
  mint: anchor.web3.PublicKey,
  isToken2022: boolean = false,
) {
  const tokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    user,
    mint,
    user.publicKey,
    undefined,
    isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
  );
  return tokenAccount;
}

// Mint tokens into a user's token account
export async function mintTokensToUser(
  provider: anchor.AnchorProvider,
  mint: anchor.web3.PublicKey,
  tokenAccount: anchor.web3.PublicKey,
  minter: anchor.web3.Keypair,
  amount: number,
  isToken2022: boolean = false,
) {
  await mintTo(
    provider.connection,
    minter,
    mint,
    tokenAccount,
    minter,
    amount,
    undefined,
    undefined,
    isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
  );
}

// Create a single vault
export async function createVault(
  provider: anchor.AnchorProvider,
  program: anchor.Program,
  vaultCurator: anchor.web3.Keypair,
  mint: anchor.web3.PublicKey,
  vaultName: string,
  isToken2022: boolean = false,
) {
  const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      vaultCurator.publicKey.toBuffer(),
      mint.toBuffer(),
      Buffer.from(vaultName),
    ],
    program.programId,
  );

  const vaultTokenAccountKeypair = anchor.web3.Keypair.generate();
  const vaultTokenAccount = vaultTokenAccountKeypair.publicKey;

  await createAccount(
    provider.connection,
    vaultCurator,
    mint,
    vault,
    vaultTokenAccountKeypair,
    undefined,
    isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
  );

  await program.methods
    .initializeVault(vaultName)
    .accounts({
      vault: vault,
      payer: vaultCurator.publicKey,
      tokenMint: mint,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([vaultCurator])
    .rpc();

  return { vault, vaultTokenAccount };
}
