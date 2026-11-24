/**
 * Pre-release, isolated server-owned GROUNDED walking only.
 * Caller must authenticate socket identity and supply independently reviewed
 * walkable ground + complete collision coverage for the selected room.
 * A terrain height sample alone is NOT a reviewed walkability provider.
 * No live Worker integration, jump, swimming, sprint, dynamic collision,
 * combat, inventory or financial state. Coordinates are feet-space.
 */
const WALK_SPEED=9,MAX_TICK_MS=100,INPUT_TTL_MS=250,STEP=.2,MAX_GRADE=1;
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
  return {serverId:id,roomId:this.#roomId,position:{...p.position},observedAtMs:p.observedAtMs};
 }
 // Only an authenticated server caller may supply the session ID.
 // No packet-selected spawn, time, health or coordinate accepted.
 join(id){
  if(!validId(id)||this.#players.has(id)||this.#players.size>=32)return deny('invalid-session');
  const now=this.#clock();
  if(!time(now)||now<this.#lastTick)return deny('invalid-server-time');
  const position=this.#point(this.#spawn.x,this.#spawn.z);
  if(!position||!this.#clear(position,position))return deny('unverified-spawn');
  const p={position,observedAtMs:now,joinedAt:now,sequence:-1,input:{x:0,z:0,at:now}};
  this.#players.set(id,p);
  return {ok:true,snapshot:this.#snapshot(id,p)};
 }
 // Input is just a bounded direction and monotonic sequence. Never moves
 // the player itself; only the server scheduler may call tick().
 input(id,packet){
  const p=this.#players.get(id),now=this.#clock();
  if(!p)return deny('unknown-session');
  if(!time(now)||now<this.#lastTick||now<p.input.at)return deny('invalid-server-time');
  const {x,z,sequence}=packet??{};
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1||Math.abs(z)>1||
     !time(sequence)||sequence<=p.sequence)return deny('invalid-or-replayed-input');
  const divisor=Math.max(1,Math.hypot(x,z));
  p.sequence=sequence;p.input={x:x/divisor,z:z/divisor,at:now};
  return {ok:true};
 }
 tick(){
  const now=this.#clock(),prior=this.#lastTick;
  if(!time(now)||now<prior)return deny('invalid-server-time');
  if(now===prior)return {ok:true,updated:0};
  this.#lastTick=now;
  let updated=0;
  for(const p of this.#players.values()){
   if(now<p.observedAtMs||now<p.input.at)continue;
   const start=this.#point(p.position.x,p.position.z);
   if(!start||Math.abs(start.y-p.position.y)>1e-6||!this.#clear(start,start))continue;
   const elapsed=Math.max(0,Math.min(now, p.input.at+INPUT_TTL_MS)-Math.max(prior,now-MAX_TICK_MS,p.input.at,p.joinedAt));
   const dx=p.input.x*WALK_SPEED*elapsed/1000,dz=p.input.z*WALK_SPEED*elapsed/1000;
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
 disconnect(id){return this.#players.delete(id)}
}
