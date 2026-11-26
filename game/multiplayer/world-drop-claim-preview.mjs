/**
 * Isolated nonfinancial one-drop prototype. No production import, inventory
 * grant, currency, user asset or wallet operation. The caller MUST bind session
 * identity and resolve synchronous, authoritative state in the serialized room.
 * A successful result records ONLY a durable synthetic claim receipt.
 */
import {authorizeWorldGrab} from './server-authority-rules.mjs';
const ROOM='preview-world-drop-fixture';
const DROP='preview-world-drop-1';
const KEY='game:preview:world-drop:v1:'+ROOM+':'+DROP;
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
    const now=clock();if(!time(now))return deny('invalid-server-time');
    // Resolve actor inside transaction, including retries. No browser positions.
    const actor=resolveActor(sessionId,ROOM);
    if(!actor||actor.serverId!==sessionId||actor.roomId!==ROOM||!idOk(actor.accountId)||
       !Number.isFinite(actor.health)||actor.health<=0||!time(actor.observedAtMs)||
       actor.observedAtMs>now||now-actor.observedAtMs>1000)
     return deny('untrusted-or-inactive-actor');
    const eligible=authorizeWorldGrab({actor,drop,nowMs:now});
    if(!eligible.ok)return eligible;
    if(clearPath(actor.position,point,ROOM)!==true)return deny('blocked-or-unverified-drop-path');
    const prior=await tx.get(KEY);
    if(prior!==undefined){
     if(!prior||prior.version!==1||prior.roomId!==ROOM||prior.dropId!==DROP||
        !idOk(prior.accountId)||!time(prior.claimedAtMs)||prior.claimedAtMs>now)
      return deny('invalid-stored-claim');
     return deny('drop-already-claimed');
    }
    await tx.put(KEY,{version:1,roomId:ROOM,dropId:DROP,accountId:actor.accountId,claimedAtMs:now});
    return {ok:true,dropId:DROP,fixture:'synthetic-claim-receipt'};
   });
  }catch{
   // Ambiguous commit: refuse further claims on this instance. Never replay
   // a success automatically; fresh instances must inspect durable state.
   unavailable=true;return deny('claim-storage-unavailable');
  }
 }
 return Object.freeze({claim,reviewedForProduction:false});
}
