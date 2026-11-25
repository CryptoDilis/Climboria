// Server-side one-request observation only. No execution or wallet integration.
import {normalizePriceResponse} from "../base-price-provider/zeroex-indicative.mjs";
import {inspectAllowanceHolderExec} from "./allowanceholder-calldata.mjs";
const endpoint="https://api.0x.org/swap/allowance-holder/quote";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const HOLDER="0x0000000000001ff3684f28c67538d4d072c22734";
const address=v=>typeof v==="string"&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x(?:0{40}|e{40})$/i.test(v);
export async function observeFirmQuote({authorized=false,taker,apiKey,fetchImpl=(url,options)=>globalThis.fetch(url,options)}={}){
 if(authorized!==true||!address(taker)||typeof apiKey!=="string"||!apiKey.trim()||/[\r\n]/.test(apiKey))throw Error("Explicit authorization and valid input required");
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
 return Object.freeze({provider:"0x",chainId:8453,observationOnly:true,executable:false,requestedSellAmount:price.requestedSellAmount,estimatedBuyAmount:price.estimatedBuyAmount,providerMinBuyAmount:price.providerMinBuyAmount,reportedProviderBlock:price.providerBlock,reportedFees: Object.fromEntries(Object.entries(price.fees).map(([key,fee])=>[key,fee===null?null:{amount:fee.amount,token:fee.token===taker.toLowerCase()?"taker":fee.token}])),allowanceHolderMatches:address(data.allowanceTarget)&&data.allowanceTarget.toLowerCase()===HOLDER,allowanceIssue:allowance===null?"none":allowance&&address(allowance.spender)?(allowance.spender.toLowerCase()===HOLDER?"known-holder":"other-spender"):"unknown",balanceIssue:data.issues?.balance===null?"none":data.issues?.balance?"reported":"unknown",simulationComplete:data.issues?.simulationIncomplete===false,permit2Present:data.permit2!=null,validEnvelope,decoded});
}
