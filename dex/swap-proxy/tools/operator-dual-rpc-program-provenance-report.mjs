#!/usr/bin/env node
/**
 * Manual operator-only evidence report; no secrets are printed or persisted.
 * Requires CLIMBORIA_SOLANA_RPC_URL, CLIMBORIA_SOLANA_RPC_URL_SECONDARY,
 * and CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH in the operator environment.
 *
 * Read-only: asks both independently configured RPC hosts for finalized
 * upgradeable Jupiter V6/Raydium V4 loader metadata. This is NOT a bytecode
 * audit, independently authenticated ledger proof or release authorization.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { assertNoObservedProgramUpgradeDrift } from "./observed-programdata-drift.mjs";
import { verifyDualRpcProgramProvenance } from "./operator-dual-rpc-program-provenance.mjs";

export async function runDualRpcProgramMetadata({
  primaryRpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL,
  secondaryRpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL_SECONDARY,
  expectedGenesisHash = process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH
} = {}) {
  if (!primaryRpcUrl || !secondaryRpcUrl || !expectedGenesisHash) {
    throw new Error("Operator private RPC endpoints and pinned genesis are not configured");
  }
  return verifyDualRpcProgramProvenance({
    primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runDualRpcProgramMetadata();
    // This repo-reviewed source snapshot is ONLY a change alarm. It is
    // NOT a substitute for independently pinned full executable-image SHA256.
    const baseline = JSON.parse(await readFile(
      new URL("./observed-programdata-baseline.json", import.meta.url), "utf8"
    ));
    const drift = assertNoObservedProgramUpgradeDrift(result, baseline);
    console.log(JSON.stringify({ ...result, observedProgramMetadataBaseline: drift }, null, 2));
    console.log("NO-GO: matching provider-reported loader metadata does not verify executable bytes, source parity, CPI, independent operators, ledger finality or native trading");
  } catch {
    // Do not reflect upstream URLs, credentials, fetch exceptions or stack.
    console.error("FAIL private dual-RPC program provenance or reviewed observed-metadata drift check. If any deployment slot/authority changed, review new binary before release. No credentials logged.");
    process.exitCode = 1;
  }
}
