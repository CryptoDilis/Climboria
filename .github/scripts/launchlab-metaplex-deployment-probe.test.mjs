import test from "node:test";
import assert from "node:assert/strict";
import {
  captureDevnetMetaplexProgramProvenance,
  BPF_UPGRADEABLE_LOADER_ID,
  METAPLEX_TOKEN_METADATA_PROGRAM_ID,
} from "./launchlab-metaplex-deployment-probe.mjs";

class PublicKey {
  constructor(value) { this.value = typeof value === "string" ? value : Buffer.from(value).toString("hex"); }
  toBase58() { return this.value; }
}
const programDataAddress = "ProgramData111111111111111111111111111111";
const authority = "UpgradeAuthority11111111111111111111111111";
function fixture({ cluster = "devnet", programMissing = false, dataMissing = false, programOwner = BPF_UPGRADEABLE_LOADER_ID, executable = true, dataOwner = BPF_UPGRADEABLE_LOADER_ID, stateTag = 3, authorityOption = 1 } = {}) {
  const calls = [];
  const programState = Buffer.alloc(36);
  programState.writeUInt32LE(2, 0);
  Buffer.alloc(32, 7).copy(programState, 4);
  const bytecode = Buffer.from("metaplex-devnet-bytecode");
  const codeOffset = authorityOption === 1 ? 45 : 13;
  const programData = Buffer.alloc(codeOffset + bytecode.length);
  programData.writeUInt32LE(stateTag, 0);
  programData.writeBigUInt64LE(123456n, 4);
  programData[12] = authorityOption;
  if (authorityOption === 1) Buffer.alloc(32, 9).copy(programData, 13);
  bytecode.copy(programData, codeOffset);
  const derivedAddress = new PublicKey(Buffer.alloc(32, 7));
  const connection = {
    getAccountInfo: async (key, commitment) => {
      calls.push({ key: key.toBase58(), commitment });
      if (key.toBase58() === METAPLEX_TOKEN_METADATA_PROGRAM_ID) {
        return programMissing ? null : { owner: new PublicKey(programOwner), executable, data: programState };
      }
      if (key.toBase58() === derivedAddress.toBase58()) {
        return dataMissing ? null : { owner: new PublicKey(dataOwner), executable: false, data: programData };
      }
      throw new Error("unexpected account request");
    },
  };
  return { connection, calls, derivedAddress };
}
const sdk = { PublicKey };

test("captures finalized Devnet program-data slot, authority, and bytecode hash without source-match claim", async () => {
  const f = fixture();
  const result = await captureDevnetMetaplexProgramProvenance({ connection: f.connection, sdk, cluster: "devnet" });
  assert.equal(result.status, "deployment_provenance_captured_source_match_unverified");
  assert.equal(result.programId, METAPLEX_TOKEN_METADATA_PROGRAM_ID);
  assert.equal(result.programDataAddress, f.derivedAddress.toBase58());
  assert.equal(result.deploymentSlot, 123456);
  assert.equal(result.upgradeAuthority, new PublicKey(Buffer.alloc(32, 9)).toBase58());
  assert.equal(result.immutable, false);
  assert.equal(result.executableByteLength, 24);
  assert.equal(result.executableSha256.length, 64);
  assert.equal(result.sourceMatchStatus, "not_verified_no_reproducible_build_comparison");
  assert.equal(result.transactionSubmitted, false);
  assert.deepEqual(f.calls.map(x => x.commitment), ["finalized", "finalized"]);
});

test("captures immutable ProgramData when upgrade authority is absent", async () => {
  const f = fixture({ authorityOption: 0 });
  const result = await captureDevnetMetaplexProgramProvenance({ connection: f.connection, sdk, cluster: "devnet" });
  assert.equal(result.upgradeAuthority, null);
  assert.equal(result.immutable, true);
});

test("rejects Mainnet, missing program, wrong loader, and non-executable program", async () => {
  const f = fixture();
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: f.connection, sdk, cluster: "mainnet" }), /restricted to Devnet/);
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ programMissing: true }).connection, sdk, cluster: "devnet" }), /program account is missing/);
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ programOwner: "System111111111111111111111111111111111" }).connection, sdk, cluster: "devnet" }), /not owned by the upgradeable BPF loader/);
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ executable: false }).connection, sdk, cluster: "devnet" }), /not executable/);
});

test("rejects missing ProgramData, bad loader state, and invalid authority option", async () => {
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ dataMissing: true }).connection, sdk, cluster: "devnet" }), /ProgramData account is missing/);
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ stateTag: 2 }).connection, sdk, cluster: "devnet" }), /unexpected state layout/);
  await assert.rejects(() => captureDevnetMetaplexProgramProvenance({ connection: fixture({ authorityOption: 7 }).connection, sdk, cluster: "devnet" }), /authority option is invalid/);
});
