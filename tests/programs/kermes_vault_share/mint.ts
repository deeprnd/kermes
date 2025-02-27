import { describe, it, expect, beforeEach } from "vitest";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KermesStaking } from "../../../target/types/kermes_staking";
import { KermesVaultShare } from "../../../target/types/kermes_vault_share";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getAccount, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { createUser, createMint, createTokenAccount } from "../../helpers";

describe("kermes_vault_share mint test", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const vaultShareProgram = anchor.workspace
    .KermesVaultShare as Program<KermesVaultShare>;
  const stakingProgram = anchor.workspace
    .KermesStaking as Program<KermesStaking>;

  // Initialize test variables
  let admin: Keypair;
  let user: Keypair;
  let vaultShareMint: PublicKey;
  let userTokenAccount: PublicKey;
  let initialBalance: bigint;

  beforeEach(async () => {
    // Create admin and user keypairs
    admin = await createUser(provider);
    user = await createUser(provider);

    // Create a Token2022 mint with admin as authority
    vaultShareMint = await createMint(provider, admin, 9, true);

    // Create token account for the user
    userTokenAccount = await createTokenAccount(
      provider,
      user,
      vaultShareMint,
      true,
    );

    // Get initial balance
    const userAccount = await getAccount(
      provider.connection,
      userTokenAccount,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    initialBalance = userAccount.amount;
  });

  it("mints vault share tokens correctly and emits event", async () => {
    // Define the amount to mint
    const amountToMint = new anchor.BN(1000000000);

    // Execute the mint instruction
    await vaultShareProgram.methods
      .mint(amountToMint)
      .accounts({
        mint: vaultShareMint,
        userTokenAccount: userTokenAccount,
        mintAuthority: admin.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    // Check if the tokens were minted correctly
    const userAccount = await getAccount(
      provider.connection,
      userTokenAccount,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Verify user balance increased
    expect(userAccount.amount).toBe(
      initialBalance + BigInt(amountToMint.toString()),
    );

    // Check the total supply of the mint
    const mintInfo = await getMint(
      provider.connection,
      vaultShareMint,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // Verify total supply matches the minted amount
    expect(mintInfo.supply).toBe(BigInt(amountToMint.toString()));
  });
});
