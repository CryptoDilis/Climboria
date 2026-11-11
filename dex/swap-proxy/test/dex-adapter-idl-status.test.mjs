import test from "node:test";
import assert from "node:assert/strict";
import { classifyDexAdapterIdlEvidence } from "../tools/dex-adapter-idl-status.mjs";

const complete = {
  candidateTransactionSlot: 468153382,
  activeHistoricalRevisionCount: 1,
  activeSourcesAgreeOnInstructionSchema: true,
  latestAndActiveHistorySchemasAgree: true,
  programLoaderOwnerMatches: true,
  programDataDeploymentSlot: "468000000",
  onChainIdlFound: true,
  onChainIdlOwnerMatchesProgram: true,
  onChainInstructionSchemaMatchesActiveHistory: true,
  onChainPayloadMatchesActiveHistory: true,
};

test("classifies complete candidate-slot IDL provenance as supported", () => {
  const result = classifyDexAdapterIdlEvidence(complete);
  assert.equal(result.status, "supported");
  assert.deepEqual(result.reasons, []);
  assert.equal(result.scope, "candidate-transaction-idl-provenance");
});

test("classifies missing and ambiguous evidence as incomplete with reason codes", () => {
  const result = classifyDexAdapterIdlEvidence({
    ...complete,
    activeHistoricalRevisionCount: 2,
    latestAndActiveHistorySchemasAgree: false,
    onChainPayloadMatchesActiveHistory: false,
  });
  assert.equal(result.status, "incomplete");
  assert.ok(result.reasons.includes("multiple-active-historical-idl-revisions"));
  assert.ok(result.reasons.includes("latest-and-active-history-schema-disagree-or-missing"));
  assert.ok(result.reasons.includes("on-chain-idl-payload-not-matched-to-active-history"));
});

test("treats a later ProgramData deployment as incomplete, not proof of historical absence", () => {
  const result = classifyDexAdapterIdlEvidence({
    ...complete,
    programDataDeploymentSlot: "468190520",
  });
  assert.equal(result.status, "incomplete");
  assert.deepEqual(result.reasons, ["current-programdata-last-deployment-after-candidate-slot"]);
  assert.equal(result.scope, "candidate-transaction-idl-provenance");
});

test("does not infer incompatibility when deployment-slot evidence is missing", () => {
  const result = classifyDexAdapterIdlEvidence({
    ...complete,
    programDataDeploymentSlot: null,
  });
  assert.equal(result.status, "incomplete");
  assert.ok(result.reasons.includes("program-deployment-slot-unavailable"));
});

test("classifies candidate-slot absence as incompatible only when archival evidence proves it", () => {
  const result = classifyDexAdapterIdlEvidence({
    ...complete,
    candidateSlotProgramExistenceVerified: false,
  });
  assert.equal(result.status, "incompatible");
  assert.deepEqual(result.reasons, ["program-absent-at-candidate-slot-verified"]);
});
