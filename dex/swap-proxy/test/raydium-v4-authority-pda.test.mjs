import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveRaydiumV4AmmAuthorityPda } from "../src/raydium-v4-authority-pda.mjs";

test("Raydium mainnet V4 AUTHORITY_AMM / nonce 254 derives the known 5Q544f authority", async () => {
  // Raydium's pinned processor.rs uses seeds [b"amm authority", &[nonce]]
  // and program ID 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8.
  // The 5Q544fKr... account is also the well-known Raydium V4 AMM PDA.
  const verdict = await deriveRaydiumV4AmmAuthorityPda({
    network: "mainnet-beta", nonce: 254
  });
  assert.equal(verdict.authority, "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
  assert.equal(verdict.seed, "amm authority");
  assert.equal(verdict.programId, "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
  assert.equal(verdict.independentlyDerivedOffCurvePda, true);
  assert.equal(verdict.approvedForJupiterCpi, false);
});

test("Devnet Raydium V4 authority PDA cannot be replaced with mainnet authority", async () => {
  const pda = await deriveRaydiumV4AmmAuthorityPda({
    network: "devnet", nonce: 254
  });
  assert.equal(pda.programId, "DRaya7Kj3aMWQSy19kSjvmuwq9docCHofyP9kanQGaav");
  assert.equal(pda.authority, "AhSQwzpJMskCCQ3GkWDZSA69xS5qK5s7jLejhK6sgYf1");
  assert.notEqual(pda.authority, "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
  assert.equal(pda.approvedForJupiterCpi, false);
});

test("on-curve nonce 255 must never be treated as a valid Raydium PDA", async () => {
  for (const network of ["mainnet-beta", "devnet"]) {
    await assert.rejects(
      deriveRaydiumV4AmmAuthorityPda({ network, nonce: 255 }),
      /on-curve or ambiguous address/i,
      "Solana rejects a PDA candidate that decompresses to a curve point"
    );
  }
});

test("authority derivation rejects missing, invalid and noncanonical network/nonce", async () => {
  for (const args of [
    undefined, {},
    { network: "testnet", nonce: 254 },
    { network: "mainnet-beta", nonce: -1 },
    { network: "mainnet-beta", nonce: 256 },
    { network: "mainnet-beta", nonce: 254.5 },
    { network: "mainnet-beta", nonce: "254" },
    { network: "devnet", nonce: null }
  ]) {
    await assert.rejects(
      deriveRaydiumV4AmmAuthorityPda(args),
      /unknown Raydium network|invalid AMM state nonce/i
    );
  }
});

test("authority PDA evidence remains outside the signable Jupiter order and execute paths", () => {
  const source = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["']\.\/raydium-v4-authority-pda\.mjs/);
  assert.doesNotMatch(source, /from ["']\.\/raydium-v4-pool-evidence\.mjs/);
  assert.match(source, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(source, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
});
