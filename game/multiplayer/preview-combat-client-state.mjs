/**
 * Private synthetic combat client projection. No network, public Game wiring,
 * local HP mutation, rewards or inventory. Server snapshots are authoritative;
 * hit/respawn pushes only invalidate the view until a fresh read succeeds.
 */
const sid=id=>typeof id==='string'&&/^s_[a-f0-9]{32}$/.test(id);
const maxHp=500;
const syntheticRoom='preview-combat-fixture',authoredRoom='preview-jarrell-camp-v1';
function project(id,s,room){
 if(s?.serverId!==id||s.roomId!==room||s.maxHealth!==maxHp||
    !Number.isInteger(s.health)||s.health<0||s.health>maxHp||s.health%5!==0||
    s.downed!==(s.health===0)||
    (s.downed?(!Number.isSafeInteger(s.respawnAtMs)||s.respawnAtMs<0):s.respawnAtMs!==null))return null;
 const health={health:s.health,maxHealth:maxHp,downed:s.downed,respawnAtMs:s.respawnAtMs};
 if(room===syntheticRoom)return Object.freeze(health);
 const p=s.position;
 if(!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.abs(p.y)>=50000||
    p.x<-219.6-1e-6||p.x>-180.4+1e-6||p.z<-189.6-1e-6||p.z>-150.4+1e-6||
    !Number.isSafeInteger(s.observedAtMs)||s.observedAtMs<0||
    !Number.isFinite(s.stamina)||s.stamina<0||s.stamina>200||typeof s.sprintExhausted!=='boolean'||
    (s.stamina===0&&!s.sprintExhausted)||(s.sprintExhausted&&s.stamina>=40))return null;
 return Object.freeze({...health,position:Object.freeze({x:p.x,y:p.y,z:p.z}),
  observedAtMs:s.observedAtMs,stamina:s.stamina,sprintExhausted:s.sprintExhausted});
}
export function createPreviewCombatClientState(joined){return createState(joined,'synthetic-combat',syntheticRoom)}
// Explicit opt-in for local authored map only; never infer mode from a packet.
export function createAuthoredLocalCombatClientState(joined){return createState(joined,'authored-camp-local',authoredRoom)}
function createState(joined,fixture,room){
 if(joined?.type!=='preview-joined'||joined.fixture!==fixture||!sid(joined.id))throw Error('Invalid preview admission');
 const id=joined.id;let view=project(id,joined.snapshot,room);
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
  const next=result?.ok===true?project(id,result.snapshot,room):null;
  if(!next||token.revision!==revision||(room===authoredRoom&&next.observedAtMs<view.observedAtMs)){dirty=true;return false}
  view=next;dirty=false;return true;
 }
 function close(){closed=true;pending=null;view=null;dirty=true}
 return Object.freeze({id,observe,beginSnapshot,acceptSnapshot,close,
  read:()=>closed||dirty?null:view,needsSnapshot:()=>!closed&&dirty,
  canAct:()=>!closed&&!dirty&&!view.downed});
}
