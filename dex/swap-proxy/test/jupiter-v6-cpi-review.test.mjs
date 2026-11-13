import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeJupiterV6Route } from "../src/jupiter-v6-policy.mjs";
import {
  JUPITER_V6_CPI_REVIEW_POLICY_VERSION,
  JUPITER_V6_UNREVIEWED_CPI_VARIANTS,
  requireReviewedJupiterV6CpiSemantics
} from "../src/jupiter-v6-cpi-review.mjs";

// Raw Jupiter V6 route bytes, not user-provided labels or metadata.
const discriminator = [229, 23, 203, 151, 122, 227, 173, 42];
const variants = [7, 17, 26, 38, 40, 46, 61];
function u16(n) { return [n & 255, n >>> 8]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function u64(n) {
  const value = BigInt(n);
  return Array.from({ length: 8 }, (_, i) => Number((value >> BigInt(8 * i)) & 255n));
}
function rawRoutePlan(steps) {
  const body = steps.flatMap(({ variant, percent, inputIndex = 0, outputIndex }) => [
    variant,
    ...(variant === 17 || variant === 61 ? [1] : []),
    percent, inputIndex, outputIndex
  ]);
  return new Uint8Array([
    ...discriminator, ...u32(steps.length),
    ...body, ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
}

test("every currently decodable DEX variant is still unreviewed for executable CPI", () => {
  assert.equal(JUPITER_V6_CPI_REVIEW_POLICY_VERSION, "v1-unverified");
  assert.deepEqual(Object.keys(JUPITER_V6_UNREVIEWED_CPI_VARIANTS).map(Number), variants);
  for (const variant of variants) {
    // This is a structurally valid V6 *raw* route with exactly one step.
    const raw = rawRoutePlan([{ variant, percent: 100, outputIndex: 1 }]);
    const route = decodeJupiterV6Route(raw);
    assert.equal(route.steps.length, 1);
    assert.equal(route.steps[0].variant, variant);
    assert.throws(
      () => requireReviewedJupiterV6CpiSemantics(route),
      /CPI semantics are not independently verified.*wallet-signable orders remain disabled/i,
      `Variant ${variant} must NOT become signable based on structural allowlisting`
    );
  }
});

test("mixed multi-DEX splits fail closed unless EVERY variant has independent CPI proof", () => {
  const route = decodeJupiterV6Route(rawRoutePlan([
    { variant: 7, percent: 50, outputIndex: 2 },
    { variant: 46, percent: 50, outputIndex: 2 }
  ]));
  assert.deepEqual(route.steps.map(step => step.variant), [7, 46]);
  assert.throws(
    () => requireReviewedJupiterV6CpiSemantics(route),
    /Raydium, RaydiumCP.*wallet-signable orders remain disabled/i
  );
});

test("manually forged review requests and unknown variants never grant approval", () => {
  for (const value of [
    null, {},
    { steps: [] },
    { steps: [{ variant: 999 }] },
    { steps: [{ variant: "7" }] },
    { steps: [{ variant: 7 }, { variant: 999 }] },
    { steps: Array.from({ length: 17 }, () => ({ variant: 7 })) }
  ]) {
    assert.throws(
      () => requireReviewedJupiterV6CpiSemantics(value),
      /unknown or malformed CPI variant review request/i
    );
  }
  assert.throws(
    () => requireReviewedJupiterV6CpiSemantics({ steps: [{ variant: 7, approved: true }] }),
    /not independently verified/i,
    "Forged metadata, labels or claimed approval must not override source review"
  );
});

test("order path enforces CPI boundary before RPC account evidence and order issuance", () => {
  const worker = readFileSync(new URL("../src/index.mjs", import.meta.url), "utf8");
  const policyModule = readFileSync(new URL("../src/jupiter-v6-cpi-review.mjs", import.meta.url), "utf8");
  const start = worker.indexOf("async function handleOrder(");
  const end = worker.indexOf("async function handleQuote(", start);
  assert.ok(start >= 0 && end > start, "Must locate the real handleOrder body");
  const handleOrder = worker.slice(start, end);
  const structure = handleOrder.indexOf("const policyResult = validateJupiterV6Transaction({");
  const reviewed = handleOrder.indexOf("requireReviewedJupiterV6CpiSemantics(policyResult.route)");
  const rpc = handleOrder.indexOf("tokenAccountVerification = await verifyJupiterTokenAccounts({");
  const token = handleOrder.indexOf("const orderToken = crypto.randomUUID()");
  assert.ok(structure >= 0 && structure < reviewed && reviewed < rpc && rpc < token,
    "Every signable order must pass CPI review before RPC/token issuance; no structural-only bypass");
  assert.match(worker, /const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;/);
  assert.match(worker, /const EXECUTION_SECURITY_REVIEW_COMPLETE = false;/);
  assert.doesNotMatch(policyModule, /approved:\s*true|process\.env|env\.|testOnly/i,
    "CPI policy may not be silently enabled by metadata, environment, or test-only flags");
});
