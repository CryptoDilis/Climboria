/**
 * Opt-in, strictly read-only Base eth_call simulation for a reviewed 0x
 * candidate. NEVER sends or returns executable calldata. A successful eth_call
 * does NOT authorize a wallet approval, signing or actual execution.
 */
import {normalizeExecutionIntent,inspectFirmQuoteCandidate,BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {validatePublicBaseRpcUrl,assertBaseBlockIdentity} from "./allowance-observation.mjs";

const MAX_RESPONSE_BYTES=32768;
const MAX_GAS=3000000n;
const GAS_RE=/^0x[1-9a-f][0-9a-f]{0,10}$/;
function gasHex(value){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,15})$/.test(value))throw Error("Invalid simulation gas cap");
 const n=BigInt(value);
 if(n<21000n||n>MAX_GAS)throw Error("Simulation gas outside bounded policy");
 return "0x"+n.toString(16);
}
function validateReference(ref){
 if(!ref||typeof ref!=="object"||Array.isArray(ref)||
    typeof ref.block!=="string"||!GAS_RE.test(ref.block)||
    typeof ref.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(ref.hash)||
    /^0x0{64}$/.test(ref.hash))throw Error("Invalid simulation block anchor");
 return Object.freeze({block:ref.block,hash:ref.hash});
}
async function boundedBody(response){
 if(!response?.ok)throw Error("Simulation RPC rejected");
 const length=response.headers?.get("content-length");
 if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_RESPONSE_BYTES))throw Error("Simulation RPC oversized");
 const reader=response.body?.getReader?.();
 if(!reader)throw Error("Missing simulation response stream");
 let n=0;const parts=[];
 try{
  while(true){
   const chunk=await reader.read();
   if(chunk.done)break;
   n+=chunk.value.byteLength;
   if(n>MAX_RESPONSE_BYTES){await reader.cancel();throw Error("Simulation response too large");}
   parts.push(chunk.value);
  }
 }finally{reader.releaseLock();}
 const buffer=new Uint8Array(n);let offset=0;
 for(const chunk of parts){buffer.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(buffer));}
 catch{throw Error("Malformed simulation RPC JSON");}
}
export async function observeBaseFirmQuoteSimulation(input,quote,policy,{
 authorized=false,publicRpcUrl="https://mainnet.base.org",referenceBlock,
 simulationGasLimit="1200000",fetchImpl=(url,opts)=>globalThis.fetch(url,opts),
 signal
}={}){
 if(BASE_EXECUTION_ENABLED!==false)throw Error("Offline Base simulation must not enable execution");
 if(authorized!==true)throw Error("Read-only Base simulation requires explicit opt-in");
 const endpoint=validatePublicBaseRpcUrl(publicRpcUrl);
 const anchor=validateReference(referenceBlock);
 const cap=gasHex(simulationGasLimit);
 const intent=normalizeExecutionIntent(input);
 // This parser does NOT establish nested action argument safety; the result
 // explicitly remains non-executable even when the RPC returned success.
 const candidate=inspectFirmQuoteCandidate(input,quote,policy);
 if(candidate.executable!==false||candidate.candidateOnly!==true)
  throw Error("Untrusted Base quote candidate");
 const tx=quote.transaction;
 const calldata=tx?.data;
 if(typeof calldata!=="string"||!/^0x(?:[0-9a-fA-F]{2}){4,32768}$/.test(calldata))
  throw Error("Invalid candidate simulation calldata");
 const pinned={blockHash:anchor.hash,requireCanonical:true};
 const timeout=AbortSignal.timeout(12000);
 const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
 let id=0;
 const rpc=async(method,params)=>{
  requestSignal.throwIfAborted();
  const requestId=++id;
  const response=await fetchImpl(endpoint,{
   method:"POST",redirect:"error",credentials:"omit",cache:"no-store",signal:requestSignal,
   headers:{"content-type":"application/json",accept:"application/json"},
   body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params})
  });
  const parsed=await boundedBody(response);
  requestSignal.throwIfAborted();
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
     parsed.jsonrpc!=="2.0"||parsed.id!==requestId||
     Object.hasOwn(parsed,"error")||!Object.hasOwn(parsed,"result"))
   throw Error("Simulation RPC returned invalid result or EVM revert");
  return parsed.result;
 };
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("Simulation RPC not on Base 8453");
 assertBaseBlockIdentity(await rpc("eth_getBlockByNumber",[anchor.block,false]),anchor.block,anchor.hash);
 const result=await rpc("eth_call",[{
  from:intent.taker,to:tx.to.toLowerCase(),data:calldata,
  value:"0x0",gas:cap
 },pinned]);
 if(typeof result!=="string"||!/^0x(?:[0-9a-fA-F]{2})*$/.test(result)||result.length>8194)
  throw Error("Invalid EVM simulation output");
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("Simulation RPC chain changed");
 assertBaseBlockIdentity(await rpc("eth_getBlockByNumber",[anchor.block,false]),anchor.block,anchor.hash);
 requestSignal.throwIfAborted();
 return Object.freeze({
  chainId:8453,provider:"0x",simulationObserved:true,
  block:anchor.block,blockHash:anchor.hash,
  candidateOnly:true,observationOnly:true,executable:false,
  executionReady:false,readOnly:true,
  nestedActionArgumentsVerified:false,independentRpcVerified:false,
  walletAuthorizationVerified:false,receiptFinalityVerified:false,
  simulationGasCap:simulationGasLimit,
  requestedSellAmount:candidate.requestedSellAmount,
  providerMinBuyAmount:candidate.providerMinBuyAmount,
  // Never expose calldata, transaction to/value, provider API credentials or
  // RPC revert payloads as a "ready to sign" artifact.
 });
}
