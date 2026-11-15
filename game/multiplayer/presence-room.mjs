/**
 * A transport-agnostic REAL player presence room core for a future
 * authenticated server. This module does not open sockets or create players.
 * Only a trusted WebSocket gateway may supply server-issued session IDs.
 *
 * Not wired to the live Game. No fake player ghosts, loot, damage or rewards.
 */
import {ROOM_RULES,validatePlayerMove} from './server-authority-rules.mjs';
const VALID_ID=/^[a-zA-Z0-9_-]{16,100}$/;
const VALID_NAME=/^[a-zA-Z0-9 _-]{2,24}$/;
const ALLOWED_MODELS=new Set(['Adventurer','Jarrell','Lheiz']);
const INITIAL_POSITION=Object.freeze({x:0,y:2,z:-30});

export class PresenceRoom{
 constructor({roomId='jarrell-peak',now=()=>Date.now(),limit=32}={}){
  if(typeof roomId!=='string'||!roomId||typeof now!=='function'||!Number.isInteger(limit)||limit<2||limit>128)
   throw Error('Invalid trusted room configuration');
  this.roomId=roomId;
  this.now=now;
  this.limit=limit;
  this.members=new Map();
 }
 snapshot(){
  return [...this.members.values()].map(m=>({
   id:m.id,name:m.name,model:m.model,
   position:{...m.position}
  }));
 }
 /** Connections MUST have passed the external server's authentication check. */
 connect({trustedSessionId,name,model,send}={}){
  if(!VALID_ID.test(trustedSessionId||'')||typeof send!=='function')
   return {ok:false,reason:'invalid-trusted-session'};
  if(this.members.has(trustedSessionId))return {ok:false,reason:'duplicate-session'};
  if(this.members.size>=this.limit)return {ok:false,reason:'room-full'};
  const entry={
   id:trustedSessionId,name:VALID_NAME.test(name||'')?name:'Explorer',
   model:ALLOWED_MODELS.has(model)?model:'Adventurer',
   position:{...INITIAL_POSITION},lastMoveAt:this.now(),send
  };
  const peers=this.snapshot();
  try{send({type:'welcome',roomId:this.roomId,selfId:entry.id,peers})}
  catch(_){return {ok:false,reason:'connection-not-writable'}}
  this.members.set(entry.id,entry);
  this.broadcast({type:'player-joined',player:{
   id:entry.id,name:entry.name,model:entry.model,position:{...entry.position}
  }},entry.id);
  return {ok:true,id:entry.id,count:this.members.size};
 }
 broadcast(packet,exceptId){
  const failed=[];
  for(const [id,member] of this.members){
   if(id===exceptId)continue;
   try{member.send(packet)}catch(_){failed.push(id)}
  }
  // Explicitly evict failed transports to avoid displaying ghost players.
  for(const id of failed)this.disconnect(id);
 }
 move(trustedSessionId,payload={}){
  const m=this.members.get(trustedSessionId);
  if(!m)return {ok:false,reason:'unknown-or-disconnected-session'};
  const now=this.now(),dt=now-m.lastMoveAt;
  if(dt<50)return {ok:false,reason:'move-rate-limited'};
  // A player can be idle for minutes: validation must not permanently lock
  // movement after the 1s freshness window. Cap the displacement budget to
  // a single trusted second; never trust huge elapsed time as teleport credit.
  const acceptedInterval=Math.min(dt,ROOM_RULES.maxAcceptedMoveAgeMs);
  const result=validatePlayerMove({previous:m.position,next:payload.position,elapsedMs:acceptedInterval});
  if(!result.ok)return result;
  // Ignore any client-provided id, name, room or health fields.
  m.position={x:payload.position.x,y:payload.position.y,z:payload.position.z};
  m.lastMoveAt=now;
  this.broadcast({type:'player-moved',id:m.id,position:{...m.position}},m.id);
  return {ok:true};
 }
 receive(trustedSessionId,packet){
  if(!packet||typeof packet!=='object')return {ok:false,reason:'invalid-packet'};
  if(packet.type==='move')return this.move(trustedSessionId,packet);
  if(packet.type==='attack'||packet.type==='grab')
   return {ok:false,reason:'combat-and-loot-not-connected-to-authoritative-server'};
  return {ok:false,reason:'unsupported-packet'};
 }
 disconnect(trustedSessionId){
  if(!this.members.delete(trustedSessionId))return false;
  this.broadcast({type:'player-left',id:trustedSessionId},trustedSessionId);
  return true;
 }
}
