import { decodeAddressLookupTableAccount } from "./solana-message.mjs";

const RPC_TIMEOUT_MS = 8000;
const MAX_RPC_RESPONSE_BYTES = 128 * 1024;

function publicKeyToBase58(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error("Invalid lookup table public key");
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
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
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  return "1".repeat(zeros) + (digits.length === 1 && digits[0] === 0 ? "" : digits.reverse().map(n => alphabet[n]).join(""));
}

function assertApprovedRpcUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Solana RPC endpoint is not configured as a valid URL"); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || url.hash ||
      host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "0.0.0.0" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) {
    throw new Error("Solana RPC endpoint must be a configured HTTPS endpoint");
  }
  return url.toString();
}

async function readBoundedText(response) {
  const declaredLength = Number(response.headers?.get?.("content-length") || 0);
  if (declaredLength > MAX_RPC_RESPONSE_BYTES) throw new Error("Trusted Solana RPC response exceeded size limit");
  if (!response.body?.getReader) throw new Error("Trusted Solana RPC response must support bounded streaming reads");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RPC_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Trusted Solana RPC response exceeded size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(joined); }
  catch { throw new Error("Trusted Solana RPC returned invalid UTF-8"); }
}

function decodeCanonicalBase64(value) {
  if (typeof value !== "string" || !value.length || value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("RPC returned invalid base64 account data");
  }
  let binary;
  try { binary = atob(value); } catch { throw new Error("RPC returned invalid base64 account data"); }
  if (btoa(binary) !== value) throw new Error("RPC returned non-canonical base64 account data");
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Resolve every transaction ALT from one trusted getMultipleAccounts response.
 * The RPC URL is server configuration only; callers must never pass request data.
 * Account identity, owner, executable, bytes and context slot are all taken from
 * the same response before the pure ALT decoder sees them.
 */
export async function resolveAddressLookupTables(parsed, {
  rpcUrl,
  fetchImpl = fetch,
  commitment = "confirmed",
  minContextSlot
} = {}) {
  if (!parsed || !Array.isArray(parsed.addressTableLookups)) throw new Error("Invalid parsed Solana transaction");
  if (parsed.addressTableLookups.length === 0) return [];
  if (parsed.addressTableLookups.length > 32) throw new Error("Too many address lookup tables");
  if (commitment !== "confirmed" && commitment !== "finalized") throw new Error("ALT resolution requires confirmed or finalized commitment");
  if (minContextSlot !== undefined && (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0)) {
    throw new Error("Invalid minimum RPC context slot");
  }
  const endpoint = assertApprovedRpcUrl(rpcUrl);
  const seen = new Set();
  const accountKeys = parsed.addressTableLookups.map(lookup => {
    const key = publicKeyToBase58(lookup.accountKey);
    if (seen.has(key)) throw new Error("Duplicate address lookup table account in transaction");
    seen.add(key);
    return key;
  });
  const config = { encoding: "base64", commitment };
  if (minContextSlot !== undefined) config.minContextSlot = minContextSlot;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-alt-resolution", method: "getMultipleAccounts", params: [accountKeys, config] }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response?.ok) throw new Error("Trusted Solana RPC account request failed");
  const raw = await readBoundedText(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new Error("Trusted Solana RPC returned invalid JSON"); }
  if (payload?.jsonrpc !== "2.0" || payload.id !== "climboria-alt-resolution" || payload.error) {
    throw new Error("Trusted Solana RPC returned an invalid or failed response");
  }
  const contextSlot = payload?.result?.context?.slot;
  const values = payload?.result?.value;
  if (!Number.isSafeInteger(contextSlot) || contextSlot < 0 ||
      (minContextSlot !== undefined && contextSlot < minContextSlot) ||
      !Array.isArray(values) || values.length !== accountKeys.length) {
    throw new Error("Trusted Solana RPC response context or account count is invalid");
  }
  return values.map((account, index) => {
    if (!account || typeof account !== "object" || typeof account.owner !== "string" ||
        typeof account.executable !== "boolean" || !Array.isArray(account.data) ||
        account.data.length !== 2 || account.data[1] !== "base64") {
      throw new Error("Trusted Solana RPC returned an incomplete lookup table account");
    }
    const data = decodeCanonicalBase64(account.data[0]);
    return decodeAddressLookupTableAccount({
      accountKey: parsed.addressTableLookups[index].accountKey,
      owner: account.owner,
      executable: account.executable,
      data,
      contextSlot
    });
  });
}
