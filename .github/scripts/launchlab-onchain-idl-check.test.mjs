import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CRITICAL_INSTRUCTIONS, CRITICAL_ACCOUNTS, CRITICAL_TYPES,
  compareCriticalIdls, verifySdkInstructionDiscriminators, verifyOnchainLaunchpadIdl
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
