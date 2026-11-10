/**
 * Read-only provenance capture for the canonical Metaplex Token Metadata
 * program on Devnet. Captures the upgradeable-loader deployment slot,
 * authority, and deployed bytecode SHA-256. It does not claim that a source
 * commit matches the deployed binary; that requires a reproducible build.
 */
import { createHash } from "node:crypto";

export const METAPLEX_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const BPF_UPGRADEABLE_LOADER_ID = "BPFLoaderUpgradeab1e11111111111111111111111";

const fail = message => { throw new Error(message); };

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
  return {
    status: "deployment_provenance_captured_source_match_unverified",
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
    sourceMatchStatus: "not_verified_no_reproducible_build_comparison",
    transactionSigned: false,
    transactionSimulated: false,
    transactionSubmitted: false,
  };
}
