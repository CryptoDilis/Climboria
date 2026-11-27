// Secondary EVM research only. Never switches wallet or Swap network.
import {canonicalBaseAddress,baseMarketUrl,parseEvmMarketPairs} from "./base-market-preview.mjs";
const CHAINS=Object.freeze({"1":{id:1,name:"Ethereum",provider:"ethereum"},"56":{id:56,name:"BNB Chain",provider:"bsc"}});
const LIMIT=450000;
async function readBounded(response){
 if(!response.body)throw Error("Missing provider body");
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,raw="";
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>LIMIT)throw Error("Oversized provider response");
   raw+=decoder.decode(value,{stream:true});}
  return JSON.parse(raw+decoder.decode());
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function initSecondaryEvmResearch({doc=globalThis.document,scope=globalThis.window,fetchImpl=scope?.fetch?.bind(scope)}={}){
 const get=id=>doc?.getElementById(id);
 const panel=get("secondaryEvmResearch"),form=get("secondaryEvmForm"),chain=get("secondaryEvmChain"),input=get("secondaryEvmContract"),status=get("secondaryEvmStatus"),results=get("secondaryEvmResults");
 if(!panel||!form||!chain||!input||!status||!results||typeof fetchImpl!=="function")return {ready:false};
 let seq=0,active=null;
 const visible=()=>doc.documentElement.dataset.climboriaSwapNetwork==="base";
 const selected=()=>Object.hasOwn(CHAINS,chain.value)?CHAINS[chain.value]:null;
 function clear(message){++seq;active?.abort();active=null;results.replaceChildren();status.textContent=message;}
 function sync(){panel.hidden=!visible();if(!visible()){input.value="";clear("Select Base market workspace to access secondary research.");}}
 function changeChain(){input.value="";clear("Enter an exact contract on the selected research network.");}
 chain.addEventListener("change",changeChain);
 input.addEventListener("input",()=>clear("Contract changed. Select Find pools to request current data."));
 form.addEventListener("submit",async event=>{
  event.preventDefault();const network=selected(),contract=canonicalBaseAddress(input.value);
  clear("Checking provider market data…");
  if(!visible()||!network||!contract){status.textContent="Select an available research network and enter its exact 0x-prefixed contract.";return;}
  const request=seq,controller=new AbortController();active=controller;
  const current=()=>request===seq&&visible()&&selected()===network&&canonicalBaseAddress(input.value)===contract;
  const timer=scope.setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetchImpl(baseMarketUrl(contract),{method:"GET",redirect:"error",cache:"no-store",headers:{accept:"application/json"},signal:controller.signal});
   if(!response.ok||!/application\/json/i.test(response.headers.get("content-type")||""))throw Error("Provider unavailable");
   const data=await readBounded(response);
   if(!current())return;
   if(!Array.isArray(data?.pairs))throw Error("Invalid provider schema");
   const rows=parseEvmMarketPairs(data,contract,network.id);
   for(const row of rows){
    const card=doc.createElement("article");card.className="base-market-pair";
    const title=doc.createElement("h4");title.textContent=row.symbol+" / "+row.quoteSymbol+" · "+row.venue;card.appendChild(title);
    const proof=doc.createElement("p");proof.className="base-market-contract";proof.textContent=network.name+" · Chain "+network.id+" · Contract "+contract+" · Pool "+row.pairAddress;card.appendChild(proof);
    const fmt=n=>n===null?"Unavailable":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumSignificantDigits:8}).format(n);
    const metrics=doc.createElement("p");metrics.className="base-market-metrics";metrics.textContent="Token USD price: "+fmt(row.priceUsd)+" · Liquidity: "+fmt(row.liquidityUsd)+" · 24h volume: "+fmt(row.volume24hUsd);card.appendChild(metrics);
    const link=doc.createElement("a");link.href="https://dexscreener.com/"+network.provider+"/"+row.pairAddress;link.target="_blank";link.rel="noopener noreferrer";link.referrerPolicy="no-referrer";link.textContent="Inspect exact pool on DexScreener";card.appendChild(link);results.appendChild(card);
   }
   status.textContent=rows.length?"Found "+rows.length+" "+network.name+" pool(s). Provider observations only; no quote or trade.":"No matching liquid pools on "+network.name+". No price inferred.";
  }catch{if(current()){results.replaceChildren();status.textContent=network.name+" market data unavailable. No quote or trade prepared.";}}
  finally{scope.clearTimeout(timer);if(request===seq)active=null;}
 });
 doc.addEventListener?.("climboria:managed-provider-pair-change",sync);
 scope.addEventListener?.("popstate",()=>scope.setTimeout(sync,0));
 sync();return {ready:true,sync};
}
if(typeof document!=="undefined"&&typeof window!=="undefined")initSecondaryEvmResearch();
