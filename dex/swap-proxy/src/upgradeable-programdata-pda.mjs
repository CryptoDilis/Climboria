/**
 * Read-only, independent Solana Upgradeable BPF Loader ProgramData PDA
 * derivation for an executable Program ID.
 *
 * Solana's bpf_loader_upgradeable::get_program_data_address derives:
 * Pubkey::find_program_address(&[program_id.as_ref()], &bpf_loader_upgradeable::id()).
 *
 * This is NOT authority to sign, load executable bytes, approve Jupiter CPI,
 * trust the RPC, or consider a program's deployed bytecode reviewed.
 */
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { isPossiblyOnEd25519Curve } from "./raydium-v4-authority-pda.mjs";

export const UPGRADEABLE_BPF_LOADER_ID =
  "BPFLoaderUpgradeab1e11111111111111111111111";
const MARKER = new TextEncoder().encode("ProgramDerivedAddress");

function fail(message) { throw new Error("Read-only ProgramData PDA: " + message); }
function keyBytes(value) {
  if (typeof value !== "string") fail("missing or malformed program public key");
  let bytes;
  try { bytes = decodeBase58(value); } catch { fail("missing or malformed program public key"); }
  if (bytes.length !== 32 || encodeBase58(bytes) !== value) {
    fail("noncanonical program public key");
  }
  return bytes;
}

/**
 * Only accepts an executable program ID as seed. The caller separately
 * validates program ownership and ProgramData metadata from finalized RPC.
 */
export async function deriveUpgradeableProgramDataPda(programId) {
  const programBytes = keyBytes(programId);
  const loaderBytes = keyBytes(UPGRADEABLE_BPF_LOADER_ID);
  const message = new Uint8Array(programBytes.length + 1 + loaderBytes.length + MARKER.length);
  message.set(programBytes, 0);
  message.set(loaderBytes, programBytes.length + 1);
  message.set(MARKER, programBytes.length + 1 + loaderBytes.length);

  // Solana Pubkey::find_program_address searches bumps descending, starting 255.
  for (let bump = 255; bump >= 0; bump--) {
    message[programBytes.length] = bump;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", message));
    if (digest.length !== 32) fail("unexpected SHA256 digest length");
    if (!isPossiblyOnEd25519Curve(digest)) {
      return Object.freeze({
        programId,
        programDataAddress: encodeBase58(digest),
        bump,
        independentlyDerivedOffCurvePda: true,
        deployedProgramBytecodeVerified: false,
        approvedForJupiterCpi: false
      });
    }
  }
  fail("no unambiguously off-curve ProgramData PDA bump");
}
