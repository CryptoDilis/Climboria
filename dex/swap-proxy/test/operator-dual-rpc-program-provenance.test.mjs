import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import { verifyDualRpcProgramProvenance } from "../tools/operator-dual-rpc-program-provenance.mjs";

const GENESIS = encodeBase58(Uint8Array.from({ length: 32 }, (_, i) => i + 1));
const WRONG = encodeBase58(Uint8Array.from({ length: 32 }, (_, i) => i + 2));
const FIRST = "https://primary.example/rpc?access=PRIVATE_A";
const SECOND = "https://secondary.example/rpc?access=PRIVATE_B";

function proof(slot = 300) {
  const meta = (programId, programDataAddress, bump, authority) => ({
    programId, programDataAddress,
    programDataPdaBump: bump,
    lastDeploySlot: 200,
    upgradeAuthority: authority,
    immutable: authority === null,
    loaderMetadataVerified: true,
    programDataPdaIndependentlyVerified: true,
    deployedProgramBytecodeVerified: false,
    approvedForJupiterCpi: false
  });
  return {
    network: "mainnet-beta",
    finalizedSlot: slot,
    programDataPdaIndependentlyVerified: true,
    deployedProgramBytecodeVerified: false,
    approvedForJupiterCpi: false,
    programs: {
      jupiterV6: meta(JUPITER_V6_PROGRAM_ID, "DataJupiterV6PublicAddress", 252, "PublicUpgradeAuthority"),
      raydiumV4: meta(RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"], "DataRaydiumV4PublicAddress", 251, null)
    }
  };
}

function harness({ secondary = proof(301), secondaryGenesis = GENESIS, primary = proof(300) } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const request = JSON.parse(options.body);
    const second = new URL(url).hostname === "secondary.example";
    calls.push({ method: request.method, second });
    assert.equal(request.method, "getGenesisHash");
    return Response.json({
      jsonrpc: "2.0", id: request.id,
      result: second ? secondaryGenesis : GENESIS
    });
  };
  const fetchProvenance = async ({ network, rpcUrl }) => {
    assert.equal(network, "mainnet-beta");
    const second = new URL(rpcUrl).hostname === "secondary.example";
    calls.push({ method: "getProgramMetadata", second });
    return structuredClone(second ? secondary : primary);
  };
  return { calls, fetchImpl, fetchProvenance };
}

function options(h, override = {}) {
  return {
    primaryRpcUrl: FIRST, secondaryRpcUrl: SECOND,
    expectedGenesisHash: GENESIS, fetchImpl: h.fetchImpl,
    fetchProvenance: h.fetchProvenance, ...override
  };
}

test("both RPC genesis and both full loader metadata observations agree without claiming approval", async () => {
  const h = harness();
  const result = await verifyDualRpcProgramProvenance(options(h));
  assert.deepEqual(h.calls.map(x => x.method), [
    "getGenesisHash", "getGenesisHash", "getProgramMetadata", "getProgramMetadata"
  ]);
  assert.equal(result.bothProviderReportedUpgradeableProgramMetadataAgree, true);
  assert.equal(result.programs.jupiterV6.programId, JUPITER_V6_PROGRAM_ID);
  assert.equal(result.programs.raydiumV4.immutable, true);
  assert.equal(result.programs.jupiterV6.lastDeploySlot, 200);
  assert.equal(result.primaryProviderReportedFinalizedSlot, 300);
  assert.equal(result.secondaryProviderReportedFinalizedSlot, 301);
  assert.equal(result.providerReportedFinalizedSlotDifference, 1);
  assert.equal(result.approvedForJupiterCpi, false);
  assert.equal(result.deployedProgramPayloadsHashedAndAudited, false);
  assert.equal(result.transactionSubmitted, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_A|PRIVATE_B|primary\.example|secondary\.example/);
});

test("no source if missing, same-host, private or non-HTTPS endpoints", async () => {
  for (const secondaryRpcUrl of [
    undefined, FIRST + "/another", "https://primary.example/different?key=other",
    "https://127.0.0.1", "http://secondary.example", "https://user:password@secondary.example"
  ]) {
    const h = harness();
    await assert.rejects(verifyDualRpcProgramProvenance(options(h, { secondaryRpcUrl })),
      /verification failed/);
    assert.equal(h.calls.length, 0);
  }
});

test("even matching upgrade metadata cannot approve drastically divergent finalized slots", async () => {
  for (const { primary, secondary } of [
    { primary: proof(469416561), secondary: proof(469414512) },
    { primary: proof(469414512), secondary: proof(469416561) }
  ]) {
    const h = harness({ primary, secondary });
    await assert.rejects(verifyDualRpcProgramProvenance(options(h)), /verification failed/);
    assert.deepEqual(h.calls.map(x => x.method), [
      "getGenesisHash", "getGenesisHash", "getProgramMetadata", "getProgramMetadata"
    ]);
  }
});

test("two provider snapshots at the 2048-slot boundary remain non-approving metadata evidence", async () => {
  const h = harness({ primary: proof(300000), secondary: proof(302048) });
  const result = await verifyDualRpcProgramProvenance(options(h));
  assert.equal(result.providerReportedFinalizedSlotDifference, 2048);
  assert.equal(result.approvedForProductionExecution, false);
  assert.equal(result.independentlyAuthenticatedLedgerFinality, false);
});

test("pinned network mismatch refuses program reads", async () => {
  const h = harness({ secondaryGenesis: WRONG });
  await assert.rejects(verifyDualRpcProgramProvenance(options(h)), /verification failed/);
  assert.deepEqual(h.calls.map(x => x.method), ["getGenesisHash", "getGenesisHash"]);
});

test("disagreement on upgrade authority, program data address or loader slot fails closed", async () => {
  for (const field of ["upgradeAuthority", "programDataAddress", "lastDeploySlot", "programDataPdaBump"]) {
    const second = proof(301);
    second.programs.jupiterV6[field] = field === "lastDeploySlot" ? 201 :
      field === "programDataPdaBump" ? 250 :
      "DifferentPublicValue";
    if (field === "upgradeAuthority") second.programs.jupiterV6.immutable = false;
    const h = harness({ secondary: second });
    await assert.rejects(verifyDualRpcProgramProvenance(options(h)), /verification failed/);
  }
});

test("missing proof, rejected PDA check or fabricated approved state fail securely", async () => {
  const variants = [
    null,
    { ...proof(), programDataPdaIndependentlyVerified: false },
    { ...proof(), approvedForJupiterCpi: true },
    { ...proof(), programs: { ...proof().programs, raydiumV4: null } },
    { ...proof(), programs: { ...proof().programs, raydiumV4: {
      ...proof().programs.raydiumV4, lastDeploySlot: 900
    } } }
  ];
  for (const primary of variants) {
    const h = harness({ primary });
    await assert.rejects(verifyDualRpcProgramProvenance(options(h)), /verification failed/);
  }
});

test("upstream failures and private URL tokens are never propagated", async () => {
  const h = harness();
  h.fetchProvenance = async () => { throw new Error("PRIVATE_B https://secondary.example/rpc"); };
  let error;
  try { await verifyDualRpcProgramProvenance(options(h)); } catch (e) { error = e; }
  assert.ok(error);
  assert.equal(error.message, "Read-only dual-RPC deployed program metadata verification failed");
  assert.doesNotMatch(error.message, /PRIVATE_B|secondary\.example/);
});
