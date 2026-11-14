import { resolveAddressLookupTables } from "./alt-resolution.mjs";
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";

const MAX_RESPONSE_BYTES = 512 * 1024;
const RPC_TIMEOUT_MS = 8000;

function fail(message) { throw new Error(message); }

export function validateRpcUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail("A valid configured Solana RPC URL is required"); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  // URL.hostname canonicalizes unusual IPv4 spellings (hex/octal/integer).
  // Reject non-public literal ranges before any operator RPC request.
  const privateIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) &&
    (() => {
      const [a, b, c] = host.split(".").map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) || // shared address space
        (a === 169 && b === 254) || // link local
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
        (a === 198 && ((b === 18 || b === 19) || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113);
    })();
  // Block IPv4-mapped IPv6 altogether: these can bypass literal IPv4 checks.
  // IPv6 link-local is fe80::/10, i.e. fe8x through febx (not just fe80).
  const privateIpv6 = host === "::1" || host === "::" ||
    /^(?:fc|fd|fe[89ab]|::ffff:)/i.test(host);
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || host === "localhost" ||
      host.endsWith(".localhost") || host.endsWith(".local") ||
      privateIpv4 || privateIpv6) {
    fail("Solana RPC must be a configured public HTTPS endpoint without credentials or private-network hosts");
  }
  url.hash = "";
  return url;
}

export async function readBoundedBody(response) {
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
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

function readU32LE(bytes, offset) {
  if (offset + 4 > bytes.length) fail("SPL account data is truncated");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function readU64LE(bytes, offset) {
  if (offset + 8 > bytes.length) fail("SPL account data is truncated");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function decodeBase64(value) {
  if (typeof value !== "string" || value.length > 1024) fail("SPL account base64 data is invalid");
  let binary;
  try { binary = atob(value); } catch { fail("SPL account base64 data is malformed"); }
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function parseClassicTokenAccount(address, account) {
  if (!account || account.executable !== false || account.owner !== SPL_TOKEN_PROGRAM_ID ||
      !Array.isArray(account.data) || account.data[1] !== "base64") {
    fail("Token account is missing, executable or not owned by the classic SPL Token program");
  }
  const bytes = decodeBase64(account.data[0]);
  if (bytes.length !== 165) fail("Only classic 165-byte SPL Token accounts are supported; Token-2022/extensions are rejected");
  const mint = encodeBase58(bytes.slice(0, 32));
  const owner = encodeBase58(bytes.slice(32, 64));
  const amount = readU64LE(bytes, 64);
  const delegateOption = readU32LE(bytes, 72);
  const state = bytes[108];
  const nativeOption = readU32LE(bytes, 109);
  const delegatedAmount = readU64LE(bytes, 121);
  const closeAuthorityOption = readU32LE(bytes, 129);
  if (state !== 1) fail("Token account must be initialized and not frozen");
  if (delegateOption !== 0 || delegatedAmount !== 0n) fail("Delegated token accounts are not supported");
  if (nativeOption > 1 || closeAuthorityOption !== 0) fail("Token account native/close-authority metadata is unsupported");
  if ((nativeOption === 1 && mint !== WRAPPED_SOL_MINT) || (mint === WRAPPED_SOL_MINT && nativeOption !== 1)) {
    fail("Native token account must use the wrapped-SOL mint");
  }
  return { address, mint, owner, amount: amount.toString(), native: nativeOption === 1 };
}
function parseClassicMint(address, account) {
  if (!account || account.executable !== false || account.owner !== SPL_TOKEN_PROGRAM_ID ||
      !Array.isArray(account.data) || account.data[1] !== "base64") {
    fail("Mint account is missing or not owned by the classic SPL Token program");
  }
  const bytes = decodeBase64(account.data[0]);
  if (bytes.length !== 82) fail("Only classic 82-byte SPL Token mints are supported; Token-2022/extensions are rejected");
  const mintAuthorityOption = readU32LE(bytes, 0);
  const supply = readU64LE(bytes, 36);
  const decimals = bytes[44];
  const initialized = bytes[45];
  const freezeAuthorityOption = readU32LE(bytes, 46);
  if (mintAuthorityOption > 1 || freezeAuthorityOption > 1 || initialized !== 1) {
    fail("Mint account must be an initialized classic SPL Token mint with canonical authority options");
  }
  return {
    address,
    decimals,
    supply: supply.toString(),
    mintAuthority: mintAuthorityOption === 1 ? encodeBase58(bytes.slice(4, 36)) : null,
    freezeAuthority: freezeAuthorityOption === 1 ? encodeBase58(bytes.slice(50, 82)) : null
  };
}

/**
 * Verifies Jupiter's user token accounts and both mint accounts in one finalized
 * RPC context. Raw SPL account bytes are parsed locally; RPC jsonParsed output is
 * not trusted. minContextSlot prevents checking token state older than ALT state.
 */
export async function verifyJupiterTokenAccounts({
  sourceTokenAccount,
  destinationTokenAccount,
  taker,
  inputMint,
  outputMint,
  amount,
  rpcUrl,
  minContextSlot = null,
  fetchImpl = globalThis.fetch
}) {
  if (typeof fetchImpl !== "function") fail("Solana RPC fetch implementation is unavailable");
  const addresses = [sourceTokenAccount, destinationTokenAccount, inputMint, outputMint];
  for (const [label, address] of [
    ["source token account", sourceTokenAccount],
    ["destination token account", destinationTokenAccount],
    ["taker", taker],
    ["input mint", inputMint],
    ["output mint", outputMint]
  ]) {
    if (typeof address !== "string" || decodeBase58(address).length !== 32) fail("Invalid " + label + " public key");
  }
  if (new Set(addresses).size !== addresses.length) fail("Jupiter source, destination and mint accounts must be distinct");
  if (typeof amount !== "string" || !/^[1-9][0-9]{0,19}$/.test(amount)) fail("Requested token input amount is invalid");
  if (minContextSlot !== null && (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0)) {
    fail("Minimum RPC context slot is invalid");
  }
  const url = validateRpcUrl(rpcUrl);
  const requestId = "climboria-token-account-verification";
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "getMultipleAccounts",
      params: [addresses, {
        encoding: "base64",
        commitment: "finalized",
        ...(minContextSlot === null ? {} : { minContextSlot })
      }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS)
  });
  if (!response.ok) fail("Solana RPC token-account verification failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("Solana RPC returned invalid token-account JSON"); }
  const slot = payload?.result?.context?.slot;
  if (payload?.jsonrpc !== "2.0" || payload?.id !== requestId || payload?.error ||
      !Number.isSafeInteger(slot) || (minContextSlot !== null && slot < minContextSlot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== 4) {
    fail("Solana RPC returned incomplete or stale token-account evidence");
  }
  const source = parseClassicTokenAccount(sourceTokenAccount, payload.result.value[0]);
  const destination = parseClassicTokenAccount(destinationTokenAccount, payload.result.value[1]);
  if (source.owner !== taker || destination.owner !== taker) fail("Both swap token accounts must be directly owned by the taker");
  if (source.mint !== inputMint || destination.mint !== outputMint) fail("Swap token-account mints do not match the requested input/output mints");
  if (BigInt(source.amount) < BigInt(amount)) fail("Taker source token-account balance is insufficient for the requested input");
  const inputMintEvidence = parseClassicMint(inputMint, payload.result.value[2]);
  const outputMintEvidence = parseClassicMint(outputMint, payload.result.value[3]);
  return {
    contextSlot: slot,
    requestedAmount: amount,
    source,
    destination,
    inputMint: inputMintEvidence,
    outputMint: outputMintEvidence
  };
}
