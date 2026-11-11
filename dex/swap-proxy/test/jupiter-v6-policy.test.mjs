import test from "node:test";
import assert from "node:assert/strict";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { validateJupiterV6Transaction, decodeJupiterV6Route, JUPITER_V6_PROGRAM_ID, JUPITER_V6_EVENT_AUTHORITY, TOKEN_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";

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
  const payload = variant === 17 ? [1] : [];
  return new Uint8Array([...discriminator, ...u32(1), variant, ...payload, percent, inputIndex, outputIndex, ...u64(inAmount), ...u64(outAmount), ...u16(slippage), fee]);
}
function parsed({ data = routeData(), extraProgram = false, takerKey = taker, outMint = outputMint, requiredSignatures = 1 } = {}) {
  const unknownProgram = encodeBase58(new Uint8Array(32).fill(23));
  const keys = [takerKey, source, destination, TOKEN_PROGRAM_ID, outMint, JUPITER_V6_PROGRAM_ID, JUPITER_V6_EVENT_AUTHORITY, raydium, compute, unknownProgram];
  const instructions = [{ programIdIndex: 5, accountIndexes: [3, 0, 1, 2, 5, 4, 5, 6, 5, 7], data }];
  if (extraProgram) instructions.push({ programIdIndex: 9, accountIndexes: [], data: new Uint8Array([99]) });
  return {
    staticAccountKeys: keys.map(decodeBase58),
    requiredSignatures,
    readonlySignedAccounts: 0,
    readonlyUnsignedAccounts: 7,
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
  // SolFi enum 61 has no matching CPI instruction/account schema in the pinned Jupiter CPI interface.
  assert.throws(() => decodeJupiterV6Route(routeData({ variant: 61 })), /unsupported DEX variant/);
  const invalidWhirlpoolDirection = routeData({ variant: 17 });
  invalidWhirlpoolDirection[13] = 2;
  assert.throws(() => decodeJupiterV6Route(invalidWhirlpoolDirection), /invalid boolean variant payload/);
});

test("rejects wrong taker, output mint, amounts, fee and excessive slippage", () => {
  assert.throws(() => validate(parsed({ takerKey: source })), /account roles/);
  assert.throws(() => validate(parsed({ outMint: source })), /account roles/);
  assert.throws(() => validate(parsed({ data: routeData({ inAmount: 1001 }) })), /amounts do not match/);
  assert.throws(() => validate(parsed({ data: routeData({ fee: 1 }) })), /platform fees/);
  assert.throws(() => validate(parsed({ data: routeData({ slippage: 501 }) })), /5% safety cap/);
});


test("accepts a connected topologically ordered split route DAG", () => {
  const splitRoute = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(4),
    7, 50, 0, 1,
    7, 50, 0, 2,
    7, 100, 1, 4,
    7, 100, 2, 4,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  const decoded = decodeJupiterV6Route(splitRoute);
  assert.equal(decoded.steps.length, 4);
  assert.equal(decoded.steps.at(-1).outputIndex, 4);
});

test("rejects route DAG inputs without an earlier producer and dead-end branches", () => {
  const phantomIntermediate = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(2),
    7, 100, 0, 2,
    7, 100, 1, 2,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  assert.throws(() => decodeJupiterV6Route(phantomIntermediate), /produced by an earlier/i);

  const deadEnd = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(2),
    7, 50, 0, 1,
    7, 50, 0, 2,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  assert.throws(() => decodeJupiterV6Route(deadEnd), /dead-end branch/i);
});

test("rejects invalid split percentages, route indexes and missing DEX program accounts", () => {
  assert.throws(() => decodeJupiterV6Route(routeData({ percent: 99 })), /total 100/);
  assert.throws(() => decodeJupiterV6Route(routeData({ inputIndex: 1, outputIndex: 1 })), /token index/);
  const p = parsed();
  p.staticAccountKeys[7] = decodeBase58(compute);
  assert.throws(() => validate(p), /missing its approved DEX program/);
});


test("requires the canonical Jupiter event authority and program fixed accounts before DEX remaining accounts", () => {
  const wrongEventAuthority = parsed();
  wrongEventAuthority.staticAccountKeys[6] = decodeBase58(source);
  assert.throws(() => validate(wrongEventAuthority), /event authority and program/i);

  const wrongProgram = parsed();
  wrongProgram.instructions[0].accountIndexes[8] = 8;
  assert.throws(() => validate(wrongProgram), /event authority and program/i);

  const missingFixedAccounts = parsed();
  missingFixedAccounts.instructions[0].accountIndexes = missingFixedAccounts.instructions[0].accountIndexes.slice(0, 8);
  assert.throws(() => validate(missingFixedAccounts), /missing required fixed or DEX accounts/i);

  const writableEventAuthority = parsed();
  writableEventAuthority.readonlyUnsignedAccounts = 6;
  assert.throws(() => validate(writableEventAuthority), /signer\/writable privileges/i);
});

test("rejects a writable duplicate alias of an approved DEX program account", () => {
  const p = parsed();
  p.instructions[0].accountIndexes.push(10);
  assert.throws(() => validate(p, { loadedWritable: [raydium] }), /DEX program accounts must be readonly/);
});

test("rejects unexpected writable privileges on route authority and fee placeholders", () => {
  const p = parsed();
  p.readonlyUnsignedAccounts = 4;
  assert.throws(() => validate(p), /signer\/writable privileges/);
});

test("rejects Compute Budget instructions that carry account metas or unsupported opcodes", () => {
  const withAccounts = parsed();
  withAccounts.instructions.unshift({
    programIdIndex: 8,
    accountIndexes: [1],
    data: new Uint8Array([2, 1, 0, 0, 0])
  });
  assert.throws(() => validate(withAccounts), /must not reference accounts/i);

  const unsupported = parsed();
  unsupported.instructions.unshift({
    programIdIndex: 8,
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
