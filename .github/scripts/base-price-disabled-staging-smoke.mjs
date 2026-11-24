import assert from "node:assert/strict";
const host="https://base-price.climboria.fun";
const origin="https://climboria.fun",expected=process.env.DEPLOY_SHA;
assert.match(expected||"",/^[a-f0-9]{40}$/);
const request=(path,opts={})=>fetch(host+path,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000),...opts});
let ready=false;
for(let attempt=0;attempt<12;attempt++){
 try{
  const r=await request("/health");
  const j=await r.json();
  if(r.status===200&&j.service==="climboria-base-price-preview"&&j.deployedGitSha===expected&&j.pricingDisabled===true&&j.bindingsReady===true&&j.execution==="unsupported"){ready=true;break;}
 }catch{}
 if(attempt<11)await new Promise(r=>setTimeout(r,5000));
}
assert.ok(ready,"Exact disabled deployment health not verified");
const path="/v1/base/indicative-price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000";
const disabled=await request(path,{headers:{Origin:origin}});
assert.equal(disabled.status,503);
assert.equal(disabled.headers.get("access-control-allow-origin"),origin);
assert.deepEqual(await disabled.json(),{error:"Base indicative pricing disabled"});
const denied=await request(path,{headers:{Origin:"https://invalid.example"}});
assert.equal(denied.status,403);
assert.equal(denied.headers.get("access-control-allow-origin"),null);
const post=await request(path,{method:"POST",headers:{Origin:origin}});
assert.equal(post.status,405);
const preflight=await request(path,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET"}});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get("access-control-allow-origin"),origin);
console.log("PASS: exact deployed disabled Base Worker, zero-budget price route and CORS; no provider requests.");
