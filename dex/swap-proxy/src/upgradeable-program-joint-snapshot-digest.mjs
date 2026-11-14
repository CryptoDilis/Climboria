/**
 * Operator-only read-only capture of Jupiter V6 AND Raydium V4 complete
 * Upgradeable Loader ProgramData accounts in ONE finalized RPC response.
 *
 * This reduces cross-slot ambiguity across the two program images without
 * proving canonical ledger state or provider honesty. The independently pinned
 * hashes are still mandatory. This code is never used by the Swap Worker.
 */
import { validateRpcUrl } from "./solana-rpc.mjs";
import { deriveUpgradeableProgramDataPda } from "./upgradeable-programdata-pda.mjs";
import { validateProof, validatePinnedSha256 } from "./upgradeable-program-bytecode-digest.mjs";
import { hashPinnedProgramSingleSnapshot } from "./upgradeable-program-single-snapshot-digest.mjs";

const PROGRAMDATA_MAX_BYTES = 10 * 1024 * 1024 + 45;
const MAX_JSON_BYTES = 2 * Math.ceil(PROGRAMDATA_MAX_BYTES / 3) * 4 + 4096;
const TIMEOUT_MS = 30000;
const REQUEST_ID = "climboria-joint-programdata-readonly";
const ROLES = Object.freeze(["jupiterV6", "raydiumV4"]);
function fail() { throw new Error("Read-only joint ProgramData snapshot invalid or unavailable"); }

async function boundedJson(response) {
  if (!response?.body || typeof response.body.getReader !== "function") fail();
  const length = response.headers?.get?.("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_JSON_BYTES) fail();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail();
      total += value.length;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => {});
        fail();
      }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch { fail(); }
}

function localAccountReplay(endpoint, role, accountAddress, account, slot) {
  // Only serve synthetic getAccountInfo responses derived from the captured
  // two-account RPC payload. No additional network calls may occur.
  return async (url, options) => {
    let request;
    try { request = JSON.parse(options?.body); } catch { fail(); }
    const [requestedAddress, params] = request?.params ?? [];
    if (url !== endpoint || request?.jsonrpc !== "2.0" ||
        request.method !== "getAccountInfo" ||
        typeof request.id !== "string" ||
        request.id !== "climboria-single-programdata-" + role ||
        requestedAddress !== accountAddress ||
        params?.encoding !== "base64" || params?.commitment !== "finalized" ||
        Object.hasOwn(params, "dataSlice") ||
        !Number.isSafeInteger(params?.minContextSlot) ||
        params.minContextSlot > slot || params.minContextSlot < 0) fail();
    return new Response(JSON.stringify({
      jsonrpc: "2.0", id: request.id,
      result: { context: {slot}, value: account }
    }), { status: 200, headers: {"content-type":"application/json"} });
  };
}

/**
 * One externally reported finalized context for BOTH entire program images.
 * Reuses the prior strict per-program decoder/hash matcher on locally captured
 * data. Never claims an independently authenticated single-slot state.
 */
export async function hashPinnedProgramsJointFinalizedSnapshot({
  provenanceProof, rpcUrl, expectedJupiterSha256, expectedRaydiumSha256,
  fetchImpl = globalThis.fetch
} = {}) {
  const pins = [
    validatePinnedSha256(expectedJupiterSha256),
    validatePinnedSha256(expectedRaydiumSha256)
  ];
  if (typeof fetchImpl !== "function") fail();
  const evidence = ROLES.map(role => validateProof(provenanceProof, role));
  const derived = await Promise.all(evidence.map(item =>
    deriveUpgradeableProgramDataPda(item.programId)));
  for (let i = 0; i < ROLES.length; i++) {
    if (derived[i].programDataAddress !== evidence[i].programDataAddress ||
        derived[i].bump !== evidence[i].programDataPdaBump) fail();
  }
  if (evidence[0].programDataAddress === evidence[1].programDataAddress) fail();
  const endpoint = validateRpcUrl(rpcUrl).toString();
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {"content-type":"application/json", accept:"application/json"},
      body: JSON.stringify({
        jsonrpc: "2.0", id: REQUEST_ID, method: "getMultipleAccounts",
        params: [evidence.map(item=>item.programDataAddress), {
          encoding:"base64", commitment:"finalized",
          minContextSlot:provenanceProof.finalizedSlot
        }]
      }),
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch { fail(); }
  if (!response?.ok) fail();
  const body = await boundedJson(response);
  const slot = body?.result?.context?.slot;
  const accounts = body?.result?.value;
  if (body?.jsonrpc !== "2.0" || body.id !== REQUEST_ID || body.error ||
      !Number.isSafeInteger(slot) || slot < provenanceProof.finalizedSlot ||
      !Array.isArray(accounts) || accounts.length !== 2 ||
      accounts.some(account => !account)) fail();

  const checked = {};
  for (let i = 0; i < ROLES.length; i++) {
    // The full account is sent through the already-tested strict canonical
    // base64/size/owner/authority, header and SHA-256 validation. This replay
    // is local; the real RPC was called exactly once for the pair.
    checked[ROLES[i]] = await hashPinnedProgramSingleSnapshot({
      role: ROLES[i], provenanceProof, rpcUrl, expectedSha256: pins[i],
      fetchImpl: localAccountReplay(endpoint,ROLES[i],evidence[i].programDataAddress,accounts[i],slot)
    });
    if (checked[ROLES[i]].firstFinalizedSlot !== slot ||
        checked[ROLES[i]].lastFinalizedSlot !== slot) fail();
  }
  return Object.freeze({
    network:"mainnet-beta",
    finalizedContextSlot:slot,
    programs:Object.freeze({
      jupiterV6:checked.jupiterV6, raydiumV4:checked.raydiumV4
    }),
    bothMatchOperatorPinnedSha256:true,
    bothProgramImagesInOneFinalizedRpcResponse:true,
    providerReportedSameFinalizedContextForBothPrograms:true,
    independentlyAuthenticatedLedgerSnapshot:false,
    independentlyTrustedRpc:false,
    independentlyAuditedReferenceDigests:false,
    sourceCodeParityVerified:false,
    jupiterCpiAccountMappingVerified:false,
    approvedForJupiterCpi:false
  });
}
