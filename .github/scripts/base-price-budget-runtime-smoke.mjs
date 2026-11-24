import assert from "node:assert/strict";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {Miniflare} from "miniflare";
import {BUDGET_OBJECT_NAME} from "../../dex/base-price-provider/budget.mjs";

// Exercise the real local workerd SQLite Durable Object implementation.
// No provider credential, upstream request, deployed Worker or public route.
const dir=await mkdtemp(join(tmpdir(),"climboria-base-budget-"));
let runtime;
const config=await readFile("dex/base-price-provider/wrangler.toml","utf8");
const compatibilityDate=config.match(/^compatibility_date = "(\d{4}-\d{2}-\d{2})"$/m)?.[1];
assert.ok(compatibilityDate,"Worker compatibility date must be explicit");
const start=async({cap="3",enabled="true",releaseCap}={})=>{
 runtime=new Miniflare({
  modules:true,scriptPath:resolve("dex/base-price-provider/worker.mjs"),
  compatibilityDate,
  durableObjects:{BASE_PRICE_BUDGET:{className:"BasePriceBudget",useSQLite:true}},
  durableObjectsPersist:dir,
  bindings:{BASE_INDICATIVE_PRICE_ENABLED:enabled,BASE_PRICE_DAILY_ATTEMPTS:cap,...(releaseCap===undefined?{}:{BASE_PRICE_RELEASE_TOTAL_ATTEMPTS:releaseCap})}
 });
 const ns=await runtime.getDurableObjectNamespace("BASE_PRICE_BUDGET");
 return ns.get(ns.idFromName(BUDGET_OBJECT_NAME));
};
const stop=async()=>{if(runtime){await runtime.dispose();runtime=null;}};
const reserve=stub=>stub.fetch("https://internal.invalid/reserve",{method:"POST"}).then(r=>r.status);
try{
 let stub=await start();
 const results=await Promise.all(Array.from({length:12},()=>reserve(stub)));
 assert.equal(results.filter(s=>s===204).length,3);
 assert.equal(results.filter(s=>s===429).length,9);
 await stop();
 stub=await start();
 assert.equal(await reserve(stub),429,"persisted cap must survive runtime restart");
 await stop();
 stub=await start({cap:"10",releaseCap:"4"});
 const limited=await Promise.all(Array.from({length:6},()=>reserve(stub)));
 assert.equal(limited.filter(s=>s===204).length,1);
 assert.equal(limited.filter(s=>s===429).length,5);
 await stop();
 stub=await start({cap:"10",releaseCap:"4"});
 assert.equal(await reserve(stub),429,"cumulative cap must survive runtime restart");
 await stop();
 stub=await start({enabled:"false"});
 assert.equal(await reserve(stub),503);
 const disabled=await runtime.dispatchFetch("https://local.invalid/v1/base/indicative-price?chainId=8453&sellToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&buyToken=0x4200000000000000000000000000000000000006&sellAmount=100000",{headers:{origin:"https://climboria.fun","CF-Connecting-IP":"192.0.2.1"}});
 assert.equal(disabled.status,503);
 assert.deepEqual(await disabled.json(),{error:"Base indicative pricing disabled"});
 await stop();
 stub=await start({cap:"0"});
 assert.equal(await reserve(stub),503);
 console.log("PASS: local workerd SQLite DO concurrent reservation, persistence and default-off endpoint");
}finally{await stop();await rm(dir,{recursive:true,force:true});}
