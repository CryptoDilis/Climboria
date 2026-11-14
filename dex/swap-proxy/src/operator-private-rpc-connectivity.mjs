/**
 * Operator-only, read-only preflight for TWO private Solana RPC endpoints.
 * Matches each endpoint's reported genesis against an externally pinned hash,
 * then verifies both support a bounded finalized getSlot request.
 * Provider statements are not cryptographic ledger finality, infrastructure
 * independence, deployed-program audit or authorization to execute swaps.
 * Never imported by the public Worker or wallet client.
 */
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";
import { verifyOperatorRpcGenesisSet } from "./raydium-v4-rpc-genesis-preflight.mjs";

const REQUEST_ID = "climboria-operator-rpc-finalized-slot";
const MAX_FINALIZED_SLOT_DRIFT = 2048;
function fail() { throw new Error("Private dual-RPC connectivity preflight failed securely"); }

async function reportedFinalizedSlot(url, fetchImpl) {
  try {
    const response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: REQUEST_ID, method: "getSlot",
        params: [{ commitment: "finalized" }]
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    if (!response?.ok) fail();
    const payload = JSON.parse(await readBoundedBody(response));
    if (payload?.jsonrpc !== "2.0" || payload?.id !== REQUEST_ID ||
        payload.error || !Number.isSafeInteger(payload.result) || payload.result <= 0) fail();
    return payload.result;
  } catch { fail(); }
}

/**
 * Validate both independently configured endpoints; never silently downgrade
 * to one provider. Distinct hostnames do not prove distinct operators.
 * No URL, API credential, raw transport error or provider response is returned.
 */
export async function verifyPrivateDualRpcConnectivity({
  primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash,
  fetchImpl = globalThis.fetch
} = {}) {
  try {
    if (typeof fetchImpl !== "function") fail();
    const first = validateRpcUrl(primaryRpcUrl);
    const second = validateRpcUrl(secondaryRpcUrl);
    if (first.hostname === second.hostname) fail();
    const genesis = await verifyOperatorRpcGenesisSet({
      primaryRpcUrl: first.toString(), secondaryRpcUrl: second.toString(),
      expectedGenesisHash, fetchImpl
    });
    if (genesis.witnessedRpcCount !== 2 || genesis.matchesOperatorExpectedGenesis !== true) fail();
    const [primaryFinalizedSlot, secondaryFinalizedSlot] = await Promise.all([
      reportedFinalizedSlot(first, fetchImpl),
      reportedFinalizedSlot(second, fetchImpl)
    ]);
    const finalizedSlotDifference = Math.abs(primaryFinalizedSlot - secondaryFinalizedSlot);
    if (finalizedSlotDifference > MAX_FINALIZED_SLOT_DRIFT) fail();
    return Object.freeze({
      kind: "CLIMBORIA_PRIVATE_DUAL_RPC_READ_ONLY_CONNECTIVITY",
      twoConfiguredDistinctRpcHostnames: true,
      bothProviderReportedGenesisMatchesOperatorPin: true,
      primaryFinalizedSlot, secondaryFinalizedSlot,
      finalizedSlotDifference,
      independentlyVerifiedDifferentOperators: false,
      independentlyAuthenticatedLedgerFinality: false,
      reviewedJupiterRaydiumProgramBytes: false,
      approvedForProductionExecution: false,
      submittedTransaction: false
    });
  } catch { fail(); }
}
