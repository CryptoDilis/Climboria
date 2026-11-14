/**
 * Operator-only, read-only mainnet ProgramData cross-check against TWO separately
 * configured HTTPS RPC hosts. An independently sourced genesis hash and two
 * independently pinned full-payload SHA-256 digests are mandatory.
 *
 * Each provider is observed sequentially: pinned loader metadata, then BOTH
 * ProgramData images in one finalized RPC response. Matching claims from two
 * hosts are evidence, NOT proof of honest providers, independently authenticated
 * finality, source/bytecode parity, CPI safety, or permission to sign transactions.
 *
 * Never import this module from the live Swap Worker.
 */
import { validateRpcUrl } from "./solana-rpc.mjs";
import { validatePinnedSha256 } from "./upgradeable-program-bytecode-digest.mjs";
import { verifyOperatorRpcGenesisSet, canonicalExpectedGenesisHash } from "./raydium-v4-rpc-genesis-preflight.mjs";
import { fetchMainnetUpgradeableProgramProvenance } from "./upgradeable-program-provenance.mjs";
import { hashPinnedProgramsJointFinalizedSnapshot } from "./upgradeable-program-joint-snapshot-digest.mjs";

const ROLES = Object.freeze(["jupiterV6", "raydiumV4"]);
const METADATA_FIELDS = Object.freeze([
  "programId", "programDataAddress", "programDataPdaBump",
  "lastDeploySlot", "upgradeAuthority", "immutable"
]);
const IMAGE_FIELDS = Object.freeze([
  "programId", "programDataAddress", "programDataLastDeploySlot",
  "programDataAccountBytes", "programPayloadBytes", "sha256"
]);
function fail() {
  // Upstream exceptions may contain private endpoint URLs or query tokens.
  throw new Error("Read-only dual-RPC ProgramData evidence invalid or inconsistent");
}
function validSlot(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function checkWitness(proof, digest, pins) {
  if (proof?.network !== "mainnet-beta" ||
      proof.programDataPdaIndependentlyVerified !== true ||
      proof.approvedForJupiterCpi !== false ||
      !validSlot(proof.finalizedSlot) ||
      digest?.network !== "mainnet-beta" ||
      digest.bothMatchOperatorPinnedSha256 !== true ||
      digest.bothProgramImagesInOneFinalizedRpcResponse !== true ||
      digest.providerReportedSameFinalizedContextForBothPrograms !== true ||
      digest.independentlyAuthenticatedLedgerSnapshot !== false ||
      digest.approvedForJupiterCpi !== false ||
      !validSlot(digest.finalizedContextSlot) ||
      digest.finalizedContextSlot < proof.finalizedSlot) fail();

  for (const role of ROLES) {
    const meta = proof.programs?.[role];
    const image = digest.programs?.[role];
    if (!meta || !image ||
        typeof meta.programId !== "string" ||
        typeof meta.programDataAddress !== "string" ||
        !Number.isInteger(meta.programDataPdaBump) ||
        meta.programDataPdaBump < 0 || meta.programDataPdaBump > 255 ||
        !validSlot(meta.lastDeploySlot) ||
        meta.lastDeploySlot > proof.finalizedSlot ||
        meta.programDataPdaIndependentlyVerified !== true ||
        meta.loaderMetadataVerified !== true ||
        meta.approvedForJupiterCpi !== false ||
        image.role !== role ||
        image.programId !== meta.programId ||
        image.programDataAddress !== meta.programDataAddress ||
        image.programDataLastDeploySlot !== meta.lastDeploySlot ||
        !validSlot(image.programDataAccountBytes) ||
        !validSlot(image.programPayloadBytes) ||
        image.programDataAccountBytes - image.programPayloadBytes !== 45 ||
        image.firstFinalizedSlot !== digest.finalizedContextSlot ||
        image.lastFinalizedSlot !== digest.finalizedContextSlot ||
        image.oneFinalizedRpcResponseForWholeProgram !== true ||
        image.matchesOperatorPinnedSha256 !== true ||
        image.approvedForJupiterCpi !== false ||
        image.sha256 !== pins[role]) fail();
  }
}

/**
 * Never silently degrade to one RPC if the second fails or disagrees.
 * Different hostnames establish only configuration separation, NOT independent
 * provider ownership or an authenticated ledger proof.
 */
export async function verifyDualRpcMainnetProgramPayloads({
  primaryRpcUrl, secondaryRpcUrl, expectedGenesisHash,
  expectedJupiterSha256, expectedRaydiumSha256,
  fetchImpl = globalThis.fetch,
  fetchProvenance = fetchMainnetUpgradeableProgramProvenance,
  hashJointSnapshot = hashPinnedProgramsJointFinalizedSnapshot
} = {}) {
  try {
    const first = validateRpcUrl(primaryRpcUrl);
    const second = validateRpcUrl(secondaryRpcUrl);
    if (first.hostname === second.hostname ||
        typeof fetchImpl !== "function" ||
        typeof fetchProvenance !== "function" ||
        typeof hashJointSnapshot !== "function") fail();
    const genesis = canonicalExpectedGenesisHash(expectedGenesisHash);
    const pins = Object.freeze({
      jupiterV6: validatePinnedSha256(expectedJupiterSha256),
      raydiumV4: validatePinnedSha256(expectedRaydiumSha256)
    });

    await verifyOperatorRpcGenesisSet({
      primaryRpcUrl: first.toString(), secondaryRpcUrl: second.toString(),
      expectedGenesisHash: genesis, fetchImpl
    });

    const snapshots = [];
    for (const rpcUrl of [first.toString(), second.toString()]) {
      const proof = await fetchProvenance({
        network: "mainnet-beta", rpcUrl, fetchImpl
      });
      const digest = await hashJointSnapshot({
        provenanceProof: proof, rpcUrl,
        expectedJupiterSha256: pins.jupiterV6,
        expectedRaydiumSha256: pins.raydiumV4,
        fetchImpl
      });
      checkWitness(proof, digest, pins);
      snapshots.push({ proof, digest });
    }

    const a = snapshots[0], b = snapshots[1];
    for (const role of ROLES) {
      for (const field of METADATA_FIELDS) {
        if (a.proof.programs[role][field] !== b.proof.programs[role][field]) fail();
      }
      for (const field of IMAGE_FIELDS) {
        if (a.digest.programs[role][field] !== b.digest.programs[role][field]) fail();
      }
    }
    const programs = {};
    for (const role of ROLES) {
      const meta = a.proof.programs[role], image = a.digest.programs[role];
      programs[role] = Object.freeze({
        programId: meta.programId,
        programDataAddress: meta.programDataAddress,
        lastDeploySlot: meta.lastDeploySlot,
        upgradeAuthority: meta.upgradeAuthority,
        immutable: meta.immutable,
        programDataAccountBytes: image.programDataAccountBytes,
        programPayloadBytes: image.programPayloadBytes,
        sha256: image.sha256
      });
    }
    return Object.freeze({
      network: "mainnet-beta",
      operatorPinnedGenesisMatchesBoth: true,
      operatorExpectedGenesisHash: genesis,
      twoConfiguredRpcHostsCompared: true,
      matchingProgramMetadataAndFullPayloads: true,
      bothWitnessesUsedJointFinalizedProgramDataSnapshots: true,
      primaryProviderReportedFinalizedSlot: a.digest.finalizedContextSlot,
      secondaryProviderReportedFinalizedSlot: b.digest.finalizedContextSlot,
      programs: Object.freeze(programs),
      independentlyAuditedRpcProviders: false,
      independentlyAuthenticatedLedgerSnapshot: false,
      independentSourceToBinaryParityVerified: false,
      jupiterV6CpiSemanticsApproved: false,
      approvedForJupiterCpi: false,
      transactionsBuiltOrSubmitted: false
    });
  } catch {
    fail();
  }
}
