import test from "node:test";
import assert from "node:assert/strict";
import { resolveTransactionLookups, verifyJupiterTokenAccounts } from "../src/solana-rpc.mjs";
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

const tokenTaker = "11111111111111111111111111111111";
const tokenInputMint = "So11111111111111111111111111111111111111112";
const tokenOutputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const sourceAccountKey = "SysvarRent111111111111111111111111111111111";
const destinationAccountKey = "SysvarC1ock11111111111111111111111111111111";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

function parsedTokenAccount({ mint, owner = tokenTaker, amount = "5000", state = "initialized", delegate = null, closeAuthority = null, programOwner = SPL_TOKEN_PROGRAM_ID, executable = false, space = 165 } = {}) {
  return {
    owner: programOwner,
    executable,
    space,
    data: {
      program: "spl-token",
      parsed: {
        type: "account",
        info: {
          mint,
          owner,
          state,
          delegate,
          delegatedAmount: { amount: "0", decimals: 0, uiAmount: 0, uiAmountString: "0" },
          closeAuthority,
          tokenAmount: { amount, decimals: 9, uiAmount: Number(amount) / 1e9, uiAmountString: String(Number(amount) / 1e9) }
        }
      }
    }
  };
}
function tokenAccountsResponse(value, slot = 123) {
  return Response.json({
    jsonrpc: "2.0",
    id: "climboria-token-account-verification",
    result: { context: { slot }, value }
  });
}
function verifyTokenAccounts(overrides = {}, fetchImpl) {
  return verifyJupiterTokenAccounts({
    sourceTokenAccount: sourceAccountKey,
    destinationTokenAccount: destinationAccountKey,
    taker: tokenTaker,
    inputMint: tokenInputMint,
    outputMint: tokenOutputMint,
    amount: "1000",
    rpcUrl: "https://rpc.example.com",
    ...overrides,
    fetchImpl
  });
}

test("verifies both Jupiter user token accounts at one finalized RPC context", async () => {
  let request;
  const result = await verifyTokenAccounts({}, async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return tokenAccountsResponse([
      parsedTokenAccount({ mint: tokenInputMint, amount: "1000" }),
      parsedTokenAccount({ mint: tokenOutputMint, amount: "0" })
    ]);
  });
  assert.equal(request.body.method, "getMultipleAccounts");
  assert.deepEqual(request.body.params[0], [sourceAccountKey, destinationAccountKey]);
  assert.deepEqual(request.body.params[1], { encoding: "jsonParsed", commitment: "finalized" });
  assert.equal(request.init.redirect, "error");
  assert.equal(result.contextSlot, 123);
  assert.equal(result.source.mint, tokenInputMint);
  assert.equal(result.destination.mint, tokenOutputMint);
});

test("rejects token accounts with wrong mint, authority, program owner, state or delegated authority", async () => {
  const cases = [
    [parsedTokenAccount({ mint: tokenOutputMint }), parsedTokenAccount({ mint: tokenOutputMint })],
    [parsedTokenAccount({ mint: tokenInputMint, owner: source }), parsedTokenAccount({ mint: tokenOutputMint })],
    [parsedTokenAccount({ mint: tokenInputMint, programOwner: ADDRESS_LOOKUP_TABLE_PROGRAM_ID }), parsedTokenAccount({ mint: tokenOutputMint })],
    [parsedTokenAccount({ mint: tokenInputMint, state: "frozen" }), parsedTokenAccount({ mint: tokenOutputMint })],
    [parsedTokenAccount({ mint: tokenInputMint, delegate: source }), parsedTokenAccount({ mint: tokenOutputMint })],
    [parsedTokenAccount({ mint: tokenInputMint, closeAuthority: source }), parsedTokenAccount({ mint: tokenOutputMint })]
  ];
  for (const value of cases) {
    await assert.rejects(verifyTokenAccounts({}, async () => tokenAccountsResponse(value)));
  }
});

test("rejects insufficient source balance, missing/unparsed accounts and malformed RPC context", async () => {
  await assert.rejects(verifyTokenAccounts({}, async () => tokenAccountsResponse([
    parsedTokenAccount({ mint: tokenInputMint, amount: "999" }),
    parsedTokenAccount({ mint: tokenOutputMint })
  ])), /below the requested input amount/);
  await assert.rejects(verifyTokenAccounts({}, async () => tokenAccountsResponse([null, parsedTokenAccount({ mint: tokenOutputMint })])));
  await assert.rejects(verifyTokenAccounts({}, async () => tokenAccountsResponse([
    { ...parsedTokenAccount({ mint: tokenInputMint }), data: ["AA==", "base64"] },
    parsedTokenAccount({ mint: tokenOutputMint })
  ])));
  await assert.rejects(verifyTokenAccounts({}, async () => tokenAccountsResponse([
    parsedTokenAccount({ mint: tokenInputMint }),
    parsedTokenAccount({ mint: tokenOutputMint })
  ], Number.MAX_SAFE_INTEGER + 1)));
});

test("rejects duplicate source/destination accounts and redirects", async () => {
  await assert.rejects(verifyTokenAccounts({ destinationTokenAccount: sourceAccountKey }, async () => tokenAccountsResponse([])), /must be distinct/);
  await assert.rejects(verifyTokenAccounts({}, async () => new Response("{}", { status: 302 })), /HTTP 302/);
});
