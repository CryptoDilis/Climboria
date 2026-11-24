/**
 * Isolated server-only nonfinancial HP lifecycle. NOT a live gateway.
 * All identity parameters MUST be bound to authenticated server sessions.
 * In-memory account state survives session replacement, not process restart.
 * No account persistence, rewards, loot, wallet actions or browser authority.
 */
import {authorizeOpenWorldMelee} from './open-world-melee-policy.mjs';
import {ROOM_RULES} from './server-authority-rules.mjs';
export const HP_RULES=Object.freeze({maxHp:500,damage:5,respawnMs:5000,attemptCooldownMs:150});
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const deny=reason=>({ok:false,reason});
export class ServerHpLifecycle {
 #movement;#room;#clock;#collision;#lastNow=-1;#accounts=new Map();#sessions=new Map();
 constructor({movement,roomId,clock=()=>Date.now(),collision}={}){
  if(typeof roomId!=='string'||!roomId||typeof clock!=='function'||collision?.roomId!==roomId||
   typeof collision.clearPath!=='function'||!['join','snapshot','input','tick','disconnect','suspendForDeath','respawnAtServerSpawn'].every(k=>typeof movement?.[k]==='function'))
   throw Error('Explicit server movement and collision required');
  this.#movement=movement;this.#room=roomId;this.#clock=clock;this.#collision=collision;
 }
 #now(){const now=this.#clock();if(!Number.isSafeInteger(now)||now<0||now<this.#lastNow)return null;this.#lastNow=now;return now}
 #state(id){return this.#accounts.get(this.#sessions.get(id))}
 join({sessionId,accountId}={}){
  const now=this.#now();if(now===null)return deny('invalid-server-time');
  if(!idOk(sessionId)||!idOk(accountId)||this.#sessions.has(sessionId))return deny('invalid-session');
  let state=this.#accounts.get(accountId);
  if(state?.sessionId||(!state&&this.#accounts.size>=128))return deny('account-unavailable');
  const joined=this.#movement.join(sessionId);if(!joined.ok)return joined;
  if(!state){state={hp:HP_RULES.maxHp,downedAt:null,lastAttempt:null,lastAttack:null,sessionId:null};this.#accounts.set(accountId,state)}
  if(state.hp===0&&!this.#movement.suspendForDeath(sessionId)){this.#movement.disconnect(sessionId);return deny('death-lock-failed')}
  state.sessionId=sessionId;this.#sessions.set(sessionId,accountId);
  return {ok:true,snapshot:this.snapshot(sessionId)};
 }
 snapshot(id){
  const s=this.#state(id);if(!s)return null;
  return {serverId:id,roomId:this.#room,health:s.hp,maxHealth:HP_RULES.maxHp,downed:s.hp===0,respawnAtMs:s.downedAt===null?null:s.downedAt+HP_RULES.respawnMs};
 }
 input(id,packet){const s=this.#state(id);if(!s||s.hp===0)return deny('inactive-fighter');return this.#movement.input(id,packet)}
 attack(actorId,targetId){
  const now=this.#now();if(now===null)return deny('invalid-server-time');
  const a=this.#state(actorId),b=this.#state(targetId);
  if(!a||!b||a===b||a.hp<=0||b.hp<=0)return deny('inactive-fighter');
  if(a.lastAttempt!==null&&now-a.lastAttempt<HP_RULES.attemptCooldownMs)return deny('attempt-cooldown');
  a.lastAttempt=now;
  const fighter=(id,s)=>({serverId:id,roomId:this.#room,active:true,health:s.hp});
  const allowed=authorizeOpenWorldMelee({actor:fighter(actorId,a),target:fighter(targetId,b),nowMs:now,lastAttackAtMs:a.lastAttack,
   resolveTrustedPosition:(id,room)=>this.#movement.snapshot(id,room),hasClearMeleePath:(p,q,room)=>this.#collision.clearPath(p,q,room)});
  if(!allowed.ok)return allowed;
  const hp=Math.max(0,b.hp-HP_RULES.damage);
  if(hp===0&&!this.#movement.suspendForDeath(targetId))return deny('death-lock-failed');
  a.lastAttack=now;b.hp=hp;
  if(hp===0)b.downedAt=now;
  return {ok:true,targetId,health:hp,damage:HP_RULES.damage,downed:hp===0};
 }
 tick(){
  const now=this.#now();if(now===null)return deny('invalid-server-time');
  const result=this.#movement.tick();if(!result.ok)return result;
  const respawned=[];
  for(const [id,account] of this.#sessions){
   const s=this.#accounts.get(account);
   if(s.hp!==0||s.downedAt===null||now-s.downedAt<HP_RULES.respawnMs)continue;
   if(!this.#movement.respawnAtServerSpawn(id))continue;
   s.hp=HP_RULES.maxHp;s.downedAt=null;s.lastAttack=now;s.lastAttempt=now;respawned.push(id);
  }
  return {ok:true,respawned};
 }
 disconnect(id){
  const s=this.#state(id);if(!s)return false;
  this.#movement.disconnect(id);this.#sessions.delete(id);s.sessionId=null;return true;
 }
}
