/**
 * Operator-only, READ-ONLY, bounded chunk digest for an already verified
 * Upgradeable BPF Loader ProgramData account. No transaction/signing path.
 *
 * This hashes EVERY allocated byte after ProgramData's 45-byte metadata
 * prefix; never trims padding or assumes an upstream ELF length. The operator
 * MUST supply a separately trusted digest of the exact deployed image.
 * Per-chunk finalized RPC slots may differ, so this is NOT a cryptographic
 * single-slot snapshot or an independent audit of the RPC.
 *
 * Do not import into the Cloudflare Worker order/execute path.
 */
import { createHash } from "node:crypto";
import { decodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";
import { UPGRADEABLE_BPF_LOADER } from "./upgradeable-program-provenance.mjs";
import { JUPITER_V6_PROGRAM_ID } from "./jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "./raydium-v4-direct-evidence.mjs";

const HEADER_BYTES = 45;
const CHUNK_BYTES = 32 * 1024;
const MAX_PROGRAM_ACCOUNT_BYTES = 10 * 1024 * 1024 + HEADER_BYTES;
const PROGRAM_IDS = Object.freeze({
  jupiterV6: JUPITER_V6_PROGRAM_ID,
  raydiumV4: RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]
});

function fail(message) { throw new Error("Read-only deployed program digest: " + message); }

export function validatePinnedSha256(digest) {
  if (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)) {
    fail("operator expected SHA-256 must be 64 lowercase hex characters");
  }
  return digest;
}

function rawBase64(account, expectedLength) {
  if (account?.owner !== UPGRADEABLE_BPF_LOADER || account.executable !== false ||
      !Number.isSafeInteger(account.space) ||
      account.space <= HEADER_BYTES || account.space > MAX_PROGRAM_ACCOUNT_BYTES ||
      !Array.isArray(account.data) || account.data.length !== 2 ||
      account.data[1] !== "base64" || typeof account.data[0] !== "string") {
    fail("ProgramData account owner, size or encoding mismatch");
  }
  const data = account.data[0];
  if (data.length > Math.ceil(CHUNK_BYTES * 4 / 3) + 8 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    fail("oversized or malformed base64 ProgramData slice");
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length !== expectedLength || bytes.toString("base64") !== data) {
    fail("incomplete or noncanonical ProgramData slice");
  }
  return bytes;
}

function checkHeader(bytes, evidence, slot) {
  if (bytes.length !== HEADER_BYTES) fail("missing ProgramData metadata prefix");
  const state = bytes.readUInt32LE(0);
  const deploySlot = bytes.readBigUInt64LE(4);
  const option = bytes[12];
  if (state !== 3 || deploySlot > BigInt(slot) ||
      deploySlot !== BigInt(evidence.lastDeploySlot) ||
      option !== (evidence.upgradeAuthority === null ? 0 : 1)) {
    fail("ProgramData metadata or deployment slot disagrees with prior finalized evidence");
  }
  if (option === 1) {
    const authority = Buffer.from(decodeBase58(evidence.upgradeAuthority));
    if (authority.length !== 32 || !bytes.subarray(13, 45).equals(authority)) {
      fail("ProgramData upgrade authority disagrees with prior finalized evidence");
    }
  }
  return bytes;
}

async function readSlice(fetchImpl, endpoint, address, offset, length, minSlot, requestIndex) {
  const requestId = "climboria-program-bytecode-" + requestIndex;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: requestId, method: "getAccountInfo",
        params: [address, {
          encoding: "base64", commitment: "finalized",
          dataSlice: { offset, length }, minContextSlot: minSlot
        }]
      }),
      redirect: "error", signal: AbortSignal.timeout(8000)
    });
  } catch { fail("RPC chunk fetch unavailable"); }
  if (!response?.ok) fail("RPC chunk fetch HTTP failure");
  let data;
  try { data = JSON.parse(await readBoundedBody(response)); }
  catch { fail("invalid bounded RPC chunk response"); }
  const slot = data?.result?.context?.slot;
  if (data?.jsonrpc !== "2.0" || data?.id !== requestId || data.error ||
      !Number.isSafeInteger(slot) || slot < minSlot ||
      !data?.result?.value) {
    fail("missing, stale or mismatched finalized RPC chunk");
  }
  const account = data.result.value;
  const bytes = rawBase64(account, length);
  return { bytes, slot, space: account.space };
}

function validateProof(proof, role) {
  if (!Object.hasOwn(PROGRAM_IDS, role) || !proof ||
      proof.network !== "mainnet-beta" ||
      proof.programDataPdaIndependentlyVerified !== true ||
      proof.approvedForJupiterCpi !== false ||
      !Number.isSafeInteger(proof.finalizedSlot) || proof.finalizedSlot < 0) {
    fail("missing independently derived, finalized ProgramData metadata proof");
  }
  const evidence = proof.programs?.[role];
  if (!evidence || evidence.programId !== PROGRAM_IDS[role] ||
      evidence.programDataPdaIndependentlyVerified !== true ||
      evidence.loaderMetadataVerified !== true ||
      evidence.deployedProgramBytecodeVerified !== false ||
      typeof evidence.programDataAddress !== "string" ||
      !Number.isSafeInteger(evidence.lastDeploySlot) ||
      evidence.lastDeploySlot > proof.finalizedSlot ||
      !(evidence.upgradeAuthority === null || typeof evidence.upgradeAuthority === "string")) {
    fail("untrusted ProgramData address or preflight metadata");
  }
  return evidence;
}

/**
 * Compare a bounded full-payload digest to the operator's externally pinned
 * SHA-256; never label it independently audited, full program parity or
 * signable-swap approved.
 *
 * Each read uses finalized commitment and monotone minContextSlot.
 * Equal pre/post ProgramData metadata bounds upgrades detectable at the
 * endpoints; intermediate updates or dishonest RPC state are NOT ruled out.
 */
export async function hashPinnedUpgradeableProgramPayload({
  role, provenanceProof, rpcUrl, expectedSha256,
  fetchImpl = globalThis.fetch
} = {}) {
  const digest = validatePinnedSha256(expectedSha256);
  const evidence = validateProof(provenanceProof, role);
  if (typeof fetchImpl !== "function") fail("RPC transport unavailable");
  const endpoint = validateRpcUrl(rpcUrl).toString();
  let index = 0;
  const first = await readSlice(fetchImpl, endpoint, evidence.programDataAddress,
    0, HEADER_BYTES, provenanceProof.finalizedSlot, ++index);
  const total = first.space;
  const originalHeader = checkHeader(first.bytes, evidence, first.slot);
  let observedSlot = first.slot;
  const hash = createHash("sha256");
  for (let offset = HEADER_BYTES; offset < total; offset += CHUNK_BYTES) {
    const length = Math.min(CHUNK_BYTES, total - offset);
    const part = await readSlice(fetchImpl, endpoint, evidence.programDataAddress,
      offset, length, observedSlot, ++index);
    if (part.space !== total) fail("ProgramData account size changed during chunked reads");
    hash.update(part.bytes);
    observedSlot = part.slot;
  }
  const final = await readSlice(fetchImpl, endpoint, evidence.programDataAddress,
    0, HEADER_BYTES, observedSlot, ++index);
  if (final.space !== total || !final.bytes.equals(originalHeader)) {
    fail("ProgramData metadata changed during finalized chunked reads");
  }
  checkHeader(final.bytes, evidence, final.slot);
  const actualSha256 = hash.digest("hex");
  if (actualSha256 !== digest) fail("payload hash does not match independently pinned SHA-256");
  return Object.freeze({
    role, programId: evidence.programId,
    programDataAddress: evidence.programDataAddress,
    programDataLastDeploySlot: evidence.lastDeploySlot,
    programDataAccountBytes: total,
    programPayloadBytes: total - HEADER_BYTES,
    firstFinalizedSlot: first.slot, lastFinalizedSlot: final.slot,
    sha256: actualSha256,
    matchesOperatorPinnedSha256: true,
    perChunkFinalizedSlotsMayDiffer: true,
    independentlyAuditedReferenceDigest: false,
    singleSlotBytecodeSnapshotVerified: false,
    independentlyTrustedRpc: false,
    sourceCodeParityVerified: false,
    jupiterCpiAccountMappingVerified: false,
    approvedForJupiterCpi: false
  });
}

/** Fail closed if either expected binary differs; no partial "both passed". */
export async function hashPinnedJupiterRaydiumPayloads({
  provenanceProof, rpcUrl, expectedJupiterSha256, expectedRaydiumSha256,
  fetchImpl = globalThis.fetch
} = {}) {
  // Pre-validate both pins and both public account proofs before any HTTP.
  validatePinnedSha256(expectedJupiterSha256);
  validatePinnedSha256(expectedRaydiumSha256);
  validateProof(provenanceProof, "jupiterV6");
  validateProof(provenanceProof, "raydiumV4");
  const jupiterV6 = await hashPinnedUpgradeableProgramPayload({
    role: "jupiterV6", provenanceProof, rpcUrl,
    expectedSha256: expectedJupiterSha256, fetchImpl
  });
  const raydiumV4 = await hashPinnedUpgradeableProgramPayload({
    role: "raydiumV4", provenanceProof, rpcUrl,
    expectedSha256: expectedRaydiumSha256, fetchImpl
  });
  return Object.freeze({
    network: "mainnet-beta",
    programs: Object.freeze({ jupiterV6, raydiumV4 }),
    bothMatchOperatorPinnedSha256: true,
    deployedProgramBytecodeIndependentlyAudited: false,
    jupiterCpiAccountMappingVerified: false,
    approvedForJupiterCpi: false
  });
}
