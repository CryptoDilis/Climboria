/**
 * Optional operator-only second RPC view for Raydium V4 finalized pool evidence.
 *
 * Different configured HTTPS hosts and matching decoded public relationships
 * improve confidence in an observation, but do not independently audit RPCs,
 * authenticate upstream pool selection, prove bytecode/custody or authorize CPI.
 * Not imported by the Worker order/execute path.
 */
import { validateRpcUrl } from "./solana-rpc.mjs";
import { fetchRaydiumV4EvidenceFromPoolAddress } from "./raydium-v4-pool-discovery.mjs";

const POOL_FIELDS = Object.freeze([
  "status", "nonce", "coinDecimals", "pcDecimals",
  "swapFeeNumerator", "swapFeeDenominator", "poolOpenTime",
  "coinVault", "pcVault", "coinMint", "pcMint", "lpMint",
  "openOrders", "market", "marketProgram", "targetOrders"
]);

function fail() {
  // Never include configured RPC endpoint text in exception messages.
  throw new Error("Raydium V4 dual-RPC public evidence mismatch or invalid witness");
}

function checkView(view, network, poolAddress) {
  if (!view || view.network !== network || view.poolAddress !== poolAddress ||
      typeof view.programId !== "string" ||
      !Number.isSafeInteger(view.poolDiscoveryContextSlot) ||
      view.poolDiscoveryContextSlot < 0 ||
      !Number.isSafeInteger(view.contextSlot) ||
      view.contextSlot < view.poolDiscoveryContextSlot ||
      typeof view.expectedAuthority !== "string" ||
      !view.pool || typeof view.pool !== "object" ||
      view.poolStateStableAcrossFinalizedReads !== true ||
      view.finalizedSnapshotRelationshipsChecked !== true ||
      view.ammAuthorityPdaIndependentlyVerified !== true ||
      view.approvedForJupiterCpi !== false) {
    fail();
  }
  for (const key of POOL_FIELDS) {
    if (view.pool[key] === null || view.pool[key] === undefined) fail();
  }
}

export function compareRaydiumV4PublicViews(primary, secondary, { network, poolAddress } = {}) {
  checkView(primary, network, poolAddress);
  checkView(secondary, network, poolAddress);
  if (primary.programId !== secondary.programId ||
      primary.expectedAuthority !== secondary.expectedAuthority) fail();
  for (const field of POOL_FIELDS) {
    if (primary.pool[field] !== secondary.pool[field]) fail();
  }
  // Slots can differ; pool configuration and derived addresses must not.
  // This comparison does not attest dynamic vault balances, block ancestry,
  // provider honesty, or the on-chain program executable.
  return Object.freeze({
    twoConfiguredRpcHostsCompared: true,
    matchingPublicPoolConfiguration: true,
    primaryFinalizedContextSlot: primary.contextSlot,
    secondaryFinalizedContextSlot: secondary.contextSlot,
    independentlyAuditedRpcSource: false,
    poolAddressIndependentlyCorroborated: false,
    jupiterCpiAccountMappingVerified: false,
    deployedProgramBytecodeVerified: false,
    approvedForJupiterCpi: false
  });
}

/**
 * Both URLs must be trusted operator configuration, never browser/user input.
 * If the second RPC fails or disagrees, fail closed rather than falling back
 * to a single source while presenting the report as corroborated.
 */
export async function fetchRaydiumV4DualRpcPublicEvidence({
  network, poolAddress, primaryRpcUrl, secondaryRpcUrl, minContextSlot = null,
  fetchEvidence = fetchRaydiumV4EvidenceFromPoolAddress
} = {}) {
  if (typeof fetchEvidence !== "function") fail();
  const first = validateRpcUrl(primaryRpcUrl);
  const second = validateRpcUrl(secondaryRpcUrl);
  if (first.hostname === second.hostname) fail();
  // Sequential calls avoid simultaneous load on externally supplied operator
  // providers. Never return a partial result on failed second RPC.
  const primary = await fetchEvidence({
    network, poolAddress, rpcUrl: first.toString(), minContextSlot
  });
  const secondary = await fetchEvidence({
    network, poolAddress, rpcUrl: second.toString(), minContextSlot
  });
  const crossCheck = compareRaydiumV4PublicViews(primary, secondary, { network, poolAddress });
  return Object.freeze({
    ...primary,
    ...crossCheck,
    // Original proof boundaries remain explicit even after agreement.
    poolAddressIndependentlyCorroborated: false,
    rpcSourceIndependentlyAudited: false,
    approvedForJupiterCpi: false
  });
}
