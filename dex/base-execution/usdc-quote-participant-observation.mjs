// Narrow read-only USDC preflight for the already reviewed four-action candidate.
// Historical source reproduction is not current controller authority or settlement proof.
import {normalizeExecutionIntent,BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {inspectFourActionQuote} from "./four-action-composition-policy.mjs";
import {assertBaseBlockIdentity} from "./allowance-observation.mjs";
import {BASE_ALLOWANCE_HOLDER} from "./allowance-policy.mjs";
import {EIP1967_SLOTS,decodeEip1967AddressWord} from "./eip1967-proxy-observation.mjs";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",implementation="0x2ce6311ddae708829bc0784c967b7d77d19fd779",admin="0x4fc7850364958d97b4d3f5a08f79db2493f8ca44",library="0x2d943e25e1859ed786afe4afb2b42e14efac691e";
const fingerprints=Object.freeze({
 [USDC]:"98d785fcb1bf847f287adc2310759fd94cc13e754b974bc72131382e8266f607",
 [implementation]:"dcb3b7ca28662970d0a7cdad420e529fb837d7bf8a246b1a680c20e153db79e8",
 [library]:"c2f89c8f2f4b2d9f3f1a9c27222107ea797b765fc3cc083b1543967cf4e0998c"
});
const legacy=Object.freeze({implementation:"0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",admin:"0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b"});
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
const address=v=>{if(typeof v!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(v)||/^0x(?:0{40}|e{40})$/i.test(v))throw Error("Invalid participant address");return v.toLowerCase();};
export function decodeUsdcBool(v){
 if(typeof v!=="string"||!/^0x0{63}[01]$/.test(v))throw Error("Invalid USDC bool");
 return v.endsWith("1");
}
export function inspectUsdcQuoteParticipants(input,quote,contractPolicy,review,state,anchor){
 const intent=normalizeExecutionIntent(input);
 if(!anchor||typeof anchor.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,10}$/.test(anchor.block)||typeof anchor.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(anchor.hash)||/^0x0{64}$/.test(anchor.hash)||anchor.block!==review?.reviewedBlockNumber||anchor.hash!==review?.reviewedBlockHash||anchor.block!==state?.blockNumber||anchor.hash!==state?.blockHash)throw Error("USDC participant reference mismatch");
 if(typeof quote?.blockNumber!=="string"||!/^[1-9][0-9]{0,19}$/.test(quote.blockNumber)||BigInt(quote.blockNumber)!==BigInt(anchor.block))throw Error("USDC quote block mismatch");
 const composition=inspectFourActionQuote(intent,quote,contractPolicy,review,state);
 if(composition.executable!==false||composition.blockHash!==anchor.hash)throw Error("Unreviewed USDC composition");
 // Both fee recipients checked conservatively, regardless of transfer direction.
 return Object.freeze([...new Set([intent.taker,BASE_ALLOWANCE_HOLDER,review.reviewedSettler,composition.pool,review.sellFeeRecipient,review.surplusRecipient].map(address))]);
}
export async function observeUsdcQuoteParticipants(input,quote,contractPolicy,review,state,{authorized=false,referenceBlock,fetchImpl=(url,opts)=>globalThis.fetch(url,opts),signal}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true)throw Error("Explicit USDC read-only authorization required");
 signal?.throwIfAborted?.();
 const s=structuredClone({input,quote,contractPolicy,review,state,referenceBlock});
 const a=s.referenceBlock,participants=inspectUsdcQuoteParticipants(s.input,s.quote,s.contractPolicy,s.review,s.state,a);
 const tag={blockHash:a.hash,requireCanonical:true};
 const deadline=AbortSignal.timeout(90000),requestSignal=signal?AbortSignal.any([signal,deadline]):deadline;
 let seq=0;
 async function rpc(host,method,params){
  requestSignal.throwIfAborted();const id=++seq;
  const r=await fetchImpl(host,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),signal:AbortSignal.any([requestSignal,AbortSignal.timeout(12000)])});
  if(!r.ok){try{await r.body?.cancel();}catch{}throw Error("USDC RPC unavailable");}
  const reader=r.body?.getReader();if(!reader)throw Error("Missing RPC stream");
  let n=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>131072){await reader.cancel();throw Error("Oversized USDC RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(n);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
  const j=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));requestSignal.throwIfAborted();
  if(!j||j.jsonrpc!=="2.0"||j.id!==id||Object.hasOwn(j,"error")||!Object.hasOwn(j,"result"))throw Error("Invalid USDC RPC result");
  return j.result;
 }
 async function observe(host){
  async function fence(){
   if(await rpc(host,"eth_chainId",[])!=="0x2105")throw Error("Wrong Base chain");
   assertBaseBlockIdentity(await rpc(host,"eth_getBlockByNumber",[a.block,false]),a.block,a.hash);
  }
  await fence();
  for(const [addr,expected] of Object.entries(fingerprints)){
   const code=await rpc(host,"eth_getCode",[addr,tag]);
   if(typeof code!=="string"||!/^0x(?:[0-9a-fA-F]{2}){1,24576}$/.test(code))throw Error("Invalid USDC runtime");
   const bytes=Uint8Array.from(code.slice(2).match(/../g),x=>parseInt(x,16));
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
   if(digest!==expected)throw Error("Reproduced USDC runtime changed");
  }
  for(const [name,expected] of Object.entries({implementation,admin})){
   if(decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[USDC,legacy[name],tag]))!==expected)throw Error("USDC legacy proxy control changed");
  }
  for(const slot of Object.values(EIP1967_SLOTS))if(decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[USDC,slot,tag]))!==null)throw Error("Unexpected USDC proxy control slot");
  const call=data=>rpc(host,"eth_call",[{to:USDC,data},tag]);
  if(decodeEip1967AddressWord(await call("0x5c60da1b"))!==implementation||decodeEip1967AddressWord(await call("0xf851a440"))!==admin)throw Error("USDC getters disagree");
  if(decodeUsdcBool(await call("0x5c975abb")))throw Error("USDC paused");
  for(const participant of participants)if(decodeUsdcBool(await call("0xfe575a87"+participant.slice(2).padStart(64,"0"))))throw Error("USDC participant restricted");
  await fence();
 }
 await observe(hosts[0]);await observe(hosts[1]);
 return Object.freeze({chainId:8453,block:a.block,blockHash:a.hash,participantCount:participants.length,previouslyReproducedUsdcRuntimeMatched:true,usdcNotPausedObserved:true,quoteParticipantsNotBlacklistedObserved:true,twoHostsAgreed:true,providerIndependenceVerified:false,controllerAuthorityVerified:false,stateAuthenticated:false,transferSemanticsVerified:false,actualQuoteVerified:false,executionReady:false,executable:false});
}
