#!/usr/bin/env node
/**
 * Private, read-only operator RPC setup verification.
 *
 * Required private environment:
 *   CLIMBORIA_SOLANA_RPC_URL
 *   CLIMBORIA_SOLANA_RPC_URL_SECONDARY
 * Required publicly corroborated chain pin:
 *   CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH
 *
 * Never print the endpoint URLs, tokens or provider error bodies. This checks
 * provider-reported genesis/finalized slots only, not authenticated chain finality
 * or authorization to enable any wallet-signing/execution path.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyPrivateDualRpcConnectivity } from "../src/operator-private-rpc-connectivity.mjs";

export async function runOperatorRpcSetup({
  primaryRpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL,
  secondaryRpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL_SECONDARY,
  expectedGenesisHash = process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!primaryRpcUrl || !secondaryRpcUrl || !expectedGenesisHash) {
    throw new Error("Configure two private RPC URLs and an independently corroborated expected genesis hash first");
  }
  return verifyPrivateDualRpcConnectivity({
    primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash, fetchImpl
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runOperatorRpcSetup();
    console.log("PASS read-only dual Solana RPC connectivity: operator-pinned genesis matches on two distinct configured hostnames");
    console.log("Reported finalized slots: primary=" + result.primaryFinalizedSlot +
      " secondary=" + result.secondaryFinalizedSlot + " difference=" + result.finalizedSlotDifference);
    console.log("NO-GO: different operators, genuine ledger finality, CPI and bytecode audit, wallet-signed swap and execution are NOT verified");
  } catch {
    console.error("FAIL private dual-RPC verification: missing configuration, invalid endpoint, mismatched chain, stale provider or transport issue. Credentials not logged.");
    process.exitCode = 1;
  }
}
