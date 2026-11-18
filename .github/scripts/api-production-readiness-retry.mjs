import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { probeProductionApi } from "./api-production-readiness.mjs";

// Post-deploy exact-revision checks must be pinned; no observational mode.
// The full pre-existing probe runs on every attempt, never an isolated /health
// shortcut. Retry only the observed Cloudflare old-edge revision mismatch.
const STALE_REVISION = "Live Worker revision differs from the exact GitHub commit deployed";
const SHA = /^[0-9a-f]{40}$/;
const MAX_ATTEMPTS = 12;
const DELAY_MS = 5000;

function isStaleEdgeRevision(error, expectedRevision) {
  return error?.code === "ERR_ASSERTION" &&
    error.operator === "strictEqual" &&
    // Node.js AssertionError.message may append an indented actual/expected
    // diff after a newline; require the unchanged fixed message boundary.
    (error.message === STALE_REVISION ||
      error.message?.startsWith(STALE_REVISION + "\n")) &&
    error.expected === expectedRevision &&
    typeof error.actual === "string" &&
    SHA.test(error.actual) &&
    error.actual !== expectedRevision;
}

export async function runExactRevisionReadinessProbe({
  expectedRevision,
  probeImpl = probeProductionApi,
  sleepImpl = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxAttempts = MAX_ATTEMPTS,
  delayMs = DELAY_MS
} = {}) {
  assert.ok(typeof expectedRevision === "string" && SHA.test(expectedRevision),
    "Deployment readiness requires an exact canonical Git SHA");
  assert.ok(Number.isSafeInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= MAX_ATTEMPTS,
    "Invalid bounded readiness attempt count");
  assert.ok(Number.isSafeInteger(delayMs) && delayMs >= 0 && delayMs <= DELAY_MS,
    "Invalid bounded readiness delay");
  assert.equal(typeof probeImpl, "function", "Full production probe required");
  assert.equal(typeof sleepImpl, "function", "Bounded delay required");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // On retry, do NOT reuse an earlier health, quote or CORS result.
      const result = await probeImpl({ expectedRevision });
      assert.equal(result?.ok, true, "Full production readiness probe did not pass");
      assert.ok(Array.isArray(result.checks) && result.checks.length >= 6 &&
        result.checks.includes("Source-approved third-party Swap provider status") &&
        result.checks.includes("Independent Solana DEX provider remains source-disabled") &&
        result.checks.includes("On-chain execute remains fail-closed") &&
        result.checks.includes("Real Jupiter SOL/USDC quote preview (no transaction)") &&
        result.checks.includes("Worker health, deployed Git revision, bindings, CORS and server-side execution gate"),
        "Full quote-only readiness evidence is incomplete");
      assert.ok(Array.isArray(result.observations), "Readiness observations are missing");
      return { ...result, attempts: attempt };
    } catch (error) {
      // In particular: unsafe execution, missing CORS, malformed quote,
      // failed provider, or a missing/malformed SHA NEVER become retryable.
      if (!isStaleEdgeRevision(error, expectedRevision) || attempt === maxAttempts) {
        throw error;
      }
      await sleepImpl(delayMs);
    }
  }
  throw new Error("Full readiness was not verified");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runExactRevisionReadinessProbe({
      expectedRevision: process.env.CLIMBORIA_EXPECTED_DEPLOY_SHA
    });
    console.log("PASS Climboria production API quote-only readiness (attempt " + result.attempts + "):");
    for (const check of result.checks) console.log("  - " + check);
    for (const observation of result.observations) console.log("  - OBSERVATION: " + observation);
  } catch {
    // Never print RPC/private credentials embedded in unexpected exceptions.
    console.error("FAIL production API quote-only readiness: exact Git SHA and all safety checks were not verified.");
    process.exitCode = 1;
  }
}
