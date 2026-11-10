import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { webcrypto } from "node:crypto";
import { parseSolanaV0Transaction, validateSignedOrderTransaction } from "../src/transaction-validation.mjs";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(input) {
  const bytes = [...input];
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let encoded = "1".repeat(zeros);
  if (!(digits.length === 1 && digits[0] === 0)) {
    for (let i = digits.length - 1; i >= 0; i--) encoded += ALPHABET[digits[i]];
  }
  return encoded;
}
function shortVec(value) {
  const out = [];
  let remaining = value;
  while (remaining >= 0x80) {
    out.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }
  out.push(remaining);
  return out;
}
function rawPublicKey(key) {
  return new Uint8Array(key.export({ format: "der", type: "spki" }).subarray(-32));
}
function makeFixture(requiredSigners = 2) {
  const taker = generateKeyPairSync("ed25519");
  const additional = generateKeyPairSync("ed25519");
  const takerBytes = rawPublicKey(taker.publicKey);
  const additionalBytes = rawPublicKey(additional.publicKey);
  const program = new Uint8Array(32); program[31] = 9;
  const keys = requiredSigners === 2 ? [takerBytes, additionalBytes, program] : [takerBytes, program];
  const header = [requiredSigners, 0, 1];
  const instruction = [keys.length - 1, ...shortVec(requiredSigners), ...Array.from({ length: requiredSigners }, (_, i) => i), ...shortVec(2), 1, 2];
  const message = Uint8Array.from([
    0x80, ...header, ...shortVec(keys.length), ...keys.flatMap(k => [...k]),
    ...new Uint8Array(32).fill(7), ...shortVec(1), ...instruction, ...shortVec(0)
  ]);
  const zeroSignatures = Array.from({ length: requiredSigners }, () => new Uint8Array(64));
  const original = Uint8Array.from([...shortVec(requiredSigners), ...zeroSignatures.flatMap(s => [...s]), ...message]);
  const takerSignature = new Uint8Array(sign(null, Buffer.from(message), taker.privateKey));
  const signedSlots = [takerSignature, ...zeroSignatures.slice(1)];
  const signed = Uint8Array.from([...shortVec(requiredSigners), ...signedSlots.flatMap(s => [...s]), ...message]);
  return {
    taker: base58Encode(takerBytes),
    original: Buffer.from(original).toString("base64"),
    signed: Buffer.from(signed).toString("base64"),
    message,
    takerSignature,
    signedSlots,
    keys
  };
}

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
  changedMessage[changedMessage.length - 1] ^= 1;
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
  const other = generateKeyPairSync("ed25519");
  const wrongTaker = base58Encode(rawPublicKey(other.publicKey));
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
