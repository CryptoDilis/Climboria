import test from "node:test";
import assert from "node:assert/strict";
import { resolveTransactionLookups, verifyJupiterTokenAccounts } from "../src/solana-rpc.mjs";
import { decodeBase58 } from "../src/transaction-validation.mjs";
import { ADDRESS_LOOKUP_TABLE_PROGRAM_ID } from "../src/alt-resolution.mjs";

const tableKey = "AddressLookupTab1e1111111111111111111111111";
const ACTIVE = (1n << 64n) - 1n;
const key = n => new Uint8Array(32).fill(n);
function accountData() {
  const data = new Uint8Array(56 + 2 * 32);
  const view = new DataView(data.buffer);
  view.setUint32(0, 1, true);
  view.setBigUint64(4, ACTIVE, true);
  view.setBigUint64(12, 4n, true);
  data[20] = 0;
  data[21] = 0;
  data.set(key(21), 56);
  data.set(key(22), 88);
  return Buffer.from(data).toString("base64");
}
function rpcResponse(value, slot = 9) {
  return Response.json({
    jsonrpc: "2.0", id: "climboria-alt-resolution",
    result: { context: { slot }, value }
  });
}
const lookup = [{ accountKey: tableKey, writableIndexes: [0], readonlyIndexes: [1] }];
const validAccount = () => ({
  owner: ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
  executable: false,
  data: [accountData(), "base64"]
});

test("uses one finalized getMultipleAccounts response and preserves writable/readonly order", async () => {
  let request;
  const result = await resolveTransactionLookups({
    lookups: lookup,
    rpcUrl: "https://rpc.example.com",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return rpcResponse([validAccount()]);
    }
  });
  assert.equal(request.body.method, "getMultipleAccounts");
  assert.deepEqual(request.body.params[0], [tableKey]);
  assert.equal(request.body.params[1].commitment, "finalized");
  assert.equal(request.init.redirect, "error");
  assert.equal(result.contextSlot, 9);
  assert.deepEqual(result.writable, [encodeBase58(key(21))]);
  assert.deepEqual(result.readonly, [encodeBase58(key(22))]);
});

function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] * 256; digits[i] = carry % 58; carry = Math.floor(carry / 58); }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) { if (zeros && i === 0 && digits[i] === 0) continue; out += alphabet[digits[i]]; }
  return out;
}

test("skips RPC entirely when the v0 transaction has no address lookups", async () => {
  const result = await resolveTransactionLookups({ lookups: [], fetchImpl: () => { throw new Error("must not call RPC"); } });
  assert.equal(result.contextSlot, null);
  assert.deepEqual(result.all, []);
});

test("rejects absent configuration, HTTP/private hosts and credentialed endpoints", async () => {
  for (const rpcUrl of [undefined, "http://rpc.example.com", "https://localhost", "https://127.0.0.1", "https://10.0.0.2", "https://user:pass@rpc.example.com"]) {
    await assert.rejects(resolveTransactionLookups({ lookups: lookup, rpcUrl, fetchImpl: async () => rpcResponse([validAccount()]) }));
  }
});

test("rejects redirects, missing accounts, malformed context and mismatched account count", async () => {
  await assert.rejects(resolveTransactionLookups({ lookups: lookup, rpcUrl: "https://rpc.example.com", fetchImpl: async () => new Response("{}", { status: 302 }) }), /HTTP 302/);
  await assert.rejects(resolveTransactionLookups({ lookups: lookup, rpcUrl: "https://rpc.example.com", fetchImpl: async () => rpcResponse([null]) }), /missing or malformed/);
  await assert.rejects(resolveTransactionLookups({ lookups: lookup, rpcUrl: "https://rpc.example.com", fetchImpl: async () => rpcResponse([], 9) }), /incomplete or mismatched/);
});

const tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const inputMint = "So11111111111111111111111111111111111111112";
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const taker = encodeBase58(key(31));
const sourceTokenAccount = encodeBase58(key(32));
const destinationTokenAccount = encodeBase58(key(33));
function classicTokenData({ mint = inputMint, owner = taker, amount = 1000n, state = 1, delegateOption = 0, nativeOption = null, closeAuthorityOption = 0 } = {}) {
  const bytes = new Uint8Array(165);
  bytes.set(decodeBase58(mint), 0);
  bytes.set(decodeBase58(owner), 32);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(64, BigInt(amount), true);
  view.setUint32(72, delegateOption, true);
  bytes[108] = state;
  view.setUint32(109, nativeOption === null ? (mint === inputMint ? 1 : 0) : nativeOption, true);
  view.setUint32(129, closeAuthorityOption, true);
  return Buffer.from(bytes).toString("base64");
}
function tokenRpcResponse(value, slot = 120) {
  return Response.json({
    jsonrpc: "2.0",
    id: "climboria-token-account-verification",
    result: { context: { slot }, value }
  });
}
function tokenAccount(mint, amount, options = {}) {
  return { owner: tokenProgram, executable: false, lamports: 2_000_000, data: [classicTokenData({ mint, amount, ...options }), "base64"] };
}
function verifyTokens(overrides = {}, responseFactory = () => tokenRpcResponse([
  tokenAccount(inputMint, 1500n),
  tokenAccount(outputMint, 0n)
])) {
  return verifyJupiterTokenAccounts({
    sourceTokenAccount,
    destinationTokenAccount,
    taker,
    inputMint,
    outputMint,
    amount: "1000",
    rpcUrl: "https://rpc.example.com",
    minContextSlot: 100,
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.method, "getMultipleAccounts");
      assert.equal(body.params[1].commitment, "finalized");
      assert.equal(body.params[1].minContextSlot, 100);
      assert.equal(init.redirect, "error");
      return responseFactory(body);
    },
    ...overrides
  });
}

test("verifies both classic SPL token accounts at finalized context and checks input balance", async () => {
  const result = await verifyTokens();
  assert.equal(result.contextSlot, 120);
  assert.equal(result.source.owner, taker);
  assert.equal(result.source.mint, inputMint);
  assert.equal(result.source.amount, "1500");
  assert.equal(result.destination.mint, outputMint);
});

test("rejects wrong token-account owner program, owner, mint and frozen state", async () => {
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    { ...tokenAccount(inputMint, 1500n), owner: ADDRESS_LOOKUP_TABLE_PROGRAM_ID },
    tokenAccount(outputMint, 0n)
  ])), /classic SPL Token program/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n, { owner: encodeBase58(key(44)) }),
    tokenAccount(outputMint, 0n)
  ])), /directly owned by the taker/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(outputMint, 1500n),
    tokenAccount(outputMint, 0n)
  ])), /mints do not match/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n, { state: 2 }),
    tokenAccount(outputMint, 0n)
  ])), /initialized and not frozen/i);
});

test("rejects delegated, close-authority, Token-2022 and insufficient-balance accounts", async () => {
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n, { delegateOption: 1 }),
    tokenAccount(outputMint, 0n)
  ])), /delegated token accounts/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n, { closeAuthorityOption: 1 }),
    tokenAccount(outputMint, 0n)
  ])), /native\/close-authority metadata/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    { ...tokenAccount(inputMint, 1500n), data: [Buffer.alloc(200).toString("base64"), "base64"] },
    tokenAccount(outputMint, 0n)
  ])), /Token-2022\/extensions are rejected/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 999n),
    tokenAccount(outputMint, 0n)
  ])), /balance is insufficient/i);
});

test("rejects stale context, duplicate token accounts and invalid native-mint state", async () => {
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n),
    tokenAccount(outputMint, 0n)
  ], 99)), /incomplete or stale/i);
  await assert.rejects(() => verifyJupiterTokenAccounts({
    sourceTokenAccount, destinationTokenAccount: sourceTokenAccount, taker, inputMint, outputMint,
    amount: "1000", rpcUrl: "https://rpc.example.com", fetchImpl: async () => { throw new Error("must not fetch"); }
  }), /must be different/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(outputMint, 1500n, { nativeOption: 1 }),
    tokenAccount(outputMint, 0n)
  ])), /wrapped-SOL mint/i);
  await assert.rejects(() => verifyTokens({}, () => tokenRpcResponse([
    tokenAccount(inputMint, 1500n, { nativeOption: 0 }),
    tokenAccount(outputMint, 0n)
  ])), /wrapped-SOL mint/i);
});
