#!/usr/bin/env node
/**
 * Operator-local, read-only executable payload SHA-256 cross-check.
 *
 * Required local environment:
 *   CLIMBORIA_SOLANA_RPC_URL (private trusted HTTPS endpoint)
 *   CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH (independently corroborated)
 *   CLIMBORIA_JUPITER_V6_EXPECTED_PROGRAMDATA_PAYLOAD_SHA256
 *   CLIMBORIA_RAYDIUM_V4_EXPECTED_PROGRAMDATA_PAYLOAD_SHA256
 *
 * Reference SHA-256s MUST come from independently reviewed byte-for-byte
 * deployment payload images (including allocated padding, not a trimmed ELF).
 * Not sourced from the SAME RPC being checked. Never paste URLs/API keys
 * into terminal transcripts, issue trackers or public CI.
 *
 * This tool neither constructs nor signs/submits any transaction.
 */
import { verifyOperatorRpcGenesisSet } from "../src/raydium-v4-rpc-genesis-preflight.mjs";
import { fetchMainnetUpgradeableProgramProvenance } from "../src/upgradeable-program-provenance.mjs";
import { hashPinnedJupiterRaydiumPayloads } from "../src/upgradeable-program-bytecode-digest.mjs";
import { safeRaydiumOperatorError } from "./raydium-v4-safe-error.mjs";

async function main() {
  const rpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL;
  const expectedGenesisHash = process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH;
  const expectedJupiterSha256 = process.env.CLIMBORIA_JUPITER_V6_EXPECTED_PROGRAMDATA_PAYLOAD_SHA256;
  const expectedRaydiumSha256 = process.env.CLIMBORIA_RAYDIUM_V4_EXPECTED_PROGRAMDATA_PAYLOAD_SHA256;
  if (!rpcUrl || !expectedGenesisHash || !expectedJupiterSha256 || !expectedRaydiumSha256) {
    throw new Error("Operator RPC, expected genesis and both independently pinned program payload SHA-256 values are required");
  }
  const genesis = await verifyOperatorRpcGenesisSet({
    primaryRpcUrl: rpcUrl, expectedGenesisHash
  });
  const provenance = await fetchMainnetUpgradeableProgramProvenance({
    network: "mainnet-beta", rpcUrl
  });
  const report = await hashPinnedJupiterRaydiumPayloads({
    provenanceProof: provenance, rpcUrl,
    expectedJupiterSha256, expectedRaydiumSha256
  });
  process.stdout.write(JSON.stringify({
    kind: "CLIMBORIA_READ_ONLY_DEPLOYED_PROGRAM_PAYLOAD_DIGEST",
    network: report.network,
    operatorPinnedGenesisMatches: genesis.matchesOperatorExpectedGenesis,
    operatorExpectedGenesisHash: genesis.genesisHash,
    programs: report.programs,
    bothMatchOperatorPinnedSha256: report.bothMatchOperatorPinnedSha256,
    programSourceAndBinaryIndependentAuditComplete: false,
    rpcIndependentlyTrusted: false,
    singleFinalizedSlotForAllBytecodeChunks: false,
    jupiterV6CpiSemanticsApproved: false,
    approvedForJupiterCpi: false,
    transactionsBuiltOrSubmitted: false
  }, null, 2) + "\n");
}

main().catch(error => {
  // Never print untrusted fetch/URL/RPC error strings or stack traces.
  process.stderr.write("Read-only deployed program digest FAILED: " +
    safeRaydiumOperatorError(error) + "\n");
  process.exitCode = 1;
});
