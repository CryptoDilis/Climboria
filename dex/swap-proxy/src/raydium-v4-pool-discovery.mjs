import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "./raydium-v4-direct-evidence.mjs";
import { deriveRaydiumV4AmmAuthorityPda } from "./raydium-v4-authority-pda.mjs";
import {
  inspectRaydiumV4RawPoolAccount,
  fetchRaydiumV4FinalizedPoolEvidence
} from "./raydium-v4-pool-evidence.mjs";

/**
 * Read-only operator tool: starting from ONE externally corroborated pool
 * pubkey, discover the remaining 7 account pubkeys from the raw Raydium V4
 * AMM state. Then re-fetch ALL 8 together at finalized commitment.
 *
 * This cannot establish the provenance of the caller's pool public key,
 * the honesty of an RPC server, the Jupiter V6 CPI forwarding, token
 * transfers, account upgrade authority, or approval to sign/exe swaps.
 *
 * No secret is printed or returned, no transaction is ever constructed.
 */
const REQUEST_ID = "climboria-raydium-v4-pool-bootstrap";

function fail(message) {
  throw new Error("Raydium V4 trusted-pool discovery: " + message);
}
function canonicalPubkey(value) {
  if (typeof value !== "string") fail("pool must be a canonical public key");
  let bytes;
  try { bytes = decodeBase58(value); }
  catch { fail("pool must be a canonical public key"); }
  if (bytes.length !== 32 || encodeBase58(bytes) !== value) {
    fail("pool must be a canonical 32-byte public key");
  }
  return value;
}

export async function fetchRaydiumV4EvidenceFromPoolAddress({
  network, poolAddress, rpcUrl, minContextSlot = null,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!Object.hasOwn(RAYDIUM_V4_PROGRAM_IDS, network)) {
    fail("unsupported or unspecified Raydium network");
  }
  canonicalPubkey(poolAddress);
  if (typeof fetchImpl !== "function") fail("operator RPC transport unavailable");
  if (minContextSlot !== null &&
      (!Number.isSafeInteger(minContextSlot) || minContextSlot < 0)) {
    fail("invalid minimum finalized context slot");
  }
  const url = validateRpcUrl(rpcUrl);
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: REQUEST_ID, method: "getAccountInfo",
      params: [poolAddress, {
        encoding: "base64", commitment: "finalized",
        ...(minContextSlot === null ? {} : { minContextSlot })
      }]
    }),
    redirect: "error",
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) fail("bootstrap finalized RPC failed with HTTP " + response.status);
  const raw = await readBoundedBody(response);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { fail("bootstrap returned malformed RPC JSON"); }
  const firstSlot = payload?.result?.context?.slot;
  if (payload?.jsonrpc !== "2.0" || payload.id !== REQUEST_ID || payload.error ||
      !Number.isSafeInteger(firstSlot) || firstSlot < 0 ||
      (minContextSlot !== null && firstSlot < minContextSlot) ||
      !payload?.result?.value) {
    fail("bootstrap returned missing, stale or mismatched finalized account evidence");
  }
  const initialAccount = payload.result.value;
  const pool = inspectRaydiumV4RawPoolAccount({ network, account: initialAccount });
  const pda = await deriveRaydiumV4AmmAuthorityPda({ network, nonce: pool.nonce });

  // The immutable keys come from locally decoded raw AMM fields, NOT from
  // an externally supplied list of possibly substituted vault addresses.
  const addresses = Object.freeze({
    pool: poolAddress,
    coinVault: pool.coinVault,
    pcVault: pool.pcVault,
    coinMint: pool.coinMint,
    pcMint: pool.pcMint,
    openOrders: pool.openOrders,
    market: pool.market,
    marketProgram: pool.marketProgram
  });
  const result = await fetchRaydiumV4FinalizedPoolEvidence({
    network, addresses, expectedAuthority: pda.authority,
    rpcUrl: url.toString(), minContextSlot: firstSlot, fetchImpl
  });
  if (result.contextSlot < firstSlot) fail("snapshot is older than initial AMM account observation");

  // Pool state might change between the bootstrap RPC and the 8-account
  // snapshot. Compare the full account bytes and owner, not merely parsed
  // vault addresses, to avoid mixing fee/nonce/status and custody contexts.
  // The final account array was already strictly parsed and validated by
  // fetchRaydiumV4FinalizedPoolEvidence, but is intentionally not returned.
  // Independently re-read the final pool state from its verified result:
  for (const field of [
    "status", "nonce", "coinDecimals", "pcDecimals",
    "swapFeeNumerator", "swapFeeDenominator", "poolOpenTime",
    "coinVault", "pcVault", "coinMint", "pcMint", "lpMint",
    "openOrders", "market", "marketProgram", "targetOrders"
  ]) {
    if (result.pool[field] !== pool[field]) {
      fail("AMM pool state changed between finalized bootstrap and single-context snapshot");
    }
  }
  return Object.freeze({
    ...result,
    poolDiscoveryContextSlot: firstSlot,
    poolStateStableAcrossFinalizedReads: true,
    poolAddressIndependentlyCorroborated: false,
    rpcSourceIndependentlyAudited: false,
    approvedForJupiterCpi: false
  });
}
