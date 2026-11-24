// Server-side only. Indicative 0x Base pricing, NOT transaction or execution data.
// No public HTTP handler or deployment configuration is included in this phase.
export const BASE_CHAIN_ID = 8453;
export const PRICE_ENDPOINT = "https://api.0x.org/swap/allowance-holder/price";
const MAX_UINT256=(1n<<256n)-1n;
const MAX_RESPONSE=262144;
function token(value){
 if(typeof value!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(value)||/^0x0{40}$/.test(value)||/^0x[eE]{40}$/.test(value))throw Error("Invalid ERC-20 contract");
 return value.toLowerCase();
}
function uint(value,{positive=false}={}){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(value))throw Error("Invalid raw amount");
 const n=BigInt(value);
 if(n>MAX_UINT256||(positive&&n===0n))throw Error("Invalid raw amount");
 return n;
}
export function normalizePriceIntent(input){
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).sort().join(",")!=="buyToken,chainId,sellAmount,sellToken")throw Error("Unexpected price intent fields");
 if(input.chainId!==BASE_CHAIN_ID)throw Error("Only Base chain 8453 is supported");
 const sellToken=token(input.sellToken),buyToken=token(input.buyToken);
 if(sellToken===buyToken)throw Error("Sell and buy contracts must differ");
 uint(input.sellAmount,{positive:true});
 return Object.freeze({chainId:BASE_CHAIN_ID,sellToken,buyToken,sellAmount:input.sellAmount});
}
function optionalUint(value){
 if(value===undefined||value===null)return null;
 uint(value);return value;
}
function normalizeFee(value){
 if(value===null||value===undefined)return null;
 if(typeof value!=="object"||Array.isArray(value))throw Error("Invalid provider fee");
 const amount=uint(value.amount);
 return {amount:amount.toString(),token:token(value.token)};
}
export function normalizePriceResponse(intent,data){
 const expected=normalizePriceIntent(intent);
 if(!data||typeof data!=="object"||Array.isArray(data)||data.liquidityAvailable!==true)throw Error("No indicative liquidity available");
 if(Object.hasOwn(data,"chainId")&&data.chainId!==BASE_CHAIN_ID)throw Error("Unexpected provider chain");
 if(token(data.sellToken)!==expected.sellToken||token(data.buyToken)!==expected.buyToken)throw Error("Provider token mismatch");
 const sell=uint(data.sellAmount,{positive:true}),requested=uint(expected.sellAmount,{positive:true});
 const buy=uint(data.buyAmount,{positive:true}),minimum=uint(data.minBuyAmount,{positive:true});
 if(sell>requested||minimum>buy)throw Error("Inconsistent indicative amounts");
 if(!data.fees||typeof data.fees!=="object"||Array.isArray(data.fees))throw Error("Provider fees unavailable");
 const fees={zeroExFee:normalizeFee(data.fees.zeroExFee),integratorFee:normalizeFee(data.fees.integratorFee),gasFee:normalizeFee(data.fees.gasFee)};
 // No integrator fee was requested; never silently present an unexpected charge.
 if(fees.integratorFee&&BigInt(fees.integratorFee.amount)>0n)throw Error("Unexpected integrator fee");
 // The official example may return net sell amount after the provider fee.
 // Require an exact explanation for any reduction; never label net as gross.
 if(sell<requested){
  const sellFees=Object.values(fees).filter(f=>f?.token===expected.sellToken).reduce((n,f)=>n+BigInt(f.amount),0n);
  if(sell+sellFees!==requested)throw Error("Unexplained difference in reported sell amount");
 }
 return Object.freeze({
  provider:"0x",chainId:BASE_CHAIN_ID,indicativeOnly:true,executable:false,
  sellToken:expected.sellToken,buyToken:expected.buyToken,requestedSellAmount:expected.sellAmount,
  reportedSellAmount:sell.toString(),estimatedBuyAmount:buy.toString(),providerMinBuyAmount:minimum.toString(),
  fees,gas:optionalUint(data.gas),gasPrice:optionalUint(data.gasPrice),
  reportedNetworkFee:optionalUint(data.totalNetworkFee),providerBlock:optionalUint(data.blockNumber)
 });
}
async function boundedJson(response){
 const length=response.headers?.get("content-length");
 if(length&&Number(length)>MAX_RESPONSE)throw Error("Provider response too large");
 if(!response.body?.getReader)throw Error("Provider response stream unavailable");
 const reader=response.body.getReader();const chunks=[];let count=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   count+=value.byteLength;if(count>MAX_RESPONSE){await reader.cancel();throw Error("Provider response too large");}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(count);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
}
// Only fixed diagnostic codes and numeric HTTP status may cross the private probe boundary.
export class IndicativePriceFailure extends Error {
 constructor(code,message,status=null){super(message);this.name="IndicativePriceFailure";this.code=code;this.status=status;}
}
export function privatePriceDiagnostic(error){
 if(!(error instanceof IndicativePriceFailure))return {stage:"internal"};
 const allowed=["credential","signal","transport","http","body","schema"];
 if(!allowed.includes(error.code))return {stage:"internal"};
 const result={stage:error.code};
 if(error.code==="http"&&Number.isInteger(error.status)&&error.status>=100&&error.status<=599)result.upstreamStatus=error.status;
 return result;
}
export async function getBaseIndicativePrice(input,{enabled=false,apiKey,fetchImpl=(url,options)=>globalThis.fetch(url,options),signal}={}){
 if(enabled!==true)throw Error("Base indicative pricing disabled");
 const intent=normalizePriceIntent(input);
 if(typeof apiKey!=="string"||!apiKey.trim()||/[\r\n]/.test(apiKey))throw new IndicativePriceFailure("credential","Server provider credential unavailable");
 const url=new URL(PRICE_ENDPOINT);
 for(const [key,value] of Object.entries(intent))url.searchParams.set(key,String(value));
 let requestSignal;
 try{const timeout=AbortSignal.timeout(10000);requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;}catch{throw new IndicativePriceFailure("signal","Indicative price signal unavailable");}
 let response;
 try{
  response=await fetchImpl(url.toString(),{method:"GET",headers:{"0x-api-key":apiKey,"0x-version":"v2",accept:"application/json"},redirect:"manual",cache:"no-store",signal:requestSignal});
 }catch{throw new IndicativePriceFailure("transport","Indicative price provider unavailable");}
 // Workers supports manual redirect mode, not error mode. Never follow an upstream redirect with the server credential.
 if(response.status>=300&&response.status<400){try{await response.body?.cancel();}catch{}throw new IndicativePriceFailure("http","Indicative price provider redirect refused",response.status);}
 if(!response.ok)throw new IndicativePriceFailure("http","Indicative price provider HTTP "+response.status,response.status);
 let data;try{data=await boundedJson(response);}catch{throw new IndicativePriceFailure("body","Invalid indicative price provider response");}
 try{return normalizePriceResponse(intent,data);}catch{throw new IndicativePriceFailure("schema","Invalid indicative price provider schema");}
}
