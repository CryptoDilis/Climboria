/**
 * Operator-only read-only full ProgramData account capture in ONE finalized
 * Solana getAccountInfo RPC response per program, followed by replay through
 * the existing conservative chunk/metadata/SHA256 verifier in local memory.
 *
 * This eliminates cross-slot mixing *within each program's payload* but RPC
 * finalized data and exact reference hash are still external trust inputs.
 * Jupiter and Raydium are queried separately and may have different slots.
 * No browser, Cloudflare Worker, signing or execute path imports this file.
 */
import { validateRpcUrl } from "./solana-rpc.mjs";
import { deriveUpgradeableProgramDataPda } from "./upgradeable-programdata-pda.mjs";
import { UPGRADEABLE_BPF_LOADER } from "./upgradeable-program-provenance.mjs";
import {
  validateProof, validatePinnedSha256, hashPinnedUpgradeableProgramPayload
} from "./upgradeable-program-bytecode-digest.mjs";

const MAX_ALLOCATED_BYTES = 10 * 1024 * 1024 + 45;
const MAX_JSON_BYTES = Math.ceil(MAX_ALLOCATED_BYTES / 3) * 4 + 2048;
const READ_TIMEOUT_MS = 25000;
function fail() { throw new Error("Read-only full ProgramData snapshot invalid or unavailable"); }

async function readBoundedResponse(response) {
  if (!response?.body || typeof response.body.getReader !== "function") fail();
  const declared = response.headers?.get?.("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_JSON_BYTES) fail();
  const reader = response.body.getReader();
  const buffers = [];
  let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail();
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel().catch(()=>{});
        fail();
      }
      buffers.push(Buffer.from(value));
    }
  } catch { fail(); }
  try { return JSON.parse(Buffer.concat(buffers,size).toString("utf8")); }
  catch { fail(); }
}
function canonicalFullAccount(account) {
  if (!account || account.owner !== UPGRADEABLE_BPF_LOADER ||
      account.executable !== false || !Number.isSafeInteger(account.space) ||
      account.space <= 45 || account.space > MAX_ALLOCATED_BYTES ||
      !Array.isArray(account.data) || account.data.length !== 2 ||
      account.data[1] !== "base64" || typeof account.data[0] !== "string") fail();
  const encoded = account.data[0];
  if (encoded.length > Math.ceil(MAX_ALLOCATED_BYTES / 3)*4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) fail();
  const bytes = Buffer.from(encoded,"base64");
  if (bytes.length !== account.space || bytes.toString("base64") !== encoded) fail();
  return bytes;
}
async function readSingleFinalizedAccount({role,evidence,proof,rpcUrl,fetchImpl}) {
  const endpoint=validateRpcUrl(rpcUrl).toString();
  const id="climboria-single-programdata-"+role;
  let response;
  try {
    response=await fetchImpl(endpoint,{
      method:"POST",
      headers:{"content-type":"application/json",accept:"application/json"},
      body:JSON.stringify({
        jsonrpc:"2.0",id,method:"getAccountInfo",
        params:[evidence.programDataAddress,{
          commitment:"finalized",encoding:"base64",
          minContextSlot:proof.finalizedSlot
        }]
      }),
      redirect:"error",signal:AbortSignal.timeout(READ_TIMEOUT_MS)
    });
  } catch { fail(); }
  if (!response?.ok) fail();
  const json=await readBoundedResponse(response);
  const slot=json?.result?.context?.slot;
  if (json?.jsonrpc!=="2.0" || json.id!==id || json.error ||
      !Number.isSafeInteger(slot) || slot<proof.finalizedSlot ||
      !json.result?.value) fail();
  const account=json.result.value;
  const fullBytes=canonicalFullAccount(account);
  return {endpoint,slot,account,fullBytes};
}

/**
 * Reuse the previously tested checksum/owner/authority/stability parser
 * against slices of the SAME frozen response, never contacting the RPC again.
 * The synthetic per-slice responses cannot assert separate RPC observations.
 */
function replaySingleAccount({capture,evidence}) {
  return async(url,options)=>{
    if (url!==capture.endpoint) fail();
    let request;
    try { request=JSON.parse(options?.body); } catch { fail(); }
    const [address,params]=request?.params||[];
    const offset=params?.dataSlice?.offset;
    const length=params?.dataSlice?.length;
    if (request?.method!=="getAccountInfo" ||
        request?.jsonrpc!=="2.0" || typeof request.id!=="string" ||
        !request.id.startsWith("climboria-program-bytecode-") ||
        address!==evidence.programDataAddress ||
        params?.commitment!=="finalized" || params?.encoding!=="base64" ||
        !Number.isSafeInteger(params.minContextSlot) ||
        params.minContextSlot>capture.slot ||
        !Number.isSafeInteger(offset) || offset<0 ||
        !Number.isSafeInteger(length) || length<1 ||
        offset+length>capture.fullBytes.length) fail();
    const bytes=capture.fullBytes.subarray(offset,offset+length);
    return new Response(JSON.stringify({
      jsonrpc:"2.0",id:request.id,
      result:{context:{slot:capture.slot},value:{
        owner:capture.account.owner,executable:capture.account.executable,
        space:capture.account.space,
        data:[bytes.toString("base64"),"base64"]
      }}
    }),{status:200,headers:{"content-type":"application/json"}});
  };
}

/** One read-only real finalized account response per program. */
export async function hashPinnedProgramSingleSnapshot({
  role,provenanceProof,rpcUrl,expectedSha256,fetchImpl=globalThis.fetch
}={}) {
  const pinned=validatePinnedSha256(expectedSha256);
  const evidence=validateProof(provenanceProof,role);
  if (typeof fetchImpl!=="function") fail();
  // Verify the claimed proof's ProgramData key independently of its boolean.
  const derived=await deriveUpgradeableProgramDataPda(evidence.programId);
  if (derived.programDataAddress!==evidence.programDataAddress ||
      derived.bump!==evidence.programDataPdaBump) fail();
  const capture=await readSingleFinalizedAccount({
    role,evidence,proof:provenanceProof,rpcUrl,fetchImpl
  });
  const checked=await hashPinnedUpgradeableProgramPayload({
    role,provenanceProof,rpcUrl,expectedSha256:pinned,
    fetchImpl:replaySingleAccount({capture,evidence})
  });
  if (checked.firstFinalizedSlot!==capture.slot ||
      checked.lastFinalizedSlot!==capture.slot) fail();
  return Object.freeze({
    ...checked,
    firstFinalizedSlot:capture.slot,
    lastFinalizedSlot:capture.slot,
    perChunkFinalizedSlotsMayDiffer:false,
    oneFinalizedRpcResponseForWholeProgram:true,
    // This is a provider-reported single context, NOT an independent
    // cryptographically authenticated finality/chain-state attestation.
    singleSlotBytecodeSnapshotVerified:false,
    independentSourceToBinaryParityVerified:false,
    approvedForJupiterCpi:false
  });
}

/** Both pins are mandatory; program responses may use different slots. */
export async function hashPinnedProgramsSingleSnapshots({
  provenanceProof,rpcUrl,expectedJupiterSha256,expectedRaydiumSha256,
  fetchImpl=globalThis.fetch
}={}) {
  validatePinnedSha256(expectedJupiterSha256);
  validatePinnedSha256(expectedRaydiumSha256);
  validateProof(provenanceProof,"jupiterV6");
  validateProof(provenanceProof,"raydiumV4");
  const jupiterV6=await hashPinnedProgramSingleSnapshot({
    role:"jupiterV6",provenanceProof,rpcUrl,expectedSha256:expectedJupiterSha256,fetchImpl
  });
  const raydiumV4=await hashPinnedProgramSingleSnapshot({
    role:"raydiumV4",provenanceProof,rpcUrl,expectedSha256:expectedRaydiumSha256,fetchImpl
  });
  return Object.freeze({
    network:"mainnet-beta",
    programs:Object.freeze({jupiterV6,raydiumV4}),
    bothMatchOperatorPinnedSha256:true,
    eachProgramReadInOneFinalizedRpcResponse:true,
    sameFinalizedSlotAcrossBothProgramsVerified:false,
    independentlyTrustedRpc:false,
    independentSourceToBinaryParityVerified:false,
    jupiterCpiAccountMappingVerified:false,
    approvedForJupiterCpi:false
  });
}
