import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { KermesStaking } from "../../../target/types/kermes_staking";
import { describe, it } from "vitest";
import assert from "assert";
import {
  createUser,
  createMint,
  createVault,
  getVaultAddress,
} from "../../helpers";

describe("kermes-staking-initialize-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KermesStaking as Program<KermesStaking>;

  const testCases = [
    {
      vaultName: "Vault One",
      isToken2022: true,
      decimals: 9,
      description: "9 decimals SPL Token",
    },
    {
      vaultName: "Vault Two",
      isToken2022: false,
      decimals: 6,
      description: "6 decimals SPL Token",
    },
    {
      vaultName: "Vault Three",
      isToken2022: true,
      decimals: 18,
      description: "18 decimals Token 2022",
    },
    {
      vaultName: "Vault Three",
      isToken2022: false,
      decimals: 18,
      description: "18 decimals SPL Token",
    },
    {
      vaultName: "Another Vault",
      isToken2022: true,
      decimals: 8,
      description: "8 decimals Token 2022",
    },
    {
      vaultName: "a",
      isToken2022: false,
      decimals: 10,
      description: "single character name and 10 decimals SPL Token",
    },
    {
      vaultName: "a",
      isToken2022: true,
      decimals: 10,
      description: "single character name and 10 decimals Token 2022",
    },
  ];

  it.each(testCases)(
    "Initialize vaults with $description",
    async ({ vaultName, isToken2022, decimals }) => {
      // Create mint
      const minter = await createUser(provider);
      const mint = await createMint(provider, minter, decimals, isToken2022);

      // Create a vault
      const vaultCurator = await createUser(provider);
      const { vault, vaultTokenAccount } = await createVault(
        provider,
        program,
        vaultCurator,
        mint,
        vaultName,
        isToken2022,
      );

      // Verify stakes
      const vaultAccount = await program.account.vault.fetch(vault);

      // Assert that the vault's total staked is 0
      assert.equal(vaultAccount.totalStaked.toString(), "0");

      // Assert that the vault's name matches the input name
      assert.equal(vaultAccount.name, vaultName);

      // Assert that the vault's token_mint matches the mint address used
      assert.equal(vaultAccount.tokenMint.toString(), mint.toString());

      // Assert that the vault's owner matches the vault curator's public key
      assert.equal(
        vaultAccount.owner.toString(),
        vaultCurator.publicKey.toString(),
      );

      // Assert that the vault's bump is correct
      const { bump } = await getVaultAddress(
        program.programId,
        vaultCurator.publicKey,
        mint,
        vaultName,
      );

      // Assert that the vault's bump matches the expected bump
      assert.equal(vaultAccount.bump, bump);
      // Optionally, assert that other fields (if defined) are correctly initialized
      assert(
        vaultAccount.totalStaked !== undefined,
        "totalStaked should be initialized",
      );
      assert(vaultAccount.owner !== undefined, "owner should be set");
      assert(vaultAccount.tokenMint !== undefined, "tokenMint should be set");

      // Additional custom assertions based on specific business logic
      // For example, checking that the vault's `name` doesn't contain special characters (if relevant)
      assert(
        !/[^a-zA-Z0-9 ]/.test(vaultAccount.name),
        "Vault name contains invalid characters",
      );
    },
  );
});
