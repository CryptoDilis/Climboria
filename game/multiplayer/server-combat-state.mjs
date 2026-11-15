/**
 * GAME ONLY — pre-release duel state. This is NOT a network server or live PvP.
 * The connecting gateway must supply authenticated server-issued player IDs.
 * Real ATTACK damage stays fail-closed until a trusted terrain/position verifier
 * is explicitly implemented server-side. A client claim is NEVER sufficient.
 */
import {authorizeMelee,inSanctuarySafeZone,ROOM_RULES} from './server-authority-rules.mjs';

const REQUEST_TTL_MS=30_000;
const MAX_HEALTH=500;
const MELEE_DAMAGE=5;

export class ServerCombatState {
 constructor({room,now=()=>Date.now(),trustedPosition=()=>null}={}){
  if(!room?.members||typeof room.members.get!=='function'||typeof now!=='function'||typeof trustedPosition!=='function')
   throw Error('Trusted room, clock and position gate required');
  this.room=room;
  this.now=now;
  this.trustedPosition=trustedPosition;
  this.pending=new Map();
  this.opponents=new Map();
  this.health=new Map();
  this.lastAttackAt=new Map();
 }
 hasPeer(id){return typeof id==='string'&&this.room.members.has(id)}
 available(a,b){
  if(!this.hasPeer(a)||!this.hasPeer(b)||a===b)return {ok:false,reason:'invalid-or-disconnected-peer'};
  if(this.opponents.has(a)||this.opponents.has(b))return {ok:false,reason:'duel-already-active'};
  const one=this.room.members.get(a),two=this.room.members.get(b);
  if(inSanctuarySafeZone(one.position)||inSanctuarySafeZone(two.position))
   return {ok:false,reason:'sanctuary-pvp-disabled'};
  return {ok:true};
 }
 /** Session ID must be derived from the authenticated socket, never packet.id. */
 request(challengerId,targetId){
  const state=this.available(challengerId,targetId);
  if(!state.ok)return state;
  const now=this.now();
  if(!Number.isFinite(now)||now<0)return {ok:false,reason:'invalid-server-time'};
  // A target gets one pending request at a time; never leave infinite invites.
  const prior=this.pending.get(targetId);
  if(prior&&prior.expiresAt>now)return {ok:false,reason:'target-has-pending-request'};
  this.pending.set(targetId,{challengerId,expiresAt:now+REQUEST_TTL_MS});
  return {ok:true,reason:'duel-request-pending'};
 }
 /** Target can accept only the exact live invitation addressed to their socket. */
 respond(targetId,challengerId,accepted){
  const request=this.pending.get(targetId),now=this.now();
  if(!request||request.challengerId!==challengerId||request.expiresAt<=now){
   if(request&&request.expiresAt<=now)this.pending.delete(targetId);
   return {ok:false,reason:'no-valid-duel-invitation'};
  }
  this.pending.delete(targetId);
  if(accepted!==true)return {ok:true,reason:'duel-declined'};
  const state=this.available(challengerId,targetId);
  if(!state.ok)return state;
  this.opponents.set(challengerId,targetId);
  this.opponents.set(targetId,challengerId);
  this.health.set(challengerId,MAX_HEALTH);
  this.health.set(targetId,MAX_HEALTH);
  this.lastAttackAt.delete(challengerId);
  this.lastAttackAt.delete(targetId);
  return {ok:true,reason:'mutual-duel-consent'};
 }
 /** Validated damage changes ONLY server-owned, nonfinancial duel HP. */
 attack(actorId){
  const targetId=this.opponents.get(actorId),now=this.now();
  if(!this.hasPeer(actorId)||!this.hasPeer(targetId)||this.opponents.get(targetId)!==actorId)
   return {ok:false,reason:'no-active-consensual-duel'};
  // The existing browser movement transport is NOT authoritative terrain
  // physics. Default deny until a trusted server-backed verifier exists.
  // Resolve independently from audited server terrain physics, NOT the
  // browser-updated PresenceRoom member.position field.
  let aPos,bPos;
  try{aPos=this.trustedPosition(actorId);bPos=this.trustedPosition(targetId)}
  catch{return {ok:false,reason:'untrusted-terrain-position'}}
  const trusted=p=>p&&typeof p==='object'&&['x','y','z'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]));
  if(!trusted(aPos)||!trusted(bPos))return {ok:false,reason:'untrusted-terrain-position'};
  const attacker={serverId:actorId,roomId:this.room.roomId,position:aPos,
   pvpEnabled:true,health:this.health.get(actorId)};
  const target={serverId:targetId,roomId:this.room.roomId,position:bPos,
   pvpEnabled:true,health:this.health.get(targetId)};
  const last=this.lastAttackAt.get(actorId)??Math.max(0,now-ROOM_RULES.attackCooldownMs);
  const allowed=authorizeMelee({attacker,target,nowMs:now,lastAttackAtMs:last,duelConsent:true});
  if(!allowed.ok)return allowed;
  const hp=Math.max(0,target.health-MELEE_DAMAGE);
  this.health.set(targetId,hp);
  this.lastAttackAt.set(actorId,now);
  return {ok:true,reason:'server-melee-hit',targetId,health:hp,downed:hp===0};
 }
 /** Disconnect, cancel or replacement clears stale consent and duel health. */
 disconnect(id){
  this.pending.delete(id);
  for(const [recipient,pending] of this.pending){
   if(pending.challengerId===id)this.pending.delete(recipient);
  }
  const opponent=this.opponents.get(id);
  this.opponents.delete(id);
  this.health.delete(id);
  this.lastAttackAt.delete(id);
  if(opponent){
   this.opponents.delete(opponent);
   this.health.delete(opponent);
   this.lastAttackAt.delete(opponent);
  }
 }
}
