import {createJarrellDryRegionPrototype} from './jarrell-dry-region-prototype.mjs';
import {ServerGroundMovement} from './server-ground-movement.mjs';

// Private authored Expedition Camp approach only. Never import into PresenceRoom.
// The caller must authenticate session/account and drive ticks on the server.
// No complete collider review or live station/fire/inventory authorization.
const ROOM='preview-crafting-fixture', CAMP=Object.freeze({x:-200,z:-170}), RANGE=5;
const idOk=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(v);
const deny=reason=>({ok:false,reason});
export function createPrivateExpeditionStation({roomId,clock,resolveOwner,resolveLitFire}={}){
 if(roomId!==ROOM||typeof clock!=='function'||typeof resolveOwner!=='function'||typeof resolveLitFire!=='function')
  throw Error('Explicit private station authority required');
 const map=createJarrellDryRegionPrototype({roomId:ROOM,bounds:{minX:-212,maxX:-188,minZ:-182,maxZ:-158}});
 const movement=new ServerGroundMovement({roomId:ROOM,clock,spawn:{x:-207,z:-170},collision:map.collision,sampleWalkableGround:map.sampleWalkableGround});
 const accounts=new Map();
 function current(s){
  if(!idOk(s))return null;
  const p=resolveOwner(s,ROOM);
  return p?.sessionId===s&&p.roomId===ROOM&&idOk(p.accountId)?p.accountId:null;
 }
 function verified(s){const a=accounts.get(s);return a&&a===current(s)?a:null;}
 function join(s){
  const a=current(s);if(!a||accounts.has(s))return deny('unverified-station-owner');
  const r=movement.join(s);
  if(r.ok){if(current(s)!==a){movement.disconnect(s);return deny('unverified-station-owner');}accounts.set(s,a);}
  return r;
 }
 function input(s,p){
  if(!verified(s))return deny('unverified-station-owner');
  // GroundMovement accepts direction and sequence, never world coordinates.
  return movement.input(s,p);
 }
 function tick(){
  for(const s of accounts.keys())if(!verified(s)){movement.disconnect(s);accounts.delete(s);}
  return movement.tick();
 }
 function station(s,r){
  if(r!==ROOM)return null;
  const a=verified(s);if(!a)return null;
  const p=movement.trustedSnapshot(s,ROOM);
  if(!p||p.serverId!==s||p.roomId!==ROOM||Math.hypot(p.position.x-CAMP.x,p.position.z-CAMP.z)>=RANGE||verified(s)!==a)return null;
  return {sessionId:s,accountId:a,roomId:ROOM,station:'campfire',inRange:true};
 }
 // Separate lit resolver for cooking. Proximity alone is not a burning fire.
 // Trusted fire source must be independently bound to this camp, session and account.
 function resolveLitStation(s,r){
  const p=station(s,r);if(!p)return null;
  const f=resolveLitFire(s,ROOM),now=clock();
  if(!f||f.roomId!==ROOM||f.sessionId!==s||f.accountId!==p.accountId||f.siteId!=='expedition-camp'||
   f.lit!==true||!Number.isSafeInteger(now)||!Number.isSafeInteger(f.litAtMs)||!Number.isSafeInteger(f.expiresAtMs)||
   f.litAtMs<0||f.litAtMs>now||now>=f.expiresAtMs||verified(s)!==p.accountId||!station(s,r))return null;
  return p;
 }
 return Object.freeze({join,input,tick,disconnect:s=>{accounts.delete(s);return movement.disconnect(s);},
  suspendForDeath:s=>verified(s)?movement.suspendForDeath(s):false,
  resolveStation:station,resolveLitStation,reviewedForProduction:false});
}
