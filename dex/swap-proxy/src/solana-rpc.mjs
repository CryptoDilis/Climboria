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
