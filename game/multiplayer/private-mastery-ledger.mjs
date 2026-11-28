const ROOM = 'preview-mastery-fixture';
const RANKS = Object.freeze(['Novice', 'Apprentice', 'Skilled', 'Expert', 'Master']);
const SKILLS = new Set([
 'climbing', 'swimming', 'fishing', 'farming', 'combat',
 'endurance', 'survival', 'crafting', 'treasure-hunting', 'weapon-handling',
]);
// Related skills are affinities, not proof of profession-specific activity.
// In particular, combat is not hunting and crafting is not commerce.
const PROFESSIONS = Object.freeze({
 blacksmith:['crafting'], fisherman:['fishing'], farmer:['farming'],
 hunter:['combat','survival'], cook:['crafting','survival'],
 explorer:['climbing','swimming','endurance'], merchant:[],
 'treasure-hunter':['treasure-hunting'],
});
const idOk = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(id);
const deny = reason => ({ ok: false, reason });

// Private storage fixture. The room must resolve completed activity from trusted
// state and assign a contiguous per-account, per-skill sequence. Client claims
// about a skill, amount or sequence never enter the ledger.
export function createPrivateMasteryLedger({ roomId, storage, resolveActivity, thresholds, resolveOwner = () => null } = {}) {
 const rankBoundaries = Array.isArray(thresholds) ? [...thresholds] : [];
 if (roomId !== ROOM || typeof storage?.transaction !== 'function' || typeof resolveActivity !== 'function' || typeof resolveOwner !== 'function' ||
     rankBoundaries.length !== RANKS.length - 1 ||
     !rankBoundaries.every((value, index) => Number.isSafeInteger(value) && value > (rankBoundaries[index - 1] ?? 0)))
  throw new Error('Explicit private mastery storage, activity authority and rank thresholds required');

 let unavailable = false;
 const keyFor = (accountId, skill) => 'game:preview:mastery:v1:' + ROOM + ':' + accountId + ':' + skill;
 const validRecord = (prior, accountId, skill) => prior !== null && typeof prior === 'object' &&
  prior.version === 1 && prior.accountId === accountId && prior.skill === skill &&
  Number.isSafeInteger(prior.sequence) && prior.sequence > 0;
 const progress = (skill, sequence) => ({ skill, validatedActivities: sequence,
  rank: RANKS[rankBoundaries.filter(boundary => sequence >= boundary).length] });

 function accountFor(sessionId) {
  const owner = resolveOwner(sessionId, ROOM);
  return owner?.sessionId === sessionId && owner.roomId === ROOM && idOk(owner.accountId)
   ? owner.accountId : null;
 }

 // Private read-only projection; no provisioning, credit or client account selector.
 async function inspect(sessionId) {
  if (!idOk(sessionId)) return deny('invalid-mastery-intent');
  if (unavailable) return deny('mastery-storage-unavailable');
  try {
   return await storage.transaction(async tx => {
    const accountId = accountFor(sessionId);
    if (!accountId) return deny('unverified-mastery-owner');
    const skills = [];
    for (const skill of SKILLS) {
     const prior = await tx.get(keyFor(accountId, skill));
     if (accountFor(sessionId) !== accountId) return deny('unverified-mastery-owner');
     if (prior !== undefined && !validRecord(prior, accountId, skill)) return deny('invalid-stored-mastery');
     skills.push(progress(skill, prior?.sequence ?? 0));
    }
    return { ok: true, skills };
   });
  } catch {
   unavailable = true;
   return deny('mastery-storage-unavailable');
  }
 }
 const preferenceKey = accountId => 'game:preview:professions:v1:' + ROOM + ':' + accountId;
 const validPreference = (p,accountId) => p && p.version===1 && p.accountId===accountId &&
  Number.isSafeInteger(p.revision) && p.revision>0 && Array.isArray(p.selected) &&
  p.selected.length<=Object.keys(PROFESSIONS).length && p.selected.every(id=>typeof id==='string'&&Object.hasOwn(PROFESSIONS,id)) &&
  new Set(p.selected).size===p.selected.length;
 const readPreference = (p,accountId) => p===undefined ? {version:1,accountId,revision:0,selected:[]} : validPreference(p,accountId)?p:null;
 async function professionProfile(sessionId,change=null) {
  if(!idOk(sessionId))return deny('invalid-profession-intent');
  if(unavailable)return deny('mastery-storage-unavailable');
  try{return await storage.transaction(async tx=>{
   const accountId=accountFor(sessionId);if(!accountId)return deny('unverified-mastery-owner');
   const prior=readPreference(await tx.get(preferenceKey(accountId)),accountId);
   if(accountFor(sessionId)!==accountId)return deny('unverified-mastery-owner');
   if(!prior)return deny('invalid-stored-professions');
   const skills=new Map();
   for(const skill of SKILLS){
    const stored=await tx.get(keyFor(accountId,skill));
    if(accountFor(sessionId)!==accountId)return deny('unverified-mastery-owner');
    if(stored!==undefined&&!validRecord(stored,accountId,skill))return deny('invalid-stored-mastery');
    skills.set(skill,progress(skill,stored?.sequence??0));
   }
   let next=prior;
   if(change!==null){
    if(change.revision!==prior.revision)return deny('profession-revision-conflict');
    if(prior.selected.includes(change.id)!==change.selected){
     if(prior.revision===Number.MAX_SAFE_INTEGER)return deny('profession-revision-exhausted');
     next={...prior,revision:prior.revision+1,selected:Object.keys(PROFESSIONS).filter(id=>id===change.id?change.selected:prior.selected.includes(id))};
     await tx.put(preferenceKey(accountId),next);
     if(accountFor(sessionId)!==accountId)throw Error('Profession owner changed during write');
    }
   }
   // No class assignment, XP grant, unlock, economic effect or invented rank.
   return {ok:true,revision:next.revision,professions:Object.entries(PROFESSIONS).map(([id,related])=>({
    id,selected:next.selected.includes(id),relatedSkills:related.map(skill=>skills.get(skill)),
    professionActivityIntegrated:false
   }))};
  });}catch{unavailable=true;return deny('mastery-storage-unavailable');}
 }
 async function setProfession(sessionId,id,selected,revision){
  if(typeof id!=='string'||!Object.hasOwn(PROFESSIONS,id)||typeof selected!=='boolean'||!Number.isSafeInteger(revision)||revision<0)
   return deny('invalid-profession-intent');
  return professionProfile(sessionId,{id,selected,revision});
 }
 function verifiedActivity(sessionId, activityId) {
  const proof = resolveActivity(sessionId, activityId, ROOM);
  if (!proof || proof.sessionId !== sessionId || proof.activityId !== activityId ||
      proof.roomId !== ROOM || !idOk(proof.accountId) || !SKILLS.has(proof.skill) ||
      !Number.isSafeInteger(proof.sequence) || proof.sequence <= 0) return null;
  return { accountId: proof.accountId, skill: proof.skill, sequence: proof.sequence };
 }

 async function record(sessionId, activityId) {
  if (!idOk(sessionId) || !idOk(activityId)) return deny('invalid-activity-intent');
  if (unavailable) return deny('mastery-storage-unavailable');
  try {
   return await storage.transaction(async tx => {
    const proof = verifiedActivity(sessionId, activityId);
    if (!proof) return deny('unverified-activity');
    const { accountId, skill, sequence } = proof;
    const key = keyFor(accountId, skill);
    const prior = await tx.get(key);
    // A queued read must not preserve a now-revoked account or changed event.
    const current = verifiedActivity(sessionId, activityId);
    if (!current || current.accountId !== accountId || current.skill !== skill || current.sequence !== sequence)
     return deny('unverified-activity');
    if (prior !== undefined && !validRecord(prior, accountId, skill))
     return deny('invalid-stored-mastery');
    const previousSequence = prior?.sequence ?? 0;
    if (sequence <= previousSequence) return deny('activity-already-recorded');
    if (sequence !== previousSequence + 1) return deny('activity-out-of-order');

    await tx.put(key, { version: 1, accountId, skill, sequence });
    return { ok: true, ...progress(skill, sequence) };
   });
  } catch {
   unavailable = true;
   return deny('mastery-storage-unavailable');
  }
 }

 return Object.freeze({ record, inspect, inspectProfessions: sessionId=>professionProfile(sessionId), setProfession, reviewedForProduction: false });
}
