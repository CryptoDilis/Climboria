import test from "node:test";
import assert from "node:assert/strict";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { validateJupiterV6Transaction, decodeJupiterV6Route, JUPITER_V6_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";

const taker = "11111111111111111111111111111111";
const inputMint = "So11111111111111111111111111111111111111112";
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const source = encodeBase58(new Uint8Array(32).fill(21));
const destination = encodeBase58(new Uint8Array(32).fill(22));
const raydium = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const compute = "ComputeBudget111111111111111111111111111111";

function u16(n) { return [n & 255, n >>> 8]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function u64(n) { const x = BigInt(n); return Array.from({ length: 8 }, (_, i) => Number((x >> BigInt(8 * i)) & 255n)); }
function routeData({ variant = 7, percent = 100, inputIndex = 0, outputIndex = 1, inAmount = 1000, outAmount = 950, slippage = 50, fee = 0 } = {}) {
  const discriminator = [229, 23, 203, 151, 122, 227, 173, 42];
  const payload = variant === 17 || variant === 61 ? [1] : [];
  return new Uint8Array([...discriminator, ...u32(1), variant, ...payload, percent, inputIndex, outputIndex, ...u64(inAmount), ...u64(outAmount), ...u16(slippage), fee]);
}
// Deliberately raw, pinned V6 route-plan fixtures: no third-party SDK or
// network calls, so malformed graph shapes remain reproducible in CI.
function routePlanData(steps, { inAmount = 1000, outAmount = 950, slippage = 50, fee = 0 } = {}) {
  const discriminator = [229, 23, 203, 151, 122, 227, 173, 42];
  const payload = steps.flatMap(({ variant = 7, percent = 100, inputIndex, outputIndex }) => [
    variant, ...(variant === 17 || variant === 61 ? [1] : []),
    percent, inputIndex, outputIndex
  ]);
  return new Uint8Array([
    ...discriminator, ...u32(steps.length), ...payload,
    ...u64(inAmount), ...u64(outAmount), ...u16(slippage), fee
  ]);
}

function parsed({ data = routeData(), extraProgram = false, takerKey = taker, outMint = outputMint, requiredSignatures = 1 } = {}) {
  const unknownProgram = encodeBase58(new Uint8Array(32).fill(23));
  const keys = [takerKey, source, destination, TOKEN_PROGRAM_ID, outMint, JUPITER_V6_PROGRAM_ID, raydium, compute, unknownProgram];
  const instructions = [{ programIdIndex: 5, accountIndexes: [3, 0, 1, 2, 5, 4, 5, 6], data }];
  if (extraProgram) instructions.push({ programIdIndex: 8, accountIndexes: [], data: new Uint8Array([99]) });
  return {
    staticAccountKeys: keys.map(decodeBase58),
    requiredSignatures,
    readonlySignedAccounts: 0,
    readonlyUnsignedAccounts: 6,
    instructions
  };
}
function validate(p = parsed(), extra = {}) {
  return validateJupiterV6Transaction({ parsed: p, taker, outputMint, amount: "1000", outAmount: "950", otherAmountThreshold: "945", ...extra });
}

test("decodes a supported Raydium Jupiter route with exact amounts and bounded slippage", () => {
  const result = validate();
  assert.equal(result.ok, true);
  assert.equal(result.route.steps[0].dex, "Raydium");
  assert.equal(result.sourceTokenAccount, source);
  assert.equal(result.destinationTokenAccount, destination);
});

test("rejects unknown top-level programs, extra signers and unsupported route variants", () => {
  assert.throws(() => validate(parsed({ extraProgram: true })), /unsupported top-level program/i);
  assert.throws(() => validate(parsed({ requiredSignatures: 2 })), /single-taker-signature/);
  assert.throws(() => decodeJupiterV6Route(routeData({ variant: 8 })), /unsupported DEX variant/);
});

test("rejects wrong taker, output mint, amounts, fee and excessive slippage", () => {
  assert.throws(() => validate(parsed({ takerKey: source })), /account roles/);
  assert.throws(() => validate(parsed({ outMint: source })), /account roles/);
  assert.throws(() => validate(parsed({ data: routeData({ inAmount: 1001 }) })), /amounts do not match/);
  assert.throws(() => validate(parsed({ data: routeData({ fee: 1 }) })), /platform fees/);
  assert.throws(() => validate(parsed({ data: routeData({ slippage: 501 }) })), /5% safety cap/);
});

test("rejects invalid split percentages, route indexes and missing DEX program accounts", () => {
  assert.throws(() => decodeJupiterV6Route(routeData({ percent: 99 })), /total 100/);
  assert.throws(() => decodeJupiterV6Route(routeData({ inputIndex: 1, outputIndex: 1 })), /token index/);
  const p = parsed();
  p.staticAccountKeys[6] = decodeBase58(compute);
  assert.throws(() => validate(p), /missing its approved DEX program/);
});

test("rejects unexpected writable privileges on route authority and fee placeholders", () => {
  const p = parsed();
  p.readonlyUnsignedAccounts = 4;
  assert.throws(() => validate(p), /signer\/writable privileges/);
});

test("rejects Compute Budget instructions that carry account metas or unsupported opcodes", () => {
  const withAccounts = parsed();
  withAccounts.instructions.unshift({
    programIdIndex: 7,
    accountIndexes: [1],
    data: new Uint8Array([2, 1, 0, 0, 0])
  });
  assert.throws(() => validate(withAccounts), /must not reference accounts/i);

  const unsupported = parsed();
  unsupported.instructions.unshift({
    programIdIndex: 7,
    accountIndexes: [],
    data: new Uint8Array([99])
  });
  assert.throws(() => validate(unsupported), /unsupported Compute Budget instruction/i);
});

test("binds Jupiter minimum output to the route instruction slippage floor", () => {
  assert.equal(validate(parsed(), { otherAmountThreshold: "945" }).ok, true);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "944" }), /weaker than the route slippage limit/i);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "951" }), /weaker than the route slippage limit/i);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "0" }), /positive integer string/i);
});


test("accepts structurally connected multi-hop and split Jupiter routes", () => {
  const multihop = routePlanData([
    { inputIndex: 0, outputIndex: 1 },
    { inputIndex: 1, outputIndex: 2 }
  ]);
  assert.equal(decodeJupiterV6Route(multihop).steps.length, 2);
  assert.equal(validate(parsed({ data: multihop })).ok, true);

  // Two branches of the source: one arrives directly at the terminal,
  // the other passes through an intermediate token before arriving.
  const split = routePlanData([
    { inputIndex: 0, outputIndex: 1, percent: 40 },
    { inputIndex: 0, outputIndex: 3, percent: 60 },
    { inputIndex: 1, outputIndex: 3, percent: 100 }
  ]);
  assert.equal(decodeJupiterV6Route(split).steps.length, 3);
  assert.equal(validate(parsed({ data: split })).ok, true);
});

test("rejects disconnected Jupiter route-plan inputs even when each split totals 100%", () => {
  // The 0→3 path is valid, but the 1→2→3 branch has no producer for
  // token index 1. The old structural decoder incorrectly accepted it.
  const injectedBranch = routePlanData([
    { inputIndex: 0, outputIndex: 3, percent: 100 },
    { inputIndex: 1, outputIndex: 2, percent: 100 },
    { inputIndex: 2, outputIndex: 3, percent: 100 }
  ]);
  assert.throws(() => decodeJupiterV6Route(injectedBranch), /unreachable intermediate input/i);
  assert.throws(() => validate(parsed({ data: injectedBranch })), /unreachable intermediate input/i);

  // More than one incoming edge does not make an unproduced source valid.
  const isolatedSource = routePlanData([
    { inputIndex: 0, outputIndex: 3, percent: 100 },
    { inputIndex: 2, outputIndex: 3, percent: 50 },
    { inputIndex: 2, outputIndex: 3, percent: 50 }
  ]);
  assert.throws(() => decodeJupiterV6Route(isolatedSource), /unreachable intermediate input/i);
});

test("rejects orphaned Jupiter intermediate output even with a valid final-output edge", () => {
  // 25% of token 0 flows to index 1, where no step consumes it.
  // The remaining 75% reaches terminal index 3, so the old
  // 'has source and terminal' check incorrectly accepted the plan.
  const abandonedBranch = routePlanData([
    { inputIndex: 0, outputIndex: 1, percent: 25 },
    { inputIndex: 0, outputIndex: 3, percent: 35 },
    { inputIndex: 0, outputIndex: 3, percent: 40 }
  ]);
  assert.throws(() => decodeJupiterV6Route(abandonedBranch), /unconsumed intermediate output/i);
  assert.throws(() => validate(parsed({ data: abandonedBranch })), /unconsumed intermediate output/i);

  // A connected route can still have one unused branch: fail closed.
  const dangling = routePlanData([
    { inputIndex: 0, outputIndex: 1, percent: 50 },
    { inputIndex: 0, outputIndex: 2, percent: 50 },
    { inputIndex: 1, outputIndex: 3, percent: 100 }
  ]);
  assert.throws(() => decodeJupiterV6Route(dangling), /unconsumed intermediate output/i);
});
