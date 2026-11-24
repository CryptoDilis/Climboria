import test from "node:test";
import assert from "node:assert/strict";
import {createPriceHandler} from "../../dex/base-price-provider/worker.mjs";
const origin="https://climboria.fun";
const path="https://unused.example/v1/base/indicative-price";
const q="?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000";
function req(suffix=q,{method="GET",headers={}}={}){
 return new Request(path+suffix,{method,headers:{origin,"CF-Connecting-IP":"192.0.2.1",...headers}});
}
function fixture(){
 const seen=[];
 const env={BASE_INDICATIVE_PRICE_ENABLED:"true",ZEROEX_API_KEY:"fake-key",BASE_PRICE_DAILY_ATTEMPTS:"10",
 BASE_PRICE_BUDGET:{idFromName:name=>name,get:id=>({fetch:async(url,opts)=>{seen.push(["budget",id,opts.method]);return new Response(null,{status:204})}})},
 BASE_PRICE_IP_LIMITER:{limit:async a=>{seen.push(["ip",a]);return {success:true}}},
 BASE_PRICE_GLOBAL_LIMITER:{limit:async a=>{seen.push(["global",a]);return {success:true}}}};
 const handler=createPriceHandler({price:async(intent,options)=>{seen.push(["price",intent,options.enabled]);return {provider:"0x",indicativeOnly:true,executable:false};}});
 return {env,seen,handler};
}
test("disabled or incomplete environment never contacts provider",async()=>{
 const {handler,env,seen}=fixture();
 for(const bad of [{},{...env,BASE_INDICATIVE_PRICE_ENABLED:true},{...env,ZEROEX_API_KEY:""},{...env,BASE_PRICE_GLOBAL_LIMITER:undefined},{...env,BASE_PRICE_BUDGET:undefined},{...env,BASE_PRICE_DAILY_ATTEMPTS:"0"}]){
  assert.equal((await handler(req(),bad)).status,503);
 }
 assert.deepEqual(seen,[]);
});
test("strict browser origins, GET, exact input and no forwarded IP fallback",async()=>{
 const {handler,env,seen}=fixture();
 for(const [request,expected] of [
  [req(q,{headers:{origin:"https://evil.example"}}),403],
  [req(q,{method:"POST"}),405],
  [req(q+"&taker=0x123"),400],
  [req(q.replace("0x4200000000000000000000000000000000000006","0x"+"a".repeat(40))),400],
  [req(q+"&chainId=8453"),400],
  [req(q.replace("8453","1")),400],
  [req(q.replace("100000","0")),400],
  [req(q,{headers:{"CF-Connecting-IP":"","X-Forwarded-For":"192.0.2.1"}}),503]
 ])assert.equal((await handler(request,env)).status,expected);
 assert.deepEqual(seen,[]);
});
test("limits applied before price and fail closed",async()=>{
 const {handler,env,seen}=fixture();
 assert.equal((await handler(req(),{...env,BASE_PRICE_IP_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await handler(req(),{...env,BASE_PRICE_GLOBAL_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await handler(req(),{...env,BASE_PRICE_GLOBAL_LIMITER:{limit:async()=>{throw Error("secret")}}})).status,503);
 assert.ok(!seen.some(x=>x[0]==="price"));
});
test("successful read-only price and restricted CORS",async()=>{
 const {handler,env,seen}=fixture();
 const r=await handler(req(),env);
 assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"no-store");assert.equal(r.headers.get("access-control-allow-origin"),origin);
 assert.equal(r.headers.get("access-control-allow-credentials"),null);
 assert.deepEqual(await r.json(),{provider:"0x",indicativeOnly:true,executable:false});
 assert.deepEqual(seen.map(x=>x[0]),["ip","global","budget","price"]);
 const preflight=await handler(req(q,{method:"OPTIONS",headers:{"access-control-request-method":"GET"}}),env);
 assert.equal(preflight.status,204);
 assert.equal((await handler(req(q,{method:"OPTIONS",headers:{"access-control-request-method":"GET","access-control-request-headers":"authorization"}}),env)).status,403);
 const broken=createPriceHandler({price:async()=>{throw Error("fake-key")}});
 const failure=await broken(req(),env);assert.equal(failure.status,502);assert.ok(!(await failure.text()).includes("fake-key"));
});

test("durable budget refusal prevents provider calls, even after regional limits pass",async()=>{
 const {handler,env,seen}=fixture();
 for(const status of [429,503,200]){
  const budget={idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status})})};
  assert.equal((await handler(req(),{...env,BASE_PRICE_BUDGET:budget})).status,status===429?429:503);
 }
 assert.ok(!seen.some(x=>x[0]==="price"));
});

test("staging health attests disabled config, exact SHA and bindings without exposing secrets",async()=>{
 const {handler,env,seen}=fixture(),sha="a".repeat(40);
 const health=new Request("https://unused.example/health");
 const disabled={...env,BASE_INDICATIVE_PRICE_ENABLED:"false",BASE_PRICE_DAILY_ATTEMPTS:"0",BASE_PRICE_DEPLOYED_SHA:sha};
 const r=await handler(health,disabled);
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{service:"climboria-base-price-preview",deployedGitSha:sha,pricingDisabled:true,bindingsReady:true,execution:"unsupported"});
 for(const bad of [{BASE_INDICATIVE_PRICE_ENABLED:"true"},{BASE_PRICE_DAILY_ATTEMPTS:"1"},{BASE_PRICE_DEPLOYED_SHA:"unpublished"},{BASE_PRICE_BUDGET:undefined}])assert.equal((await handler(health,{...disabled,...bad})).status,503);
 assert.deepEqual(seen,[]);
});
