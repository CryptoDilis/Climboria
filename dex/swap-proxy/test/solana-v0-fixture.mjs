import { generateKeyPairSync, sign } from "node:crypto";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Encode(input) {
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

export function shortVec(value) {
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

export function makeFixture(requiredSigners = 2) {
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
