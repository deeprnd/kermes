import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint as createSPLMint,
  createAssociatedTokenAccount,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { KermesStaking } from "../target/types/kermes_staking";

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
  program: anchor.Program<KermesStaking>,
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

// Helper function to calculate the bump
export async function getVaultAddress(
  programId: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  tokenMint: anchor.web3.PublicKey,
  vaultName: string,
) {
  const [vaultAddress, bump] =
    await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        payer.toBuffer(),
        tokenMint.toBuffer(),
        Buffer.from(vaultName),
      ],
      programId,
    );
  return { vaultAddress, bump };
}

// Confirms a transaction and fetches its details from the blockchain
export async function confirmAndFetchTransaction(
  program: anchor.Program,
  transactionSignature: string,
): Promise<anchor.web3.VersionedTransactionResponse | null> {
  try {
    // Get the latest blockhash for confirmation
    const latestBlockhash =
      await program.provider.connection.getLatestBlockhash();

    // Confirm the transaction
    await program.provider.connection.confirmTransaction(
      {
        signature: transactionSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    );

    // Fetch and return the transaction details
    return await program.provider.connection.getTransaction(
      transactionSignature,
      {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      },
    );
  } catch (error) {
    return null;
  }
}

// Retrieves all log messages from a given transaction
export async function getTransactionLogs(
  program: anchor.Program,
  transactionSignature: string,
): Promise<string[]> {
  const txData = await confirmAndFetchTransaction(
    program,
    transactionSignature,
  );
  return txData?.meta?.logMessages ?? [];
}

// Prints all log messages from a given transaction
export async function printTransactionLogs(
  program: anchor.Program,
  transactionSignature: string,
): Promise<void> {
  console.log(`Log messages for tx signature: ${transactionSignature}`);
  const logMessages = await getTransactionLogs(program, transactionSignature);
  if (logMessages && logMessages.length > 0) {
    logMessages.forEach((logMessage, index) => {
      console.log(`Log Message ${index + 1}: ${logMessage}`);
    });
  } else {
    console.log("No log messages found");
  }
}

// Extracts and decodes events from a given transaction
export async function getTransactionEvents(
  program: anchor.Program,
  transactionSignature: string,
): Promise<any[]> {
  try {
    const txData = await confirmAndFetchTransaction(
      program,
      transactionSignature,
    );
    const innerInstructions = txData?.meta?.innerInstructions ?? [];

    const events: any[] = [];

    innerInstructions.forEach((innerIx) => {
      innerIx.instructions.forEach((instruction) => {
        try {
          const rawData = anchor.utils.bytes.bs58.decode(instruction.data);
          const base64Data = anchor.utils.bytes.base64.encode(
            rawData.subarray(8),
          ); // Adjust if needed
          const event = program.coder.events.decode(base64Data);
          if (event) events.push(event);
        } catch (error) {
          console.warn("Error decoding event data:", error);
        }
      });
    });
    return events;
  } catch (error) {
    console.error("Error fetching transaction events:", error);
    return [];
  }
}

// Prints all events from a given transaction
export async function printTransactionEvents(
  program: anchor.Program,
  transactionSignature: string,
): Promise<void> {
  console.log(`Events for tx signature: ${transactionSignature}`);
  const events = await getTransactionEvents(program, transactionSignature);
  if (events && events.length > 0) {
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}: ${JSON.stringify(event)}`);
    });
  } else {
    console.log("No log messages found");
  }
}
