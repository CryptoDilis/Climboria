import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import {
  captureDevnetMetaplexProgramProvenance,
  inspectProgramDataHistory,
  summarizeUpgradeableLoaderHistory,
  summarizeMetaplexGovernanceHistory,
  inspectGovernanceProposalAccounts,
  decodeGovernanceProposalAccountEvidence,
  verifyGovernanceUpgradeProposalEvidence,
  METAPLEX_GOVERNANCE_PROGRAM_ID,
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
            signatures: ["ExtendSignature"],
            message: {
              staticAccountKeys: [
                new PublicKey(BPF_UPGRADEABLE_LOADER_ID),
                derivedAddress,
              ],
              compiledInstructions: [{ programIdIndex: 0, accountKeyIndexes: [1] }],
            },
          },
          meta: { err: null, logMessages: ["Extended ProgramData account by 300000 bytes"] },
        }],
      };
    },
    getSignaturesForAddress: async (key, options, commitment) => {
      assert.equal(key.toBase58(), derivedAddress.toBase58());
      assert.equal(options.limit, 1000);
      assert.equal(commitment, "finalized");
      return [
        { signature: "ExtendSignature", slot: 123456, blockTime: 1794270000, err: null },
        { signature: "OriginalDeploySignature", slot: 120000, blockTime: 1794000000, err: null },
      ];
    },
    getTransaction: async signature => {
      const isExtend = signature === "ExtendSignature";
      const keys = isExtend
        ? [new PublicKey(derivedAddress.toBase58()), new PublicKey(METAPLEX_TOKEN_METADATA_PROGRAM_ID), new PublicKey("11111111111111111111111111111111"), new PublicKey("Payer111111111111111111111111111111111")]
        : [new PublicKey("Payer111111111111111111111111111111111"), new PublicKey(derivedAddress.toBase58()), new PublicKey(METAPLEX_TOKEN_METADATA_PROGRAM_ID), new PublicKey("Buffer111111111111111111111111111111111"), new PublicKey("Rent111111111111111111111111111111111"), new PublicKey("Clock11111111111111111111111111111111"), new PublicKey(authority), new PublicKey(authority)];
      const accountIndexes = isExtend ? [0, 1, 2, 3] : [0, 1, 2, 3, 4, 5, 6, 7];
      const data = isExtend ? Uint8Array.from([6, 0, 0, 0, 224, 147, 4, 0]) : Uint8Array.from([2, 0, 0, 0]);
      return {
        blockTime: isExtend ? 1794270000 : 1794000000,
        transaction: { message: { staticAccountKeys: [new PublicKey(BPF_UPGRADEABLE_LOADER_ID), ...keys], header: { numRequiredSignatures: 1 }, compiledInstructions: [{ programIdIndex: 0, accountKeyIndexes: accountIndexes.map(index => index + 1), data }] } },
        meta: {
          err: null,
          logMessages: [isExtend ? "Extended ProgramData account by 300000 bytes" : "Program deployed"],
        },
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

test("captures finalized ProgramData state slot, loader history, authority, and bytecode hash", async () => {
  const f = fixture();
  const result = await captureDevnetMetaplexProgramProvenance({ connection: f.connection, sdk, cluster: "devnet" });
  assert.equal(result.status, "deployment_provenance_captured_source_match_unverified");
  assert.equal(result.programId, METAPLEX_TOKEN_METADATA_PROGRAM_ID);
  assert.equal(result.programDataAddress, f.derivedAddress.toBase58());
  assert.equal(result.programDataStateSlot, 123456);
  assert.equal(result.programDataStateSlotBlockTimeUnix, 1794270000);
  assert.equal(result.programDataStateSlotBlockEvidence.status, "programdata_state_slot_block_inspected");
  assert.equal(result.programDataStateSlotBlockEvidence.candidateTransactions[0].signature, "ExtendSignature");
  assert.equal(result.programDataStateSlotBlockEvidence.candidateTransactions[0].loaderInstructionCount, 1);
  assert.equal(result.programDataHistory.status, "programdata_state_slot_reached");
  assert.equal(result.governanceProposalAccounts.status, "no_successful_loader_governance_executions");
  assert.equal(result.programDataLifecycle.counts.deployWithMaxDataLen, 1);
  assert.equal(result.programDataLifecycle.counts.extendProgram, 1);
  assert.equal(result.programDataLifecycle.deployWithMaxDataLenObserved, true);
  assert.deepEqual(result.programDataLifecycle.events.map(event => event.operation), ["deployWithMaxDataLen", "extendProgram"]);
  assert.equal(result.programDataLifecycle.events[1].accountRoles.additionalBytes, 300000);
  assert.equal(result.programDataHistory.signaturesScanned, 2);
  assert.equal(result.programDataHistory.reachedStateSlot, true);
  assert.equal(result.programDataHistory.signatures[0].signature, "OriginalDeploySignature");
  assert.equal(result.programDataHistory.signatures[0].loaderLogs[0], "Program deployed");
  assert.equal(result.programDataHistory.signatures[1].signature, "ExtendSignature");
  assert.equal(result.programDataHistory.signatures[1].loaderLogs[0], "Extended ProgramData account by 300000 bytes");
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
  assert.equal(result.programDataStateSlotBlockEvidence.status, "state_slot_block_unavailable");
  assert.deepEqual(result.programDataStateSlotBlockEvidence.candidateTransactions, []);
});

test("paginates backward to the state slot without fetching unrelated recent transactions", async () => {
  const pages = [];
  const fetched = [];
  const connection = {
    getSignaturesForAddress: async (_key, options, commitment) => {
      assert.equal(commitment, "finalized");
      pages.push(options);
      if (!options.before) return [
        { signature: "recent1", slot: 500 },
        { signature: "recent2", slot: 450 },
      ];
      assert.equal(options.before, "recent2");
      return [
        { signature: "extension", slot: 100 },
        { signature: "deploy", slot: 90 },
      ];
    },
    getTransaction: async signature => {
      fetched.push(signature);
      return { meta: { err: null, logMessages: ["Program deployed"] } };
    },
  };
  const result = await inspectProgramDataHistory({
    connection, programDataPublicKey: new PublicKey(programDataAddress),
    stateSlot: 100, pageSize: 2, maxPages: 3,
  });
  assert.equal(result.status, "programdata_state_slot_reached");
  assert.equal(result.pagesScanned, 2);
  assert.equal(result.signaturesScanned, 4);
  assert.deepEqual(fetched, ["deploy", "extension"]);
  assert.equal(result.complete, true);
});

test("reports bounded incomplete history without claiming the deployment was found", async () => {
  const connection = {
    getSignaturesForAddress: async (_key, options) => [
      { signature: options.before ? "recent4" : "recent2", slot: 500 },
    ],
    getTransaction: async () => { throw Error("must not fetch recent transactions"); },
  };
  const result = await inspectProgramDataHistory({
    connection, programDataPublicKey: new PublicKey(programDataAddress),
    stateSlot: 100, pageSize: 1, maxPages: 2,
  });
  assert.equal(result.status, "programdata_history_incomplete");
  assert.equal(result.reachedStateSlot, false);
  assert.equal(result.signatures.length, 0);
  assert.equal(result.pagesScanned, 2);
});

test("selects the oldest signatures when the historical transaction inspection cap is reached", async () => {
  const fetched = [];
  const connection = {
    getSignaturesForAddress: async () => [
      { signature: "recent", slot: 500 },
      { signature: "middle", slot: 300 },
      { signature: "state", slot: 100 },
      { signature: "oldest", slot: 50 },
    ],
    getTransaction: async signature => {
      fetched.push(signature);
      return { meta: { err: null, logMessages: ["Program deployed"] } };
    },
  };
  const result = await inspectProgramDataHistory({
    connection, programDataPublicKey: new PublicKey(programDataAddress),
    stateSlot: 100, pageSize: 10, maxPages: 1, maxHistoricalTransactions: 2,
  });
  assert.deepEqual(fetched, ["oldest", "state"]);
  assert.equal(result.availableHistoricalSignatureCount, 2);
  assert.equal(result.historicalCandidateCount, 2);
  assert.equal(result.complete, true);
  assert.equal(result.selectedRangeOldestSlot, 50);
  assert.equal(result.selectedRangeNewestSlot, 100);
});

test("retries rate-limited historical transaction reads and captures loader instruction evidence", async () => {
  let attempts = 0;
  const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  const programData = new PublicKey(programDataAddress);
  const connection = {
    getSignaturesForAddress: async () => [
      { signature: "oldest-loader", slot: 50 },
    ],
    getTransaction: async () => {
      attempts++;
      if (attempts === 1) throw Error("429 Too Many Requests");
      return {
        transaction: {
          message: {
            staticAccountKeys: [loader, programData],
            compiledInstructions: [
              { programIdIndex: 0, accountKeyIndexes: [1], data: "AQID" },
            ],
          },
        },
        meta: { err: null, logMessages: ["Upgraded program"] },
      };
    },
  };
  const result = await inspectProgramDataHistory({
    connection, programDataPublicKey: new PublicKey(programDataAddress),
    stateSlot: 100, pageSize: 10, maxPages: 1, maxHistoricalTransactions: 1,
  });
  assert.equal(attempts, 2);
  assert.equal(result.signatures[0].transactionAvailable, true);
  assert.equal(result.signatures[0].instructionEvidence[0].programId, loader.toBase58());
  assert.deepEqual(result.signatures[0].instructionEvidence[0].accounts, [programData.toBase58()]);
  assert.equal(result.signatures[0].instructionEvidence[0].data, "AQID");
});

test("decodes ProgramData loader operations and does not claim deployment from upgrade-only history", () => {
  const loader = "BPFLoaderUpgradeab1e11111111111111111111111";
  const programData = programDataAddress;
  const program = METAPLEX_TOKEN_METADATA_PROGRAM_ID;
  const oldAuthority = "OldAuthority111111111111111111111111111111";
  const newAuthority = "NewAuthority111111111111111111111111111111";
  const lifecycle = summarizeUpgradeableLoaderHistory([
    {
      slot: 10, signature: "upgrade-signature", transactionAvailable: true, transactionError: null,
      signerKeys: [oldAuthority],
      instructionEvidence: [{
        programId: loader, data: Buffer.from([3, 0, 0, 0]).toString("base64"),
        dataEncoding: "base64",
        accounts: [programData, program, "buffer", "spill", "rent", "clock", oldAuthority],
      }],
    },
    {
      slot: 11, signature: "authority-transfer-signature", transactionAvailable: true, transactionError: null,
      signerKeys: [oldAuthority],
      instructionEvidence: [{
        programId: loader, data: Buffer.from([4, 0, 0, 0]).toString("base64"),
        dataEncoding: "base64", accounts: [programData, oldAuthority, newAuthority],
      }],
    },
    {
      slot: 12, signature: "extend-signature", transactionAvailable: true, transactionError: null,
      signerKeys: ["payer"],
      instructionEvidence: [{
        programId: loader, data: Buffer.from([6, 0, 0, 0, 160, 5, 0, 0]).toString("base64"),
        dataEncoding: "base64", accounts: [programData, program, "system", "payer"],
      }],
    },
  ]);
  assert.deepEqual(lifecycle.counts, { upgrade: 1, setAuthority: 1, extendProgram: 1 });
  assert.equal(lifecycle.deployWithMaxDataLenObserved, false);
  assert.deepEqual(lifecycle.events.map(event => event.operation), ["upgrade", "setAuthority", "extendProgram"]);
  assert.deepEqual(lifecycle.events[1].accountRoles, {
    governedAccount: programData, currentAuthority: oldAuthority, newAuthority,
  });
  assert.equal(lifecycle.events[2].accountRoles.additionalBytes, 1440);
});

test("maps Metaplex program-governance creation and executed upgrade proposal accounts", () => {
  const realm = "Realm1111111111111111111111111111111111";
  const governance = "Governance11111111111111111111111111111";
  const currentAuthority = "Authority111111111111111111111111111111";
  const proposal = "Proposal111111111111111111111111111111";
  const proposalTransaction = "ProposalTx11111111111111111111111111111";
  const loader = "BPFLoaderUpgradeab1e11111111111111111111111";
  const governanceHistory = summarizeMetaplexGovernanceHistory([
    {
      slot: 100, signature: "create-governance", transactionAvailable: true, transactionError: null,
      governanceLogs: ["Program log: GOVERNANCE-INSTRUCTION: CreateProgramGovernance { transfer_upgrade_authority: true }"],
      instructionEvidence: [{
        programId: METAPLEX_GOVERNANCE_PROGRAM_ID,
        data: Buffer.from([5, 0, 0, 0]).toString("base64"), dataEncoding: "base64",
        accounts: [realm, governance, METAPLEX_TOKEN_METADATA_PROGRAM_ID, programDataAddress, currentAuthority, "TokenOwnerRecord", "Payer", loader, "System", "CreateAuthority"],
      }],
    },
    {
      slot: 200, signature: "execute-upgrade", transactionAvailable: true, transactionError: null,
      instructionEvidence: [{
        programId: METAPLEX_GOVERNANCE_PROGRAM_ID,
        data: Buffer.from([16, 0, 0, 0]).toString("base64"), dataEncoding: "base64",
        accounts: [governance, proposal, proposalTransaction, loader, programDataAddress, METAPLEX_TOKEN_METADATA_PROGRAM_ID, "Buffer", "Spill", "Rent", "Clock", governance],
      }],
    },
  ]);
  assert.equal(governanceHistory.events.length, 2);
  assert.equal(governanceHistory.successfulLoaderUpgradeExecutionCount, 1);
  assert.deepEqual(governanceHistory.events[0], {
    slot: 100, signature: "create-governance", instruction: "createProgramGovernance",
    realm, programGovernance: governance, governedProgram: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programData: programDataAddress, currentUpgradeAuthority: currentAuthority,
    tokenOwnerRecord: "TokenOwnerRecord", payer: "Payer", createAuthority: "CreateAuthority",
    transferUpgradeAuthority: true, success: true, transactionError: null,
  });
  assert.deepEqual(governanceHistory.events[1], {
    slot: 200, signature: "execute-upgrade", instruction: "executeTransaction",
    governance, proposal, proposalTransaction, innerProgramId: loader,
    innerProgramData: programDataAddress, innerGovernedProgram: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    innerBuffer: "Buffer", innerUpgradeAuthority: governance, success: true, transactionError: null,
  });
});

test("captures governance, proposal, and proposal-transaction accounts in one finalized read-only batch", async () => {
  const governance = "Governance11111111111111111111111111111";
  const proposal = "Proposal111111111111111111111111111111";
  const proposalTransaction = "ProposalTx11111111111111111111111111111";
  const requested = [];
  const evidence = await inspectGovernanceProposalAccounts({
    sdk: { PublicKey },
    commitment: "finalized",
    governanceHistory: {
      events: [{
        instruction: "executeTransaction", innerProgramId: BPF_UPGRADEABLE_LOADER_ID,
        success: true, governance, proposal, proposalTransaction,
      }],
    },
    connection: {
      getMultipleAccountsInfo: async (keys, commitment) => {
        assert.equal(commitment, "finalized");
        requested.push(...keys.map(key => key.toBase58()));
        return [
          { owner: new PublicKey("GovernanceProgram1111111111111111111111"), lamports: 10, executable: false, data: Buffer.from([1, 2, 3]) },
          { owner: new PublicKey("GovernanceProgram1111111111111111111111"), lamports: 20, executable: false, data: Buffer.from("proposal bytes") },
          null,
        ];
      },
    },
  });
  assert.deepEqual(requested, [governance, proposal, proposalTransaction]);
  assert.equal(evidence.status, "governance_proposal_accounts_captured");
  assert.equal(evidence.requestedCount, 3);
  assert.equal(evidence.foundCount, 2);
  assert.equal(evidence.accounts[0].dataBase64, Buffer.from([1, 2, 3]).toString("base64"));
  assert.equal(evidence.accounts[1].dataLength, Buffer.byteLength("proposal bytes"));
  assert.equal(evidence.accounts[2].exists, false);
});

test("fails closed when governance account history is unavailable", async () => {
  const evidence = await inspectGovernanceProposalAccounts({
    sdk: { PublicKey },
    governanceHistory: { events: [{
      instruction: "executeTransaction", innerProgramId: BPF_UPGRADEABLE_LOADER_ID,
      success: true, governance: "Governance11111111111111111111111111111",
      proposal: "Proposal111111111111111111111111111111",
      proposalTransaction: "ProposalTx11111111111111111111111111111",
    }] },
    connection: {},
  });
  assert.equal(evidence.status, "multiple_accounts_rpc_unavailable");
  assert.equal(evidence.requestedCount, 3);
  assert.deepEqual(evidence.accounts, []);
});

test("decodes SPL Governance ProposalV2 title/state and embedded loader upgrade transaction", () => {
  const u8 = value => Buffer.from([value]);
  const u16 = value => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };
  const u32 = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b; };
  const u64 = value => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(value)); return b; };
  const i64 = value => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(value)); return b; };
  const str = value => Buffer.concat([u32(Buffer.byteLength(value)), Buffer.from(value)]);
  const proposalData = Buffer.concat([
    u8(14), Buffer.alloc(32, 1), Buffer.alloc(32, 2), u8(5), Buffer.alloc(32, 3),
    u8(0), u8(0), u8(0), u32(1),
    str("Yes"), u64(10), u8(1), u16(1), u16(1), u16(1),
    u8(0), u8(0), u8(0), u8(0), i64(1234),
    u8(0), u8(0), u8(0), u8(0), u8(0), u8(0),
    u8(0), u8(0), u8(0), u8(1), u8(0), u8(60),
    Buffer.alloc(64), str("Metaplex Devnet upgrade"), str("https://example.invalid/proposal"),
  ]);
  const instructionAccounts = Array.from({ length: 7 }, (_, index) =>
    Buffer.concat([Buffer.alloc(32, index), u8(0), u8(1)]));
  const transactionData = Buffer.concat([
    u8(13), Buffer.alloc(32, 4), u8(0), u16(0), u32(0), u32(1),
    Buffer.alloc(32), u32(instructionAccounts.length), ...instructionAccounts,
    u32(4), Buffer.from([3, 0, 0, 0]), u8(1), i64(2000), u8(1), Buffer.alloc(8),
  ]);
  class GovernanceTestPublicKey {
    constructor(value) { this.value = value; }
    toBase58() { return BPF_UPGRADEABLE_LOADER_ID; }
  }
  const decoded = decodeGovernanceProposalAccountEvidence({
    accounts: [
      { address: "proposal-account", exists: true, dataBase64: proposalData.toString("base64") },
      { address: "proposal-transaction-account", exists: true, dataBase64: transactionData.toString("base64") },
    ],
  }, { PublicKey: GovernanceTestPublicKey });
  assert.equal(decoded.status, "governance_proposal_accounts_decoded");
  assert.equal(decoded.proposalCount, 1);
  assert.equal(decoded.proposalTransactionCount, 1);
  assert.equal(decoded.proposals[0].name, "Metaplex Devnet upgrade");
  assert.equal(decoded.proposals[0].state, "Completed");
  assert.equal(decoded.proposals[0].descriptionLink, "https://example.invalid/proposal");
  assert.equal(decoded.proposalTransactions[0].instructions[0].loaderOpcode, 3);
  assert.equal(decoded.proposalTransactions[0].instructions[0].loaderOperation, "upgrade");
  assert.equal(decoded.proposalTransactions[0].executionStatus, 1);
  assert.deepEqual(decoded.failures, []);
});

test("verifies executed governance proposal state and exact embedded ProgramData upgrade accounts", () => {
  const governance = "Governance11111111111111111111111111111";
  const proposal = "Proposal111111111111111111111111111111";
  const proposalTransaction = "ProposalTx11111111111111111111111111111";
  const programData = "ProgramData111111111111111111111111111111";
  const loader = BPF_UPGRADEABLE_LOADER_ID;
  const program = METAPLEX_TOKEN_METADATA_PROGRAM_ID;
  const proposalDetails = {
    proposals: [{ address: proposal, governance, state: "Completed", name: "Metaplex upgrade" }],
    proposalTransactions: [{
      address: proposalTransaction, proposal, executionStatus: 1,
      instructions: [{
        programId: loader, loaderOpcode: 3,
        accounts: [
          { pubkey: programData }, { pubkey: program }, { pubkey: "buffer" },
          { pubkey: "spill" }, { pubkey: "rent" }, { pubkey: "clock" }, { pubkey: governance },
        ],
      }],
    }],
  };
  const governanceHistory = { events: [{
    slot: 100, signature: "execute-upgrade", instruction: "executeTransaction",
    governance, proposal, proposalTransaction, innerProgramId: loader, success: true,
  }] };
  const verified = verifyGovernanceUpgradeProposalEvidence({
    governanceHistory, proposalDetails, programId: program, programDataAddress: programData,
    currentUpgradeAuthority: governance,
  });
  assert.equal(verified.status, "all_governance_upgrade_proposals_verified");
  assert.equal(verified.executionCount, 1);
  assert.equal(verified.verifiedCount, 1);
  const mismatch = verifyGovernanceUpgradeProposalEvidence({
    governanceHistory,
    proposalDetails: {
      ...proposalDetails,
      proposalTransactions: [{
        ...proposalDetails.proposalTransactions[0],
        instructions: [{ ...proposalDetails.proposalTransactions[0].instructions[0],
          accounts: [{ pubkey: "WrongProgramData" }, ...proposalDetails.proposalTransactions[0].instructions[0].accounts.slice(1)] }],
      }],
    },
    programId: program, programDataAddress: programData, currentUpgradeAuthority: governance,
  });
  assert.equal(mismatch.status, "governance_upgrade_proposal_verification_partial");
  assert.equal(mismatch.failedCount, 1);
  assert.equal(mismatch.results[0].checks.programDataMatches, false);
});

test("does not report governance account decoding success when the RPC batch was unavailable", () => {
  const decoded = decodeGovernanceProposalAccountEvidence({
    status: "multiple_accounts_rpc_unavailable", requestedCount: 3, accounts: [],
  }, { PublicKey });
  assert.equal(decoded.status, "governance_proposal_account_evidence_unavailable");
  assert.equal(decoded.proposalCount, 0);
  assert.deepEqual(decoded.proposals, []);
});
