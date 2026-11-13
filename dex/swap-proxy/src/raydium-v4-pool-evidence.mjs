import { encodeBase58, decodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";
import { RAYDIUM_V4_PROGRAM_IDS, RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM } from "./raydium-v4-direct-evidence.mjs";

/**
 * Read-only, single-finalized-context Raydium V4 AMM/pool/vault evidence.
 *
 * Pinned upstream source:
 * raydium-io/raydium-amm @ 91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6
 * program/src/state.rs: AmmInfo #[repr(C, packed)], 16 initial u64s,
 * 64-byte Fees, 144-byte StateData, nine subsequent 32-byte pubkeys.
 * program/src/processor.rs: pool, vault, authority and swap-mint checks.
 *
 * This verifies ONLY the public RPC snapshot relationships enumerated below,
 * NOT Jupiter CPI account ordering, market data, program bytecode parity,
 * Raydium authority PDA derivation, fee collection or token transfers.
 * Not imported by the Worker order/execute path. Never an approval token.
 */
const SPL_TOKEN = RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM;
const WSOL = "So11111111111111111111111111111111111111112";
const MAX_ACCOUNT_DATA_BASE64 = 1400;
const ROLES = Object.freeze([
  "pool", "coinVault", "pcVault", "coinMint", "pcMint",
  "openOrders", "market", "marketProgram"
]);
const POOL_KEY_OFFSETS = Object.freeze({
  coinVault: 336, pcVault: 368, coinMint: 400, pcMint: 432,
  lpMint: 464, openOrders: 496, market: 528, marketProgram: 560,
  targetOrders: 592
});
function fail(message) { throw new Error("Raydium V4 pool evidence: " + message); }
function key(address, role) {
  if (typeof address !== "string") fail("missing " + role + " public key");
  let bytes;
  try { bytes = decodeBase58(address); } catch { fail("malformed " + role + " public key"); }
  if (bytes.length !== 32 || encodeBase58(bytes) !== address) fail("noncanonical 32-byte " + role + " public key");
  return address;
}
function bytesOf(account, role) {
  if (!account || !Array.isArray(account.data) || account.data[1] !== "base64" ||
      typeof account.data[0] !== "string" || account.data[0].length > MAX_ACCOUNT_DATA_BASE64) {
    fail("missing or oversized base64 account data for " + role);
  }
  const encoded = account.data[0];
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    fail("noncanonical base64 account data for " + role);
  }
  let binary;
  try { binary = atob(encoded); } catch { fail("invalid base64 account data for " + role); }
  const bytes = Uint8Array.from(binary, v => v.charCodeAt(0));
  // Solana RPC evidence must not silently accept alternate base64 spellings.
  const normalized = btoa(String.fromCharCode(...bytes));
  if (normalized !== encoded) fail("noncanonical base64 account data for " + role);
  return bytes;
}
function pubkey(bytes, offset) { return encodeBase58(bytes.subarray(offset, offset + 32)); }
function u64(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function u32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function nonExecutable(account, role, owner) {
  if (!account || account.executable !== false || account.owner !== owner) {
    fail(role + " has wrong program ownership or executable flag");
  }
}
function parsePool(account, poolProgram) {
  nonExecutable(account, "pool", poolProgram);
  const bytes = bytesOf(account, "pool");
  if (bytes.length !== 752) fail("Raydium V4 AmmInfo requires exactly 752 bytes");
  const status = u64(bytes, 0);
  const nonce = u64(bytes, 8);
  const coinDecimals = u64(bytes, 32);
  const pcDecimals = u64(bytes, 40);
  const swapFeeNumerator = u64(bytes, 176);
  const swapFeeDenominator = u64(bytes, 184);
  if (status !== 6n) fail("pool must have SwapOnly status 6 for this conservative read-only proof");
  if (nonce > 255n) fail("invalid AMM authority nonce");
  if (coinDecimals > 18n || pcDecimals > 18n) fail("unsupported pool mint decimals");
  if (swapFeeDenominator === 0n || swapFeeNumerator >= swapFeeDenominator) {
    fail("invalid AMM swap fee numerator/denominator");
  }
  return {
    status: Number(status), nonce: Number(nonce),
    coinDecimals: Number(coinDecimals), pcDecimals: Number(pcDecimals),
    swapFeeNumerator: swapFeeNumerator.toString(),
    swapFeeDenominator: swapFeeDenominator.toString(),
    poolOpenTime: u64(bytes, 224).toString(),
    ...Object.fromEntries(Object.entries(POOL_KEY_OFFSETS).map(([role, offset]) => [role, pubkey(bytes, offset)]))
  };
}
function parseVault(account, role) {
  nonExecutable(account, role, SPL_TOKEN);
  const bytes = bytesOf(account, role);
  if (bytes.length !== 165) fail(role + " must be classic 165-byte SPL Token account");
  const delegateOption = u32(bytes, 72);
  const delegatedAmount = u64(bytes, 121);
  const state = bytes[108], nativeOption = u32(bytes, 109);
  const closeAuthorityOption = u32(bytes, 129);
  if (state !== 1 || delegateOption !== 0 || delegatedAmount !== 0n ||
      closeAuthorityOption !== 0 || nativeOption > 1) {
    fail(role + " has frozen, delegated, closed or unsupported token state");
  }
  const mint = pubkey(bytes, 0);
  if ((mint === WSOL && nativeOption !== 1) || (mint !== WSOL && nativeOption !== 0)) {
    fail(role + " has invalid native-SOL metadata");
  }
  return { mint, owner: pubkey(bytes, 32), amount: u64(bytes, 64).toString(), native: nativeOption === 1 };
}
function parseMint(account, role) {
  nonExecutable(account, role, SPL_TOKEN);
  const bytes = bytesOf(account, role);
  if (bytes.length !== 82 || bytes[45] !== 1 || u32(bytes, 0) > 1 || u32(bytes, 46) > 1) {
    fail(role + " must be initialized classic 82-byte SPL Token mint");
  }
  return {
    decimals: bytes[44],
    mintAuthority: u32(bytes, 0) === 1 ? pubkey(bytes, 4) : null,
    freezeAuthority: u32(bytes, 46) === 1 ? pubkey(bytes, 50) : null,
    supply: u64(bytes, 36).toString()
  };
}

/** Deterministic proof for an already retrieved single finalized-context snapshot. */
export function inspectRaydiumV4FinalizedPoolSnapshot({
  network, addresses, expectedAuthority, accounts, contextSlot
} = {}) {
  if (!Object.hasOwn(RAYDIUM_V4_PROGRAM_IDS, network)) fail("unsupported or unspecified network");
  if (!Number.isSafeInteger(contextSlot) || contextSlot < 0) fail("missing finalized RPC context slot");
  if (!addresses || typeof addresses !== "object" || Array.isArray(addresses) ||
      !Array.isArray(accounts) || accounts.length !== ROLES.length) {
    fail("all eight pool, vault, mint and market accounts are required");
  }
  const keys = ROLES.map(role => key(addresses[role], role));
  key(expectedAuthority, "expectedAuthority");
  if (new Set(keys).size !== ROLES.length) fail("duplicate account addresses are not supported");
  const byRole = Object.fromEntries(ROLES.map((role, index) => [role, accounts[index]]));
  const programId = RAYDIUM_V4_PROGRAM_IDS[network];
  const pool = parsePool(byRole.pool, programId);
  for (const role of ["coinVault", "pcVault", "coinMint", "pcMint", "openOrders", "market", "marketProgram"]) {
    if (pool[role] !== addresses[role]) fail("AMM state account binding mismatch for " + role);
  }
  if (pool.coinVault === pool.pcVault || pool.coinMint === pool.pcMint) {
    fail("AMM coin/pc vaults and mints must differ");
  }
  const coinVault = parseVault(byRole.coinVault, "coinVault");
  const pcVault = parseVault(byRole.pcVault, "pcVault");
  if (coinVault.owner !== expectedAuthority || pcVault.owner !== expectedAuthority) {
    fail("vault token authorities do not match the externally supplied AMM authority");
  }
  if (coinVault.mint !== pool.coinMint || pcVault.mint !== pool.pcMint) {
    fail("vault token mints do not match on-chain AMM state");
  }
  const coinMint = parseMint(byRole.coinMint, "coinMint");
  const pcMint = parseMint(byRole.pcMint, "pcMint");
  if (coinMint.decimals !== pool.coinDecimals || pcMint.decimals !== pool.pcDecimals) {
    fail("pool decimal settings do not match the actual mint accounts");
  }
  nonExecutable(byRole.openOrders, "openOrders", pool.marketProgram);
  nonExecutable(byRole.market, "market", pool.marketProgram);
  if (bytesOf(byRole.openOrders, "openOrders").length === 0 ||
      bytesOf(byRole.market, "market").length === 0) fail("market or open-orders account has no data");
  if (!byRole.marketProgram || byRole.marketProgram.executable !== true ||
      typeof byRole.marketProgram.owner !== "string") {
    fail("market program must be executable");
  }
  return Object.freeze({
    network, contextSlot,
    poolAddress: addresses.pool, programId,
    pool, coinVault, pcVault, coinMint, pcMint,
    marketProgram: addresses.marketProgram,
    // The caller can lie about expectedAuthority; this is NOT PDA proof.
    expectedAuthority,
    finalizedSnapshotRelationshipsChecked: true,
    ammAuthorityPdaIndependentlyVerified: false,
    deployedProgramBytecodeVerified: false,
    marketOrderbookStateDecoded: false,
    jupiterCpiAccountMappingVerified: false,
    feeRecipientAndTokenMovementsVerified: false,
    approvedForJupiterCpi: false
  });
}

/**
 * Perform one bounded, finalized Solana RPC getMultipleAccounts for ALL eight
 * caller-selected addresses. This avoids multi-slot consistency gaps.
 * rpcUrl is operator/server configuration, never public-user supplied input.
 * This function is not used by /order or /execute.
 */
export async function fetchRaydiumV4FinalizedPoolEvidence({
  network, addresses, expectedAuthority, rpcUrl, minContextSlot = null,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") fail("configured RPC transport is unavailable");
  if (!addresses || typeof addresses !== "object" || Array.isArray(addresses)) fail("pool account addresses are required");
  const keys = ROLES.map(role => key(addresses[role], role));
  key(expectedAuthority, "expectedAuthority");
  if (new Set(keys).size !== keys.length) fail("duplicate account addresses are not supported");
  if (minContextSlot !== null && (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0)) {
    fail("invalid minimum finalized RPC context slot");
  }
  const url = validateRpcUrl(rpcUrl);
  const requestId = "climboria-raydium-v4-finalized-evidence";
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: requestId, method: "getMultipleAccounts",
      params: [keys, { encoding: "base64", commitment: "finalized",
        ...(minContextSlot === null ? {} : { minContextSlot }) }]
    }),
    redirect: "error", signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) fail("finalized Solana RPC request failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); } catch { fail("malformed finalized Solana RPC JSON"); }
  const contextSlot = payload?.result?.context?.slot;
  if (payload?.jsonrpc !== "2.0" || payload?.id !== requestId || payload?.error ||
      !Number.isSafeInteger(contextSlot) || contextSlot < 0 ||
      (minContextSlot !== null && contextSlot < minContextSlot) ||
      !Array.isArray(payload?.result?.value) || payload.result.value.length !== ROLES.length) {
    fail("incomplete, mismatched or stale finalized Solana RPC snapshot");
  }
  const verdict = inspectRaydiumV4FinalizedPoolSnapshot({
    network, addresses, expectedAuthority, accounts: payload.result.value, contextSlot
  });
  return Object.freeze({ ...verdict, rpcFinalizedAccountSnapshotRead: true });
}
