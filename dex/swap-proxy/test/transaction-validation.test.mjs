import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { parseSolanaV0Transaction, validateSignedOrderTransaction, validateJupiterOrderMetadata } from "../src/transaction-validation.mjs";
import { makeFixture, shortVec } from "./solana-v0-fixture.mjs";

test("accepts only a well-formed Metis v0 non-gasless order with exact input and minimum output", () => {
  assert.equal(validateJupiterOrderMetadata({
    router: "metis",
    transactionVersion: 0,
    gasless: false,
    inAmount: "1000",
    outAmount: "950",
    otherAmountThreshold: "900",
    routePlan: [{ swapInfo: { label: "Raydium" } }]
  }, { taker: "Taker111111111111111111111111111111111", amount: "1000" }), true);
});

test("rejects non-Metis routers, v1, gasless and external fee payers", () => {
  const base = { router: "metis", transactionVersion: 0, gasless: false, inAmount: "1000", outAmount: "950", otherAmountThreshold: "900", routePlan: [{ swapInfo: { label: "Raydium" } }] };
  for (const patch of [
    { router: "jupiterz" }, { router: "dflow" }, { router: "okx" },
    { transactionVersion: 1 }, { gasless: true },
    { signatureFeePayer: "DifferentFeePayer1111111111111111111111111111" }
  ]) {
    assert.throws(() => validateJupiterOrderMetadata({ ...base, ...patch }, { taker: "Taker111111111111111111111111111111111", amount: "1000" }));
  }
});

test("rejects input mismatch, missing route labels and unsafe minimum-output amounts", () => {
  const base = { router: "metis", transactionVersion: 0, gasless: false, inAmount: "1000", outAmount: "950", otherAmountThreshold: "900", routePlan: [{ swapInfo: { label: "Raydium" } }] };
  assert.throws(() => validateJupiterOrderMetadata(base, { taker: "Taker111111111111111111111111111111111", amount: "1001" }), /input amount/i);
  assert.throws(() => validateJupiterOrderMetadata({ ...base, routePlan: [] }, { taker: "Taker111111111111111111111111111111111", amount: "1000" }), /route plan/i);
  assert.throws(() => validateJupiterOrderMetadata({ ...base, otherAmountThreshold: "951" }, { taker: "Taker111111111111111111111111111111111", amount: "1000" }), /minimum output/i);
  assert.throws(() => validateJupiterOrderMetadata({ ...base, outAmount: "0" }, { taker: "Taker111111111111111111111111111111111", amount: "1000" }), /positive integer/i);
});

test("retains compiled instruction bytes and v0 address lookup indexes for review", () => {
  const short = value => Array.from(shortVec(value));
  const key = n => new Uint8Array(32).fill(n);
  const message = [
    0x80, 1, 0, 0,
    ...short(2), ...key(1), ...key(2),
    ...key(3),
    ...short(1), 1, ...short(1), 2, ...short(2), 7, 8,
    ...short(1), ...key(4), ...short(1), 0, ...short(1), 1
  ];
  const transaction = Buffer.from([...short(1), ...new Uint8Array(64), ...message]).toString("base64");
  const parsed = parseSolanaV0Transaction(transaction);
  assert.equal(parsed.instructions.length, 1);
  assert.deepEqual(Array.from(parsed.instructions[0].data), [7, 8]);
  assert.equal(parsed.addressTableLookups.length, 1);
  assert.deepEqual(parsed.addressTableLookups[0].writableIndexes, [0]);
  assert.deepEqual(parsed.addressTableLookups[0].readonlyIndexes, [1]);
});

test("parses a canonical v0 transaction and resolves its fee payer static key", () => {
  const fixture = makeFixture();
  const parsed = parseSolanaV0Transaction(fixture.original);
  assert.equal(parsed.requiredSignatures, 2);
  assert.equal(parsed.staticAccountKeys.length, 3);
  assert.deepEqual(parsed.message, fixture.message);
});

test("accepts the taker signature while preserving JupiterZ additional signer slot", async () => {
  const fixture = makeFixture(2);
  const result = await validateSignedOrderTransaction({
    originalTransaction: fixture.original,
    signedTransaction: fixture.signed,
    taker: fixture.taker,
    cryptoApi: webcrypto
  });
  assert.deepEqual(result, { ok: true });
});

test("rejects a signed message that differs from the stored Jupiter order", async () => {
  const fixture = makeFixture();
  const changedMessage = fixture.message.slice();
  changedMessage[changedMessage.length - 2] ^= 1;
  const tampered = Buffer.from([
    ...shortVec(2), ...fixture.signedSlots.flatMap(s => [...s]), ...changedMessage
  ]).toString("base64");
  const result = await validateSignedOrderTransaction({
    originalTransaction: fixture.original, signedTransaction: tampered,
    taker: fixture.taker, cryptoApi: webcrypto
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /message differs/i);
});

test("rejects a transaction signed by a different wallet", async () => {
  const fixture = makeFixture();
  const other = makeFixture(1);
  const wrongTaker = other.taker;
  const result = await validateSignedOrderTransaction({
    originalTransaction: fixture.original, signedTransaction: fixture.signed,
    taker: wrongTaker, cryptoApi: webcrypto
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /fee payer does not match/i);
});

test("rejects an invalid taker signature", async () => {
  const fixture = makeFixture();
  const badSlots = fixture.signedSlots.map(s => s.slice());
  badSlots[0][0] ^= 1;
  const invalid = Buffer.from([
    ...shortVec(2), ...badSlots.flatMap(s => [...s]), ...fixture.message
  ]).toString("base64");
  const result = await validateSignedOrderTransaction({
    originalTransaction: fixture.original, signedTransaction: invalid,
    taker: fixture.taker, cryptoApi: webcrypto
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /signature is invalid/i);
});

test("rejects a modified JupiterZ additional signature slot", async () => {
  const fixture = makeFixture(2);
  const changedSlots = fixture.signedSlots.map(s => s.slice());
  changedSlots[1][0] = 1;
  const altered = Buffer.from([
    ...shortVec(2), ...changedSlots.flatMap(s => [...s]), ...fixture.message
  ]).toString("base64");
  const result = await validateSignedOrderTransaction({
    originalTransaction: fixture.original, signedTransaction: altered,
    taker: fixture.taker, cryptoApi: webcrypto
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /additional signer signature change/i);
});

test("rejects a read-only fee payer in the Solana message header", () => {
  const fixture = makeFixture(2);
  const bytes = Buffer.from(fixture.original, "base64");
  const messageStart = 1 + 2 * 64;
  bytes[messageStart + 2] = 2; // numReadonlySignedAccounts includes the fee payer
  assert.throws(() => parseSolanaV0Transaction(bytes.toString("base64")), /signature header is inconsistent/i);
});

test("rejects non-v0, truncated, trailing-byte and non-canonical base64 transactions", () => {
  const fixture = makeFixture();
  const versionOne = Buffer.from(Buffer.from(fixture.original, "base64"));
  const signatureCount = versionOne[0];
  versionOne[1 + signatureCount * 64] = 0x81;
  assert.throws(() => parseSolanaV0Transaction(versionOne.toString("base64")), /only Solana v0/i);
  assert.throws(() => parseSolanaV0Transaction(Buffer.from(fixture.original, "base64").subarray(0, 40).toString("base64")), /truncated/i);
  assert.throws(() => parseSolanaV0Transaction(Buffer.from([...Buffer.from(fixture.original, "base64"), 0]).toString("base64")), /trailing/i);
  assert.throws(() => parseSolanaV0Transaction(fixture.original + " "), /canonical base64/i);
});

test("rejects noncanonical or oversized Jupiter output and minimum u64 amounts before BigInt", () => {
  const base = {
    router: "metis", transactionVersion: 0, gasless: false,
    inAmount: "1000", outAmount: "950", otherAmountThreshold: "900",
    routePlan: [{ swapInfo: { label: "Raydium" } }]
  };
  const options = { taker: "Taker111111111111111111111111111111111", amount: "1000" };
  const invalid = [
    "18446744073709551616", // u64 max + 1
    "9".repeat(250000), // never parse provider-supplied oversized BigInt
    "00", "01", "0", "-1", "1e6", "1.0", " 1", "1 ", 0, null
  ];
  for (const value of invalid) {
    for (const field of ["outAmount", "otherAmountThreshold"]) {
      assert.throws(
        () => validateJupiterOrderMetadata({ ...base, [field]: value }, options),
        /positive integer strings within u64/,
        `${field} must be a canonical positive u64`
      );
    }
  }
  const largest = "18446744073709551615";
  assert.equal(validateJupiterOrderMetadata({
    ...base, outAmount: largest, otherAmountThreshold: largest
  }, options), true, "Maximum on-chain u64 value is structurally representable");
  assert.throws(
    () => validateJupiterOrderMetadata({ ...base, otherAmountThreshold: largest }, options),
    /minimum output cannot exceed/,
    "A representable u64 threshold must still respect quoted output"
  );
});

test("rejects invalid requested u64 input amounts and mismatched provider echoes", () => {
  const base = {
    router: "metis", transactionVersion: 0, gasless: false,
    inAmount: "1000", outAmount: "950", otherAmountThreshold: "900",
    routePlan: [{ swapInfo: { label: "Raydium" } }]
  };
  for (const amount of ["0", "01", "18446744073709551616", "9".repeat(250000), 1000, undefined]) {
    assert.throws(
      () => validateJupiterOrderMetadata({ ...base, inAmount: amount }, {
        taker: "Taker111111111111111111111111111111111", amount
      }),
      /input amount/,
      "A matching invalid provider echo must not turn an impossible input into a valid order"
    );
  }
  assert.throws(() => validateJupiterOrderMetadata(base, {
    taker: "Taker111111111111111111111111111111111", amount: "1001"
  }), /input amount/);
});

test("rejects over-16-hop provider route metadata while retaining supported bounded plans", () => {
  const base = {
    router: "metis", transactionVersion: 0, gasless: false,
    inAmount: "1000", outAmount: "950", otherAmountThreshold: "900",
    routePlan: [{ swapInfo: { label: "Raydium" } }]
  };
  const options = { taker: "Taker111111111111111111111111111111111", amount: "1000" };
  assert.equal(validateJupiterOrderMetadata({
    ...base, routePlan: Array.from({ length: 16 }, () => ({ swapInfo: { label: "Raydium" } }))
  }, options), true);
  assert.throws(() => validateJupiterOrderMetadata({
    ...base, routePlan: Array.from({ length: 17 }, () => ({ swapInfo: { label: "Raydium" } }))
  }, options), /exceeds 16 hops/);
});
