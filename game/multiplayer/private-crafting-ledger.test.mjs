import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateCraftingLedger } from './private-crafting-ledger.mjs';

function fixture(){
 const roomId='preview-crafting-fixture', a='crafting_session_a',b='crafting_session_b',account='verified_account_a';
 const records=new Map(), owners=new Map([[a,account],[b,'verified_account_b']]);
 let tail=Promise.resolve(),station='workbench',hook=null,ambiguous=false,writeHook=null;
 const stock={fiber:4,wood:3,'raw-fish':2,'repair-kit':0,'cooked-fish':0};
 const storage={transaction(operation){
  const pending=tail.then(async()=>{
   const draft=new Map(JSON.parse(JSON.stringify([...records])));
   const result=await operation({get:async key=>{if(hook)hook();return draft.get(key);},put:async(key,value)=>{draft.set(key,JSON.parse(JSON.stringify(value)));if(writeHook)writeHook();}});
   for(const [k,v] of draft)records.set(k,v);
   if(ambiguous)throw Error('ambiguous commit');
   return result;
  });tail=pending.catch(()=>{});return pending;
 }};
 const options={roomId,storage,resolveOwner:sessionId=>owners.has(sessionId)?{sessionId,accountId:owners.get(sessionId),roomId}:null,
 resolveStation:sessionId=>({sessionId,accountId:owners.get(sessionId),roomId,station,inRange:station!==null})};
 return {a,b,account,records,owners,stock,options,make:()=>createPrivateCraftingLedger(options),setStation:v=>{station=v;},onRead:fn=>{hook=fn;},onWrite:fn=>{writeHook=fn;},setAmbiguous:v=>{ambiguous=v;}};
}

test("materialConservation", async function materialConservation(){
 const f=fixture(),ledger=f.make();
 assert.equal((await ledger.provision(f.account,f.stock)).ok,true);
 assert.equal((await ledger.provision(f.account,f.stock)).reason,'crafting-already-provisioned');
 const results=await Promise.all([ledger.craft(f.a,'repair-kit',0),f.make().craft(f.a,'repair-kit',0)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>r.reason==='crafting-revision-changed').length,1);
 assert.deepEqual((await f.make().inspect(f.a)).stock,{fiber:2,wood:2,'raw-fish':2,'repair-kit':1,'cooked-fish':0});
 assert.equal((await ledger.craft(f.a,'cooked-fish',1)).reason,'crafting-station-unavailable');
 f.setStation('campfire');
 assert.deepEqual((await ledger.craft(f.a,'cooked-fish',1)).stock,{fiber:2,wood:1,'raw-fish':1,'repair-kit':1,'cooked-fish':1});
 assert.equal((await f.make().inspect(f.b)).reason,'crafting-not-provisioned');
 assert.equal((await ledger.craft(f.a,'__proto__',2)).reason,'invalid-crafting-intent');
});

test("boundsAndAuthority", async function boundsAndAuthority(){
 const f=fixture(),ledger=f.make();
 await ledger.provision(f.account,{...f.stock,'repair-kit':20});
 assert.equal((await ledger.craft(f.a,'repair-kit',0)).reason,'crafting-output-full');
 f.setStation('campfire');
 f.onRead(()=>f.setStation(null));
 assert.equal((await ledger.craft(f.a,'cooked-fish',0)).reason,'crafting-station-unavailable');
 f.onRead(null);f.setStation('campfire');
 f.onRead(()=>f.owners.delete(f.a));
 assert.equal((await ledger.craft(f.a,'cooked-fish',0)).reason,'unverified-crafting-owner');
 f.onRead(null);f.owners.set(f.a,f.account);
 f.onWrite(()=>f.setStation(null));
 assert.equal((await ledger.craft(f.a,'cooked-fish',0)).reason,'crafting-storage-unavailable');
 f.onWrite(null);f.setStation('campfire');
 assert.equal((await f.make().inspect(f.a)).revision,0);
 assert.equal((await f.make().craft(f.a,'cooked-fish',0)).ok,true);
 assert.equal((await f.make().craft(f.a,'cooked-fish',1)).ok,true);
 assert.equal((await f.make().craft(f.a,'cooked-fish',2)).reason,'insufficient-crafting-materials');
});

test("corruptionAndAmbiguity", async function corruptionAndAmbiguity(){
 const f=fixture(),ledger=f.make();
 await ledger.provision(f.account,f.stock);
 f.setAmbiguous(true);
 assert.equal((await ledger.craft(f.a,'repair-kit',0)).reason,'crafting-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await ledger.inspect(f.a)).reason,'crafting-storage-unavailable');
 assert.equal((await f.make().craft(f.a,'repair-kit',0)).reason,'crafting-revision-changed');
 const key=[...f.records.keys()][0],prior=f.records.get(key);
 f.records.set(key,{...prior,stock:{...prior.stock,fiber:3}});
 assert.equal((await f.make().inspect(f.a)).reason,'invalid-crafting-state');
 assert.equal((await f.make().craft(f.a,'repair-kit',1)).reason,'invalid-crafting-state');
 assert.throws(()=>createPrivateCraftingLedger({...f.options,roomId:'jarrell-peak'}));
});
