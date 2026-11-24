import assert from "node:assert/strict";
import {resolve} from "node:path";
import {readFile} from "node:fs/promises";
import {Miniflare} from "miniflare";
const cfg=await readFile("dex/base-price-provider/wrangler.toml","utf8");
const compatibilityDate=cfg.match(/^compatibility_date = "(\d{4}-\d{2}-\d{2})"$/m)?.[1];
assert.ok(compatibilityDate);
const sellToken="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buyToken="0x4200000000000000000000000000000000000006";
let calls=0,mode="ok";
const runtime=new Miniflare({
 modules:true,scriptPath:resolve(".github/scripts/base-price-adapter-runtime-fixture.mjs"),compatibilityDate,
 outboundService:async request=>{
  calls++;
  const url=new URL(request.url);
  assert.equal(url.origin+url.pathname,"https://api.0x.org/swap/allowance-holder/price");
  assert.equal(request.method,"GET");
  assert.equal(request.headers.get("0x-api-key"),"synthetic-test-key");
  assert.equal(request.headers.get("0x-version"),"v2");
  assert.deepEqual(Object.fromEntries(url.searchParams),{chainId:"8453",sellToken,buyToken,sellAmount:"100000"});
  if(mode==="redirect")return new Response(null,{status:302,headers:{location:"https://invalid.example/credential-trap"}});
  if(mode==="http")return new Response("synthetic private upstream error",{status:429});
  if(mode==="body")return new Response("not JSON");
  if(mode==="schema")return Response.json({liquidityAvailable:false});
  return Response.json({liquidityAvailable:true,sellToken,buyToken,sellAmount:"100000",buyAmount:"58733120001805",minBuyAmount:"58145788801787",fees:{zeroExFee:{amount:"150",token:sellToken},integratorFee:null,gasFee:null}});
 }
});
try{
 const ok=await runtime.dispatchFetch("https://local.invalid/test");
 const data=await ok.json();
 assert.equal(ok.status,200,JSON.stringify({data,outboundCalls:calls}));assert.equal(data.executable,false);assert.equal(data.estimatedBuyAmount,"58733120001805");
 for(const [next,expected] of [["redirect",{stage:"http",upstreamStatus:302}],["http",{stage:"http",upstreamStatus:429}],["body",{stage:"body"}],["schema",{stage:"schema"}]]){
  mode=next;const r=await runtime.dispatchFetch("https://local.invalid/test");assert.equal(r.status,502);assert.deepEqual(await r.json(),expected);
 }
 assert.equal(calls,5);
 console.log("PASS: local workerd adapter transport, signal, HTTP/body/schema classification with intercepted synthetic upstream.");
}finally{await runtime.dispose();}
