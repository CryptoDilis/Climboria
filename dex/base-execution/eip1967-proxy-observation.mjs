/**
 * Read-only Base ERC-1967 proxy-control observations. This is risk triage,
 * NOT contract source verification, approval consent or trade authorization.
 * Two public RPC hostnames agreeing does not authenticate onchain state.
 */
import {assertBaseBlockIdentity,validatePublicBaseRpcUrl,BASE_OBSERVATION_PRIMARY_RPC} from "./allowance-observation.mjs";
import {corroborateBaseAllowanceObservation} from "./dual-rpc-observation.mjs";

export const EIP1967_SLOTS=Object.freeze({
 implementation:"0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
 admin:"0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
 beacon:"0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50"
});
const WORD=/^0x[0-9a-fA-F]{64}$/;
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const CODE=/^0x(?:[0-9a-fA-F]{2}){1,24576}$/;
const EMPTY="0x"+"0".repeat(64);
const MAX_BYTES=131072;

export function decodeEip1967AddressWord(raw){
 if(typeof raw!=="string"||!WORD.test(raw))throw Error("Invalid EIP-1967 slot word");
 const word=raw.toLowerCase();
 if(word===EMPTY)return null;
 if(word.slice(2,26)!=="0".repeat(24))throw Error("Noncanonical EIP-1967 address word");
 const address="0x"+word.slice(26);
 if(!ADDRESS.test(address)||/^0x0{40}$/.test(address))throw Error("Invalid EIP-1967 address");
 return address;
}
function validReference(ref){
 return Boolean(ref&&typeof ref==="object"&&!Array.isArray(ref)&&
  typeof ref.token==="string"&&ADDRESS.test(ref.token)&&!/^0x0{40}$/i.test(ref.token)&&
  typeof ref.block==="string"&&/^0x[1-9a-f][0-9a-f]{0,15}$/.test(ref.block)&&
  typeof ref.hash==="string"&&/^0x[0-9a-f]{64}$/.test(ref.hash)&&ref.hash!==EMPTY);
}
const codeHash=async code=>{
 if(typeof code!=="string"||!CODE.test(code))throw Error("Implementation/beacon bytecode unavailable");
 const bytes=Uint8Array.from(code.slice(2).match(/../g),x=>parseInt(x,16));
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
};
async function boundedJson(response){
 if(!response?.ok)throw Error("Base proxy RPC unavailable");
 const length=response.headers?.get("content-length");
 if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES))throw Error("Base proxy RPC oversized");
 const reader=response.body?.getReader?.();if(!reader)throw Error("Missing RPC stream");
 const chunks=[];let n=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>MAX_BYTES){await reader.cancel();throw Error("Oversized Base proxy RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const buffer=new Uint8Array(n);let start=0;for(const x of chunks){buffer.set(x,start);start+=x.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(buffer));
}
export async function observeEip1967AtBaseBlock(reference,{
 rpcUrl=BASE_OBSERVATION_PRIMARY_RPC,
 fetchImpl=(url,opts)=>globalThis.fetch(url,opts),signal
}={}){
 if(!validReference(reference))throw Error("Invalid exact Base proxy reference");
 const endpoint=validatePublicBaseRpcUrl(rpcUrl);
 const deadline=AbortSignal.timeout(15000),requestSignal=signal?AbortSignal.any([signal,deadline]):deadline;
 let seq=0;
 const call=async(method,params)=>{
  requestSignal.throwIfAborted();
  const id=++seq;
  const response=await fetchImpl(endpoint,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},
   credentials:"omit",cache:"no-store",redirect:"error",signal:requestSignal,
   body:JSON.stringify({jsonrpc:"2.0",id,method,params})});
  const parsed=await boundedJson(response);requestSignal.throwIfAborted();
  if(!parsed||parsed.jsonrpc!=="2.0"||parsed.id!==id||Object.hasOwn(parsed,"error")||!Object.hasOwn(parsed,"result"))
   throw Error("Invalid Base proxy RPC response");
  return parsed.result;
 };
 if(await call("eth_chainId",[])!=="0x2105")throw Error("Not Base mainnet");
 const pinned=Object.freeze({blockHash:reference.hash,requireCanonical:true});
 assertBaseBlockIdentity(await call("eth_getBlockByNumber",[reference.block,false]),reference.block,reference.hash);
 const slots={};
 for(const [name,slot] of Object.entries(EIP1967_SLOTS)){
  slots[name]=decodeEip1967AddressWord(await call("eth_getStorageAt",[reference.token,slot,pinned]));
 }
 let implementationCodeSha256=null,beaconCodeSha256=null;
 if(slots.implementation)implementationCodeSha256=await codeHash(await call("eth_getCode",[slots.implementation,pinned]));
 if(slots.beacon)beaconCodeSha256=await codeHash(await call("eth_getCode",[slots.beacon,pinned]));
 if(await call("eth_chainId",[])!=="0x2105")throw Error("Base proxy RPC chain changed");
 assertBaseBlockIdentity(await call("eth_getBlockByNumber",[reference.block,false]),reference.block,reference.hash);
 requestSignal.throwIfAborted();
 return Object.freeze({
  chainId:8453,token:reference.token.toLowerCase(),block:reference.block,hash:reference.hash,
  implementation:slots.implementation,admin:slots.admin,beacon:slots.beacon,
  implementationCodeSha256,beaconCodeSha256
 });
}
const FIELDS=Object.freeze(["chainId","token","block","hash","implementation","admin","beacon","implementationCodeSha256","beaconCodeSha256"]);
export function compareEip1967Snapshots(primary,secondary,reference){
 if(!validReference(reference))throw Error("Invalid exact Base proxy reference");
 for(const observation of [primary,secondary]){
  if(!observation||typeof observation!=="object"||
   observation.chainId!==8453||observation.token!==reference.token.toLowerCase()||
   observation.block!==reference.block||observation.hash!==reference.hash)
   throw Error("Base proxy evidence identity mismatch");
 }
 for(const field of FIELDS)if(primary[field]!==secondary[field])throw Error("Base proxy RPC mismatch: "+field);
 for(const s of [primary.implementation,primary.admin,primary.beacon])
  if(s!==null&&(typeof s!=="string"||!ADDRESS.test(s)||s!==s.toLowerCase()||/^0x0{40}$/.test(s)))
   throw Error("Invalid Base proxy state address");
 for(const [address,hash] of [[primary.implementation,primary.implementationCodeSha256],[primary.beacon,primary.beaconCodeSha256]]){
  if(address?(typeof hash!=="string"||!/^[0-9a-f]{64}$/.test(hash)):hash!==null)
   throw Error("Incomplete Base proxy runtime code observation");
 }
 const warnings=[];
 if(primary.implementation)warnings.push("IMPLEMENTATION_SLOT_NONZERO_UPGRADEABILITY_REVIEW_REQUIRED");
 if(primary.admin)warnings.push("ADMIN_SLOT_NONZERO_PRIVILEGED_CONTROL_REVIEW_REQUIRED");
 if(primary.beacon)warnings.push("BEACON_SLOT_NONZERO_UPGRADEABILITY_REVIEW_REQUIRED");
 if(primary.implementation&&primary.beacon)warnings.push("CONFLICTING_IMPLEMENTATION_AND_BEACON_SLOTS");
 if(!primary.implementation&&!primary.beacon)warnings.push("NO_EIP1967_IMPLEMENTATION_DETECTED_OTHER_PROXY_PATTERNS_UNCHECKED");
 warnings.push("TOKEN_SOURCE_PROXY_SEMANTICS_AND_TRANSFER_BEHAVIOR_UNVERIFIED");
 return Object.freeze({
  chainId:8453,token:reference.token.toLowerCase(),block:reference.block,hash:reference.hash,
  implementation:primary.implementation,admin:primary.admin,beacon:primary.beacon,
  implementationCodeSha256:primary.implementationCodeSha256,beaconCodeSha256:primary.beaconCodeSha256,
  warnings:Object.freeze(warnings),readOnly:true,observationOnly:true,
  twoHostsAgreed:true,providerIndependenceVerified:false,
  sourceBinaryParityVerified:false,transferSemanticsVerified:false,
  executable:false,executionReady:false
 });
}
export async function corroborateBaseProxyControl(input,{
 primaryRpcUrl=BASE_OBSERVATION_PRIMARY_RPC,secondaryRpcUrl,
 fetchImpl=(url,opts)=>globalThis.fetch(url,opts),signal,
 allowanceImpl=corroborateBaseAllowanceObservation,probeImpl=observeEip1967AtBaseBlock
}={}){
 // Validate both public URLs before any network requests.
 const primary=validatePublicBaseRpcUrl(primaryRpcUrl),secondary=validatePublicBaseRpcUrl(secondaryRpcUrl);
 if(new URL(primary).hostname===new URL(secondary).hostname)throw Error("Base proxy RPC hostnames must differ");
 signal?.throwIfAborted?.();
 const observation=await allowanceImpl(input,{primaryRpcUrl:primary,secondaryRpcUrl:secondary,fetchImpl,signal});
 if(observation?.chainId!==8453||observation.executable!==false||observation.observationOnly!==true||
   observation.matchedAcrossDistinctRpcHosts!==true||observation.providerIndependenceVerified!==false)
  throw Error("Unverified Base allowance reference");
 const reference={token:observation.sellToken,block:observation.observedBlock,hash:observation.observedBlockHash};
 if(!validReference(reference))throw Error("Invalid Base allowance reference for proxy");
 const p=await probeImpl(reference,{rpcUrl:primary,fetchImpl,signal});
 const s=await probeImpl(reference,{rpcUrl:secondary,fetchImpl,signal});
 return compareEip1967Snapshots(p,s,reference);
}
