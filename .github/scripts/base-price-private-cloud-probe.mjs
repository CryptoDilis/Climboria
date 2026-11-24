import assert from "node:assert/strict";
import {previewIntent,previewLabels} from "../../dex/base-price-preview.mjs";
const token=process.env.BASE_PRICE_PROBE_TOKEN;
assert.ok(typeof token==="string"&&/^[a-f0-9]{64}$/.test(token),"Missing private probe credential");
const endpoint="https://base-price.climboria.fun/v1/base/indicative-price";
const buy=previewIntent("buy","0.1"),sell=previewIntent("sell","0.0001");
const request=(intent,authenticated)=>{const url=new URL(endpoint);for(const k of ["chainId","sellToken","buyToken","sellAmount"])url.searchParams.set(k,String(intent[k]));
 const headers={Origin:"https://climboria.fun"};if(authenticated)headers["X-Base-Price-Probe"]=token;
 return fetch(url,{method:"GET",headers,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});};
const unauth=await request(buy,false);
assert.equal(unauth.status,403,"Public requests must be denied before provider use");
assert.deepEqual(await unauth.json(),{error:"Private price probe denied"});
for(const [direction,intent] of [["buy",buy],["sell",sell]]){
 const r=await request(intent,true);
 assert.equal(r.status,200,"Authorized "+direction+" price unavailable");
 assert.equal(r.headers.get("access-control-allow-origin"),"https://climboria.fun");
 const j=await r.json();
 assert.equal(j.executable,false);assert.equal(j.indicativeOnly,true);
 for(const field of ["transaction","allowanceTarget","issues","data","to"])assert.ok(!Object.hasOwn(j,field),"Unexpected execution field");
 previewLabels(intent,j);
 console.log(JSON.stringify({direction,chainId:j.chainId,requestedSellAmount:j.requestedSellAmount,reportedSellAmount:j.reportedSellAmount,estimatedBuyAmount:j.estimatedBuyAmount,providerMinBuyAmount:j.providerMinBuyAmount,fees:j.fees,reportedNetworkFee:j.reportedNetworkFee,executable:false}));
}
const capped=await request(buy,true);
assert.equal(capped.status,429,"Third authorized attempt must be rejected before upstream");
assert.deepEqual(await capped.json(),{error:"Daily price request budget reached"});
console.log("PASS: two private cloud indicative requests, unauthenticated denial, actual durable quota rejection.");
