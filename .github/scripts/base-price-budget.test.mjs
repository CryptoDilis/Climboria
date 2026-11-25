import test from "node:test";
import assert from "node:assert/strict";
import {BasePriceBudget,parseDailyCap,parseReleaseCap} from "../../dex/base-price-provider/budget.mjs";
const request=()=>new Request("https://internal.invalid/reserve",{method:"POST"});
function fixture(cap="3",initial,enabled="true",releaseCap){
 let record=initial,queue=Promise.resolve();
 // In-memory serialized transaction simulation; actual DO runtime still requires staging verification.
 const storage={transaction(fn){const next=queue.then(()=>fn({get:async()=>record,put:async(key,value)=>{record=value;}}));queue=next.catch(()=>{});return next;}};
 const budget=new BasePriceBudget({storage},{BASE_INDICATIVE_PRICE_ENABLED:enabled,BASE_PRICE_DAILY_ATTEMPTS:cap,...(releaseCap===undefined?{}:{BASE_PRICE_RELEASE_TOTAL_ATTEMPTS:releaseCap})});
 return {budget,record:()=>record};
}
test("budget configuration is explicit, bounded and fail closed",async()=>{
 for(const cap of [undefined,"","0","01","-1","1001","1.5",3]){assert.equal(parseDailyCap(cap),0);assert.equal((await fixture(cap===undefined?"":cap).budget.fetch(request())).status,503);}
 assert.equal(parseDailyCap("1000"),1000);
 assert.equal((await fixture("3",undefined,"false").budget.fetch(request())).status,503);
});
test("parallel reservations do not exceed cap; failures consume attempts",async()=>{
 const {budget,record}=fixture();
 const statuses=await Promise.all(Array.from({length:8},()=>budget.fetch(request()).then(r=>r.status)));
 assert.equal(statuses.filter(s=>s===204).length,3);assert.equal(statuses.filter(s=>s===429).length,5);assert.equal(record().count,3);
});
test("persistent count survives instance replacement and reduced cap; UTC rollover only",async()=>{
 const day=new Date().toISOString().slice(0,10);
 const current=fixture("2",{day,count:2});
 assert.equal((await current.budget.fetch(request())).status,429);
 const prior=fixture("1",{day:"2000-01-01",count:999});
 assert.equal((await prior.budget.fetch(request())).status,204);
 assert.deepEqual(prior.record(),{day,count:1,total:1000});
 const future=fixture("3",{day:"9999-01-01",count:1});
 assert.equal((await future.budget.fetch(request())).status,503);
});
test("invalid internal route, corrupt state or storage failure never grants reservation",async()=>{
 const {budget}=fixture("3",{day:"invalid",count:-1});
 assert.equal((await budget.fetch(new Request("https://internal.invalid/reserve"))).status,404);
 assert.equal((await budget.fetch(request())).status,503);
 const broken=new BasePriceBudget({storage:{transaction:async()=>{throw Error("storage failure")}}},{BASE_INDICATIVE_PRICE_ENABLED:"true",BASE_PRICE_DAILY_ATTEMPTS:"3"});
 assert.equal((await broken.fetch(request())).status,503);
});

test("cumulative allocation is bounded, explicit and never resets with the UTC day",async()=>{
 assert.equal(parseReleaseCap("10000"),10000);
 for(const value of ["0","01","10001","1.5","-1",5,""]){
  assert.equal(parseReleaseCap(value),0);
  assert.equal((await fixture("3",undefined,"true",value).budget.fetch(request())).status,503);
 }
 const prior=fixture("3",{day:"2000-01-01",count:2,total:5},"true","6");
 assert.equal((await prior.budget.fetch(request())).status,204);
 const denied=await prior.budget.fetch(request());
 assert.equal(denied.status,429);assert.equal(denied.headers.get("X-Base-Budget-Limit"),"release");
 assert.equal(prior.record().total,6);assert.equal(prior.record().count,1);
});
test("concurrent cumulative reservations preserve the legacy count and cannot exceed allocation",async()=>{
 const day=new Date().toISOString().slice(0,10);
 const {budget,record}=fixture("10",{day,count:1},"true","3");
 const results=await Promise.all(Array.from({length:10},()=>budget.fetch(request())));
 assert.equal(results.filter(r=>r.status===204).length,2);
 assert.equal(results.filter(r=>r.status===429&&r.headers.get("X-Base-Budget-Limit")==="release").length,8);
 assert.deepEqual(record(),{day,count:3,total:3});
 const corrupt=fixture("10",{day,count:3,total:2},"true","10");
 assert.equal((await corrupt.budget.fetch(request())).status,503);
});

test("public mode independently requires cumulative cap at durable reservation boundary",async()=>{
 for(const env of [
  {BASE_PRICE_DAILY_ATTEMPTS:"10"},
  {BASE_PRICE_DAILY_ATTEMPTS:"10",BASE_PRICE_RELEASE_TOTAL_ATTEMPTS:"9"},
  {BASE_PRICE_DAILY_ATTEMPTS:"101",BASE_PRICE_RELEASE_TOTAL_ATTEMPTS:"1000"},
  {BASE_PRICE_DAILY_ATTEMPTS:"10",BASE_PRICE_RELEASE_TOTAL_ATTEMPTS:"1001"}
 ]){
  const budget=new BasePriceBudget({storage:{transaction:async()=>{assert.fail("Invalid public allocation accessed storage");}}},{BASE_INDICATIVE_PRICE_ENABLED:"true",BASE_PRICE_PUBLIC_RELEASE:"true",...env});
  assert.equal((await budget.fetch(request())).status,503);
 }
});
