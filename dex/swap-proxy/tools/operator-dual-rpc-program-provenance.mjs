/**
 * Operator-only read-only two-RPC comparison of deployed Jupiter V6 and
 * Raydium V4 Upgradeable Loader metadata. Reuses strict finalized headers
 * and independently derived ProgramData PDA checks from existing inspector.
 *
 * This verifies agreement of TWO RPC RESPONSES, not the integrity of those
 * RPC operators, deployed executable bytes, CPI signer/vault/fee semantics,
 * ledger finality or any permission to enable real trading.
 *
 * Never import into the Worker or a client wallet code path.
 */
import { validateRpcUrl } from "../src/solana-rpc.mjs";
import { verifyOperatorRpcGenesisSet } from "../src/raydium-v4-rpc-genesis-preflight.mjs";
import { fetchMainnetUpgradeableProgramProvenance } from "../src/upgradeable-program-provenance.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";

const PROGRAMS = Object.freeze({
  jupiterV6: JUPITER_V6_PROGRAM_ID,
  raydiumV4: RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]
});
// The independent connectivity preflight already rejects stale finalized-slot
// witnesses beyond this difference. Preserve the same fail-closed bound here.
const MAX_FINALIZED_SLOT_DRIFT = 2048;
const META = Object.freeze([
  "programId", "programDataAddress", "programDataPdaBump",
  "lastDeploySlot", "upgradeAuthority", "immutable"
]);
function fail() {
  // Never surface provider error objects, URLs or query-string tokens.
  throw new Error("Read-only dual-RPC deployed program metadata verification failed");
}
function checkedMetadata(proof, role) {
  const value = proof?.programs?.[role];
  if (!value ||
      value.programId !== PROGRAMS[role] ||
      typeof value.programDataAddress !== "string" ||
      !Number.isInteger(value.programDataPdaBump) ||
      value.programDataPdaBump < 0 || value.programDataPdaBump > 255 ||
      !Number.isSafeInteger(value.lastDeploySlot) ||
      value.lastDeploySlot < 0 || value.lastDeploySlot > proof.finalizedSlot ||
      !(value.upgradeAuthority === null || typeof value.upgradeAuthority === "string") ||
      value.immutable !== (value.upgradeAuthority === null) ||
      value.loaderMetadataVerified !== true ||
      value.programDataPdaIndependentlyVerified !== true ||
      value.deployedProgramBytecodeVerified !== false ||
      value.approvedForJupiterCpi !== false) fail();
  return value;
}

/**
 * Fail closed on any missing source, divergent metadata or failed RPC.
 * The pinned genesis is independently supplied by the operator, never
 * learned or accepted from either RPC provider as the reference value.
 */
export async function verifyDualRpcProgramProvenance({
  primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash,
  fetchImpl = globalThis.fetch,
  fetchProvenance = fetchMainnetUpgradeableProgramProvenance
} = {}) {
  try {
    if (typeof fetchImpl !== "function" ||
        typeof fetchProvenance !== "function") fail();
    const first = validateRpcUrl(primaryRpcUrl);
    const second = validateRpcUrl(secondaryRpcUrl);
    if (first.hostname === second.hostname) fail();

    const genesis = await verifyOperatorRpcGenesisSet({
      primaryRpcUrl: first.toString(),
      secondaryRpcUrl: second.toString(),
      expectedGenesisHash, fetchImpl
    });
    if (genesis.witnessedRpcCount !== 2 ||
        genesis.matchesOperatorExpectedGenesis !== true) fail();

    const observations = [];
    for (const rpcUrl of [first.toString(), second.toString()]) {
      const proof = await fetchProvenance({
        network: "mainnet-beta", rpcUrl, fetchImpl
      });
      if (proof?.network !== "mainnet-beta" ||
          !Number.isSafeInteger(proof.finalizedSlot) ||
          proof.finalizedSlot <= 0 ||
          proof.programDataPdaIndependentlyVerified !== true ||
          proof.deployedProgramBytecodeVerified !== false ||
          proof.approvedForJupiterCpi !== false) fail();
      for (const role of Object.keys(PROGRAMS)) checkedMetadata(proof, role);
      observations.push(proof);
    }
    const [a, b] = observations;
    const providerReportedFinalizedSlotDifference = Math.abs(a.finalizedSlot - b.finalizedSlot);
    if (providerReportedFinalizedSlotDifference > MAX_FINALIZED_SLOT_DRIFT) fail();
    const programs = {};
    for (const role of Object.keys(PROGRAMS)) {
      const one = checkedMetadata(a, role);
      const two = checkedMetadata(b, role);
      if (one.lastDeploySlot > b.finalizedSlot ||
          two.lastDeploySlot > a.finalizedSlot ||
          META.some(field => one[field] !== two[field])) fail();
      programs[role] = Object.freeze(
        Object.fromEntries(META.map(field => [field, one[field]]))
      );
    }
    return Object.freeze({
      kind: "CLIMBORIA_READ_ONLY_DUAL_RPC_PROGRAM_METADATA_EVIDENCE",
      network: "mainnet-beta",
      expectedGenesisHash: genesis.genesisHash,
      bothProviderReportedGenesisMatchedOperatorPin: true,
      distinctConfiguredRpcHostnames: true,
      primaryProviderReportedFinalizedSlot: a.finalizedSlot,
      secondaryProviderReportedFinalizedSlot: b.finalizedSlot,
      providerReportedFinalizedSlotDifference,
      bothProviderReportedUpgradeableProgramMetadataAgree: true,
      programs: Object.freeze(programs),
      independentlyVerifiedDifferentOperators: false,
      independentlyAuthenticatedLedgerFinality: false,
      deployedProgramPayloadsHashedAndAudited: false,
      sourceToBinaryParityVerified: false,
      cpiSignerVaultFeeSecurityAudited: false,
      approvedForJupiterCpi: false,
      approvedForProductionExecution: false,
      transactionSubmitted: false
    });
  } catch { fail(); }
}
