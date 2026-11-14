import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import { verifyDualRpcMainnetProgramPayloads } from "../src/upgradeable-program-dual-rpc-digest.mjs";

const key = n => encodeBase58(new Uint8Array(32).fill(n));
const GENESIS = key(8);
const PINS = { jupiterV6: "a".repeat(64), raydiumV4: "b".repeat(64) };
const PRIMARY = "https://provider-one.example/rpc?key=FIRST_SECRET";
const SECONDARY = "https://provider-two.example/rpc?key=SECOND_SECRET";
const ROLES = ["jupiterV6", "raydiumV4"];

function proof() {
  return {
    network: "mainnet-beta", finalizedSlot: 100,
    programDataPdaIndependentlyVerified: true, approvedForJupiterCpi: false,
    programs: {
      jupiterV6: {
        programId: key(1), programDataAddress: key(2),
        programDataPdaBump: 254, lastDeploySlot: 90,
        upgradeAuthority: key(3), immutable: false,
        programDataPdaIndependentlyVerified: true,
        loaderMetadataVerified: true, approvedForJupiterCpi: false
      },
      raydiumV4: {
        programId: key(4), programDataAddress: key(5),
        programDataPdaBump: 255, lastDeploySlot: 91,
        upgradeAuthority: null, immutable: true,
        programDataPdaIndependentlyVerified: true,
        loaderMetadataVerified: true, approvedForJupiterCpi: false
      }
    }
  };
}
function digest(p, slot) {
  return {
    network: "mainnet-beta", finalizedContextSlot: slot,
    bothMatchOperatorPinnedSha256: true,
    bothProgramImagesInOneFinalizedRpcResponse: true,
    providerReportedSameFinalizedContextForBothPrograms: true,
    independentlyAuthenticatedLedgerSnapshot: false,
    approvedForJupiterCpi: false,
    programs: Object.fromEntries(ROLES.map(role => [role, {
      role, programId: p.programs[role].programId,
      programDataAddress: p.programs[role].programDataAddress,
      programDataLastDeploySlot: p.programs[role].lastDeploySlot,
      programDataAccountBytes: 1100, programPayloadBytes: 1055,
      sha256: PINS[role],
      firstFinalizedSlot: slot, lastFinalizedSlot: slot,
      oneFinalizedRpcResponseForWholeProgram: true,
      matchesOperatorPinnedSha256: true,
      approvedForJupiterCpi: false
    }]))
  };
}
function harness({ mutateProof, mutateDigest, failSecond, badGenesisHost } = {}) {
  const requests = [];
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, options, body });
    assert.equal(body.method, "getGenesisHash");
    assert.equal(options.redirect, "error");
    return Response.json({
      jsonrpc: "2.0", id: body.id,
      result: url.startsWith(badGenesisHost || "missing-host") ? key(9) : GENESIS
    });
  };
  const fetchProvenance = async ({ network, rpcUrl }) => {
    assert.equal(network, "mainnet-beta");
    const index = calls.push({ kind: "provenance", rpcUrl });
    if (failSecond && index === 3) throw new Error("SECRET_SECOND_RPC_URL");
    const p = proof();
    mutateProof?.(p, index === 1 ? 0 : 1);
    return p;
  };
  const hashJointSnapshot = async ({ provenanceProof, rpcUrl, expectedJupiterSha256, expectedRaydiumSha256 }) => {
    calls.push({ kind: "digest", rpcUrl });
    assert.equal(expectedJupiterSha256, PINS.jupiterV6);
    assert.equal(expectedRaydiumSha256, PINS.raydiumV4);
    const n = calls.filter(c => c.kind === "digest").length;
    const d = digest(provenanceProof, n === 1 ? 120 : 130);
    mutateDigest?.(d, n === 1 ? 0 : 1);
    return d;
  };
  return { requests, calls, fetchImpl, fetchProvenance, hashJointSnapshot };
}
const input = (h, overrides = {}) => ({
  primaryRpcUrl: PRIMARY, secondaryRpcUrl: SECONDARY,
  expectedGenesisHash: GENESIS,
  expectedJupiterSha256: PINS.jupiterV6,
  expectedRaydiumSha256: PINS.raydiumV4,
  ...h, ...overrides
});
const rejected = /Read-only dual-RPC ProgramData evidence invalid or inconsistent/;

test("two distinct RPC hosts witness independently pinned genesis, stable metadata and joint image digests", async () => {
  const h = harness();
  const result = await verifyDualRpcMainnetProgramPayloads(input(h));
  assert.equal(h.requests.length, 2);
  assert.equal(h.calls.length, 4);
  assert.deepEqual(h.calls.map(x => x.kind), ["provenance","digest","provenance","digest"]);
  assert.equal(result.primaryProviderReportedFinalizedSlot, 120);
  assert.equal(result.secondaryProviderReportedFinalizedSlot, 130);
  assert.equal(result.programs.jupiterV6.sha256, PINS.jupiterV6);
  assert.equal(result.programs.raydiumV4.sha256, PINS.raydiumV4);
  assert.equal(result.twoConfiguredRpcHostsCompared, true);
  assert.equal(result.matchingProgramMetadataAndFullPayloads, true);
  for (const flag of [
    "independentlyAuditedRpcProviders", "independentlyAuthenticatedLedgerSnapshot",
    "independentSourceToBinaryParityVerified", "jupiterV6CpiSemanticsApproved",
    "approvedForJupiterCpi", "transactionsBuiltOrSubmitted"
  ]) assert.equal(result[flag], false, flag);
  assert.doesNotMatch(JSON.stringify(result), /FIRST_SECRET|SECOND_SECRET|provider-one|provider-two/);
});

test("same-host alternative API keys and malformed pins fail before any RPC", async () => {
  for (const overrides of [
    {secondaryRpcUrl:"https://provider-one.example/other?token=SECOND_SECRET"},
    {expectedJupiterSha256:"incorrect"},
    {expectedRaydiumSha256:"0x"+"b".repeat(64)},
    {expectedGenesisHash:"not-base58"},
    {secondaryRpcUrl:"http://provider-two.example"}
  ]) {
    const h = harness();
    await assert.rejects(verifyDualRpcMainnetProgramPayloads(input(h, overrides)), rejected);
    assert.equal(h.requests.length, 0);
    assert.equal(h.calls.length, 0);
  }
});

test("genesis mismatch on second RPC denies both, no later metadata or payload calls", async () => {
  const h = harness({ badGenesisHost: "https://provider-two.example" });
  await assert.rejects(verifyDualRpcMainnetProgramPayloads(input(h)), rejected);
  assert.equal(h.requests.length, 2);
  assert.equal(h.calls.length, 0);
});

test("provider metadata disagreement or dishonest approval flags fail closed", async () => {
  for (const mutate of [
    p => { p.programs.jupiterV6.upgradeAuthority = key(6); },
    p => { p.programs.raydiumV4.lastDeploySlot = 92; },
    p => { p.programs.jupiterV6.programDataAddress = key(7); },
    p => { p.programDataPdaIndependentlyVerified = false; },
    p => { p.programs.raydiumV4.loaderMetadataVerified = false; },
    p => { p.approvedForJupiterCpi = true; }
  ]) {
    const h = harness({ mutateProof:(p,i)=>{if(i===1)mutate(p);} });
    await assert.rejects(verifyDualRpcMainnetProgramPayloads(input(h)), rejected);
  }
});

test("payload, slot, source flags or full-image size mismatches fail closed", async () => {
  for (const mutate of [
    d => { d.programs.jupiterV6.sha256 = "c".repeat(64); },
    d => { d.programs.raydiumV4.programDataAccountBytes = 1200; },
    d => { d.programs.jupiterV6.programPayloadBytes = 1054; },
    d => { d.finalizedContextSlot = 99; },
    d => { d.programs.jupiterV6.firstFinalizedSlot = 129; },
    d => { d.bothProgramImagesInOneFinalizedRpcResponse = false; },
    d => { d.providerReportedSameFinalizedContextForBothPrograms = false; },
    d => { d.programs.raydiumV4.approvedForJupiterCpi = true; },
    d => { d.independentlyAuthenticatedLedgerSnapshot = true; }
  ]) {
    const h = harness({ mutateDigest:(d,i)=>{if(i===1)mutate(d);} });
    await assert.rejects(verifyDualRpcMainnetProgramPayloads(input(h)), rejected);
  }
});

test("second provider failures do not degrade to one-source evidence or leak credentials", async () => {
  const h = harness({ failSecond: true });
  let err;
  try { await verifyDualRpcMainnetProgramPayloads(input(h)); } catch (error) { err = error; }
  assert.match(err?.message || "", rejected);
  assert.doesNotMatch(err.message, /SECRET|provider-one|provider-two|https:/);
  assert.equal(h.calls.length, 3);
});
