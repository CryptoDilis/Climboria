/**
 * Game-only pre-release open-world melee authorization.
 * NOT connected to the Worker; no HP mutation, loot, or financial effects.
 * A future server caller MUST derive identity from authenticated sockets,
 * health/cooldown from its own state, and coordinates + obstruction checks
 * from independent authoritative terrain simulation. PresenceRoom browser
 * movement, even when rate-limited, is not that simulation.
 */
import {ROOM_RULES,inSanctuarySafeZone} from './server-authority-rules.mjs';
const finite=Number.isFinite;
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const pointOk=p=>p&&['x','y','z'].every(k=>finite(p[k])&&Math.abs(p[k])<50000);
const deny=reason=>({ok:false,reason});
// Legacy room spawn protection is centered at (0,-30), but the authored
// Sanctuary POI is (0,-90), radius 60. Preserve both until a single reviewed
// map-derived combat boundary is available; conservatively include edges.
const protectedSanctuary=p=>inSanctuarySafeZone(p)||
 Math.hypot(p.x-ROOM_RULES.safeZone.x,p.z-ROOM_RULES.safeZone.z)<=ROOM_RULES.safeZone.radius||
 Math.hypot(p.x,p.z+90)<=60;
export function authorizeOpenWorldMelee({
 actor,target,nowMs,lastAttackAtMs=null,
 resolveTrustedPosition=()=>null,hasClearMeleePath=()=>false
}={}){
 if(!idOk(actor?.serverId)||!idOk(target?.serverId)||actor.serverId===target.serverId||
    typeof actor.roomId!=='string'||!actor.roomId||actor.roomId!==target.roomId||
    actor.active!==true||target.active!==true)
  return deny('invalid-peer-or-room');
 if(!finite(actor.health)||actor.health<=0||!finite(target.health)||target.health<=0)
  return deny('inactive-fighter');
 if(!finite(nowMs)||nowMs<0||
    (lastAttackAtMs!==null&&(!finite(lastAttackAtMs)||lastAttackAtMs<0||lastAttackAtMs>nowMs)))
  return deny('invalid-server-time');
 if(lastAttackAtMs!==null&&nowMs-lastAttackAtMs<ROOM_RULES.attackCooldownMs)
  return deny('attack-cooldown');
 let a,b;
 try{
  a=resolveTrustedPosition(actor.serverId,actor.roomId);
  b=resolveTrustedPosition(target.serverId,target.roomId);
 }catch{return deny('untrusted-terrain-position')}
 const verified=(s,fighter)=>s&&s.serverId===fighter.serverId&&s.roomId===fighter.roomId&&
  pointOk(s.position)&&finite(s.observedAtMs)&&s.observedAtMs>=0&&
  s.observedAtMs<=nowMs&&nowMs-s.observedAtMs<=ROOM_RULES.maxAcceptedMoveAgeMs;
 if(!verified(a,actor)||!verified(b,target))return deny('untrusted-terrain-position');
 if(protectedSanctuary(a.position)||protectedSanctuary(b.position))
  return deny('sanctuary-pvp-disabled');
 const distance=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z);
 if(distance>ROOM_RULES.meleeRangeMeters)return deny('target-out-of-range');
 // Never treat a missing, throwing, asynchronous, or truthy non-boolean
 // terrain result as permission. No browser packet can supply this function.
 try{
  if(hasClearMeleePath(a.position,b.position,actor.roomId)!==true)
   return deny('blocked-or-unverified-melee-path');
 }catch{return deny('blocked-or-unverified-melee-path')}
 return {ok:true,reason:'authorized-open-world-melee-intent',targetId:target.serverId};
}
