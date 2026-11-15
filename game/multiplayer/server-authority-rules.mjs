/**
 * Game-only policy for a FUTURE server-authoritative multiplayer room.
 *
 * DO NOT call these on client state and pretend that they make multiplayer,
 * combat, or item transfers secure. The caller must first authenticate and
 * resolve the actor, target, inventory and positions from trusted room state.
 * There are NO live networking/rewards/attack features in this module.
 */
export const ROOM_RULES=Object.freeze({
 safeZone:Object.freeze({x:0,z:-30,radius:74}),
 meleeRangeMeters:2.8,
 grabRangeMeters:2,
 attackCooldownMs:950,
 // Jarrell Gameplay walk = 9 m/s; stamina sprint = 22 m/s. A jump can
 // add up to 11 m/s vertical, giving ~24.6 m/s total displacement.
 // Bound cosmetic presence updates at 28 m/s with a small packet-jitter
 // allowance below; never reuse client positions for PvP or rewards.
 maxPlayerSpeedMetersPerSecond:28,
 maxAcceptedMoveAgeMs:1000
});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validPoint=p=>!!p&&finite(p.x)&&finite(p.y)&&finite(p.z)&&Math.abs(p.x)<50000&&Math.abs(p.y)<50000&&Math.abs(p.z)<50000;
const planeDist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const identity=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
export function inSanctuarySafeZone(point){
 return validPoint(point)&&planeDist(point,ROOM_RULES.safeZone)<ROOM_RULES.safeZone.radius;
}
/** Caller supplies server-observed previous and proposed positions/timestamps. */
export function validatePlayerMove({previous,next,elapsedMs}={}){
 if(!validPoint(previous)||!validPoint(next)||!finite(elapsedMs)||elapsedMs<20||elapsedMs>ROOM_RULES.maxAcceptedMoveAgeMs)
  return {ok:false,reason:'invalid-or-stale-position'};
 const distance=Math.hypot(next.x-previous.x,next.y-previous.y,next.z-previous.z);
 if(distance>ROOM_RULES.maxPlayerSpeedMetersPerSecond*elapsedMs/1000+.4)
  return {ok:false,reason:'move-too-fast'};
 return {ok:true,distance};
}
function sameRoom(a,b){
 return identity(a?.serverId)&&identity(b?.serverId)&&a.serverId!==b.serverId
  &&typeof a.roomId==='string'&&a.roomId.length>0&&a.roomId===b.roomId;
}
/** A PvP attack is a REQUEST, not a client-chosen damage amount. */
export function authorizeMelee({attacker,target,nowMs,lastAttackAtMs,duelConsent}={}){
 if(!sameRoom(attacker,target)||!validPoint(attacker.position)||!validPoint(target.position))
  return {ok:false,reason:'invalid-peer-or-room'};
 if(inSanctuarySafeZone(attacker.position)||inSanctuarySafeZone(target.position))
  return {ok:false,reason:'sanctuary-pvp-disabled'};
 if(!duelConsent||attacker.pvpEnabled!==true||target.pvpEnabled!==true)
  return {ok:false,reason:'pvp-consent-required'};
 if(!finite(attacker.health)||attacker.health<=0||!finite(target.health)||target.health<=0)
  return {ok:false,reason:'inactive-fighter'};
 if(!finite(nowMs)||nowMs<0||!finite(lastAttackAtMs)||lastAttackAtMs>nowMs)
  return {ok:false,reason:'invalid-server-time'};
 if(nowMs-lastAttackAtMs<ROOM_RULES.attackCooldownMs)
  return {ok:false,reason:'attack-cooldown'};
 const distance=planeDist(attacker.position,target.position);
 if(distance>ROOM_RULES.meleeRangeMeters||Math.abs(attacker.position.y-target.position.y)>2.5)
  return {ok:false,reason:'target-out-of-range'};
 // Health/damage must be decremented by the authoritative room service.
 return {ok:true,reason:'authorized-melee-intent'};
}
/**
 * Only unowned ephemeral WORLD DROPS may be grabbed. Account inventory, paid
 * assets, wallet funds, owned inventory, and player bodies are NEVER loot.
 * Caller must atomically claim the item in the authoritative store; this
 * function does not perform a transfer or grant a reward.
 */
export function authorizeWorldGrab({actor,drop,nowMs}={}){
 if(!identity(actor?.serverId)||!validPoint(actor.position)||typeof actor.roomId!=='string'||!actor.roomId)
  return {ok:false,reason:'invalid-actor'};
 if(!drop||drop.type!=='world_drop'||drop.binding!=='unbound'
   ||drop.authoritative!==true||drop.claimed===true||drop.paid===true||drop.onChain===true
   ||typeof drop.roomId!=='string'||drop.roomId!==actor.roomId)
  return {ok:false,reason:'object-not-grabbable'};
 if(!validPoint(drop.position)||!finite(nowMs)||nowMs<0
   ||!finite(drop.protectedUntilMs)||nowMs<drop.protectedUntilMs)
  return {ok:false,reason:'drop-protected-or-invalid'};
 if(planeDist(actor.position,drop.position)>ROOM_RULES.grabRangeMeters
   ||Math.abs(actor.position.y-drop.position.y)>2.3)
  return {ok:false,reason:'drop-out-of-range'};
 return {ok:true,reason:'eligible-for-atomic-room-claim'};
}
