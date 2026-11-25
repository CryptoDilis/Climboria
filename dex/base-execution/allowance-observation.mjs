// Read-only RPC observations, not authenticated chain proof or execution authorization.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
import {BASE_ALLOWANCE_HOLDER,inspectAllowanceState} from "./allowance-policy.mjs";
const RPC="https://mainnet.base.org",RUNTIME_SHA="19f7b3f5410204f7deb3ff7c19bd8cb97a84fecf8c4afeb412fefd84f6867877";
const word=address=>address.slice(2).padStart(64,"0");
const decode=value=>{if(typeof value!=="string"||!/^0x[0-9a-fA-F]{64}$/.test(value))throw Error("Invalid uint256 observation");return BigInt(value).toString();};
async function bounded(response){
 if(!response.ok){try{await response.body?.cancel();}catch{}throw Error("RPC unavailable");}
 const reader=response.body?.getReader();if(!reader)throw Error("Missing RPC stream");
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
export async function readAllowanceObservation(input,{fetchImpl=(url,options)=>globalThis.fetch(url,options),signal}={}){
 const intent=normalizeExecutionIntent(input);
 const deadline=AbortSignal.timeout(15000),requestSignal=signal?AbortSignal.any([signal,deadline]):deadline;
 let id=0;
 async function rpc(method,params){
  requestSignal.throwIfAborted();
  const requestId=++id;
  const result=await bounded(await fetchImpl(RPC,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),credentials:"omit",redirect:"error",cache:"no-store",signal:requestSignal}));
  requestSignal.throwIfAborted();
  if(!result||result.jsonrpc!=="2.0"||result.id!==requestId||Object.hasOwn(result,"error")||!Object.hasOwn(result,"result"))throw Error("Invalid RPC result");
  return result.result;
 }
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("Wrong Base chain");
 const block=await rpc("eth_blockNumber",[]);
 if(typeof block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,15}$/.test(block))throw Error("Invalid block");
 const holderCode=await rpc("eth_getCode",[BASE_ALLOWANCE_HOLDER,block]);
 if(typeof holderCode!=="string"||!/^0x[0-9a-fA-F]{2018}$/.test(holderCode))throw Error("Unexpected holder runtime");
 const code=Uint8Array.from(holderCode.slice(2).match(/../g),x=>parseInt(x,16));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",code)),x=>x.toString(16).padStart(2,"0")).join("");
 if(hash!==RUNTIME_SHA)throw Error("Holder runtime fingerprint mismatch");
 const tokenCode=await rpc("eth_getCode",[intent.sellToken,block]);
 if(typeof tokenCode!=="string"||!/^0x(?:[0-9a-fA-F]{2}){1,24576}$/.test(tokenCode))throw Error("No sell token runtime");
 const balance=decode(await rpc("eth_call",[{to:intent.sellToken,data:"0x70a08231"+word(intent.taker)},block]));
 const allowance=decode(await rpc("eth_call",[{to:intent.sellToken,data:"0xdd62ed3e"+word(intent.taker)+word(BASE_ALLOWANCE_HOLDER)},block]));
 if(await rpc("eth_chainId",[])!=="0x2105")throw Error("RPC chain changed");
 requestSignal.throwIfAborted();
 return inspectAllowanceState(intent,{chainId:8453,owner:intent.taker,token:intent.sellToken,spender:BASE_ALLOWANCE_HOLDER,block,balance,allowance});
}
