import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CRITICAL_INSTRUCTIONS, CRITICAL_ACCOUNTS, CRITICAL_TYPES,
  compareCriticalIdls, inspectIdlDefinitionNames, stripAccountDocs, verifySdkInstructionDiscriminators, verifyOnchainLaunchpadIdl
} from "./launchlab-onchain-idl-check.mjs";

function pinnedFixture() {
  return {
    instructions: CRITICAL_INSTRUCTIONS.map((name, i) => ({
      name, discriminator: [i,1,2,3,4,5,6,7],
      accounts: [
        { name: "payer", writable: true, signer: true },
        { name: "pool_state", writable: true, signer: false, pda: { seeds: [{ kind: "const", value: [1,2,3] }] } },
        { name: "authority", writable: false, signer: true }
      ],
      args: [{ name: "amount", type: "u64" }, { name: "limit", type: "u64" }]
    })),
    accounts: CRITICAL_ACCOUNTS.map((name,i) => ({ name, discriminator: [i, 4, 2, 1, 0, 7, 3, 9] })),
    types: CRITICAL_TYPES.map(name => ({ name, type: { kind: "struct", fields: [{ name: "amount", type: "u64" }] } }))
  };
}

test("matching critical instructions, account discriminators and types produce no drift", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const check = compareCriticalIdls(repo, live);
  assert.deepEqual(check.criticalDiscriminatorMismatches, []);
  assert.deepEqual(check.criticalAccountMetaMismatches, []);
  assert.deepEqual(check.criticalArgumentMismatches, []);
  assert.deepEqual(check.criticalInstructionSchemaDetails, []);
  assert.deepEqual(check.criticalSchemaMismatches, []);
  assert.deepEqual(check.repoOnlyInstructions, []);
  assert.deepEqual(check.liveOnlyInstructions, []);
});

test("fails closed on changed trade/launch discriminators", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions.find(x => x.name === "initialize_v2").discriminator[0] = 255;
  live.instructions.find(x => x.name === "migrate_to_cpswap").discriminator[7] = 9;
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalDiscriminatorMismatches.some(x => x.includes("initialize_v2")));
  assert.ok(check.criticalDiscriminatorMismatches.some(x => x.includes("migrate_to_cpswap")));
});

test("reports missing critical instructions even if an unrelated one is present", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions = live.instructions.filter(x => x.name !== "buy_exact_in");
  live.instructions.push({name:"harmless_new_method",discriminator:[1,1,1,1,1,1,1,1]});
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalDiscriminatorMismatches.some(x => x.includes("buy_exact_in")));
  assert.deepEqual(check.liveOnlyInstructions, ["harmless_new_method"]);
});

test("account discriminator drift blocks compatibility", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.accounts.find(x => x.name === "PoolState").discriminator = [2,2,2,2,2,2,2,2];
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalSchemaMismatches.some(x => x.includes("PoolState")));
});

test("transaction critical account type layout changes are flagged, never silently accepted", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.types.find(x => x.name === "PlatformConfig").type.fields[0].type = "u32";
  live.types.find(x => x.name === "BondingCurveParam").type.fields.push({ name: "extra", type: "u8" });
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalSchemaMismatches.some(x => x.includes("PlatformConfig")));
  assert.ok(check.criticalSchemaMismatches.some(x => x.includes("BondingCurveParam")));
  assert.equal(check.criticalSchemaDetails.length, 2);
});

test("missing essential account/type definitions are blockers", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.accounts = live.accounts.filter(x => x.name !== "GlobalConfig");
  live.types = live.types.filter(x => x.name !== "PlatformCurveParam");
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalSchemaMismatches.some(x => x.includes("GlobalConfig")));
  assert.ok(check.criticalSchemaMismatches.some(x => x.includes("PlatformCurveParam")));
});

test("rejects tampered official pinned IDL bytes before any RPC call", async () => {
  const dir = await mkdtemp(join(tmpdir(),"launchlab-onchain-idl-test-"));
  try {
    const idl = join(dir,"idl.json"), layout=join(dir,"layout.ts");
    await writeFile(idl,JSON.stringify(pinnedFixture()));
    await writeFile(layout,"invalid layout");
    await assert.rejects(verifyOnchainLaunchpadIdl(idl,layout), /Pinned official LaunchLab IDL hash mismatch/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test("SDK builder discriminators match exact pinned IDL bytes", () => {
  const repo = pinnedFixture();
  const names = {buy_exact_in:"buyExactIn", buy_exact_out:"buyExactOut", sell_exact_in:"sellExactIn", sell_exact_out:"sellExactOut", initialize_v2:"initializeV2", initialize_with_token_2022:"initializeWithToken2022", create_platform_config:"createPlatformConfig", claim_platform_fee:"claimPlatformFee", claim_platform_fee_from_vault:"claimPlatformFeeFromVault", claim_creator_fee:"claimCreatorFee", create_vesting_account:"createVestingAccount", claim_vested_token:"claimVestedToken", create_platform_vesting_account:"createPlatformVestingAccount"};
  const rows = Object.entries(names).map(([idl, sdk]) => sdk + ": Buffer.from([" + repo.instructions.find(x => x.name === idl).discriminator.join(",") + "])");
  const text = "export const anchorDataBuf = {\n" + rows.join(",\n") + "\n};";
  assert.equal(verifySdkInstructionDiscriminators(repo,text).comparedInstructionCount, 13);
  const modified = text.replace("buyExactIn: Buffer.from([2,", "buyExactIn: Buffer.from([250,");
  assert.throws(() => verifySdkInstructionDiscriminators(repo,modified), /buy_exact_in/);
  const absent = text.replace(/claimCreatorFee: Buffer\.from\(\[[^\]]+\]\),?/, "");
  assert.throws(() => verifySdkInstructionDiscriminators(repo,absent), /claim_creator_fee/);
});

test("signer, writable and PDA constraint drift blocks launches despite equal 8-byte instruction discriminator", () => {
  for (const change of [
    entry => { entry.accounts[0].signer = false; },
    entry => { entry.accounts[1].writable = false; },
    entry => { entry.accounts[1].pda.seeds[0].value[2] = 99; },
    entry => { entry.accounts[0].optional = true; }
  ]) {
    const repo = pinnedFixture(), live = structuredClone(repo);
    const ins = live.instructions.find(x => x.name === "initialize_v2");
    change(ins);
    const check = compareCriticalIdls(repo, live);
    assert.deepEqual(check.criticalDiscriminatorMismatches, []);
    assert.ok(check.criticalAccountMetaMismatches.some(x => x.startsWith("initialize_v2:")), "must reject changed account metas");
    const detail = check.criticalInstructionSchemaDetails.find(x => x.name === "initialize_v2");
    assert.ok(detail?.accountMetaDifference);
    assert.equal(detail.argumentDifference, null);
  }
});

test("critical account order, account additions and missing account arrays are release blockers", () => {
  for (const change of [
    entry => { entry.accounts.reverse(); },
    entry => { entry.accounts.push({ name: "fee_recipient", writable: true, signer: false }); },
    entry => { delete entry.accounts; }
  ]) {
    const repo = pinnedFixture(), live = structuredClone(repo);
    change(live.instructions.find(x => x.name === "migrate_to_cpswap"));
    const check = compareCriticalIdls(repo, live);
    assert.ok(check.criticalAccountMetaMismatches.some(x => x.startsWith("migrate_to_cpswap:")));
    assert.deepEqual(check.criticalDiscriminatorMismatches, []);
  }
});

test("critical argument order, encoded types and missing argument arrays block launches", () => {
  for (const change of [
    entry => { entry.args.reverse(); },
    entry => { entry.args[0].type = "u32"; },
    entry => { entry.args.push({ name: "unauditedFee", type: "u64" }); },
    entry => { delete entry.args; }
  ]) {
    const repo = pinnedFixture(), live = structuredClone(repo);
    change(live.instructions.find(x => x.name === "buy_exact_in"));
    const check = compareCriticalIdls(repo, live);
    assert.ok(check.criticalArgumentMismatches.some(x => x.startsWith("buy_exact_in:")));
    assert.deepEqual(check.criticalDiscriminatorMismatches, []);
    assert.ok(check.criticalInstructionSchemaDetails.some(x => x.name === "buy_exact_in"));
  }
});

test("missing critical instruction rejects account/argument schemas too", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions = live.instructions.filter(x => x.name !== "initialize_with_token_2022");
  const check = compareCriticalIdls(repo, live);
  assert.ok(check.criticalDiscriminatorMismatches.some(x => x.includes("initialize_with_token_2022")));
  assert.ok(check.criticalAccountMetaMismatches.some(x => x.includes("initialize_with_token_2022")));
  assert.ok(check.criticalArgumentMismatches.some(x => x.includes("initialize_with_token_2022")));
});


test("human-readable docs-only changes are classified without falsely asserting signer or PDA drift", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions.find(x => x.name === "buy_exact_in").accounts[1].docs = ["Updated provider documentation"];
  const check = compareCriticalIdls(repo, live);
  assert.deepEqual(check.criticalDiscriminatorMismatches, []);
  assert.deepEqual(check.criticalArgumentMismatches, []);
  assert.deepEqual(check.criticalAccountConstraintMismatches, []);
  assert.equal(check.criticalAccountMetaMismatches.length, 1, "raw account-IDL mismatch must remain a blocker");
  assert.match(check.documentationOnlyAccountMismatches[0], /buy_exact_in/);
  const detail = check.criticalInstructionSchemaDetails.find(x => x.name === "buy_exact_in");
  assert.equal(detail.accountConstraintDifference, false);
  assert.equal(detail.accountDocumentationOnly, true);
});

test("fixed token program address removed in live IDL is a security-relevant drift, even if docs also change", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const a = repo.instructions.find(x => x.name === "initialize_v2").accounts[0];
  const b = live.instructions.find(x => x.name === "initialize_v2").accounts[0];
  a.address = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  b.docs = ["Token program may be either SPL or Token-2022"];
  const check = compareCriticalIdls(repo, live);
  assert.equal(check.documentationOnlyAccountMismatches.length, 0);
  assert.equal(check.criticalAccountConstraintMismatches.length, 1);
  assert.match(check.criticalAccountConstraintMismatches[0], /initialize_v2/);
  assert.equal(check.criticalInstructionSchemaDetails[0].accountConstraintDifference, true);
});

test("documentation stripping preserves all account permissions and unknown constraints recursively", () => {
  const entry = [
    {
      name: "vault", signer: true, writable: true,
      docs: ["Visible explanation"],
      pda: { seeds: [{ kind: "account", path: "creator", docs: ["seed note"] }] },
      arbitraryFutureConstraint: { approved: false, docs: ["nested docs"] }
    }
  ];
  const projected = stripAccountDocs(entry);
  assert.deepEqual(projected, [{
    name: "vault", signer: true, writable: true,
    pda: { seeds: [{ kind: "account", path: "creator" }] },
    arbitraryFutureConstraint: { approved: false }
  }]);
  assert.ok(Object.hasOwn(entry[0], "docs"), "original IDL must not be mutated");
  assert.equal(projected[0].arbitraryFutureConstraint.approved, false);
});

test("signer, writable, optional, account order, PDA and args changes cannot be classified as docs-only", () => {
  for (const change of [
    entry => { entry.accounts[0].signer = false; },
    entry => { entry.accounts[1].writable = false; },
    entry => { entry.accounts[1].pda.seeds[0].value[0] = 255; },
    entry => { entry.accounts.reverse(); },
    entry => { entry.accounts[2].optional = true; },
    entry => { delete entry.accounts; }
  ]) {
    const repo = pinnedFixture(), live = structuredClone(repo);
    change(live.instructions.find(x => x.name === "migrate_to_cpswap"));
    const result = compareCriticalIdls(repo, live);
    assert.equal(result.documentationOnlyAccountMismatches.length, 0);
    assert.equal(result.criticalAccountConstraintMismatches.length, 1);
    assert.equal(result.criticalAccountMetaMismatches.length, 1);
  }
});


test("forensic report skips changed docs and locates the later security-critical account address", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const pinnedInstruction = repo.instructions.find(x => x.name === "initialize_v2");
  const observedInstruction = live.instructions.find(x => x.name === "initialize_v2");
  // First raw mismatch is prose in account index 0.
  observedInstruction.accounts[0].docs = ["Raydium now supports Token-2022"];
  // Actual enforced address constraint is later in the account list.
  pinnedInstruction.accounts[2].address = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const result = compareCriticalIdls(repo, live);
  const details = result.criticalInstructionSchemaDetails.find(x => x.name === "initialize_v2");
  assert.equal(result.criticalAccountConstraintMismatches.length, 1);
  assert.equal(result.documentationOnlyAccountMismatches.length, 0);
  assert.equal(details.accountMetaDifference.index, 0, "raw first diff remains visible");
  assert.equal(details.firstSecurityConstraintDifference.index, 2, "reveal first actual account constraint drift");
  assert.equal(details.firstSecurityConstraintDifference.pinned.address, "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  assert.equal(details.firstSecurityConstraintDifference.live.address, undefined);
  assert.deepEqual(result.criticalArgumentMismatches, []);
});

test("docs-only changes produce no material security difference", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions[0].accounts[0].docs = ["Only text changed"];
  const result = compareCriticalIdls(repo, live);
  assert.equal(result.criticalInstructionSchemaDetails[0].firstSecurityConstraintDifference, null);
  assert.equal(result.criticalAccountMetaMismatches.length, 1, "original fail-closed raw mismatch retained");
});


test("matching unambiguous pinned and live Anchor IDL namespaces remain accepted", () => {
  const original = pinnedFixture();
  const evidence = compareCriticalIdls(original, structuredClone(original));
  assert.deepEqual(evidence.idlNamespaceMismatches, []);
  assert.deepEqual(inspectIdlDefinitionNames(original, "pinned official IDL"), []);
});

test("a duplicate launch instruction can hide a conflicting signer schema behind the final Map value", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const conflicting = structuredClone(live.instructions.find(x => x.name === "initialize_v2"));
  conflicting.accounts[0].signer = false;
  // This conflicting first entry was silently discarded by last-write-wins
  // Map() before the fix, since the second entry equals pinned official IDL.
  live.instructions.unshift(conflicting);
  const evidence = compareCriticalIdls(repo, live);
  assert.deepEqual(evidence.criticalDiscriminatorMismatches, []);
  assert.deepEqual(evidence.criticalAccountMetaMismatches, []);
  assert.deepEqual(evidence.criticalArgumentMismatches, []);
  assert.equal(evidence.idlNamespaceMismatches.length, 1);
  assert.match(evidence.idlNamespaceMismatches[0], /live on-chain IDL: duplicate instructions name/);
});

test("duplicate program account definitions cannot hide fee-vault or pool-state changes", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const duplicate = structuredClone(live.accounts.find(x=>x.name === "PlatformConfig"));
  duplicate.discriminator[0] ^= 255;
  live.accounts.unshift(duplicate);
  const evidence = compareCriticalIdls(repo, live);
  assert.deepEqual(evidence.criticalSchemaMismatches, []);
  assert.match(evidence.idlNamespaceMismatches[0], /duplicate accounts name/);
});

test("duplicate type definitions are rejected even when final type layout matches", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const duplicate = structuredClone(live.types.find(x=>x.name === "CurveParams"));
  duplicate.type.fields[0].type = "u8";
  live.types.unshift(duplicate);
  const evidence = compareCriticalIdls(repo, live);
  assert.deepEqual(evidence.criticalSchemaMismatches, []);
  assert.match(evidence.idlNamespaceMismatches[0], /duplicate types name/);
});

test("duplicates in pinned official IDL are also rejected, never silently preferred", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  repo.instructions.push(structuredClone(repo.instructions[0]));
  repo.accounts.push(structuredClone(repo.accounts[0]));
  repo.types.push(structuredClone(repo.types[0]));
  const evidence = compareCriticalIdls(repo, live);
  assert.equal(evidence.idlNamespaceMismatches.length, 3);
  assert.ok(evidence.idlNamespaceMismatches.every(x => x.includes("pinned official IDL")));
});

test("noncritical duplicate definitions also fail namespace review rather than creating ambiguous SDK resolution", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  live.instructions.push({ name: "unlisted_method", discriminator: [1,2,3,4,5,6,7,8], accounts: [], args: [] });
  live.instructions.push({ name: "unlisted_method", discriminator: [7,7,7,7,7,7,7,7], accounts: [], args: [] });
  const evidence = compareCriticalIdls(repo, live);
  assert.equal(evidence.idlNamespaceMismatches.length, 1);
  assert.match(evidence.idlNamespaceMismatches[0], /duplicate instructions name/);
  assert.deepEqual(evidence.criticalDiscriminatorMismatches, []);
});

test("missing arrays and malformed entries are explicit namespace blockers without runtime TypeErrors", () => {
  for (const change of [
    x => { x.instructions = undefined; },
    x => { x.instructions = {}; },
    x => { x.accounts = {}; },
    x => { x.types = "not an array"; },
    x => { x.instructions[0] = null; },
    x => { x.accounts[0] = []; },
    x => { x.types[0] = { name: 42, type: {} }; },
    x => { x.instructions[0].name = "__invalid name__"; },
    x => { x.instructions[0].name = "x".repeat(129); }
  ]) {
    const repo = pinnedFixture(), live = structuredClone(repo);
    change(live);
    const evidence = compareCriticalIdls(repo, live);
    assert.ok(evidence.idlNamespaceMismatches.length > 0);
    assert.ok(evidence.idlNamespaceMismatches.every(x =>
      x.startsWith("live on-chain IDL:")), "must label the untrusted namespace");
  }
});

test("malformed IDL root and suspicious provider names do not appear in diagnostic strings", () => {
  assert.match(inspectIdlDefinitionNames(null)[0], /IDL root must be an object/);
  const maliciousName = "SENSITIVE_RPC_TOKEN_" + "X".repeat(150);
  const issues = inspectIdlDefinitionNames({
    instructions: [{name: maliciousName}], accounts: [], types: []
  }, "live on-chain IDL");
  assert.equal(issues.length, 1);
  assert.doesNotMatch(issues[0], /SENSITIVE_RPC_TOKEN/);
});

test("namespace diagnostics remain deterministic and include actual indices for review", () => {
  const repo = pinnedFixture();
  const live = structuredClone(repo);
  live.instructions.push(structuredClone(live.instructions[0]));
  const evidence = compareCriticalIdls(repo, live);
  assert.match(evidence.idlNamespaceMismatches[0], /indices 0 and 13/);
  assert.deepEqual(evidence.idlNamespaceMismatches,
    compareCriticalIdls(repo, live).idlNamespaceMismatches);
});
