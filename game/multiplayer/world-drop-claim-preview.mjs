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
 async function claim(sessionId,dropId){
  if(!idOk(sessionId)||dropId!==DROP)return deny('invalid-claim-intent');
  if(unavailable)return deny('claim-storage-unavailable');
  try{
   return await storage.transaction(async tx=>{
    const prior=await tx.get(KEY),slot=await tx.get(SLOT_KEY);
    const now=clock();if(!time(now))return deny('invalid-server-time');
    // Resolve actor after storage reads, including retries. No browser positions.
    const actor=resolveActor(sessionId,ROOM);
    if(!actor||actor.serverId!==sessionId||actor.roomId!==ROOM||!idOk(actor.accountId)||
       !Number.isFinite(actor.health)||actor.health<=0||!time(actor.observedAtMs)||
       actor.observedAtMs>now||now-actor.observedAtMs>1000)
     return deny('untrusted-or-inactive-actor');
    const eligible=authorizeWorldGrab({actor,drop,nowMs:now});
    if(!eligible.ok)return eligible;
    if(clearPath(actor.position,point,ROOM)!==true)return deny('blocked-or-unverified-drop-path');
    if(prior!==undefined||slot!==undefined){
     if(!prior||prior.version!==2||prior.roomId!==ROOM||prior.dropId!==DROP||
        !idOk(prior.accountId)||!time(prior.claimedAtMs)||prior.claimedAtMs>now||
        !slot||slot.version!==1||slot.roomId!==ROOM||slot.dropId!==DROP||
        slot.accountId!==prior.accountId||slot.item!==ITEM||slot.quantity!==1||
        slot.grantedAtMs!==prior.claimedAtMs)
      return deny('invalid-stored-claim');
     return deny('drop-already-claimed');
    }
    // Snapshot primitives before either asynchronous write; both records
    // commit together. Never derive item or quantity from a client request.
    const accountId=actor.accountId;
    await tx.put(KEY,{version:2,roomId:ROOM,dropId:DROP,accountId,claimedAtMs:now});
    await tx.put(SLOT_KEY,{version:1,roomId:ROOM,dropId:DROP,accountId,item:ITEM,quantity:1,grantedAtMs:now});
    return {ok:true,dropId:DROP,fixture:'synthetic-claim-and-slot',item:ITEM,quantity:1};
   });
  }catch{
   // Ambiguous commit: refuse further claims on this instance. Never replay
   // a success automatically; fresh instances must inspect durable state.
   unavailable=true;return deny('claim-storage-unavailable');
  }
 }
 return Object.freeze({claim,reviewedForProduction:false});
}
