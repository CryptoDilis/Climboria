/**
 * Read-only provenance capture for the canonical Metaplex Token Metadata
 * program on Devnet. ProgramDataState.slot is the last loader modification
 * slot (including ExtendProgram), not necessarily the initial deployment slot.
 * Captures loader history and deployed bytecode SHA-256 without claiming a
 * source match unless a reproducible build artifact is identical.
 */
import { createHash } from "node:crypto";

export const METAPLEX_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const BPF_UPGRADEABLE_LOADER_ID = "BPFLoaderUpgradeab1e11111111111111111111111";
export const PINNED_METAPLEX_BUILD_ARTIFACT = Object.freeze({
  sourceCommit: "7ce760f9e010cb9819ffd7dd86986a44691bd1f8",
  workflowRunId: 42729492423,
  artifactId: 13724730597,
  artifactPath: "programs/.bin/token_metadata.so",
  byteLength: 685688,
  sha256: "d1914b9af7eda34d66e54de20e11b55dcfdbf4652dfff89cce0808681960fee8",
});

const fail = message => { throw new Error(message); };

export function compareExecutableToPinnedBuildArtifact(executableBytes, {
  artifactLength,
  artifactSha256,
}) {
  const bytes = Buffer.from(executableBytes ?? []);
  if (!Number.isSafeInteger(artifactLength) || artifactLength < 1 ||
      typeof artifactSha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifactSha256)) {
    fail("Pinned build artifact length and SHA-256 are required");
  }
  if (bytes.length < artifactLength) {
    return {
      status: "deployed_program_shorter_than_build_artifact",
      artifactLength,
      deployedLength: bytes.length,
      prefixSha256: null,
      prefixHashMatches: false,
      trailingPaddingLength: 0,
      trailingPaddingIsZero: false,
      exactMatch: false,
    };
  }
  const prefix = bytes.subarray(0, artifactLength);
  const trailing = bytes.subarray(artifactLength);
  const prefixSha256 = createHash("sha256").update(prefix).digest("hex");
  const prefixHashMatches = prefixSha256 === artifactSha256;
  const trailingPaddingIsZero = trailing.every(byte => byte === 0);
  const exactMatch = prefixHashMatches && trailingPaddingIsZero;
  return {
    status: exactMatch
      ? "exact_pinned_artifact_match_with_zero_padding"
      : prefixHashMatches
        ? "artifact_prefix_matches_but_trailing_bytes_are_nonzero"
        : "pinned_artifact_hash_mismatch",
    artifactLength,
    deployedLength: bytes.length,
    prefixSha256,
    prefixHashMatches,
    trailingPaddingLength: trailing.length,
    trailingPaddingIsZero,
    exactMatch,
  };
}

export async function inspectProgramDataStateSlotBlock({
  connection,
  stateSlot,
  programId,
  programDataAddress,
  loaderId = BPF_UPGRADEABLE_LOADER_ID,
}) {
  if (typeof connection?.getBlock !== "function") {
    return { status: "block_rpc_unavailable", stateSlot, candidateTransactions: [] };
  }
  let block;
  try {
    block = await connection.getBlock(stateSlot, {
      commitment: "finalized",
      transactionDetails: "full",
      rewards: false,
      maxSupportedTransactionVersion: 0,
    });
  } catch (error) {
    return {
      status: "state_slot_block_fetch_failed",
      stateSlot,
      reason: String(error.message || error),
      candidateTransactions: [],
    };
  }
  if (!block) return { status: "state_slot_block_unavailable", stateSlot, candidateTransactions: [] };
  const candidates = [];
  for (const entry of block.transactions ?? []) {
    const tx = entry.transaction ?? {};
    const message = tx.message ?? {};
    const keys = message.staticAccountKeys ?? message.accountKeys ?? [];
    const addressAt = value => value?.toBase58?.() ?? value?.pubkey?.toBase58?.() ?? String(value ?? "");
    const addresses = keys.map(addressAt);
    const mentionsTarget = addresses.includes(programDataAddress) || addresses.includes(programId);
    const instructions = message.compiledInstructions ?? message.instructions ?? [];
    let loaderInstructionCount = 0;
    for (const instruction of instructions) {
      const instructionProgramId = instruction.programId
        ? addressAt(instruction.programId)
        : Number.isInteger(instruction.programIdIndex)
          ? addresses[instruction.programIdIndex]
          : "";
      if (instructionProgramId !== loaderId) continue;
      const accountIndexes = instruction.accountKeyIndexes ?? instruction.accounts ?? [];
      const accountAddresses = accountIndexes.map(index =>
        Number.isInteger(index) ? addresses[index] : addressAt(index)
      );
      if (accountAddresses.includes(programDataAddress) || accountAddresses.includes(programId)) {
        loaderInstructionCount += 1;
      }
    }
    if (!mentionsTarget && loaderInstructionCount === 0) continue;
    const firstSignature = tx.signatures?.[0] ?? null;
    candidates.push({
      signature: typeof firstSignature === "string"
        ? firstSignature
        : firstSignature ? Buffer.from(firstSignature).toString("hex") : null,
      referencesProgram: addresses.includes(programId),
      referencesProgramData: addresses.includes(programDataAddress),
      loaderInstructionCount,
      transactionError: entry.meta?.err ?? null,
      relevantLogs: (entry.meta?.logMessages ?? []).filter(line => /upgrade|deploy|programdata|loader/i.test(line)).slice(0, 20),
    });
  }
  return {
    status: "programdata_state_slot_block_inspected",
    stateSlot,
    blockTime: block.blockTime ?? null,
    transactionCount: block.transactions?.length ?? 0,
    candidateTransactions: candidates,
  };
}

export async function inspectProgramDataHistory({ connection, programDataPublicKey }) {
  if (typeof connection?.getSignaturesForAddress !== "function" || typeof connection?.getTransaction !== "function" || !programDataPublicKey) {
    return { status: "programdata_history_rpc_unavailable", signatures: [] };
  }
  let signatureInfo;
  try {
    signatureInfo = await connection.getSignaturesForAddress(programDataPublicKey, { limit: 100 }, "finalized");
  } catch (error) {
    return { status: "programdata_history_fetch_failed", reason: String(error.message || error), signatures: [] };
  }
  const history = [];
  for (const info of signatureInfo ?? []) {
    let transaction = null;
    let fetchError = null;
    try {
      transaction = await connection.getTransaction(info.signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      fetchError = String(error.message || error);
    }
    const logs = transaction?.meta?.logMessages ?? [];
    history.push({
      signature: info.signature,
      slot: info.slot,
      blockTime: info.blockTime ?? transaction?.blockTime ?? null,
      transactionAvailable: Boolean(transaction),
      transactionError: transaction?.meta?.err ?? info.err ?? null,
      loaderLogs: logs.filter(line => /upgrade|deploy|programdata|loader|extend/i.test(line)).slice(0, 30),
      fetchError,
    });
  }
  return { status: "programdata_history_inspected", signatureCount: history.length, complete: history.length < 100, signatures: history };
}

export async function captureDevnetMetaplexProgramProvenance({ connection, sdk, cluster, buildArtifact = PINNED_METAPLEX_BUILD_ARTIFACT }) {
  if (cluster !== "devnet") fail("Metaplex deployment provenance capture is restricted to Devnet");
  if (!connection || !sdk?.PublicKey || typeof connection.getAccountInfo !== "function") {
    fail("Read-only account RPC and PublicKey support are required");
  }
  const programId = new sdk.PublicKey(METAPLEX_TOKEN_METADATA_PROGRAM_ID);
  const commitment = "finalized";
  const program = await connection.getAccountInfo(programId, commitment);
  if (!program) fail("Canonical Devnet Metaplex Token Metadata program account is missing");
  if (program.owner?.toBase58?.() !== BPF_UPGRADEABLE_LOADER_ID) {
    fail("Metaplex Token Metadata program is not owned by the upgradeable BPF loader");
  }
  if (program.executable !== true) fail("Canonical Devnet Metaplex Token Metadata program is not executable");
  const programData = Buffer.from(program.data ?? []);
  if (programData.length !== 36 || programData.readUInt32LE(0) !== 2) {
    fail("Upgradeable-loader Program account has an unexpected state layout");
  }
  const programDataAddress = new sdk.PublicKey(programData.subarray(4, 36));
  const dataAccount = await connection.getAccountInfo(programDataAddress, commitment);
  if (!dataAccount) fail("Metaplex ProgramData account is missing at finalized commitment");
  if (dataAccount.owner?.toBase58?.() !== BPF_UPGRADEABLE_LOADER_ID) {
    fail("Metaplex ProgramData account is not owned by the upgradeable BPF loader");
  }
  if (dataAccount.executable === true) fail("Metaplex ProgramData account must not be executable");
  const bytes = Buffer.from(dataAccount.data ?? []);
  if (bytes.length < 13 || bytes.readUInt32LE(0) !== 3) {
    fail("Upgradeable-loader ProgramData account has an unexpected state layout");
  }
  const programDataStateSlot = Number(bytes.readBigUInt64LE(4));
  const authorityOption = bytes[12];
  let upgradeAuthority = null;
  let codeOffset;
  if (authorityOption === 0) {
    codeOffset = 13;
  } else if (authorityOption === 1) {
    if (bytes.length < 45) fail("Upgradeable-loader ProgramData authority field is truncated");
    upgradeAuthority = new sdk.PublicKey(bytes.subarray(13, 45)).toBase58();
    codeOffset = 45;
  } else {
    fail("Upgradeable-loader ProgramData authority option is invalid");
  }
  const executableBytes = bytes.subarray(codeOffset);
  if (executableBytes.length === 0) fail("Metaplex ProgramData contains no executable bytecode");
  let deploymentBlockTimeUnix = null;
  if (typeof connection.getBlockTime === "function") {
    try {
      const blockTime = await connection.getBlockTime(programDataStateSlot);
      if (Number.isSafeInteger(blockTime) && blockTime > 0) deploymentBlockTimeUnix = blockTime;
    } catch {
      // The slot timestamp is supplementary provenance; account/hash checks remain authoritative.
    }
  }
  const artifactMetadata = {
    sourceCommit: buildArtifact.sourceCommit ?? null,
    workflowRunId: buildArtifact.workflowRunId ?? null,
    artifactId: buildArtifact.artifactId ?? null,
    artifactPath: buildArtifact.artifactPath ?? null,
    byteLength: buildArtifact.byteLength,
    sha256: buildArtifact.sha256,
  };
  const programDataStateSlotBlockEvidence = await inspectProgramDataStateSlotBlock({
    connection,
    stateSlot: programDataStateSlot,
    programId: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programDataAddress: programDataAddress.toBase58(),
  });
  const programDataHistory = await inspectProgramDataHistory({
    connection,
    programDataPublicKey: programDataAddress,
  });
  const pinnedBuildArtifactComparison = compareExecutableToPinnedBuildArtifact(executableBytes, {
    artifactLength: artifactMetadata.byteLength,
    artifactSha256: artifactMetadata.sha256,
  });
  return {
    status: pinnedBuildArtifactComparison.exactMatch
      ? "deployment_provenance_captured_exact_pinned_build_match"
      : "deployment_provenance_captured_source_match_unverified",
    cluster,
    commitment,
    programId: METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    programOwner: program.owner.toBase58(),
    executable: program.executable,
    programDataAddress: programDataAddress.toBase58(),
    programDataOwner: dataAccount.owner.toBase58(),
    programDataStateSlot,
    programDataStateSlotBlockTimeUnix: deploymentBlockTimeUnix,
    programDataStateSlotBlockEvidence,
    programDataHistory,
    upgradeAuthority,
    immutable: upgradeAuthority === null,
    executableByteLength: executableBytes.length,
    executableSha256: createHash("sha256").update(executableBytes).digest("hex"),
    pinnedBuildArtifact: artifactMetadata,
    pinnedBuildArtifactComparison,
    sourceMatchStatus: pinnedBuildArtifactComparison.exactMatch ? "exact_pinned_build_artifact_match" : "pinned_build_artifact_not_matched",
    transactionSigned: false,
    transactionSimulated: false,
    transactionSubmitted: false,
  };
}
