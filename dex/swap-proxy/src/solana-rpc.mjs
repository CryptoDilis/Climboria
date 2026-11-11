import { resolveAddressLookupTables } from "./alt-resolution.mjs";

const MAX_RESPONSE_BYTES = 512 * 1024;
const RPC_TIMEOUT_MS = 8000;

function fail(message) { throw new Error(message); }

function validateRpcUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail("A valid configured Solana RPC URL is required"); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) &&
    (() => {
      const p = host.split(".").map(Number);
      return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
        (p[0] === 169 && p[1] === 254) ||
        (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
        (p[0] === 192 && p[1] === 168);
    })();
  const privateIpv6 = host === "::1" || host === "::" || /^(fc|fd|fe80:)/i.test(host);
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || host === "localhost" ||
      host.endsWith(".localhost") || host.endsWith(".local") ||
      privateIpv4 || privateIpv6) {
    fail("Solana RPC must be a configured public HTTPS endpoint without credentials or private-network hosts");
  }
  url.hash = "";
  return url;
}

async function readBoundedBody(response) {
  if (!response.body || typeof response.body.getReader !== "function") {
    fail("Solana RPC response must support bounded streaming reads");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      fail("Solana RPC response exceeded the byte limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

/**
 * Fetches all lookup-table accounts in one finalized-context RPC response.
 * The RPC URL is an operator secret/configuration value, never client input.
 */
export async function resolveTransactionLookups({
  lookups,
  rpcUrl,
  fetchImpl = globalThis.fetch
}) {
  if (!Array.isArray(lookups)) fail("Transaction lookup references must be an array");
  if (lookups.length === 0) return { writable: [], readonly: [], all: [], tables: [], contextSlot: null };
  if (lookups.length > 32) fail("Too many address lookup tables");
  if (typeof fetchImpl !== "function") fail("Solana RPC fetch implementation is unavailable");
  const url = validateRpcUrl(rpcUrl);
  const addresses = lookups.map(item => item?.accountKey);
  if (addresses.some(address => typeof address !== "string" || address.length < 32 || address.length > 44) ||
      new Set(addresses).size !== addresses.length) {
    fail("Invalid or duplicate address lookup table account key");
  }
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "climboria-alt-resolution",
      method: "getMultipleAccounts",
      params: [addresses, { encoding: "base64", commitment: "finalized" }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response.ok) fail("Solana RPC account lookup request failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("Solana RPC returned invalid JSON"); }
  if (payload?.jsonrpc !== "2.0" || payload?.id !== "climboria-alt-resolution" ||
      payload?.error || !Number.isSafeInteger(payload?.result?.context?.slot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== addresses.length) {
    fail("Solana RPC returned an incomplete or mismatched account lookup response");
  }
  const accounts = new Map();
  for (let i = 0; i < addresses.length; i++) {
    const account = payload.result.value[i];
    if (!account || account.owner == null || account.executable == null ||
        !Array.isArray(account.data) || account.data[1] !== "base64" ||
        typeof account.data[0] !== "string") {
      fail("Solana RPC returned a missing or malformed address lookup table account");
    }
    accounts.set(addresses[i], account);
  }
  const resolved = await resolveAddressLookupTables({
    lookups,
    fetchAccount: async address => accounts.get(address),
    currentSlot: payload.result.context.slot
  });
  return { ...resolved, contextSlot: payload.result.context.slot };
}

const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/**
 * Verifies the user-owned SPL token accounts referenced by the Jupiter route.
 * Uses a single finalized-context getMultipleAccounts response and fails closed
 * on missing, unparsed, delegated, frozen, wrong-mint or wrong-authority accounts.
 */
export async function verifyJupiterTokenAccounts({
  sourceTokenAccount,
  destinationTokenAccount,
  taker,
  inputMint,
  outputMint,
  amount,
  rpcUrl,
  fetchImpl = globalThis.fetch
}) {
  const addresses = [sourceTokenAccount, destinationTokenAccount];
  if (addresses.some(address => typeof address !== "string" || address.length < 32 || address.length > 44) ||
      addresses[0] === addresses[1]) {
    fail("Jupiter source and destination token accounts must be distinct valid addresses");
  }
  if ([taker, inputMint, outputMint].some(value => typeof value !== "string" || value.length < 32 || value.length > 44) ||
      inputMint === outputMint || typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) {
    fail("Token-account verification received invalid taker, mint or input amount metadata");
  }
  if (typeof fetchImpl !== "function") fail("Solana RPC fetch implementation is unavailable");
  const url = validateRpcUrl(rpcUrl);
  const requestId = "climboria-token-account-verification";
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "getMultipleAccounts",
      params: [addresses, { encoding: "jsonParsed", commitment: "finalized" }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response.ok) fail("Solana RPC token-account verification failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("Solana RPC returned invalid token-account JSON"); }
  if (payload?.jsonrpc !== "2.0" || payload?.id !== requestId || payload?.error ||
      !Number.isSafeInteger(payload?.result?.context?.slot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== 2) {
    fail("Solana RPC returned an incomplete or mismatched token-account response");
  }
  const expected = [
    { address: sourceTokenAccount, mint: inputMint, role: "source" },
    { address: destinationTokenAccount, mint: outputMint, role: "destination" }
  ];
  const verified = [];
  for (let i = 0; i < expected.length; i++) {
    const item = expected[i];
    const account = payload.result.value[i];
    const parsed = account?.data?.parsed;
    const info = parsed?.info;
    if (!account || account.executable !== false || account.owner !== SPL_TOKEN_PROGRAM_ID ||
        account.space !== 165 || account.data?.program !== "spl-token" ||
        parsed?.type !== "account" || !info) {
      fail("Jupiter " + item.role + " must be an initialized classic SPL Token account");
    }
    if (info.mint !== item.mint || info.owner !== taker || info.state !== "initialized") {
      fail("Jupiter " + item.role + " token account mint, authority or state does not match the order");
    }
    if (info.delegate != null || (info.delegatedAmount?.amount != null && info.delegatedAmount.amount !== "0") ||
        info.closeAuthority != null) {
      fail("Jupiter " + item.role + " token account has a delegate or close authority");
    }
    if (!info.tokenAmount || typeof info.tokenAmount.amount !== "string" || !/^(0|[1-9][0-9]*)$/.test(info.tokenAmount.amount)) {
      fail("Jupiter " + item.role + " token account has an invalid token balance");
    }
    if (item.role === "source" && BigInt(info.tokenAmount.amount) < BigInt(amount)) {
      fail("Jupiter source token account balance is below the requested input amount");
    }
    verified.push({
      address: item.address,
      mint: info.mint,
      authority: info.owner,
      amount: info.tokenAmount.amount,
      state: info.state
    });
  }
  return { contextSlot: payload.result.context.slot, source: verified[0], destination: verified[1] };
}
