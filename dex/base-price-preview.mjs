// Public UI: no secrets, wallet access or executable quote data.
// A separate verified deployment must explicitly enable this preview.
export const BASE_PRICE_PREVIEW_ENABLED=false;
export const BASE_PRICE_PREVIEW_ENDPOINT=null;
export const VERIFIED_BASE_PRICE_ENDPOINT="https://base-price.climboria.fun/v1/base/indicative-price";
export const BASE_PRICE_HEALTH_ENDPOINT="https://base-price.climboria.fun/health";
export function isPublicPricingReady(data){
 return Boolean(data&&data.service==="climboria-base-price-preview"&&typeof data.deployedGitSha==="string"&&/^[a-f0-9]{40}$/.test(data.deployedGitSha)&&data.pricingDisabled===false&&data.publicPricingReady===true&&data.bindingsReady===true&&data.execution==="unsupported");
}
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH="0x4200000000000000000000000000000000000006";
const MAX_UINT=(1n<<256n)-1n;
const PAIRS=Object.freeze({
 buy:Object.freeze({sellToken:USDC,buyToken:WETH,sellDecimals:6,buyDecimals:18,sellSymbol:"USDC",buySymbol:"WETH"}),
 sell:Object.freeze({sellToken:WETH,buyToken:USDC,sellDecimals:18,buyDecimals:6,sellSymbol:"WETH",buySymbol:"USDC"})
});
function raw(value){
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(value)||BigInt(value)>MAX_UINT)throw Error("Invalid provider amount");
 return BigInt(value);
}
export function parseBasePreviewAmount(value,decimals){
 if(typeof value!=="string"||value.length>80||!Number.isInteger(decimals)||decimals<0||decimals>18||!/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value))throw Error("Enter a positive decimal amount");
 const [whole,fraction=""]=value.split(".");
 if(fraction.length>decimals)throw Error("Too many decimal places");
 const units=BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,"0")||"0");
 if(units<=0n||units>MAX_UINT)throw Error("Amount out of range");
 return units.toString();
}
export function formatBasePreviewAmount(value,decimals){
 const units=raw(value),digits=units.toString().padStart(decimals+1,"0");
 if(!decimals)return digits;
 const fraction=digits.slice(-decimals).replace(/0+$/,"");
 return digits.slice(0,-decimals)+(fraction?"."+fraction:"");
}
export function previewIntent(direction,amount){
 if(!Object.hasOwn(PAIRS,direction))throw Error("Invalid direction");
 const pair=PAIRS[direction];
 return {pair,chainId:8453,sellToken:pair.sellToken,buyToken:pair.buyToken,sellAmount:parseBasePreviewAmount(amount,pair.sellDecimals)};
}
export function previewLabels(intent,data){
 if(!data||data.provider!=="0x"||data.chainId!==8453||data.indicativeOnly!==true||data.executable!==false||data.sellToken!==intent.sellToken||data.buyToken!==intent.buyToken||data.requestedSellAmount!==intent.sellAmount)throw Error("Unexpected price response");
 const p=intent.pair,requested=raw(data.requestedSellAmount),net=raw(data.reportedSellAmount),buy=raw(data.estimatedBuyAmount),min=raw(data.providerMinBuyAmount);
 if(net<=0n||net>requested||buy<=0n||min<=0n||min>buy)throw Error("Unexpected price amounts");
 if(!data.fees||typeof data.fees!=="object")throw Error("Fee information unavailable");
 let sellFees=0n;
 const rows=[["Requested input",formatBasePreviewAmount(data.requestedSellAmount,p.sellDecimals)+" "+p.sellSymbol],["Provider-reported sell amount",formatBasePreviewAmount(data.reportedSellAmount,p.sellDecimals)+" "+p.sellSymbol],["Estimated output",formatBasePreviewAmount(data.estimatedBuyAmount,p.buyDecimals)+" "+p.buySymbol],["Provider minimum estimate (not guaranteed)",formatBasePreviewAmount(data.providerMinBuyAmount,p.buyDecimals)+" "+p.buySymbol]];
 for(const [key,label] of [["zeroExFee","Provider fee"],["integratorFee","Integrator fee"],["gasFee","Provider gas fee"]]){
  if(!Object.hasOwn(data.fees,key))throw Error("Missing fee information");
  const fee=data.fees[key];if(fee===null){rows.push([label,"None reported"]);continue;}
  const amount=raw(fee.amount);
  if(key==="integratorFee"&&amount!==0n)throw Error("Unexpected integrator fee");
  if(fee.token===p.sellToken)sellFees+=amount;
  const known=fee.token===USDC?[6,"USDC"]:fee.token===WETH?[18,"WETH"]:null;
  if(!known)throw Error("Unknown fee token");
  rows.push([label,formatBasePreviewAmount(fee.amount,known[0])+" "+known[1]]);
 }
 if(net<requested&&net+sellFees!==requested)throw Error("Unexplained sell amount difference");
 rows.push(["Reported network fee",data.reportedNetworkFee==null?"Unavailable":formatBasePreviewAmount(data.reportedNetworkFee,18)+" ETH (estimate)"]);
 return rows;
}
export function initBasePricePreview(doc=globalThis.document,{enabled=BASE_PRICE_PREVIEW_ENABLED,endpoint=BASE_PRICE_PREVIEW_ENDPOINT,fetchImpl=globalThis.fetch,healthGated=false}={}){
 const form=doc.getElementById("basePriceForm"),direction=doc.getElementById("basePriceDirection"),amount=doc.getElementById("basePriceAmount"),status=doc.getElementById("basePriceStatus"),result=doc.getElementById("basePriceResult"),button=doc.getElementById("basePriceSubmit");
 if(!form||!direction||!amount||!status||!result||!button)return;
 let url=null;
 // No URL comes from user input, storage, or query parameters.
 if(enabled===true&&typeof endpoint==="string"){
  try{const candidate=new URL(endpoint);if(candidate.protocol==="https:"&&candidate.hostname==="base-price.climboria.fun"&&!candidate.username&&!candidate.password&&!candidate.port&&!candidate.search&&!candidate.hash&&candidate.pathname==="/v1/base/indicative-price")url=candidate;}catch{}
 }
 const check=doc.getElementById("basePriceAvailability");
 const healthMode=healthGated===true&&Boolean(check);
 let healthReady=false,healthChecking=false,current;
 const available=()=>Boolean(url)&&(!healthMode||healthReady);
 const health=async signal=>{
  const response=await fetchImpl(BASE_PRICE_HEALTH_ENDPOINT,{method:"GET",credentials:"omit",redirect:"error",cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});
  if(!response.ok){try{await response.body?.cancel();}catch{}return false;}
  const reader=response.body?.getReader();if(!reader)return false;
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return false;}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return isPublicPricingReady(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
 };
 if(healthMode)url=new URL(VERIFIED_BASE_PRICE_ENDPOINT);
 const clear=()=>{current?.abort();current=null;result.replaceChildren();button.disabled=!available()||healthChecking;status.textContent=available()?"Indicative estimates only. No wallet required.":"Pricing preview is not active. Live provider configuration is pending.";};
 direction.addEventListener("change",()=>{amount.value="";clear();});
 amount.addEventListener("input",clear);clear();
 if(healthMode){
  status.textContent="Check availability to see whether public pricing is active.";
  check.addEventListener("click",async()=>{
   if(healthChecking||current)return;
   healthChecking=true;healthReady=false;clear();check.disabled=true;status.textContent="Checking public pricing availability…";
   try{healthReady=await health(new AbortController().signal);}catch{healthReady=false;}
   finally{healthChecking=false;check.disabled=false;button.disabled=!available();status.textContent=healthReady?"Public indicative estimates available. No wallet required.":"Public pricing is not currently available. No price request was sent.";}
  });
 }
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(current||healthChecking||!available())return;clear();
  let intent;try{intent=previewIntent(direction.value,amount.value.trim());}catch(error){status.textContent=error.message;return;}
  const controller=new AbortController();current=controller;button.disabled=true;status.textContent="Requesting indicative estimate…";
  try{
   if(healthMode){
    const ready=await health(controller.signal);
    if(current!==controller||controller.signal.aborted)return;
    healthReady=ready;
    if(!ready){status.textContent="Public pricing is not currently available. No price request was sent.";return;}
   }
   const target=new URL(url);for(const k of ["chainId","sellToken","buyToken","sellAmount"])target.searchParams.set(k,String(intent[k]));
   const response=await fetchImpl(target.toString(),{method:"GET",credentials:"omit",redirect:"error",cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   if(!response.ok){
    // Never display arbitrary upstream error text or retry automatically.
    if(current===controller&&!controller.signal.aborted){
     status.textContent=response.status===429?"Pricing request limit reached. Try again later.":response.status===503?"Base pricing is temporarily unavailable. No transaction prepared.":"Indicative pricing unavailable. No transaction prepared.";
    }
    if(healthMode&&response.status===503)healthReady=false;
    try{await response.body?.cancel();}catch{}
    return;
   }
   const length=response.headers?.get("content-length");if(length&&Number(length)>32768)throw Error("Price response too large");
   const reader=response.body?.getReader();if(!reader)throw Error("Price response unavailable");
   const chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw Error("Price response too large");}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const rows=previewLabels(intent,JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)));
   if(current!==controller||controller.signal.aborted)return;
   for(const [label,value] of rows){const row=doc.createElement("p");row.textContent=label+": "+value;result.append(row);}
   status.textContent="Indicative provider estimate only. Not a firm quote, approval or trade.";
  }catch{if(current===controller&&!controller.signal.aborted)status.textContent="Indicative pricing unavailable. No transaction prepared.";}
  finally{if(current===controller){current=null;button.disabled=!available();}}
 });
}
if(typeof document!=="undefined")initBasePricePreview(document,{healthGated:true});
