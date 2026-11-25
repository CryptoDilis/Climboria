// Read-only RPC observations, not authenticated chain proof or execution authorization.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
import {BASE_ALLOWANCE_HOLDER,inspectAllowanceState} from "./allowance-policy.mjs";
export const BASE_OBSERVATION_PRIMARY_RPC="https://mainnet.base.org";
const RUNTIME_SHA="19f7b3f5410204f7deb3ff7c19bd8cb97a84fecf8c4afeb412fefd84f6867877";
const word=address=>address.slice(2).padStart(64,"0");
// The opt-in corroboration CLI accepts only PUBLIC, keyless HTTPS hosts. It
// cannot access localhost/private IPs, redirect to arbitrary URLs, or use
// credentials in a query/path. Provider independence is verified separately.
export function validatePublicBaseRpcUrl(value){
 if(typeof value!=="string"||value.length>220||value.trim()!==value)throw Error("Invalid public Base RPC URL");
 let url;try{url=new URL(value);}catch{throw Error("Invalid public Base RPC URL");}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=="https:"||!host.includes(".")||host.length>130||
    !/^[a-z0-9.-]+$/.test(host)||!host.split(".").every(part=>part&&part.length<=63&&!part.startsWith("-")&&!part.endsWith("-"))||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host)||
    /^[0-9.]+$/.test(host)||host.includes(":")||
    (url.port&&url.port!=="443")||url.username||url.password||url.pathname!=="/"||
    url.search||url.hash||url.origin!==value.replace(/\/$/,""))throw Error("Invalid public Base RPC URL");
 return url.origin;
}
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
const codeBytes=hex=>Uint8Array.from(hex.slice(2).match(/../g),x=>parseInt(x,16));
const decode=value=>{if(typeof value!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(value))throw Error("Invalid uint256 observation");return BigInt(value).toString();};
// Reorg fence: the same numbered block must still have the same identity after
// every read. This detects mid-probe reorganizations, not an untrusted RPC node
// that lies consistently, nor eventual finality.
export function assertBaseBlockIdentity(value,expectedNumber,expectedHash=null){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.number!==expectedNumber||
    typeof value.hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(value.hash)||
    /^0x0{64}$/i.test(value.hash))throw Error("Invalid Base block identity");
 const hash=value.hash.toLowerCase();
 if(expectedHash!==null&&hash!==expectedHash)throw Error("Base block changed during allowance observation");
 return hash;
}
async function bounded(response){
 if(!response.ok){try{await response.body?.cancel();}catch{}throw Error("RPC unavailable");}
 const reader=response.body?.getReader();if(!reader)throw Error("Missing RPC stream");
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
export async function readAllowanceObservation(input,{fetchImpl=(url,options)=>globalThis.fetch(url,options),signal,rpcUrl=BASE_OBSERVATION_PRIMARY_RPC,referenceBlock=null}={}){
 const intent=normalizeExecutionIntent(input);
 const endpoint=validatePublicBaseRpcUrl(rpcUrl);
 if(referenceBlock!==null && (!referenceBlock||typeof referenceBlock!=="object"||
    typeof referenceBlock.number!=="string"||!/^0x[1-9a-f][0-9a-f]{0,15}$/.test(referenceBlock.number)||
    typeof referenceBlock.hash!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(referenceBlock.hash)||
    /^0x0{64}$/i.test(referenceBlock.hash)))throw Error("Invalid independent Base reference block");
 const deadline=AbortSignal.timeout(15000),requestSignal=signal?AbortSignal.any([signal,deadline]):deadline;
 let id=0;
 async function rpc(method,params){
  requestSignal.throwIfAborted();
  const requestId=++id;
  const result=await bounded(await fetchImpl(endpoint,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),credentials:"omit",redirect:"error",cache:"no-store",signal:requestSignal}));
  requestSignal.throwIfAborted();
  if(!result||result.jsonrpc!=="2.0"||result.id!==requestId||Object.hasOwn(result,"error")||!Object.hasOwn(result,"result"))throw Error("Invalid RPC result");
  return result.result;
 }
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("Wrong Base chain");
 const headBlock=await rpc("eth_blockNumber",[]);
 if(typeof headBlock!=="string"||!/^0x[1-9a-f][0-9a-f]{0,15}$/.test(headBlock))throw Error("Invalid block");
 const block=referenceBlock?.number ?? headBlock;
 if(referenceBlock!==null&&BigInt(headBlock)<BigInt(block))throw Error("Independent RPC has not reached reference block");
 const initialBlockHash=assertBaseBlockIdentity(await rpc("eth_getBlockByNumber",[block,false]),block,referenceBlock?.hash?.toLowerCase() ?? null);
 // EIP-1898: pin state reads to the block HASH, not merely the numerical
 // height. If the RPC does not support hash-pinned state or the block is no
 // longer canonical, fail closed rather than silently falling back to height.
 const pinnedBlock=Object.freeze({blockHash:initialBlockHash,requireCanonical:true});
 const holderCode=await rpc("eth_getCode",[BASE_ALLOWANCE_HOLDER,pinnedBlock]);
 if(typeof holderCode!=="string"||!/^0x[0-9a-fA-F]{2018}$/.test(holderCode))throw Error("Unexpected holder runtime");
 const hash=await sha256(codeBytes(holderCode));
 if(hash!==RUNTIME_SHA)throw Error("Holder runtime fingerprint mismatch");
 const tokenCode=await rpc("eth_getCode",[intent.sellToken,pinnedBlock]);
 if(typeof tokenCode!=="string"||!/^0x(?:[0-9a-fA-F]{2}){1,24576}$/.test(tokenCode))throw Error("No sell token runtime");
 const sellTokenCodeSha256=await sha256(codeBytes(tokenCode));
 const balance=decode(await rpc("eth_call",[{to:intent.sellToken,data:"0x70a08231"+word(intent.taker)},pinnedBlock]));
 const allowance=decode(await rpc("eth_call",[{to:intent.sellToken,data:"0xdd62ed3e"+word(intent.taker)+word(BASE_ALLOWANCE_HOLDER)},pinnedBlock]));
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("RPC chain changed");
 // End fence also detects reorganizations between discovery and final check.
 // A hash-pinned read must NEVER degrade to a height-based read on RPC errors.
 assertBaseBlockIdentity(await rpc("eth_getBlockByNumber",[block,false]),block,initialBlockHash);
 requestSignal.throwIfAborted();
 return Object.freeze({...inspectAllowanceState(intent,{chainId:8453,owner:intent.taker,token:intent.sellToken,spender:BASE_ALLOWANCE_HOLDER,block,balance,allowance}),observedBlockHash:initialBlockHash,observedSellTokenCodeSha256:sellTokenCodeSha256});

}
