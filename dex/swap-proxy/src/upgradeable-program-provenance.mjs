/**
 * Operator-only, read-only, mainnet Jupiter V6 and Raydium V4 executable
 * metadata inspector. Checks Upgradeable BPF Loader ownership, Program ->
 * ProgramData links, deployment slots, and upgrade authority. Does NOT hash
 * executable bytecode, establish deployed/source parity, or approve Jupiter CPI.
 *
 * Only 45-byte account prefixes are requested. No transaction is constructed
 * or signed. Never import this module from the live Worker.
 */
import { decodeBase58, encodeBase58 } from "./transaction-validation.mjs";
import { validateRpcUrl, readBoundedBody } from "./solana-rpc.mjs";
import { JUPITER_V6_PROGRAM_ID } from "./jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "./raydium-v4-direct-evidence.mjs";
import { deriveUpgradeableProgramDataPda, UPGRADEABLE_BPF_LOADER_ID } from "./upgradeable-programdata-pda.mjs";

export const UPGRADEABLE_BPF_LOADER = UPGRADEABLE_BPF_LOADER_ID;
const MAX_HEADER_BYTES = 45;
const PROGRAM_IDS = Object.freeze({
  jupiterV6: JUPITER_V6_PROGRAM_ID,
  raydiumV4: RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]
});
function fail(message) { throw new Error("Read-only executable metadata: " + message); }
function canonicalKey(value) {
  if (typeof value !== "string") fail("invalid account public key");
  let bytes;
  try { bytes = decodeBase58(value); } catch { fail("invalid account public key"); }
  if (bytes.length !== 32 || encodeBase58(bytes) !== value) fail("invalid account public key");
  return value;
}
function bytesOf(account, label) {
  if (!account || !Array.isArray(account.data) ||
      account.data.length !== 2 || account.data[1] !== "base64" ||
      typeof account.data[0] !== "string" ||
      account.data[0].length > 64) fail(label + " missing bounded base64 header");
  const encoded = account.data[0];
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    fail(label + " malformed base64 header");
  }
  let raw;
  try { raw = atob(encoded); } catch { fail(label + " malformed base64 header"); }
  const bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
  if (btoa(raw) !== encoded) fail(label + " noncanonical base64 header");
  return bytes;
}
function programHeader(account, role) {
  if (account?.owner !== UPGRADEABLE_BPF_LOADER || account.executable !== true) {
    fail(role + " must be an executable Upgradeable BPF Loader program");
  }
  const bytes = bytesOf(account, role);
  if (bytes.length !== 36) fail(role + " Program state requires exactly 36 bytes");
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (view.getUint32(0,true) !== 2) fail(role + " wrong upgradeable Program state");
  return { bytes: account.data[0], programDataAddress: canonicalKey(encodeBase58(bytes.subarray(4,36))) };
}
function programDataHeader(account, role, contextSlot) {
  if (account?.owner !== UPGRADEABLE_BPF_LOADER || account.executable !== false) {
    fail(role + " ProgramData must be non-executable and owned by upgradeable loader");
  }
  const bytes = bytesOf(account, role);
  if (bytes.length !== MAX_HEADER_BYTES) fail(role + " requires 45-byte ProgramData header");
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (view.getUint32(0,true) !== 3) fail(role + " wrong upgradeable ProgramData state");
  const slot = view.getBigUint64(4,true);
  if (slot > BigInt(contextSlot) || slot > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail(role + " deployment slot exceeds finalized context");
  }
  const authorityOption = bytes[12];
  if (authorityOption !== 0 && authorityOption !== 1) fail(role + " invalid upgrade authority option");
  if (account.space !== undefined &&
      (!Number.isSafeInteger(account.space) || account.space <= MAX_HEADER_BYTES)) {
    fail(role + " ProgramData reported space cannot hold executable payload");
  }
  return {
    lastDeploySlot: Number(slot),
    upgradeAuthority: authorityOption === 1
      ? canonicalKey(encodeBase58(bytes.subarray(13,45))) : null,
    immutable: authorityOption === 0
  };
}
export function inspectFinalizedProgramProvenance({
  network, bootstrapSlot, finalizedSlot, bootstrapAccounts, finalizedAccounts
}={}) {
  if (network !== "mainnet-beta") fail("this dual-program proof is pinned to mainnet-beta only");
  if (!Number.isSafeInteger(bootstrapSlot) || bootstrapSlot < 0 ||
      !Number.isSafeInteger(finalizedSlot) || finalizedSlot < bootstrapSlot ||
      !Array.isArray(bootstrapAccounts) || bootstrapAccounts.length !== 2 ||
      !Array.isArray(finalizedAccounts) || finalizedAccounts.length !== 4) {
    fail("missing or stale finalized program account snapshots");
  }
  const roles = Object.keys(PROGRAM_IDS);
  const first = roles.map((role,i) => programHeader(bootstrapAccounts[i], role));
  const second = roles.map((role,i) => programHeader(finalizedAccounts[i], role));
  if (first.some((item,i) => item.bytes !== second[i].bytes ||
      item.programDataAddress !== second[i].programDataAddress)) {
    fail("program account changed between finalized reads");
  }
  if (first[0].programDataAddress === first[1].programDataAddress ||
      Object.values(PROGRAM_IDS).includes(first[0].programDataAddress) ||
      Object.values(PROGRAM_IDS).includes(first[1].programDataAddress)) {
    fail("invalid duplicate or aliased ProgramData addresses");
  }
  const result = {};
  for (let i=0;i<2;i++) {
    const role=roles[i];
    const header=programDataHeader(finalizedAccounts[i+2], role, finalizedSlot);
    result[role]=Object.freeze({
      programId: PROGRAM_IDS[role],
      programDataAddress: first[i].programDataAddress,
      ...header,
      loaderMetadataVerified: true,
      // This synchronous RPC-image inspector cannot perform independent PDA math.
      programDataPdaIndependentlyVerified: false,
      deployedProgramBytecodeVerified: false,
      approvedForJupiterCpi: false
    });
  }
  return Object.freeze({
    network, bootstrapSlot, finalizedSlot,
    programs: Object.freeze(result),
    programDataPdaIndependentlyVerified: false,
    deployedProgramBytecodeVerified: false,
    jupiterCpiAccountMappingVerified: false,
    approvedForJupiterCpi: false
  });
}
const REQUEST_ID = "climboria-upgradeable-program-readonly";
async function readFinalized(fetchImpl,rpcUrl,addresses,minContextSlot) {
  let response;
  try {
    response=await fetchImpl(rpcUrl,{
      method:"POST",
      headers:{"content-type":"application/json",accept:"application/json"},
      body:JSON.stringify({
        jsonrpc:"2.0",id:REQUEST_ID,method:"getMultipleAccounts",
        params:[addresses,{
          commitment:"finalized",encoding:"base64",
          dataSlice:{offset:0,length:MAX_HEADER_BYTES},
          ...(minContextSlot===null?{}:{minContextSlot})
        }]
      }),redirect:"error",signal:AbortSignal.timeout(8000)
    });
  } catch { fail("RPC transport unavailable"); }
  if (!response?.ok) fail("RPC account request failed");
  let json;
  try { json=JSON.parse(await readBoundedBody(response)); }
  catch { fail("invalid bounded RPC response"); }
  const slot=json?.result?.context?.slot;
  if (json?.jsonrpc!=="2.0" || json.id!==REQUEST_ID || json.error ||
      !Number.isSafeInteger(slot) || slot<0 ||
      (minContextSlot!==null && slot<minContextSlot) ||
      !Array.isArray(json?.result?.value) ||
      json.result.value.length!==addresses.length) {
    fail("invalid or stale finalized account response");
  }
  return {slot,accounts:json.result.value};
}
export async function fetchMainnetUpgradeableProgramProvenance({
  network, rpcUrl, minContextSlot=null, fetchImpl=globalThis.fetch
}={}) {
  if (network!=="mainnet-beta") fail("only mainnet-beta Jupiter/Raydium program pairing is supported");
  if (minContextSlot!==null &&
      (!Number.isSafeInteger(minContextSlot) || minContextSlot<0)) fail("invalid minimum context slot");
  if (typeof fetchImpl!=="function") fail("RPC transport unavailable");
  const endpoint=validateRpcUrl(rpcUrl).toString();
  const initial=await readFinalized(fetchImpl,endpoint,Object.values(PROGRAM_IDS),minContextSlot);
  const heads=Object.keys(PROGRAM_IDS).map((role,i)=>programHeader(initial.accounts[i],role));
  // The on-chain Program header can be a valid 36-byte forged claim. Derive
  // the loader PDA locally BEFORE requesting any caller-directed ProgramData.
  const derived=await Promise.all(
    Object.values(PROGRAM_IDS).map(programId=>deriveUpgradeableProgramDataPda(programId))
  );
  if (heads.some((item,i)=>item.programDataAddress!==derived[i].programDataAddress)) {
    fail("Program header references a noncanonical ProgramData PDA");
  }
  const addresses=[...Object.values(PROGRAM_IDS),...derived.map(item=>item.programDataAddress)];
  const final=await readFinalized(fetchImpl,endpoint,addresses,initial.slot);
  const inspected=inspectFinalizedProgramProvenance({
    network,bootstrapSlot:initial.slot,finalizedSlot:final.slot,
    bootstrapAccounts:initial.accounts,finalizedAccounts:final.accounts
  });
  // The offline PDA derivation is separate from the finalized account header,
  // but still does NOT verify executable bytes, source parity, or Jupiter CPI.
  const programs=Object.freeze(Object.fromEntries(
    Object.keys(PROGRAM_IDS).map((role,i)=>[role,Object.freeze({
      ...inspected.programs[role],
      programDataPdaBump: derived[i].bump,
      programDataPdaIndependentlyVerified: true
    })])
  ));
  return Object.freeze({
    ...inspected, programs, programDataPdaIndependentlyVerified: true,
    deployedProgramBytecodeVerified: false,
    approvedForJupiterCpi: false
  });
}
