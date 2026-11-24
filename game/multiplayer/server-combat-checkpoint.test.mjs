import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeCombatCheckpoint,createCombatCheckpointStore} from './server-combat-checkpoint.mjs';
const A='account_1111111111111111',B='account_2222222222222222',roomId='test-arena';
const nowMs=40000;
function checkpoint(accountId=A){
 return {version:1,accountId,roomId,savedAtMs:nowMs,hp:495,downedAt:null,lastAttack:39000,lastAttempt:39000,
  movement:{roomId,position:{x:200,y:0,z:20},stamina:198800,exhausted:false,downed:false}};
}
const decode=raw=>decodeCombatCheckpoint(raw,{accountId:A,roomId,nowMs});
function fakeStorage(){
 let rows=new Map(),queue=Promise.resolve();
 return {transaction(fn){
  const result=queue.then(async()=>{
   const draft=new Map(structuredClone([...rows]));
   const value=await fn({get:async key=>draft.get(key),put:async(key,value)=>{draft.set(key,structuredClone(value))}});
   rows=draft;return value;
  });
  queue=result.catch(()=>{});return result;
 }};
}
test('checkpoint round-trip copies allowlisted fields and binds account and room',()=>{
 const raw=checkpoint();raw.wallet='ignored';raw.movement.position.extra=9;
 const decoded=decode(JSON.parse(JSON.stringify(raw)));
 assert.deepEqual(decoded,checkpoint());
 raw.movement.position.x=219;assert.equal(decoded.movement.position.x,200);
 assert.equal(decode(checkpoint(B)),null);
 assert.equal(decodeCombatCheckpoint(checkpoint(),{accountId:A,roomId:'other',nowMs}),null);
});
test('checkpoint rejects inconsistent death, stamina, coordinates and future timestamps',()=>{
 for(const patch of [{hp:-5},{hp:499},{hp:0},{downedAt:100},{savedAtMs:40001},{lastAttack:39001},{lastAttempt:null}]){
  assert.equal(decode({...checkpoint(),...patch}),null);
 }
 for(const patch of [{downed:true},{stamina:200001},{stamina:0},{exhausted:true},{position:{x:NaN,y:0,z:20}},{roomId:'other'}]){
  const raw=checkpoint();Object.assign(raw.movement,patch);assert.equal(decode(raw),null);
 }
 const dead=checkpoint();dead.hp=0;dead.downedAt=39000;dead.movement.downed=true;
 assert.equal(decode(dead).hp,0);
});
test('transactional store atomically compares both revisions before writing hit checkpoints',async()=>{
 const store=createCombatCheckpointStore({storage:fakeStorage(),roomId,clock:()=>nowMs});
 const save=(accountId,expectedRevision,raw=checkpoint(accountId))=>({accountId,expectedRevision,checkpoint:raw});
 assert.deepEqual(await store.load(A),{ok:true,revision:0,checkpoint:null});
 assert.equal((await store.saveBatch([save(A,0),save(B,0)])).ok,true);
 const changed=checkpoint();changed.hp=490;
 assert.equal((await store.saveBatch([save(A,1,changed),save(B,0)])).reason,'checkpoint-revision-conflict');
 assert.equal((await store.load(A)).checkpoint.hp,495);
 assert.equal((await store.load(B)).revision,1);
 assert.equal((await store.saveBatch([save(A,1,changed),save(B,1)])).ok,true);
 assert.equal((await store.load(A)).checkpoint.hp,490);
 assert.equal((await store.load(B)).revision,2);
});
test('concurrent compare-and-swap accepts only one same-revision update',async()=>{
 const store=createCombatCheckpointStore({storage:fakeStorage(),roomId,clock:()=>nowMs});
 const payload=[{accountId:A,expectedRevision:0,checkpoint:checkpoint()}];
 const results=await Promise.all([store.saveBatch(payload),store.saveBatch(payload)]);
 assert.equal(results.filter(x=>x.ok).length,1);
 assert.equal(results.filter(x=>x.reason==='checkpoint-revision-conflict').length,1);
 assert.equal((await store.load(A)).revision,1);
});
test('store fails closed for malformed, duplicate, rollback and unavailable storage',async()=>{
 const storage=fakeStorage(),store=createCombatCheckpointStore({storage,roomId,clock:()=>nowMs});
 const entry={accountId:A,expectedRevision:0,checkpoint:checkpoint()};
 assert.equal((await store.saveBatch([entry,entry])).ok,false);
 assert.equal((await store.saveBatch([entry])).ok,true);
 const stale=checkpoint();stale.savedAtMs=39999;
 assert.equal((await store.saveBatch([{...entry,expectedRevision:1,checkpoint:stale}])).reason,'checkpoint-time-rollback');
 const broken=createCombatCheckpointStore({storage:{transaction:async()=>{throw Error('offline')}},roomId,clock:()=>nowMs});
 assert.equal((await broken.load(A)).reason,'checkpoint-storage-unavailable');
 assert.equal((await broken.saveBatch([entry])).ok,false);
});
