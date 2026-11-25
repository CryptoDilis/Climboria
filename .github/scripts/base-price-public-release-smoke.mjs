import assert from "node:assert/strict";
import {previewIntent,previewLabels,VERIFIED_BASE_PRICE_ENDPOINT} from "../../dex/base-price-preview.mjs";
const sha=process.env.DEPLOY_SHA;
assert.match(sha||"",/^[a-f0-9]{40}$/);
const host="https://base-price.climboria.fun",origin="https://climboria.fun";
const get=(url,options={})=>fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000),...options});
let ready=false;
for(let i=0;i<12;i++){
 try{
  const r=await get(host+"/health"),j=await r.json();
  if(r.status===200&&j.service==="climboria-base-price-preview"&&j.deployedGitSha===sha&&j.pricingDisabled===false&&j.publicPricingReady===true&&j.bindingsReady===true&&j.execution==="unsupported"){ready=true;break;}
 }catch{}
 if(i<11)await new Promise(r=>setTimeout(r,5000));
}
assert.ok(ready,"Exact public release health not verified");
const target=intent=>{
 const url=new URL(VERIFIED_BASE_PRICE_ENDPOINT);
 for(const k of ["chainId","sellToken","buyToken","sellAmount"])url.searchParams.set(k,String(intent[k]));
 return url;
};
const buy=previewIntent("buy","0.1"),sell=previewIntent("sell","0.0001");
const denied=await get(target(buy),{headers:{Origin:"https://invalid.example"}});
assert.equal(denied.status,403);assert.equal(denied.headers.get("access-control-allow-origin"),null);
const post=await get(target(buy),{method:"POST",headers:{Origin:origin}});
assert.equal(post.status,405);
const extra=target(buy);extra.searchParams.set("taker","0x123");
assert.equal((await get(extra,{headers:{Origin:origin}})).status,400);
const preflight=await get(target(buy),{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET"}});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get("access-control-allow-origin"),origin);
for(const [direction,intent] of [["buy",buy],["sell",sell]]){
 const r=await get(target(intent),{headers:{Origin:origin}});
 assert.equal(r.status,200,"Public "+direction+" indicative price unavailable");
 assert.equal(r.headers.get("access-control-allow-origin"),origin);
 assert.equal(r.headers.get("cache-control"),"no-store");
 const j=await r.json();
 assert.equal(j.indicativeOnly,true);assert.equal(j.executable,false);
 for(const k of ["transaction","allowanceTarget","data","to","issues","diagnostic"])assert.ok(!Object.hasOwn(j,k),"Unexpected private or execution field");
 previewLabels(intent,j);
 console.log("PASS: public "+direction+" indicative estimate, exact pair/amount/fees, no execution fields");
}
console.log("PASS: exact public release and CORS; two authorized live requests, no retries.");
