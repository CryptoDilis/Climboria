import test from "node:test";
import assert from "node:assert/strict";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { validateJupiterV6Transaction, decodeJupiterV6Route, JUPITER_V6_PROGRAM_ID, TOKEN_PROGRAM_ID, UNSUPPORTED_TOKEN_2022_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";

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
  // Wrong-role negative cases must NOT also duplicate another key: test
  // role validation independently from the new duplicate-key safety gate.
  const unrelatedMint = encodeBase58(new Uint8Array(32).fill(25));
  // Keep fee payer correct while substituting the route's transfer authority.
  const wrongAuthority = parsed();
  wrongAuthority.instructions[0].accountIndexes[1] = 1;
  assert.throws(() => validate(wrongAuthority), /account roles/);
  assert.throws(() => validate(parsed({ outMint: unrelatedMint })), /account roles/);
  assert.throws(() => validate(parsed({ data: routeData({ inAmount: 1001 }) })), /amounts do not match/);
  assert.throws(() => validate(parsed({ data: routeData({ fee: 1 }) })), /platform fees/);
  assert.throws(() => validate(parsed({ data: routeData({ slippage: 501 }) })), /5% safety cap/);
});

test("rejects invalid split percentages, route indexes and missing DEX program accounts", () => {
  assert.throws(() => decodeJupiterV6Route(routeData({ percent: 99 })), /total 100/);
  assert.throws(() => decodeJupiterV6Route(routeData({ inputIndex: 1, outputIndex: 1 })), /token index/);
  const p = parsed();
  p.staticAccountKeys[6] = decodeBase58(encodeBase58(new Uint8Array(32).fill(24)));
  assert.throws(() => validate(p), /missing its approved DEX program/);
});

test("rejects unexpected writable privileges on route authority and fee placeholders", () => {
  const p = parsed();
  p.readonlyUnsignedAccounts = 4;
  assert.throws(() => validate(p), /known executable program/i,
    "An executable token program must be readonly, even if an outer route also has writable role errors");

  // Isolate a writable output-mint privilege violation without turning any
  // known program into writable or duplicating a resolved pubkey.
  const outputMintWritableViaAlt = parsed();
  outputMintWritableViaAlt.staticAccountKeys[4] = decodeBase58(encodeBase58(new Uint8Array(32).fill(26)));
  outputMintWritableViaAlt.instructions[0].accountIndexes[5] = 9;
  assert.throws(
    () => validate(outputMintWritableViaAlt, { loadedWritable: [outputMint] }),
    /signer\/writable privileges/i
  );
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


test("rejects duplicate account pubkeys in resolved static keys and ALT entries", () => {
  const repeatedSourceAndDestination = parsed();
  repeatedSourceAndDestination.staticAccountKeys[2] = decodeBase58(source);
  assert.throws(
    () => validate(repeatedSourceAndDestination),
    /duplicate resolved account pubkeys/i,
    "A source/destination alias must never become a legitimate token-movement route"
  );

  const repeatedExecutableProgram = parsed();
  repeatedExecutableProgram.staticAccountKeys[8] = decodeBase58(raydium);
  assert.throws(
    () => validate(repeatedExecutableProgram),
    /duplicate resolved account pubkeys/i,
    "Duplicating a DEX executable pubkey can hide a later writable alias"
  );

  assert.throws(
    () => validate(parsed(), { loadedReadonly: [raydium] }),
    /duplicate resolved account pubkeys/i,
    "An ALT readonly key must not alias any existing static account key"
  );
  const other = encodeBase58(new Uint8Array(32).fill(24));
  assert.throws(
    () => validate(parsed(), { loadedWritable: [other], loadedReadonly: [other] }),
    /duplicate resolved account pubkeys/i,
    "Resolved ALT writable/readonly indexes must not alias each other"
  );
});

test("rejects executable program writable privileges even outside active route metas", () => {
  const whirlpool = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
  assert.throws(
    () => validate(parsed(), { loadedWritable: [whirlpool] }),
    /grants signer or writable privileges to a known executable program/i,
    "An approved but unused executable DEX program cannot be writable in ALT keys"
  );

  // Remove the static Raydium pubkey; reference the same program as a
  // resolved ALT writable account rather than merely duplicating it.
  const viaWritableAlt = parsed();
  viaWritableAlt.staticAccountKeys[6] = decodeBase58(encodeBase58(new Uint8Array(32).fill(25)));
  viaWritableAlt.instructions[0].accountIndexes[7] = 9;
  assert.throws(
    () => validate(viaWritableAlt, { loadedWritable: [raydium] }),
    /grants signer or writable privileges to a known executable program/i,
    "Moving a route's program meta to a writable ALT must be rejected"
  );
});

test("accepts a uniquely resolved readonly ALT DEX program without widening security policy", () => {
  const viaReadonlyAlt = parsed();
  viaReadonlyAlt.staticAccountKeys[6] = decodeBase58(encodeBase58(new Uint8Array(32).fill(25)));
  viaReadonlyAlt.instructions[0].accountIndexes[7] = 9;
  const accepted = validate(viaReadonlyAlt, { loadedReadonly: [raydium] });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.route.steps[0].dex, "Raydium");
  // This is only a mocked structural acceptance; CPI and asset flows are
  // still not proven, and signing/execute release gates remain hard-disabled.
});

test("rejects out-of-bounds ALT and static account indexes before any route acceptance", () => {
  const malicious = parsed();
  malicious.instructions[0].accountIndexes[7] = 255;
  assert.throws(() => validate(malicious), /account index is outside the resolved key list/i);
});


test("fee payer must match the requested taker, independent of route transfer-authority roles", () => {
  const differentPayer = encodeBase58(new Uint8Array(32).fill(24));
  const p = parsed({ takerKey: differentPayer });
  assert.throws(
    () => validate(p),
    /fee payer must match the requested taker/i,
    "Upstream transactions paid by a different wallet must not reach signable order storage"
  );
  assert.equal(validate().ok, true);
});

test("rejects Token-2022 program even when only an intermediate CPI account could use it", () => {
  const extraReadonly = parsed();
  extraReadonly.staticAccountKeys[8] = decodeBase58(UNSUPPORTED_TOKEN_2022_PROGRAM_ID);
  assert.throws(() => validate(extraReadonly), /Token-2022 program accounts are unsupported/i);

  const referencedReadonly = parsed();
  referencedReadonly.staticAccountKeys[8] = decodeBase58(UNSUPPORTED_TOKEN_2022_PROGRAM_ID);
  referencedReadonly.instructions[0].accountIndexes.push(8);
  assert.throws(() => validate(referencedReadonly), /Token-2022 program accounts are unsupported/i);

  assert.throws(
    () => validate(parsed(), { loadedReadonly: [UNSUPPORTED_TOKEN_2022_PROGRAM_ID] }),
    /Token-2022 program accounts are unsupported/i,
    "An unsupported token program cannot bypass the check by moving to an ALT"
  );
  assert.throws(
    () => validate(parsed(), { loadedWritable: [UNSUPPORTED_TOKEN_2022_PROGRAM_ID] }),
    /Token-2022 program accounts are unsupported/i
  );
});

test("rejects repeated Compute Budget price, limit or loaded-data settings", () => {
  const cases = [
    { name: "unit limit", bytes: [2, ...u32(250000)] },
    { name: "unit price", bytes: [3, ...u64(200)] },
    { name: "loaded-account data size", bytes: [4, ...u32(32768)] }
  ];
  for (const item of cases) {
    const p = parsed();
    const budget = () => ({
      programIdIndex: 7,
      accountIndexes: [],
      data: new Uint8Array(item.bytes)
    });
    p.instructions.unshift(budget(), budget());
    assert.throws(
      () => validate(p),
      /duplicate Compute Budget instruction type/i,
      `Two ${item.name} settings must be rejected before signing`
    );
  }
});

test("accepts distinct canonical Compute Budget settings once each", () => {
  const p = parsed();
  p.instructions.unshift(
    { programIdIndex: 7, accountIndexes: [], data: new Uint8Array([2, ...u32(250000)]) },
    { programIdIndex: 7, accountIndexes: [], data: new Uint8Array([3, ...u64(200)]) },
    { programIdIndex: 7, accountIndexes: [], data: new Uint8Array([4, ...u32(32768)]) }
  );
  assert.equal(validate(p).ok, true);
});


test("rejects fully connected but non-topologically ordered raw Jupiter V6 route plans", () => {
  // Jupiter IDL requires a topologically sorted trade DAG. A graph can be
  // connected and still be invalid if a hop consumes an intermediate token
  // before a prior step has produced it.
  const reversedTwoHop = routePlanData([
    { inputIndex: 1, outputIndex: 2, percent: 100 },
    { inputIndex: 0, outputIndex: 1, percent: 100 }
  ]);
  assert.throws(
    () => decodeJupiterV6Route(reversedTwoHop),
    /topologically sorted/i
  );
  assert.throws(
    () => validate(parsed({ data: reversedTwoHop })),
    /topologically sorted/i
  );

  // Split percentages, connectivity and terminal output are all valid,
  // but index 1 is referenced before its first producer is processed.
  const lateProducer = routePlanData([
    { inputIndex: 0, outputIndex: 3, percent: 55 },
    { inputIndex: 1, outputIndex: 3, percent: 100 },
    { inputIndex: 0, outputIndex: 1, percent: 45 }
  ]);
  assert.throws(
    () => decodeJupiterV6Route(lateProducer),
    /topologically sorted/i
  );
  assert.throws(
    () => validate(parsed({ data: lateProducer })),
    /topologically sorted/i
  );
});

test("accepts ordered branched Jupiter V6 route even when intermediate hops are interleaved", () => {
  const orderedBranch = routePlanData([
    { inputIndex: 0, outputIndex: 1, percent: 35 },
    { inputIndex: 0, outputIndex: 4, percent: 65 },
    { inputIndex: 1, outputIndex: 2, percent: 100 },
    { inputIndex: 2, outputIndex: 4, percent: 100 }
  ]);
  assert.equal(decodeJupiterV6Route(orderedBranch).steps.length, 4);
  assert.equal(validate(parsed({ data: orderedBranch })).ok, true);
});
