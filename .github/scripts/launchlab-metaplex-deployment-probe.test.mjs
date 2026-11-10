import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import {
  captureDevnetMetaplexProgramProvenance,
  compareExecutableToPinnedBuildArtifact,
  PINNED_METAPLEX_BUILD_ARTIFACT,
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
    getBlockTime: async slot => { assert.equal(slot, 123456); return 1794270000; },
    getBlock: async (slot, config) => {
      assert.equal(slot, 123456);
      assert.equal(config.commitment, "finalized");
      return {
        blockTime: 1794270000,
        transactions: [{
          transaction: {
            signatures: ["DeployOrUpgradeSignature"],
            message: {
              staticAccountKeys: [
                new PublicKey(BPF_UPGRADEABLE_LOADER_ID),
                derivedAddress,
              ],
              compiledInstructions: [{ programIdIndex: 0, accountKeyIndexes: [1] }],
            },
          },
          meta: { err: null, logMessages: ["Program upgraded successfully"] },
        }],
      };
    },
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
  assert.equal(result.deploymentBlockTimeUnix, 1794270000);
  assert.equal(result.deploymentTransactionEvidence.status, "deployment_block_inspected");
  assert.equal(result.deploymentTransactionEvidence.candidateTransactions[0].signature, "DeployOrUpgradeSignature");
  assert.equal(result.deploymentTransactionEvidence.candidateTransactions[0].loaderInstructionCount, 1);
  assert.equal(result.upgradeAuthority, new PublicKey(Buffer.alloc(32, 9)).toBase58());
  assert.equal(result.immutable, false);
  assert.equal(result.executableByteLength, 24);
  assert.equal(result.executableSha256.length, 64);
  assert.equal(result.sourceMatchStatus, "pinned_build_artifact_not_matched");
  assert.equal(result.pinnedBuildArtifact.sourceCommit, "7ce760f9e010cb9819ffd7dd86986a44691bd1f8");
  assert.equal(result.pinnedBuildArtifactComparison.status, "deployed_program_shorter_than_build_artifact");
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

test("matches an exact official build artifact prefix with only zero-filled loader padding", () => {
  const artifact = Buffer.from("reproducible-metaplex-elf-fixture");
  const deployed = Buffer.concat([artifact, Buffer.alloc(16)]);
  const comparison = compareExecutableToPinnedBuildArtifact(deployed, {
    artifactLength: artifact.length,
    artifactSha256: createHash("sha256").update(artifact).digest("hex"),
  });
  assert.equal(comparison.exactMatch, true);
  assert.equal(comparison.status, "exact_pinned_artifact_match_with_zero_padding");
  assert.equal(comparison.trailingPaddingLength, 16);
  assert.equal(comparison.trailingPaddingIsZero, true);
});

test("does not accept an artifact prefix mismatch or nonzero bytes after the artifact", () => {
  const artifact = Buffer.from("expected-elf");
  const hash = createHash("sha256").update(artifact).digest("hex");
  const mismatch = compareExecutableToPinnedBuildArtifact(Buffer.from("different-elf"), {
    artifactLength: artifact.length, artifactSha256: hash,
  });
  assert.equal(mismatch.exactMatch, false);
  assert.equal(mismatch.status, "pinned_artifact_hash_mismatch");
  const nonzeroTail = compareExecutableToPinnedBuildArtifact(Buffer.concat([artifact, Buffer.from([1])]), {
    artifactLength: artifact.length, artifactSha256: hash,
  });
  assert.equal(nonzeroTail.prefixHashMatches, true);
  assert.equal(nonzeroTail.trailingPaddingIsZero, false);
  assert.equal(nonzeroTail.exactMatch, false);
});

test("requires valid pinned artifact hash and length", () => {
  assert.throws(() => compareExecutableToPinnedBuildArtifact(Buffer.alloc(1), {
    artifactLength: 0, artifactSha256: "bad",
  }), /Pinned build artifact length and SHA-256 are required/);
  assert.equal(PINNED_METAPLEX_BUILD_ARTIFACT.byteLength, 685688);
});

test("reports unavailable deployment block history without inventing a transaction signature", async () => {
  const f = fixture();
  f.connection.getBlock = async () => null;
  const result = await captureDevnetMetaplexProgramProvenance({ connection: f.connection, sdk, cluster: "devnet" });
  assert.equal(result.deploymentTransactionEvidence.status, "deployment_block_unavailable");
  assert.deepEqual(result.deploymentTransactionEvidence.candidateTransactions, []);
});
