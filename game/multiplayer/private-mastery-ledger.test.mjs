import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateMasteryLedger } from './private-mastery-ledger.mjs';

const roomId = 'preview-mastery-fixture';
const a = 'mastery_session_a', b = 'mastery_session_b';
const activityId = 'mastery_activity_1';

function fixture() {
 const records = new Map(), proofs = new Map();
 let tail = Promise.resolve(), beforeRead, ambiguous = false;
 const storage = {
  transaction(operation) {
   const queued = tail.then(async () => {
    const draft = new Map(structuredClone([...records]));
    const result = await operation({
     get: async key => { beforeRead?.(); return draft.get(key); },
     put: async (key, value) => draft.set(key, structuredClone(value)),
    });
    for (const [key, value] of draft) records.set(key, value);
    if (ambiguous) throw new Error('unknown commit outcome');
    return result;
   });
   tail = queued.catch(() => {});
   return queued;
  },
 };
 const options = { roomId, storage, thresholds: [2, 3, 4, 5], resolveActivity: (session, id) => proofs.get(session + ':' + id) };
 return {
  records, options, make: () => createPrivateMasteryLedger(options),
  setProof(sessionId, skill, sequence, id = activityId) {
   proofs.set(sessionId + ':' + id, { roomId, sessionId, activityId: id, skill, sequence, accountId: 'verified_account_' + sessionId.at(-1) });
  },
  revoke: (session, id = activityId) => proofs.delete(session + ':' + id),
  onRead: fn => { beforeRead = fn; },
  setAmbiguous: value => { ambiguous = value; },
 };
}

test('ranks progress by verified activity and remain independent across skills and accounts', async () => {
 const f = fixture();
 for (const [index, rank] of ['Novice', 'Apprentice', 'Skilled', 'Expert', 'Master'].entries()) {
  const sequence = index + 1, event = 'mastery_activity_' + sequence;
  f.setProof(a, 'climbing', sequence, event);
  assert.deepEqual(await f.make().record(a, event), { ok: true, skill: 'climbing', validatedActivities: sequence, rank });
 }
 for (const [session, skill] of [[a, 'swimming'], [b, 'climbing']]) {
  f.setProof(session, skill, 1);
  assert.equal((await f.make().record(session, activityId)).rank, 'Novice');
 }
 assert.equal(f.records.size, 3);
});

test('duplicate delivery across instances records one result; gaps and invalid skill grants fail closed', async () => {
 const f = fixture();
 f.setProof(a, 'fishing', 2);
 assert.equal((await f.make().record(a, activityId)).reason, 'activity-out-of-order');
 f.setProof(a, 'character-level', 1);
 assert.equal((await f.make().record(a, activityId)).reason, 'unverified-activity');
 f.setProof(a, 'fishing', 1);
 assert.equal((await f.make().record(b, activityId)).reason, 'unverified-activity');
 const results = await Promise.all([f.make().record(a, activityId), f.make().record(a, activityId)]);
 assert.equal(results.filter(result => result.ok).length, 1);
 assert.equal(results.filter(result => result.reason === 'activity-already-recorded').length, 1);
 assert.equal(f.records.size, 1);
});

test('revocation during the read prevents recording; an ambiguous write cannot award twice', async () => {
 const f = fixture(), ledger = f.make();
 f.setProof(a, 'farming', 1);
 f.onRead(() => f.revoke(a));
 assert.equal((await ledger.record(a, activityId)).reason, 'unverified-activity');
 assert.equal(f.records.size, 0);
 f.onRead(null);
 f.setProof(a, 'farming', 1);
 f.setAmbiguous(true);
 assert.equal((await ledger.record(a, activityId)).reason, 'mastery-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await ledger.record(a, activityId)).reason, 'mastery-storage-unavailable');
 assert.equal((await f.make().record(a, activityId)).reason, 'activity-already-recorded');
});

test('rejects non-private rooms and invalid rank thresholds', () => {
 const f = fixture();
 assert.throws(() => createPrivateMasteryLedger({ ...f.options, roomId: 'jarrell-peak' }));
 assert.throws(() => createPrivateMasteryLedger({ ...f.options, thresholds: [2, 2, 4, 5] }));
 assert.throws(() => createPrivateMasteryLedger({ ...f.options, thresholds: Array(4) }));
});


test('owner-only mastery inspection restores every independent skill without writing or exposing another account', async () => {
 const f = fixture();
 const owner = sessionId => ({ sessionId, roomId, accountId: 'verified_account_' + sessionId.at(-1) });
 const make = () => createPrivateMasteryLedger({ ...f.options, resolveOwner: owner });
 for (let sequence = 1; sequence <= 3; sequence++) {
  const id = 'mastery_activity_' + sequence;
  f.setProof(a, 'climbing', sequence, id);
  assert.equal((await make().record(a, id)).ok, true);
 }
 const initial = await make().inspect(a);
 assert.equal(initial.ok, true);
 assert.equal(initial.skills.length, 10);
 assert.deepEqual(initial.skills.find(s => s.skill === 'climbing'), { skill: 'climbing', validatedActivities: 3, rank: 'Skilled' });
 assert.equal(initial.skills.filter(s => s.validatedActivities === 0 && s.rank === 'Novice').length, 9);
 assert.equal((await make().inspect(b)).skills.every(s => s.validatedActivities === 0), true);
 assert.equal(f.records.size, 1);
 assert.equal((await f.make().inspect(a)).reason, 'unverified-mastery-owner');
 assert.equal((await make().inspect('invalid')).reason, 'invalid-mastery-intent');
});

test('inspection fails closed on revocation, reassignment, corrupt state and ambiguous storage', async () => {
 const f = fixture();
 let accountId = 'verified_account_a';
 const make = () => createPrivateMasteryLedger({ ...f.options, resolveOwner: sessionId => accountId ? { sessionId, roomId, accountId } : null });
 f.setProof(a, 'climbing', 1);
 await make().record(a, activityId);
 f.onRead(() => { accountId = null; });
 assert.equal((await make().inspect(a)).reason, 'unverified-mastery-owner');
 accountId = 'verified_account_a';
 f.onRead(() => { accountId = 'verified_account_b'; });
 assert.equal((await make().inspect(a)).reason, 'unverified-mastery-owner');
 f.onRead(null);
 accountId = 'verified_account_a';
 const key = [...f.records.keys()][0];
 const prior = f.records.get(key);
 f.records.set(key, { ...prior, accountId: 'verified_account_b' });
 assert.equal((await make().inspect(a)).reason, 'invalid-stored-mastery');
 f.records.set(key, prior);
 const ledger = make();
 f.setAmbiguous(true);
 assert.equal((await ledger.inspect(a)).reason, 'mastery-storage-unavailable');
 f.setAmbiguous(false);
 assert.equal((await ledger.inspect(a)).reason, 'mastery-storage-unavailable');
 assert.equal((await make().inspect(a)).ok, true);
});

test('eight optional professions reflect persisted related skills without granting mastery',async()=>{
 const f=fixture(),owner=sessionId=>({sessionId,roomId,accountId:'verified_account_'+sessionId.at(-1)});
 const make=()=>createPrivateMasteryLedger({...f.options,resolveOwner:owner});
 for(let sequence=1;sequence<=3;sequence++){
  f.setProof(a,'fishing',sequence);
  assert.equal((await make().record(a,activityId)).ok,true);
 }
 const before=await make().inspectProfessions(a);
 assert.equal(before.professions.length,8);
 assert.equal(before.professions.every(p=>!p.selected&&!p.professionActivityIntegrated),true);
 assert.equal(before.professions.find(p=>p.id==='fisherman').relatedSkills[0].rank,'Skilled');
 assert.deepEqual(before.professions.find(p=>p.id==='merchant').relatedSkills,[]);
 assert.equal(f.records.size,1);
 let p=await make().setProfession(a,'fisherman',true,0);assert.equal(p.revision,1);
 p=await make().setProfession(a,'farmer',true,1);assert.equal(p.professions.filter(x=>x.selected).length,2);
 assert.equal((await make().inspectProfessions(b)).professions.every(x=>!x.selected),true);
 p=await make().setProfession(a,'fisherman',false,2);assert.equal(p.professions.filter(x=>x.selected).length,1);
 assert.equal((await make().inspect(a)).skills.find(x=>x.skill==='fishing').validatedActivities,3);
});
test('profession selection is idempotent, revision checked and account bound',async()=>{
 const f=fixture(),owner=sessionId=>({sessionId,roomId,accountId:'verified_account_'+sessionId.at(-1)});
 const ledger=createPrivateMasteryLedger({...f.options,resolveOwner:owner});
 const results=await Promise.all([ledger.setProfession(a,'cook',true,0),ledger.setProfession(a,'farmer',true,0)]);
 assert.equal(results.filter(x=>x.ok).length,1);
 assert.equal(results.filter(x=>x.reason==='profession-revision-conflict').length,1);
 const current=await ledger.inspectProfessions(a),chosen=current.professions.find(p=>p.selected).id;
 assert.equal((await ledger.setProfession(a,chosen,true,1)).revision,1);
 assert.equal((await ledger.setProfession(a,'__proto__',true,1)).reason,'invalid-profession-intent');
 assert.equal((await ledger.setProfession(a,'cook','true',1)).reason,'invalid-profession-intent');
 assert.equal((await f.make().inspectProfessions(a)).reason,'unverified-mastery-owner');
 assert.equal((await ledger.inspectProfessions(b)).revision,0);
});
test('profession inspection rejects revoked owners, corrupt state and ambiguous writes',async()=>{
 const f=fixture();let accountId='verified_account_a';
 const make=()=>createPrivateMasteryLedger({...f.options,resolveOwner:sessionId=>accountId?{sessionId,roomId,accountId}:null});
 f.onRead(()=>{accountId=null;});
 assert.equal((await make().inspectProfessions(a)).reason,'unverified-mastery-owner');
 f.onRead(null);accountId='verified_account_a';
 f.setAmbiguous(true);const ledger=make();
 assert.equal((await ledger.setProfession(a,'hunter',true,0)).reason,'mastery-storage-unavailable');
 f.setAmbiguous(false);assert.equal((await ledger.inspectProfessions(a)).reason,'mastery-storage-unavailable');
 assert.equal((await make().inspectProfessions(a)).revision,1);
 const key=[...f.records.keys()][0],prior=f.records.get(key);
 f.records.set(key,{...prior,selected:['hunter','hunter']});
 assert.equal((await make().inspectProfessions(a)).reason,'invalid-stored-professions');
});
