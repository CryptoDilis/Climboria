import test from "node:test";
import assert from "node:assert/strict";
import {BasePriceBudget,parseDailyCap} from "../../dex/base-price-provider/budget.mjs";
const request=()=>new Request("https://internal.invalid/reserve",{method:"POST"});
function fixture(cap="3",initial,enabled="true"){
 let record=initial,queue=Promise.resolve();
 // In-memory serialized transaction simulation; actual DO runtime still requires staging verification.
 const storage={transaction(fn){const next=queue.then(()=>fn({get:async()=>record,put:async(key,value)=>{record=value;}}));queue=next.catch(()=>{});return next;}};
 const budget=new BasePriceBudget({storage},{BASE_INDICATIVE_PRICE_ENABLED:enabled,BASE_PRICE_DAILY_ATTEMPTS:cap});
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
 assert.deepEqual(prior.record(),{day,count:1});
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
