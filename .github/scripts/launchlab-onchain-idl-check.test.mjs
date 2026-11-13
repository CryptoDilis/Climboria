import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CRITICAL_INSTRUCTIONS, CRITICAL_ACCOUNTS, CRITICAL_TYPES,
  compareCriticalIdls, verifyOnchainLaunchpadIdl
} from "./launchlab-onchain-idl-check.mjs";

function pinnedFixture() {
  return {
    instructions: CRITICAL_INSTRUCTIONS.map((name, i) => ({ name, discriminator: [i,1,2,3,4,5,6,7] })),
    accounts: CRITICAL_ACCOUNTS.map((name,i) => ({ name, discriminator: [i, 4, 2, 1, 0, 7, 3, 9] })),
    types: CRITICAL_TYPES.map(name => ({ name, type: { kind: "struct", fields: [{ name: "amount", type: "u64" }] } }))
  };
}

test("matching critical instructions, account discriminators and types produce no drift", () => {
  const repo = pinnedFixture(), live = structuredClone(repo);
  const check = compareCriticalIdls(repo, live);
  assert.deepEqual(check.criticalDiscriminatorMismatches, []);
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
