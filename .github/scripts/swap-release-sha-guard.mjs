#!/usr/bin/env node
/**
 * Explicit, exact-commit authorization for activating the THIRD-PARTY
 * Jupiter Swap provider in production.
 *
 * Source OFF and emergency OFF rollback must ALWAYS remain deployable.
 * Source ON requires an operator-set GitHub Actions repository variable:
 * CLIMBORIA_SWAP_RELEASE_APPROVED_SHA == the exact checked-out main commit.
 *
 * This does not validate Jupiter's hosted rights, vendor runtime, privacy,
 * wallet signing, or an on-chain settlement. It only prevents an accidental
 * source-ON Worker deployment through an ordinary main merge/push.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[0-9a-f]{40}$/;
const GATE = /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm;

export function validateSwapReleaseAuthorization(source, deploySha, approvedSha) {
  assert.equal(typeof source, "string", "Worker source is required");
  const gates = [...source.matchAll(GATE)];
  assert.equal(gates.length, 1, "Exactly one canonical third-party Swap source gate is required");
  assert.match(source, /^const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;$/m,
    "Native signable orders must remain source-disabled");
  assert.match(source, /^const EXECUTION_SECURITY_REVIEW_COMPLETE = false;$/m,
    "Native transaction execution must remain source-disabled");

  if (gates[0][1] === "false") {
    // Emergency rollback is intentionally possible with no extra approval
    // variable, even if an old approval SHA is still configured.
    return Object.freeze({ mode: "source-off", approved: true });
  }
  assert.match(deploySha ?? "", SHA, "ON deployment requires the exact 40-character Git commit SHA");
  assert.match(approvedSha ?? "", SHA,
    "ON deployment blocked: operator must set CLIMBORIA_SWAP_RELEASE_APPROVED_SHA to the exact main commit");
  assert.equal(approvedSha, deploySha,
    "ON deployment blocked: approved Git SHA does not match this deployment's exact commit");
  return Object.freeze({ mode: "source-on", approved: true });
}

export function main() {
  const source = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  const verdict = validateSwapReleaseAuthorization(
    source, process.env.GITHUB_SHA, process.env.CLIMBORIA_SWAP_RELEASE_APPROVED_SHA
  );
  if (verdict.mode === "source-off") {
    console.log("PASS: source-OFF Swap provider can deploy/recover without an ON release approval");
  } else {
    console.log("PASS: source-ON Jupiter Swap approved for this exact deployment commit SHA");
  }
  console.log("This is a release authorization check, not vendor integrity or wallet-trading approval evidence.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error("BLOCK: unsafe third-party Swap release authorization: " + error.message);
    process.exitCode = 1;
  }
}
