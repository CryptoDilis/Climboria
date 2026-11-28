const ROOM = 'preview-region-events-fixture';
const KEY = 'game:preview:region-events:v1:' + ROOM;
const KINDS = Object.freeze(['falling-star', 'lost-expedition', 'secret-passage', 'wandering-merchant']);
const CAP = 64;
const idOk = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,100}$/.test(value);
const timeOk = value => Number.isSafeInteger(value) && value >= 0;
const deny = reason => ({ ok: false, reason });

// Pull-based private schedule. A trusted room supplies the current region and
// clock. There are no timers, client messages, player effects or reward grants.
export function createPrivateRegionEvents({ roomId, storage, clock, seed, regions, intervalMs, activeMs, resolveOwner = null, resolveCompletion = null } = {}) {
 const regionIds = Array.isArray(regions) ? [...regions].sort() : [];
 if (roomId !== ROOM || typeof storage?.transaction !== 'function' || typeof clock !== 'function' ||
     !timeOk(seed) || seed > 0xffffffff || !timeOk(intervalMs) || !timeOk(activeMs) ||
     activeMs === 0 || activeMs >= intervalMs || regionIds.length === 0 || regionIds.length > 16 ||
     new Set(regionIds).size !== regionIds.length ||
     !regionIds.every(region => typeof region === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(region)))
  throw new Error('Explicit private event regions, timing and storage required');
 if (!((resolveOwner===null&&resolveCompletion===null)||(typeof resolveOwner==='function'&&typeof resolveCompletion==='function'))) throw Error('Explicit event participation authority required');

 const configuration = JSON.stringify([seed, regionIds, intervalMs, activeMs]);
 let unavailable = false;

 async function transact(fn){
  if(unavailable)return deny('event-storage-unavailable');
  try{return await storage.transaction(fn);}catch{unavailable=true;return deny('event-storage-unavailable');}
 }
 // Observations and receipts share one transaction and one durable slot.
 async function observe(tx){
  const prior=await tx.get(KEY),now=clock();
  if(!timeOk(now)||!timeOk(now+activeMs))return deny('invalid-server-time');
  if(prior!==undefined&&(!prior||prior.version!==1||prior.configuration!==configuration||
   !timeOk(prior.anchorMs)||!timeOk(prior.slot)||typeof prior.expired!=='boolean'||
   (prior.participants!==undefined&&(!Array.isArray(prior.participants)||prior.participants.length>CAP||
    !prior.participants.every(idOk)||new Set(prior.participants).size!==prior.participants.length))))return deny('invalid-event-state');
  const priorReceiptAt=prior?.lastReceiptAtMs??null;
  if(priorReceiptAt!==null){
   const priorStart=prior.anchorMs+prior.slot*intervalMs;
   if(!prior.participants?.length||!timeOk(priorStart)||!timeOk(priorStart+activeMs)||
    !timeOk(priorReceiptAt)||priorReceiptAt<priorStart||priorReceiptAt>=priorStart+activeMs)
    return deny('invalid-event-state');
   if(now<priorReceiptAt)return deny('stale-world-clock');
  }
  const anchorMs=prior?.anchorMs??now;
  if(now<anchorMs)return deny('stale-world-clock');
  const slot=Math.floor((now-anchorMs)/intervalMs);
  if(prior&&slot<prior.slot)return deny('stale-world-clock');
  const startsAtMs=anchorMs+slot*intervalMs,expiresAtMs=startsAtMs+activeMs;
  const expired=now>=expiresAtMs||(slot===prior?.slot&&prior.expired);
  const sameSlot=slot===prior?.slot;
  const state={version:1,configuration,anchorMs,slot,expired,
   participants:sameSlot?(prior.participants??[]):[],lastReceiptAtMs:sameSlot?priorReceiptAt:null};
  if(!prior||slot!==prior.slot||expired!==prior.expired)await tx.put(KEY,state);
  const mixed=Math.imul(seed^slot,0x9e3779b1)>>>0;
  const event=expired?null:{id:ROOM+':'+anchorMs+':'+slot,regionId:regionIds[(mixed>>>10)%regionIds.length],kind:KINDS[mixed%KINDS.length],startsAtMs,expiresAtMs};
  return {ok:true,event,state,now};
 }
 async function snapshot(regionId){
  if(!regionIds.includes(regionId))return deny('invalid-region');
  return transact(async tx=>{
   const o=await observe(tx);if(!o.ok)return o;
   return {ok:true,event:o.event?.regionId===regionId?o.event:null};
  });
 }
 function owner(s){
  const p=resolveOwner(s,ROOM);
  return p?.sessionId===s&&p.roomId===ROOM&&idOk(p.accountId)&&regionIds.includes(p.regionId)?{accountId:p.accountId,regionId:p.regionId}:null;
 }
 function completion(s,i,a){
  const p=resolveCompletion(s,i,ROOM);
  if(!p||p.roomId!==ROOM||p.sessionId!==s||p.accountId!==a.accountId||p.regionId!==a.regionId||p.completionId!==i||
   typeof p.eventId!=='string'||p.eventId.length>100||!timeOk(p.completedAtMs)||p.completed!==true||p.reachable!==true)return null;
  return {eventId:p.eventId,completedAtMs:p.completedAtMs};
 }
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 async function recordParticipation(s,i){
  if(resolveOwner===null)return deny('event-participation-disabled');
  if(!idOk(s)||!idOk(i))return deny('invalid-event-intent');
  return transact(async tx=>{
   const a=owner(s);if(!a)return deny('unverified-event-owner');
   const p=completion(s,i,a);if(!p)return deny('unverified-event-completion');
   const valid=()=>same(a,owner(s))&&same(p,completion(s,i,a));
   const o=await observe(tx);
   if(!valid())throw Error('Event authority changed during observation');
   if(!o.ok)return o;
   const e=o.event;
   if(!e||e.id!==p.eventId||e.regionId!==a.regionId||p.completedAtMs<e.startsAtMs||p.completedAtMs>o.now||p.completedAtMs>=e.expiresAtMs)return deny('event-completion-not-active');
   if(o.state.participants.includes(a.accountId))return deny('event-already-recorded');
   if(o.state.participants.length>=CAP)return deny('event-participation-cap');
   const active=()=>{const now=clock();return timeOk(now)&&now>=o.now&&now<e.expiresAtMs;};
   if(!active())return deny('event-completion-not-active');
   const next={...o.state,lastReceiptAtMs:o.now,participants:[...o.state.participants,a.accountId]};
   await tx.put(KEY,next);
   if(!valid()||!active())throw Error('Event authority or time changed during receipt write');
   return {ok:true,eventId:e.id,recorded:true};
  });
 }
 return Object.freeze({snapshot,recordParticipation,reviewedForProduction:false});
}
