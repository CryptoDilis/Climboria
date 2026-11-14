import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "./raydium-v4-direct-evidence.mjs";

/**
 * Independent, READ-ONLY Raydium AMM V4 authority PDA derivation.
 *
 * Pinned primary source: raydium-io/raydium-amm
 * commit 91739d8d9f5cf347e0ce14ebe4d2bb7069fb31b6:
 * - program/src/processor.rs:96 AUTHORITY_AMM = b"amm authority"
 * - program/src/processor.rs:284-290 authority_id() invokes Solana
 *   Pubkey::create_program_address(&[AUTHORITY_AMM, &[nonce]], program_id).
 *
 * The Solana PDA hash is SHA256(seed || nonce || programId ||
 * "ProgramDerivedAddress"); a valid PDA MUST be off the Ed25519 curve.
 *
 * Pure WebCrypto SHA256 + conservative compressed-Edwards point check;
 * dependency-free to work on Node and Workers. Any uncertain/noncanonical
 * point is treated AS ON-CURVE and rejected, never as an approved PDA.
 *
 * This module does not sign, build, submit or authorize any transaction.
 * It is used only by the standalone read-only Raydium forensic snapshot
 * collector; Jupiter V6 CPI review remains source-level hard-DENIED.
 */
const SEED = new TextEncoder().encode("amm authority");
const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");
const P = (1n << 255n) - 19n;

function fail(message) { throw new Error("Raydium V4 authority PDA: " + message); }
function mod(x) { return ((x % P) + P) % P; }
function powMod(value, exponent) {
  let base = mod(value), result = 1n;
  for (let e = exponent; e > 0n; e >>= 1n) {
    if (e & 1n) result = mod(result * base);
    base = mod(base * base);
  }
  return result;
}
const D = mod(-121665n * powMod(121666n, P - 2n));
const SQRT_MINUS_ONE = powMod(2n, (P - 1n) / 4n);

/**
 * Security-conservative on-curve check. Returns true for any canonical
 * compressed Edwards25519 point and for noncanonical/ambiguous encodings.
 * Only a mathematically impossible square root is treated as OFF-curve.
 */
export function isPossiblyOnEd25519Curve(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) return true;
  let y = 0n;
  for (let i = 31; i >= 0; i--) {
    y = (y << 8n) + BigInt(i === 31 ? (bytes[i] & 127) : bytes[i]);
  }
  if (y >= P) return true; // Never classify an ambiguous point as a valid PDA.
  const yy = mod(y * y);
  const numerator = mod(yy - 1n);
  const denominator = mod(D * yy + 1n);
  if (denominator === 0n) return true; // Ambiguous: fail closed.
  const xx = mod(numerator * powMod(denominator, P - 2n));
  let x = powMod(xx, (P + 3n) / 8n);
  if (mod(x * x) !== xx) {
    x = mod(x * SQRT_MINUS_ONE);
    if (mod(x * x) !== xx) return false; // No Edwards point exists.
  }
  return true;
}

export async function deriveRaydiumV4AmmAuthorityPda({ network, nonce } = {}) {
  if (!Object.hasOwn(RAYDIUM_V4_PROGRAM_IDS, network)) fail("unknown Raydium network");
  if (!Number.isInteger(nonce) || nonce < 0 || nonce > 255) fail("invalid AMM state nonce");
  const programId = RAYDIUM_V4_PROGRAM_IDS[network];
  const programBytes = decodeBase58(programId);
  if (programBytes.length !== 32) fail("noncanonical Raydium program ID");
  const message = new Uint8Array(SEED.length + 1 + programBytes.length + PDA_MARKER.length);
  let index = 0;
  message.set(SEED, index); index += SEED.length;
  message[index++] = nonce;
  message.set(programBytes, index); index += programBytes.length;
  message.set(PDA_MARKER, index);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", message));
  if (digest.length !== 32 || isPossiblyOnEd25519Curve(digest)) {
    fail("AMM nonce derives an on-curve or ambiguous address, not a valid Solana PDA");
  }
  return Object.freeze({
    network, nonce, programId,
    authority: encodeBase58(digest),
    seed: "amm authority",
    independentlyDerivedOffCurvePda: true,
    approvedForJupiterCpi: false
  });
}
