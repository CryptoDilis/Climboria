/**
 * Read-only provenance capture for the canonical Metaplex Token Metadata
 * program on Devnet. Captures the upgradeable-loader deployment slot,
 * authority, and deployed bytecode SHA-256. It does not claim that a source
 * commit matches the deployed binary; that requires a reproducible build.
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

export async function captureDevnetMetaplexProgramProvenance({ connection, sdk, cluster }) {
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
  const deploymentSlot = Number(bytes.readBigUInt64LE(4));
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
  const pinnedBuildArtifactComparison = compareExecutableToPinnedBuildArtifact(executableBytes, {
    artifactLength: PINNED_METAPLEX_BUILD_ARTIFACT.byteLength,
    artifactSha256: PINNED_METAPLEX_BUILD_ARTIFACT.sha256,
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
    deploymentSlot,
    upgradeAuthority,
    immutable: upgradeAuthority === null,
    executableByteLength: executableBytes.length,
    executableSha256: createHash("sha256").update(executableBytes).digest("hex"),
    pinnedBuildArtifact: PINNED_METAPLEX_BUILD_ARTIFACT,
    pinnedBuildArtifactComparison,
    sourceMatchStatus: pinnedBuildArtifactComparison.exactMatch ? "exact_pinned_build_artifact_match" : "pinned_build_artifact_not_matched",
    transactionSigned: false,
    transactionSimulated: false,
    transactionSubmitted: false,
  };
}
