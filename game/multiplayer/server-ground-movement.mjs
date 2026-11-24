/**
 * Pre-release, isolated server-owned GROUNDED walking and sprint.
 * Caller must authenticate socket identity and supply independently reviewed
 * walkable ground + complete collision coverage for the selected room.
 * A terrain height sample alone is NOT a reviewed walkability provider.
 * No live Worker integration, jump, swimming, dynamic collision,
 * combat, inventory or financial state. Coordinates are feet-space.
 */
const WALK_SPEED=9,SPRINT_SPEED=22,MAX_TICK_MS=100,INPUT_TTL_MS=250,STEP=.2,MAX_GRADE=1;
// Integer milli-stamina; same base tuning as game/play.html.
const MAX_STAMINA=200000,RESTART_STAMINA=40000,DRAIN_PER_MS=12,RECOVERY_PER_MS=8;
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{16,100}$/.test(id);
const coord=n=>Number.isFinite(n)&&Math.abs(n)<50000;
const time=n=>Number.isSafeInteger(n)&&n>=0;
const deny=reason=>({ok:false,reason});
export class ServerGroundMovement {
 #players=new Map();
 #lastTick;
 #roomId;
 #clock;
 #spawn;
 #ground;
 #collision;
 constructor({roomId,clock=()=>Date.now(),spawn,sampleWalkableGround,collision}={}){
  if(typeof roomId!=='string'||!roomId||typeof clock!=='function'||
     !coord(spawn?.x)||!coord(spawn?.z)||typeof sampleWalkableGround!=='function'||
     collision?.roomId!==roomId||typeof collision.clearMovement!=='function')
   throw Error('Explicit reviewed server walkability and collision region required');
  this.#roomId=roomId;this.#clock=clock;
  this.#spawn={x:spawn.x,z:spawn.z};this.#ground=sampleWalkableGround;this.#collision=collision;
  this.#lastTick=clock();
  if(!time(this.#lastTick))throw Error('Invalid server clock');
 }
 #point(x,z){
  if(!coord(x)||!coord(z))return null;
  try{
   const y=this.#ground(x,z,this.#roomId);
   return coord(y)?{x,y,z}:null;
  }catch{return null}
 }
 #clear(a,b){
  try{return this.#collision.clearMovement(a,b,this.#roomId)===true}catch{return false}
 }
 #snapshot(id,p){
  return {serverId:id,roomId:this.#roomId,position:{...p.position},observedAtMs:p.observedAtMs,stamina:p.stamina/1000,sprintExhausted:p.exhausted};
 }
 // Only an authenticated server caller may supply the session ID.
 // No packet-selected spawn, time, health or coordinate accepted.
 join(id){
  if(!validId(id)||this.#players.has(id)||this.#players.size>=32)return deny('invalid-session');
  const now=this.#clock();
  if(!time(now)||now<this.#lastTick)return deny('invalid-server-time');
  const position=this.#point(this.#spawn.x,this.#spawn.z);
  if(!position||!this.#clear(position,position))return deny('unverified-spawn');
  const p={position,observedAtMs:now,joinedAt:now,sequence:-1,downed:false,stamina:MAX_STAMINA,exhausted:false,input:{x:0,z:0,sprint:false,at:now}};
  this.#players.set(id,p);
  return {ok:true,snapshot:this.#snapshot(id,p)};
 }
 // Input is just a bounded direction and monotonic sequence. Never moves
 // the player itself; only the server scheduler may call tick().
 input(id,packet){
  const p=this.#players.get(id),now=this.#clock();
  if(!p)return deny('unknown-session');
  if(p.downed)return deny('fighter-downed');
  if(!time(now)||now<this.#lastTick||now<p.input.at)return deny('invalid-server-time');
  const {x,z,sequence,sprint=false}=packet??{};
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1||Math.abs(z)>1||
     typeof sprint!=='boolean'||!time(sequence)||sequence<=p.sequence)return deny('invalid-or-replayed-input');
  const divisor=Math.max(1,Math.hypot(x,z));
  p.sequence=sequence;p.input={x:x/divisor,z:z/divisor,sprint,at:now};
  return {ok:true};
 }
 tick(){
  const now=this.#clock(),prior=this.#lastTick;
  if(!time(now)||now<prior)return deny('invalid-server-time');
  if(now===prior)return {ok:true,updated:0};
  this.#lastTick=now;
  let updated=0;
  for(const p of this.#players.values()){
   if(p.downed||now<p.observedAtMs||now<p.input.at)continue;
   const start=this.#point(p.position.x,p.position.z);
   if(!start||Math.abs(start.y-p.position.y)>1e-6||!this.#clear(start,start))continue;
   const elapsed=Math.max(0,Math.min(now, p.input.at+INPUT_TTL_MS)-Math.max(prior,now-MAX_TICK_MS,p.input.at,p.joinedAt));
   const tickMs=Math.max(0,now-Math.max(prior,now-MAX_TICK_MS,p.joinedAt));
   const wantsSprint=p.input.sprint&&Math.hypot(p.input.x,p.input.z)>0;
   // Charge sprint intent even if blocked; packets cannot mint movement or
   // stamina. Exhausted players recover to the restart threshold before
   // sprinting again. Delayed scheduler ticks grant no catch-up credit.
   const sprintMs=wantsSprint&&!p.exhausted?Math.min(elapsed,Math.ceil(p.stamina/DRAIN_PER_MS)):0;
   p.stamina=Math.max(0,p.stamina-sprintMs*DRAIN_PER_MS);
   if(p.stamina===0)p.exhausted=true;
   p.stamina=Math.min(MAX_STAMINA,p.stamina+(tickMs-sprintMs)*RECOVERY_PER_MS);
   if(p.exhausted&&p.stamina>=RESTART_STAMINA)p.exhausted=false;
   const travel=(sprintMs*SPRINT_SPEED+(elapsed-sprintMs)*WALK_SPEED)/1000;
   const dx=p.input.x*travel,dz=p.input.z*travel;
   const distance=Math.hypot(dx,dz),steps=Math.ceil(distance/STEP);
   let next=start;
   // Reviewed providers must cover the body footprint as well as the center.
   // Substeps are conservative approximation; real map QA still required.
   for(let i=1;i<=steps;i++){
    const candidate=this.#point(start.x+dx*i/steps,start.z+dz*i/steps);
    if(!candidate||Math.abs(candidate.y-next.y)>MAX_GRADE*distance/steps+1e-8||
       !this.#clear(next,candidate))break;
    next=candidate;
   }
   p.position=next;p.observedAtMs=now;updated++;
  }
  return {ok:true,updated};
 }
 snapshot(id,roomId){
  const p=this.#players.get(id);
  return roomId===this.#roomId&&p?this.#snapshot(id,p):null;
 }
 // Server lifecycle hooks: never route these directly from client packets.
 suspendForDeath(id){
  const p=this.#players.get(id);if(!p)return false;
  p.downed=true;p.input={x:0,z:0,sprint:false,at:p.observedAtMs};return true;
 }
 respawnAtServerSpawn(id){
  const p=this.#players.get(id),now=this.#clock();
  if(!p||!p.downed||!time(now)||now<this.#lastTick||now<p.observedAtMs)return false;
  const position=this.#point(this.#spawn.x,this.#spawn.z);
  if(!position||!this.#clear(position,position))return false;
  p.position=position;p.observedAtMs=now;p.joinedAt=now;p.downed=false;
  p.stamina=MAX_STAMINA;p.exhausted=false;
  p.input={x:0,z:0,sprint:false,at:now}; // Keep input sequence across death.
  return true;
 }
 disconnect(id){return this.#players.delete(id)}
}
