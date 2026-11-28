import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateRegionEvents } from './private-region-events.mjs';

function fixture() {
 let now = 1_000, state, writes = 0, ambiguous = false, tail = Promise.resolve();
 const storage = {
  transaction(operation) {
   const queued = tail.then(async () => {
    let draft = state;
    const result = await operation({ get: async () => draft, put: async (_key, value) => { draft = value; writes++; } });
    state = draft;
    if (ambiguous) throw new Error('unknown commit outcome');
    return result;
   });
   tail = queued.catch(() => {});
   return queued;
  },
 };
 const options = { roomId: 'preview-region-events-fixture', storage, clock: () => now, seed: 0,
  regions: ['sanctuary', 'cave'], intervalMs: 100, activeMs: 30 };
 return { options, make: () => createPrivateRegionEvents(options), at: value => { now = value; },
  writes: () => writes, setAmbiguous: value => { ambiguous = value; } };
}

test('concurrent readers share one seeded event and only its region sees it', async () => {
 const f = fixture();
 const [a, b, c] = await Promise.all([f.make().snapshot('cave'), f.make().snapshot('cave'), f.make().snapshot('sanctuary')]);
 assert.deepEqual(a, b);
 assert.deepEqual(a.event, { id: 'preview-region-events-fixture:1000:0', regionId: 'cave', kind: 'falling-star', startsAtMs: 1000, expiresAtMs: 1030 });
 assert.equal(c.event, null);
 assert.equal(f.writes(), 1);
});

test('expiry survives restart and missed slots are skipped without catch-up', async () => {
 const f = fixture();
 await f.make().snapshot('cave');
 f.at(1030);
 assert.equal((await f.make().snapshot('cave')).event, null);
 f.at(1029);
 assert.equal((await f.make().snapshot('cave')).event, null);
 assert.equal(f.writes(), 2);
 f.at(1400);
 const active = (await Promise.all(['cave', 'sanctuary'].map(region => f.make().snapshot(region)))).filter(r => r.event);
 assert.equal(active.length, 1);
 assert.equal(active[0].event.startsAtMs, 1400);
 assert.equal(active[0].event.id.endsWith(':4'), true);
 assert.equal(f.writes(), 3);
 f.at(1300);
 assert.equal((await f.make().snapshot('cave')).reason, 'stale-world-clock');
});

test('changed configuration and private scope boundaries fail closed', async () => {
 const f = fixture();
 await f.make().snapshot('cave');
 assert.throws(() => createPrivateRegionEvents({ ...f.options, roomId: 'jarrell-peak' }));
 assert.throws(() => createPrivateRegionEvents({ ...f.options, activeMs: 100 }));
 assert.equal((await f.make().snapshot('unknown')).reason, 'invalid-region');
 const changed = createPrivateRegionEvents({ ...f.options, seed: 1 });
 assert.equal((await changed.snapshot('cave')).reason, 'invalid-event-state');
});

test('ambiguous initialization never restarts the persisted event clock', async () => {
 const f = fixture(), first = f.make();
 f.setAmbiguous(true);
 assert.equal((await first.snapshot('cave')).reason, 'event-storage-unavailable');
 f.setAmbiguous(false);f.at(1010);
 assert.equal((await first.snapshot('cave')).reason, 'event-storage-unavailable');
 const fresh = await f.make().snapshot('cave');
 assert.equal(fresh.event.startsAtMs, 1000);
 assert.equal(f.writes(), 1);
});

const S='session-events-001',A='account-events-001',B='account-events-002',I='complete-event-001',ROOM='preview-region-events-fixture';
function participationFixture(){
 let now=1000,state,tail=Promise.resolve(),account=A,region='cave',hook=null;
 let p={eventId:ROOM+':1000:0',completedAtMs:1000,completed:true,reachable:true};
 const storage={transaction(fn){const run=tail.then(async()=>{let draft=state;const r=await fn({get:async()=>draft,put:async(k,v)=>{draft=v;if(hook)hook(v);}});state=draft;return r;});tail=run.catch(()=>{});return run;}};
 const options={roomId:ROOM,storage,clock:()=>now,seed:0,regions:['cave','sanctuary'],intervalMs:100,activeMs:30,
  resolveOwner:s=>({sessionId:s,roomId:ROOM,accountId:account,regionId:region}),
  resolveCompletion:(s,i)=>i===I?{sessionId:s,roomId:ROOM,accountId:account,regionId:region,completionId:i,...p}:null};
 return {options,make:()=>createPrivateRegionEvents(options),at:v=>{now=v;},owner:v=>{account=v;},region:v=>{region=v;},proof:v=>{p={...p,...v};},hook:v=>{hook=v;},rewrite:fn=>{state=fn({...state});}};
}
test('one durable receipt per account per active slot; concurrent replays and regional isolation',async()=>{
 const f=participationFixture(),a=f.make();await a.snapshot('cave');
 const r=await Promise.all([a.recordParticipation(S,I),a.recordParticipation(S,I)]);
 assert.equal(r.filter(x=>x.ok).length,1);
 assert.equal((await f.make().recordParticipation(S,I)).reason,'event-already-recorded');
 f.owner(B);f.region('sanctuary');assert.equal((await a.recordParticipation(S,I)).reason,'event-completion-not-active');
 f.region('cave');assert.equal((await a.recordParticipation(S,I)).ok,true);
 f.at(1030);assert.equal((await a.recordParticipation(S,I)).reason,'event-completion-not-active');
 f.at(1020);assert.equal((await f.make().recordParticipation(S,I)).reason,'event-completion-not-active');
});
test('forged owner, unreachable and future completions are rejected',async()=>{
 const f=participationFixture(),a=f.make();await a.snapshot('cave');
 f.proof({accountId:B});assert.equal((await a.recordParticipation(S,I)).reason,'unverified-event-completion');
 f.proof({accountId:A,reachable:false});assert.equal((await a.recordParticipation(S,I)).reason,'unverified-event-completion');
 f.proof({reachable:true,completedAtMs:1001});assert.equal((await a.recordParticipation(S,I)).reason,'event-completion-not-active');
 f.at(1001);assert.equal((await a.recordParticipation(S,I)).ok,true);
});
test('bounded receipt capacity and fresh slot reset',async()=>{
 const f=participationFixture(),a=f.make();await a.snapshot('cave');
 for(let n=0;n<64;n++){f.owner('account-events-'+String(n).padStart(3,'0'));assert.equal((await a.recordParticipation(S,I)).ok,true);}
 f.owner('account-events-999');assert.equal((await a.recordParticipation(S,I)).reason,'event-participation-cap');
 f.at(1100);
 const snapshots=await Promise.all(['cave','sanctuary'].map(r=>a.snapshot(r)));
 const e=snapshots.find(r=>r.event).event;f.region(e.regionId);f.proof({eventId:e.id,completedAtMs:1100});
 assert.equal((await a.recordParticipation(S,I)).ok,true);
});
test('expiry or account change during write rolls back; disabled legacy participation',async()=>{
 const f=participationFixture(),a=f.make();await a.snapshot('cave');
 f.hook(v=>{if(v.participants.length)f.at(1030);});
 assert.equal((await a.recordParticipation(S,I)).reason,'event-storage-unavailable');
 f.hook(null);const fresh=f.make();assert.equal((await fresh.snapshot('cave')).event,null);
 f.at(1001);assert.equal((await fresh.recordParticipation(S,I)).reason,'event-completion-not-active');
 const g=participationFixture(),b=g.make();await b.snapshot('cave');
 g.hook(v=>{if(v.participants.length)g.owner(B);});
 assert.equal((await b.recordParticipation(S,I)).reason,'event-storage-unavailable');
 g.hook(null);g.owner(A);assert.equal((await g.make().recordParticipation(S,I)).ok,true);
 assert.equal((await fixture().make().recordParticipation(S,I)).reason,'event-participation-disabled');
});

test('a committed receipt prevents a same-slot clock rollback across instances',async()=>{
 const f=participationFixture(),first=f.make();
 await first.snapshot('cave');
 f.at(1020);f.proof({completedAtMs:1020});
 assert.equal((await first.recordParticipation(S,I)).ok,true);
 f.owner(B);f.at(1019);f.proof({completedAtMs:1019});
 const fresh=f.make();
 assert.equal((await fresh.snapshot('cave')).reason,'stale-world-clock');
 assert.equal((await fresh.recordParticipation(S,I)).reason,'stale-world-clock');
 f.at(1020);
 assert.equal((await fresh.recordParticipation(S,I)).ok,true);
});

test('legacy receipts remain readable and the first new receipt adds its clock checkpoint',async()=>{
 const f=participationFixture(),initial=f.make();
 await initial.snapshot('cave');
 assert.equal((await initial.recordParticipation(S,I)).ok,true);
 f.rewrite(state=>{delete state.lastReceiptAtMs;return state;});
 f.at(1001);
 assert.equal((await f.make().recordParticipation(S,I)).reason,'event-already-recorded');
 f.owner(B);
 assert.equal((await f.make().recordParticipation(S,I)).ok,true);
 f.at(1000);
 assert.equal((await f.make().snapshot('cave')).reason,'stale-world-clock');
});
