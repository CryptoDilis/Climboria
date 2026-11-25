// Server-side one-request observation only. No execution or wallet integration.
import {normalizePriceResponse} from "../base-price-provider/zeroex-indicative.mjs";
import {inspectAllowanceHolderExec} from "./allowanceholder-calldata.mjs";
import {BASE_EXECUTION_ENABLED,normalizeExecutionIntent} from "./intent-policy.mjs";
import {observeFundedComposedSimulation} from "./funded-composed-simulation.mjs";
const endpoint="https://api.0x.org/swap/allowance-holder/quote";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const HOLDER="0x0000000000001ff3684f28c67538d4d072c22734";
const address=v=>typeof v==="string"&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x(?:0{40}|e{40})$/i.test(v);
async function readFirmQuote({authorized=false,taker,apiKey,fetchImpl=(url,options)=>globalThis.fetch(url,options)}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true||!address(taker)||typeof apiKey!=="string"||!apiKey.trim()||/[\r\n]/.test(apiKey))throw Error("Explicit authorization and valid input required");
 const intent={chainId:8453,sellToken:USDC,buyToken:WETH,sellAmount:"100000"};
 const url=new URL(endpoint);for(const [k,v] of Object.entries({...intent,taker:taker.toLowerCase()}))url.searchParams.set(k,String(v));
 let r;try{r=await fetchImpl(url.toString(),{method:"GET",redirect:"manual",cache:"no-store",headers:{"0x-api-key":apiKey,"0x-version":"v2",accept:"application/json"},signal:AbortSignal.timeout(15000)});}catch{throw Error("Provider transport failed");}
 if(!r.ok){try{await r.body?.cancel();}catch{}throw Error("Provider request rejected: HTTP "+r.status);}
 let data;
 try{
  const reader=r.body?.getReader();if(!reader)throw Error();
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw Error();}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 }catch{throw Error("Invalid or oversized provider response");}
 let price;try{price=normalizePriceResponse(intent,data);}catch{throw Error("Unexpected firm quote price schema");}
 const tx=data.transaction;
 const validEnvelope=address(tx?.to)&&tx.to.toLowerCase()===HOLDER&&tx.value==="0";
 let decoded=null;
 if(validEnvelope){try{const outer=inspectAllowanceHolderExec(tx.data,{observationTaker:taker});const redact=a=>a===taker.toLowerCase()?"taker":a;decoded={operator:redact(outer.operator),target:redact(outer.target),outerTokenMatches:outer.token===USDC,outerAmountMatches:outer.amount===intent.sellAmount,nestedSelector:outer.nestedSelector,nestedRecipientMatches:outer.settler.recipient===taker.toLowerCase(),nestedBuyTokenMatches:outer.settler.buyToken===WETH,nestedMinimumMatches:outer.settler.minAmountOut===price.providerMinBuyAmount,actions:outer.settler.actions};}catch{}}
 const allowance=data.issues?.allowance;
 const observation=Object.freeze({provider:"0x",chainId:8453,observationOnly:true,executable:false,requestedSellAmount:price.requestedSellAmount,estimatedBuyAmount:price.estimatedBuyAmount,providerMinBuyAmount:price.providerMinBuyAmount,reportedProviderBlock:price.providerBlock,reportedFees: Object.fromEntries(Object.entries(price.fees).map(([key,fee])=>[key,fee===null?null:{amount:fee.amount,token:fee.token===taker.toLowerCase()?"taker":fee.token}])),allowanceHolderMatches:address(data.allowanceTarget)&&data.allowanceTarget.toLowerCase()===HOLDER,allowanceIssue:allowance===null?"none":allowance&&address(allowance.spender)?(allowance.spender.toLowerCase()===HOLDER?"known-holder":"other-spender"):"unknown",balanceIssue:data.issues?.balance===null?"none":data.issues?.balance?"reported":"unknown",simulationComplete:data.issues?.simulationIncomplete===false,permit2Present:data.permit2!=null,validEnvelope,decoded});
 return {intent:Object.freeze({...intent,taker:taker.toLowerCase()}),data,observation};
}
export async function observeFirmQuote(options={}){
 return (await readFirmQuote(options)).observation;
}
// Trusted server-side reviewer receives only the sanitized observation, never
// raw calldata or credentials. It must provide independent reviewed policy,
// intent floor, state and block identity, not simply echo provider claims.
// No production HTTP/CLI wiring. Explicit opt-in covers both read-only phases.
export async function observeFirmQuoteWithFundedSimulation({
 authorized=false,simulationAuthorized=false,taker,apiKey,fetchImpl,
 rpcFetchImpl,reviewCandidate,signal
}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true||simulationAuthorized!==true||typeof reviewCandidate!=="function"||!address(taker))throw Error("Explicit quote and funded read-only authorization and trusted reviewer required");
 signal?.throwIfAborted?.();
 const {intent,data,observation}=await readFirmQuote({authorized,taker,apiKey,fetchImpl});
 signal?.throwIfAborted?.();
 if(!observation.validEnvelope||observation.decoded===null||observation.allowanceHolderMatches!==true||observation.allowanceIssue!=="none"||observation.balanceIssue!=="none"||observation.simulationComplete!==true||observation.permit2Present!==false||typeof observation.reportedProviderBlock!=="string"||!/^[1-9][0-9]{0,19}$/.test(observation.reportedProviderBlock))throw Error("Provider observation not eligible for funded review");
 let snapshot;
 try{
  const reviewed=await reviewCandidate(structuredClone(observation),{signal});
  snapshot=structuredClone(reviewed);
 }catch{throw Error("Independent funded review unavailable");}
 signal?.throwIfAborted?.();
 try{
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)||Object.keys(snapshot).sort().join(",")!=="contractPolicy,minimumBuyAmount,referenceBlock,review,state")throw Error("Invalid review shape");
  const executionIntent=normalizeExecutionIntent({...intent,minimumBuyAmount:snapshot.minimumBuyAmount});
  const simulation=await observeFundedComposedSimulation(executionIntent,data,snapshot.contractPolicy,snapshot.review,snapshot.state,{authorized:true,referenceBlock:snapshot.referenceBlock,fetchImpl:rpcFetchImpl,signal});
  if(simulation.executable!==false||simulation.executionReady!==false||simulation.twoHostsAgreed!==true)throw Error("Invalid simulation evidence");
  return Object.freeze({observation,simulation,samePrivateProviderResponse:true,independentReviewAuthenticated:false,actualQuoteVerified:false,executionReady:false,executable:false});
 }catch{throw Error("Reviewed funded simulation rejected");}
}
