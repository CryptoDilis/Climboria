import { createHash } from "node:crypto";

/**
 * Evidence-only DEX adapter IDL provenance classification.
 * This does not establish runtime CPI account slicing, deployed binary identity,
 * signer/writable privileges, or transaction safety.
 */
function canonicalizeIdlValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeIdlValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalizeIdlValue(value[key])]),
    );
  }
  return value;
}

export function canonicalIdlSchemaSha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeIdlValue(value)))
    .digest("hex");
}

export function classifyDexAdapterIdlEvidence(evidence) {
  const reasons = [];
  const deploymentSlot = evidence.programDataDeploymentSlot == null
    ? null
    : BigInt(evidence.programDataDeploymentSlot);
  const candidateSlot = BigInt(evidence.candidateTransactionSlot);

  if (evidence.candidateSlotProgramExistenceVerified === false) {
    reasons.push("program-absent-at-candidate-slot-verified");
    return {
      status: "incompatible",
      scope: "candidate-transaction-idl-provenance",
      reasons,
      evidence,
    };
  }

  // ProgramData stores the most recent deployment/upgrade slot. A later slot
  // does not prove the program was absent at an earlier candidate slot.
  if (deploymentSlot !== null && deploymentSlot > candidateSlot) {
    reasons.push("current-programdata-last-deployment-after-candidate-slot");
  }

  if (evidence.activeHistoricalRevisionCount === 0) {
    reasons.push("no-active-historical-idl-revision");
  } else if (
    evidence.activeHistoricalRevisionCount !== 1 &&
    evidence.activeSourcesAgreeOnFullIdl !== true
  ) {
    reasons.push("multiple-active-historical-idl-revisions");
  }
  if (evidence.activeSourcesAgreeOnInstructionSchema !== true) {
    reasons.push("active-history-sources-do-not-establish-one-schema");
  }
  if (evidence.latestAndActiveHistorySchemasAgree !== true) {
    reasons.push("latest-and-active-history-schema-disagree-or-missing");
  }
  if (evidence.programLoaderOwnerMatches !== true) {
    reasons.push("program-upgradeable-loader-provenance-unverified");
  }
  if (deploymentSlot === null) {
    reasons.push("program-deployment-slot-unavailable");
  }
  if (evidence.onChainIdlFound !== true) {
    reasons.push("on-chain-idl-account-unavailable");
  }
  if (evidence.onChainIdlOwnerMatchesProgram !== true) {
    reasons.push("on-chain-idl-owner-not-verified");
  }
  if (evidence.onChainInstructionSchemaMatchesActiveHistory !== true) {
    reasons.push("on-chain-instruction-schema-not-matched-to-active-history");
  }
  if (evidence.onChainPayloadMatchesActiveHistory !== true) {
    reasons.push("on-chain-idl-payload-not-matched-to-active-history");
  }

  const status = reasons.length === 0 ? "supported" : "incomplete";
  return {
    status,
    scope: "candidate-transaction-idl-provenance",
    reasons,
    evidence,
  };
}
