/**
 * Isolated nonfinancial one-drop prototype. No production import, real inventory,
 * currency, user asset or wallet operation. The caller MUST bind session
 * identity and resolve synchronous, authoritative state in the serialized room.
 * Success atomically commits a receipt and a fixed synthetic inventory slot.
 */
import {authorizeWorldGrab} from './server-authority-rules.mjs';
const ROOM='preview-world-drop-fixture';
const DROP='preview-world-drop-1';
const KEY='game:preview:world-drop:v1:'+ROOM+':'+DROP;
const SLOT_KEY=KEY+':synthetic-inventory';
const STATE_KEY=KEY+':lifetime';
const RECOVERY_MS=90_000;
const ITEM='preview-training-relic';
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const time=t=>Number.isSafeInteger(t)&&t>=0;
const deny=reason=>({ok:false,reason});
const point=Object.freeze({x:201,y:0,z:20});
const drop=Object.freeze({type:'world_drop',binding:'unbound',authoritative:true,roomId:ROOM,
 position:point,claimed:false,paid:false,onChain:false,protectedUntilMs:0});
export function createWorldDropClaimPreview({storage,roomId,clock=()=>Date.now(),resolveActor,clearPath}={}){
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof clock!=='function'||
    typeof resolveActor!=='function'||typeof clearPath!=='function')
  throw Error('Explicit isolated preview storage and server authority required');
 let unavailable=false;
 function checkLifetime(state,now){
  if(state===undefined)return 'drop-not-open';
  if(!state||state.version!==1||state.roomId!==ROOM||state.dropId!==DROP||
     !time(state.openedAtMs)||!time(state.expiresAtMs)||
     state.expiresAtMs-state.openedAtMs!==RECOVERY_MS||now<state.openedAtMs)
   return 'invalid-stored-drop';
  return now>=state.expiresAtMs?'drop-expired':null;
 }
 function checkReceipt(prior,slot,state,now){
  if(prior===undefined&&slot===undefined)return null;
  if(!prior||prior.version!==2||prior.roomId!==ROOM||prior.dropId!==DROP||
     !idOk(prior.accountId)||!time(prior.claimedAtMs)||prior.claimedAtMs>now||
     prior.claimedAtMs<state.openedAtMs||prior.claimedAtMs>=state.expiresAtMs||
     !slot||slot.version!==1||slot.roomId!==ROOM||slot.dropId!==DROP||
     slot.accountId!==prior.accountId||slot.item!==ITEM||slot.quantity!==1||
     slot.grantedAtMs!==prior.claimedAtMs)
   return 'invalid-stored-claim';
  return 'drop-already-claimed';
 }
 async function transact(operation){
  if(unavailable)return deny('claim-storage-unavailable');
  try{return await storage.transaction(operation)}
  catch{
   // An ambiguous commit cannot be acknowledged or retried on this instance.
   // A fresh instance must inspect the durable slot, receipt and lifetime.
   unavailable=true;return deny('claim-storage-unavailable');
  }
 }
 // Room-side fixture issuance only. This method is not a client action.
 async function openDrop(){
  return transact(async tx=>{
   const state=await tx.get(STATE_KEY);
   const prior=await tx.get(KEY),slot=await tx.get(SLOT_KEY);
   const now=clock();
   if(!time(now))return deny('invalid-server-time');
   if(state!==undefined){
    const problem=checkLifetime(state,now)||checkReceipt(prior,slot,state,now);
    return problem?deny(problem):{ok:true,expiresAtMs:state.expiresAtMs};
   }
   if(prior!==undefined||slot!==undefined)return deny('invalid-stored-drop');
   const expiresAtMs=now+RECOVERY_MS;
   if(!time(expiresAtMs))return deny('invalid-server-time');
   await tx.put(STATE_KEY,{version:1,roomId:ROOM,dropId:DROP,openedAtMs:now,expiresAtMs});
   return {ok:true,expiresAtMs};
  });
 }
 async function claim(sessionId,dropId){
  if(!idOk(sessionId)||dropId!==DROP)return deny('invalid-claim-intent');
  return transact(async tx=>{
    const state=await tx.get(STATE_KEY),prior=await tx.get(KEY),slot=await tx.get(SLOT_KEY);
    const now=clock();if(!time(now))return deny('invalid-server-time');
    const problem=checkLifetime(state,now);if(problem)return deny(problem);
    // Resolve actor after storage reads, including retries. No browser positions.
    const actor=resolveActor(sessionId,ROOM);
    if(!actor||actor.serverId!==sessionId||actor.roomId!==ROOM||!idOk(actor.accountId)||
       !Number.isFinite(actor.health)||actor.health<=0||!time(actor.observedAtMs)||
       actor.observedAtMs>now||now-actor.observedAtMs>1000)
     return deny('untrusted-or-inactive-actor');
    const eligible=authorizeWorldGrab({actor,drop,nowMs:now});
    if(!eligible.ok)return eligible;
    if(clearPath(actor.position,point,ROOM)!==true)return deny('blocked-or-unverified-drop-path');
    const receiptProblem=checkReceipt(prior,slot,state,now);if(receiptProblem)return deny(receiptProblem);
    // Snapshot primitives before either asynchronous write; both records
    // commit together. Never derive item or quantity from a client request.
    const accountId=actor.accountId;
    await tx.put(KEY,{version:2,roomId:ROOM,dropId:DROP,accountId,claimedAtMs:now});
    await tx.put(SLOT_KEY,{version:1,roomId:ROOM,dropId:DROP,accountId,item:ITEM,quantity:1,grantedAtMs:now});
    return {ok:true,dropId:DROP,fixture:'synthetic-claim-and-slot',item:ITEM,quantity:1};
  });
 }
 return Object.freeze({openDrop,claim,reviewedForProduction:false});
}
