import test from "node:test";
import assert from "node:assert/strict";
import { resolveAddressLookupTables } from "../src/solana-rpc.mjs";

const key = value => new Uint8Array(32).fill(value);
const OWNER = "AddressLookupTab1e1111111111111111111111111";
function lookupData() {
  const data = new Uint8Array(56 + 32);
  const view = new DataView(data.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, 0xffffffffffffffffn, true);
  view.setBigUint64(12, 0n, true);
  data[20] = 0;
  data[21] = 0;
  data.set(key(42), 56);
  return Buffer.from(data).toString("base64");
}
function parsed() {
  return { addressTableLookups: [{ accountKey: key(6), writableIndexes: [0], readonlyIndexes: [] }] };
}
function rpcResponse(value, slot = 101) {
  return new Response(JSON.stringify({
    jsonrpc: "2.0", id: "climboria-alt-resolution",
    result: { context: { slot }, value }
  }), { status: 200, headers: { "content-type": "application/json" } });
}
function account(overrides = {}) {
  return { owner: OWNER, executable: false, data: [lookupData(), "base64"], ...overrides };
}

test("fetches ALT by message key and binds account bytes, owner and context from one RPC response", async () => {
  let request;
  const tables = await resolveAddressLookupTables(parsed(), {
    rpcUrl: "https://rpc.example.com",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return rpcResponse([account()]);
    }
  });
  assert.equal(request.url, "https://rpc.example.com/");
  assert.equal(request.body.method, "getMultipleAccounts");
  assert.equal(request.init.redirect, "error");
  assert.equal(request.body.params[0].length, 1);
  assert.equal(request.body.params[1].encoding, "base64");
  assert.equal(tables.length, 1);
  assert.equal(tables[0].accountKey[0], 6);
  assert.equal(tables[0].addresses[0][0], 42);
  assert.equal(tables[0].contextSlot, 101);
});

test("uses confirmed commitment and forwards an optional minimum context slot", async () => {
  let config;
  await resolveAddressLookupTables(parsed(), {
    rpcUrl: "https://rpc.example.com",
    minContextSlot: 90,
    fetchImpl: async (_url, init) => {
      config = JSON.parse(init.body).params[1];
      return rpcResponse([account()], 101);
    }
  });
  assert.equal(config.commitment, "confirmed");
  assert.equal(config.minContextSlot, 90);
});

test("rejects missing configuration and non-public or non-HTTPS RPC endpoints", async () => {
  await assert.rejects(resolveAddressLookupTables(parsed()), /valid URL/);
  for (const rpcUrl of ["http://rpc.example.com", "https://localhost", "https://127.0.0.1", "https://192.168.1.5", "https://10.0.0.2", "https://user:pass@rpc.example.com"]) {
    await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl }), /public HTTPS/);
  }
});

test("rejects duplicate lookup table keys before making an RPC request", async () => {
  const duplicate = parsed();
  duplicate.addressTableLookups.push({ ...duplicate.addressTableLookups[0] });
  let called = false;
  await assert.rejects(resolveAddressLookupTables(duplicate, {
    rpcUrl: "https://rpc.example.com",
    fetchImpl: async () => { called = true; return rpcResponse([]); }
  }), /Duplicate address lookup table/);
  assert.equal(called, false);
});

test("rejects failed, malformed, mismatched and underspecified RPC responses", async () => {
  const rpcUrl = "https://rpc.example.com";
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => new Response("{}", { status: 503 }) }), /request failed/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => new Response("{", { status: 200 }) }), /invalid JSON/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => new Response(" ".repeat(128 * 1024 + 1), { status: 200 }) }), /exceeded size limit/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([account()], 89), minContextSlot: 90 }), /context or account count/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([]) }), /context or account count/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([account({ owner: "11111111111111111111111111111111" })]) }), /unexpected owner/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([account({ executable: true })]) }), /must not be executable/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([account({ data: ["%%%=", "base64"] })]) }), /invalid base64/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl, fetchImpl: async () => rpcResponse([{ owner: OWNER, executable: false, data: [lookupData()] }]) }), /incomplete lookup table/);
});

test("rejects invalid commitment and minimum context slot values", async () => {
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl: "https://rpc.example.com", commitment: "processed" }), /confirmed or finalized/);
  await assert.rejects(resolveAddressLookupTables(parsed(), { rpcUrl: "https://rpc.example.com", minContextSlot: -1 }), /minimum RPC context slot/);
});
