const ROOM = 'preview-mastery-fixture';
const RANKS = Object.freeze(['Novice', 'Apprentice', 'Skilled', 'Expert', 'Master']);
const SKILLS = new Set([
 'climbing', 'swimming', 'fishing', 'farming', 'combat',
 'endurance', 'survival', 'crafting', 'treasure-hunting', 'weapon-handling',
]);
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

 return Object.freeze({ record, inspect, reviewedForProduction: false });
}
