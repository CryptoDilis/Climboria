import test from "node:test";
import assert from "node:assert/strict";
import { decodeSolanaTransaction, hashSolanaMessage } from "../src/solana-message.mjs";

function shortVec(value) {
  const out = [];
  do { let byte = value & 0x7f; value >>>= 7; if (value) byte |= 0x80; out.push(byte); } while (value);
  return out;
}
function fixture({ version = 0, programIndex = null, accountIndex = null, trailing = [] } = {}) {
  const bytes = [...shortVec(1), ...new Array(64).fill(7)];
  if (version === 0) bytes.push(0x80, 1, 0, 0);
  else bytes.push(1, 0, 0);
  bytes.push(...shortVec(1), ...new Array(32).fill(9), ...new Array(32).fill(3));
  if (programIndex === null) bytes.push(0);
  else bytes.push(1, programIndex, ...shortVec(1), accountIndex, ...shortVec(1), 1);
  if (version === 0) bytes.push(0);
  bytes.push(...trailing);
  return Buffer.from(bytes).toString("base64");
}

test("decodes a structurally valid v0 transaction", () => {
  const parsed = decodeSolanaTransaction(fixture());
  assert.equal(parsed.version, 0);
  assert.equal(parsed.requiredSignatures, 1);
  assert.equal(parsed.staticAccountKeys.length, 1);
  assert.equal(parsed.instructions.length, 0);
  assert.equal(parsed.totalKeyCount, 1);
});
test("decodes a structurally valid legacy transaction", () => {
  const parsed = decodeSolanaTransaction(fixture({ version: "legacy" }));
  assert.equal(parsed.version, "legacy");
  assert.equal(parsed.requiredSignatures, 1);
});
test("rejects unsupported message versions", () => {
  const bytes = Buffer.from(fixture());
  bytes[65] = 0x81;
  assert.throws(() => decodeSolanaTransaction(bytes.toString("base64")), /Unsupported Solana message version/);
});
test("rejects malformed base64 and truncated transactions", () => {
  assert.throws(() => decodeSolanaTransaction("not base64!"), /Invalid transaction base64/);
  assert.throws(() => decodeSolanaTransaction("AQI="), /Truncated|Invalid/);
});
test("rejects trailing bytes instead of silently accepting a different wire message", () => {
  assert.throws(() => decodeSolanaTransaction(fixture({ trailing: [99] })), /trailing transaction bytes/);
});
test("rejects instruction program indexes outside static account keys", () => {
  assert.throws(() => decodeSolanaTransaction(fixture({ programIndex: 1, accountIndex: 0 })), /program index/);
});
test("rejects instruction account indexes outside the combined key range", () => {
  assert.throws(() => decodeSolanaTransaction(fixture({ programIndex: 0, accountIndex: 1 })), /account index/);
});
test("hashes the exact serialized message, excluding signatures", async () => {
  const tx = fixture();
  const first = await hashSolanaMessage(tx);
  const bytes = Buffer.from(tx, "base64");
  bytes[1] ^= 1;
  assert.equal(await hashSolanaMessage(bytes.toString("base64")), first);
});
