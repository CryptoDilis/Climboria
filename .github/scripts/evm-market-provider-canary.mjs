// Read-only provider compatibility canary; not a router, on-chain verifier or release gate waiver.
// Known wrapped-native reference contracts. Provider labels are checked, not trusted as on-chain proof.
import assert from "node:assert/strict";
import {parseEvmMarketPairs,baseMarketUrl} from "../../swap/base-market-preview.mjs";
const references=Object.freeze([
 {id:8453,label:"base",contract:"0x4200000000000000000000000000000000000006"},
 {id:1,label:"ethereum",contract:"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"},
 {id:56,label:"bsc",contract:"0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"}
]);
const maxBytes=450000;
async function readBounded(response){
 if(!response.body)throw Error("Empty provider body");
 const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,body="";
 try {
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>maxBytes)throw Error("Provider response too large");
   body+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(body+decoder.decode());
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
let failures=0;
for(const ref of references){
 try {
  const url=baseMarketUrl(ref.contract);
  assert.ok(url);
  const response=await fetch(url,{method:"GET",redirect:"error",cache:"no-store",
   headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("Provider HTTP "+response.status);
  if(!/application\/json/i.test(response.headers.get("content-type")||""))throw Error("Unexpected provider content type");
  const data=await readBounded(response);
  assert.ok(Array.isArray(data?.pairs),"Provider pair schema missing");
  const rows=parseEvmMarketPairs(data,ref.contract,ref.id);
  assert.ok(rows.length>0,"No matching liquid reference pools");
  assert.ok(rows.some(row=>row.priceAvailable),"No exact base-side USD price available");
  for(const row of rows){
   assert.equal(row.contract,ref.contract);
   assert.ok(data.pairs.slice(0,150).some(p=>p?.chainId===ref.label&&
    typeof p.pairAddress==="string"&&p.pairAddress.toLowerCase()===row.pairAddress&&
    [p.baseToken?.address,p.quoteToken?.address].some(a=>typeof a==="string"&&a.toLowerCase()===ref.contract)));
  }
  console.log(JSON.stringify({result:"PASS",chainId:ref.id,providerChain:ref.label,
   contract:ref.contract,matchingPools:rows.length,pricedPools:rows.filter(p=>p.priceAvailable).length}));
 }catch(error){
  failures++;console.error(JSON.stringify({result:"NO_GO",chainId:ref.id,reason:String(error.message).slice(0,200)}));
 }
}
if(failures)process.exitCode=1;
