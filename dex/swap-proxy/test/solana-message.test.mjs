import test from "node:test";
import assert from "node:assert/strict";
import { decodeSolanaTransaction, hashSolanaMessage, reconstructAccountMetas, decodeAddressLookupTableAccount } from "../src/solana-message.mjs";

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
test("rejects malformed base64, truncated transactions, and zero signatures", () => {
  assert.throws(() => decodeSolanaTransaction("not base64!"), /Invalid transaction base64/);
  assert.throws(() => decodeSolanaTransaction("AQI="), /Truncated|Invalid/);
  const noSignatures = Buffer.from(fixture());
  noSignatures[0] = 0;
  assert.throws(() => decodeSolanaTransaction(noSignatures.toString("base64")), /signature count/);
});
test("rejects trailing bytes instead of silently accepting a different wire message", () => {
  assert.throws(() => decodeSolanaTransaction(fixture({ trailing: [99] })), /trailing transaction bytes/);
});
test("rejects instruction program indexes outside the full account range", () => {
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


test("reconstructs canonical static and ALT writable-then-readonly account ordering", () => {
  const key = n => Uint8Array.from({ length: 32 }, () => n);
  const parsed = {
    staticAccountKeys: [key(1), key(2), key(3)],
    requiredSignatures: 1, readonlySigned: 0, readonlyUnsigned: 1,
    addressTableLookups: [
      { accountKey: key(10), writableIndexes: [0], readonlyIndexes: [1] },
      { accountKey: key(11), writableIndexes: [1], readonlyIndexes: [0] }
    ],
    totalKeyCount: 7,
    instructions: [{ programIdIndex: 6, accountIndexes: [0, 3, 4, 5], data: Uint8Array.of(1) }]
  };
  const tables = [
    { accountKey: key(10), addresses: [key(20), key(21)] },
    { accountKey: key(11), addresses: [key(22), key(23)] }
  ];
  const resolved = reconstructAccountMetas(parsed, tables);
  assert.deepEqual(resolved.metas.map(x => x.key.slice(0, 2)), ["01", "02", "03", "14", "17", "15", "16"]);
  assert.deepEqual(resolved.metas.map(x => x.writable), [true, true, false, true, true, false, false]);
  assert.equal(resolved.instructions[0].program.key, resolved.metas[6].key);
});

test("fails closed on missing, mismatched, duplicated or out-of-bounds ALT data", () => {
  const key = n => Uint8Array.from({ length: 32 }, () => n);
  const parsed = {
    staticAccountKeys: [key(1)], requiredSignatures: 1, readonlySigned: 0, readonlyUnsigned: 0,
    addressTableLookups: [{ accountKey: key(10), writableIndexes: [0], readonlyIndexes: [1] }],
    totalKeyCount: 3, instructions: []
  };
  assert.throws(() => reconstructAccountMetas(parsed), /trusted resolution/);
  assert.throws(() => reconstructAccountMetas(parsed, [{ accountKey: key(11), addresses: [key(20), key(21)] }]), /identity mismatch/);
  assert.throws(() => reconstructAccountMetas(parsed, [{ accountKey: key(10), addresses: [key(20)] }]), /lookup table index/);
  assert.throws(() => reconstructAccountMetas({ ...parsed, addressTableLookups: [{ ...parsed.addressTableLookups[0], readonlyIndexes: [0] }] }, [{ accountKey: key(10), addresses: [key(20), key(21)] }]), /duplicated lookup table index/);
  assert.throws(() => reconstructAccountMetas(parsed, [{ accountKey: key(10), addresses: [key(1), key(21)] }]), /Duplicate resolved account/);
});


test("accepts an instruction program ID loaded from a v0 readonly ALT", () => {
  const bytes = [
    ...shortVec(1), ...new Array(64).fill(5),
    0x80, 1, 0, 0,
    ...shortVec(1), ...new Array(32).fill(1), ...new Array(32).fill(2),
    1, 1, 0, 0,
    ...shortVec(1), ...new Array(32).fill(9),
    0, 1, 0
  ];
  const parsed = decodeSolanaTransaction(Buffer.from(bytes).toString("base64"));
  assert.equal(parsed.totalKeyCount, 2);
  assert.equal(parsed.instructions[0].programIdIndex, 1);
  const resolved = reconstructAccountMetas(parsed, [{
    accountKey: Uint8Array.from({ length: 32 }, () => 9),
    addresses: [Uint8Array.from({ length: 32 }, () => 7)]
  }]);
  assert.equal(resolved.instructions[0].program.key, "07".repeat(32));
  assert.equal(resolved.instructions[0].program.writable, false);
  assert.equal(resolved.instructions[0].program.signer, false);
});


test("decodes active lookup-table account data with owner and RPC slot checks", () => {
  const owner = "AddressLookupTab1e1111111111111111111111111";
  const data = new Uint8Array(56 + 2 * 32);
  const view = new DataView(data.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, 0xffffffffffffffffn, true);
  view.setBigUint64(12, 100n, true);
  data[20] = 1;
  data[21] = 0;
  data.set(new Uint8Array(32).fill(8), 56);
  data.set(new Uint8Array(32).fill(9), 88);
  const table = decodeAddressLookupTableAccount({ data, owner, executable: false, contextSlot: 101 });
  assert.equal(table.addresses.length, 2);
  assert.equal(table.lastExtendedSlot, "100");
  assert.equal(table.authority, null);
  assert.equal(table.addresses[1][0], 9);
});

test("rejects untrusted, malformed, deactivated and not-yet-warmed lookup tables", () => {
  const owner = "AddressLookupTab1e1111111111111111111111111";
  const data = new Uint8Array(56 + 32);
  const view = new DataView(data.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, 0xffffffffffffffffn, true);
  view.setBigUint64(12, 100n, true);
  data[20] = 1;
  assert.throws(() => decodeAddressLookupTableAccount({ data, owner: "11111111111111111111111111111111", contextSlot: 101 }), /unexpected owner/);
  assert.throws(() => decodeAddressLookupTableAccount({ data, owner, executable: true, contextSlot: 101 }), /must not be executable/);
  assert.throws(() => decodeAddressLookupTableAccount({ data, owner, contextSlot: 100 }), /not active until a later slot/);
  const inactive = data.slice();
  new DataView(inactive.buffer).setBigUint64(4, 99n, true);
  assert.throws(() => decodeAddressLookupTableAccount({ data: inactive, owner, contextSlot: 101 }), /Deactivated/);
  const badPadding = data.slice(); badPadding[55] = 1;
  assert.throws(() => decodeAddressLookupTableAccount({ data: badPadding, owner, contextSlot: 101 }), /padding/);
  assert.throws(() => decodeAddressLookupTableAccount({ data: data.slice(0, 55), owner, contextSlot: 101 }), /data length/);
});
