import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateWildlife} from './private-wildlife.mjs';
const ROOM='preview-wildlife-fixture', S='session-wildlife-01', A='account-wildlife-01', B='account-wildlife-02', T='tick-wildlife-0001', D='defeat-wildlife-001';
function fixture(){
 let data=new Map(),queue=Promise.resolve(),a=A,tick={sequence:1,threatNearby:false},defeat={generation:1,revision:0,site:'clearing',validatedDefeat:true,inRange:true},hook=null;
 const storage={transaction(fn){const run=queue.then(async()=>{const staged=new Map(data);const result=await fn({get:async k=>staged.get(k),put:async(k,v)=>{staged.set(k,v);if(hook)hook(k);}});data=staged;return result;});queue=run.catch(()=>{});return run;}};
 const options={roomId:ROOM,storage,resolveTick:(i)=>i===T?{roomId:ROOM,tickId:i,...tick}:null,resolveOwner:s=>({sessionId:s,roomId:ROOM,accountId:a}),resolveDefeat:(s,i)=>i===D?{sessionId:s,accountId:a,roomId:ROOM,defeatId:i,...defeat}:null};
 return {options,make:()=>createPrivateWildlife(options),tick:v=>{tick={...tick,...v};},defeat:v=>{defeat={...defeat,...v};},owner:v=>{a=v;},hook:v=>{hook=v;}};
}
test('bounded patrol and flee, replay and restart',async()=>{
 const f=fixture(),a=f.make();
 assert.equal((await a.inspect()).site,'clearing');
 assert.equal((await a.advance(T)).site,'trail');
 assert.equal((await a.advance(T)).reason,'wildlife-tick-conflict');
 f.tick({sequence:3});assert.equal((await a.advance(T)).reason,'wildlife-tick-conflict');
 f.tick({sequence:2,threatNearby:true});const r=await a.advance(T);assert.equal(r.site,'clearing');assert.equal(r.mode,'flee');
 assert.equal((await f.make().inspect()).tick,2);
});
test('one receipt per creature generation, cooldown and stale defeat rejection',async()=>{
 const f=fixture(),a=f.make();
 const results=await Promise.all([a.recordDefeat(S,D),a.recordDefeat(S,D)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.find(r=>r.ok).receiptCount,1);
 f.owner(B);assert.equal((await a.recordDefeat(S,D)).reason,'wildlife-defeat-conflict');
 for(let sequence=1;sequence<=3;sequence++){f.tick({sequence});assert.equal((await a.advance(T)).ok,true);}
 const p=await f.make().inspect();assert.equal(p.generation,2);assert.equal(p.mode,'roam');
 assert.equal((await a.recordDefeat(S,D)).reason,'wildlife-defeat-conflict');
 f.owner(A);f.defeat({generation:2,revision:p.revision});assert.equal((await a.recordDefeat(S,D)).receiptCount,2);
});
test('wrong owner, range, site and missing defeat proof are denied',async()=>{
 const f=fixture(),a=f.make();
 f.defeat({accountId:B});assert.equal((await a.recordDefeat(S,D)).reason,'unverified-wildlife-defeat');
 f.defeat({accountId:A,inRange:false});assert.equal((await a.recordDefeat(S,D)).reason,'unverified-wildlife-defeat');
 f.defeat({inRange:true,validatedDefeat:false});assert.equal((await a.recordDefeat(S,D)).reason,'unverified-wildlife-defeat');
 f.defeat({validatedDefeat:true,site:'grove'});assert.equal((await a.recordDefeat(S,D)).reason,'wildlife-defeat-conflict');
 assert.equal((await a.inspect()).revision,0);
});
test('receipt transaction rolls back on authority change',async()=>{
 const f=fixture(),a=f.make();
 f.hook(k=>{if(k.includes(':receipt:'))f.owner(B);});
 assert.equal((await a.recordDefeat(S,D)).reason,'wildlife-storage-unavailable');
 f.hook(null);f.owner(A);
 const b=f.make();assert.equal((await b.inspect()).mode,'roam');
 assert.equal((await b.recordDefeat(S,D)).receiptCount,1);
 assert.throws(()=>createPrivateWildlife({...f.options,roomId:'public'}));
});
