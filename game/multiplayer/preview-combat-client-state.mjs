/**
 * Private synthetic combat client projection. No network, public Game wiring,
 * local HP mutation, rewards or inventory. Server snapshots are authoritative;
 * hit/respawn pushes only invalidate the view until a fresh read succeeds.
 */
const sid=id=>typeof id==='string'&&/^s_[a-f0-9]{32}$/.test(id);
const maxHp=500,room='preview-combat-fixture';
function project(id,s){
 if(s?.serverId!==id||s.roomId!==room||s.maxHealth!==maxHp||
    !Number.isInteger(s.health)||s.health<0||s.health>maxHp||s.health%5!==0||
    s.downed!==(s.health===0)||
    (s.downed?(!Number.isSafeInteger(s.respawnAtMs)||s.respawnAtMs<0):s.respawnAtMs!==null))return null;
 return Object.freeze({health:s.health,maxHealth:maxHp,downed:s.downed,respawnAtMs:s.respawnAtMs});
}
export function createPreviewCombatClientState(joined){
 if(joined?.type!=='preview-joined'||joined.fixture!=='synthetic-combat'||!sid(joined.id))throw Error('Invalid preview admission');
 const id=joined.id;let view=project(id,joined.snapshot);
 if(!view)throw Error('Invalid preview snapshot');
 let closed=false,dirty=false,revision=0,pending=null;
 function observe(packet){
  if(closed||packet?.targetId!==id)return false;
  if(packet.type==='preview-hit'){
   if(!sid(packet.actorId)||packet.actorId===id||packet.damage!==5||
      !Number.isInteger(packet.health)||packet.health<0||packet.health>=maxHp||packet.health%5!==0||
      packet.downed!==(packet.health===0))return false;
  }else if(packet.type!=='preview-respawn')return false;
  dirty=true;revision++;return true;
 }
 function beginSnapshot(){
  if(closed||pending)return null;
  pending=Object.freeze({revision});return pending;
 }
 function acceptSnapshot(token,result){
  // Identity comparison rejects responses from retired adapters or earlier reads.
  if(closed||!pending||token!==pending)return false;
  pending=null;
  const next=result?.ok===true?project(id,result.snapshot):null;
  if(!next||token.revision!==revision){dirty=true;return false}
  view=next;dirty=false;return true;
 }
 function close(){closed=true;pending=null;view=null;dirty=true}
 return Object.freeze({id,observe,beginSnapshot,acceptSnapshot,close,
  read:()=>closed||dirty?null:view,needsSnapshot:()=>!closed&&dirty,
  canAct:()=>!closed&&!dirty&&!view.downed});
}
