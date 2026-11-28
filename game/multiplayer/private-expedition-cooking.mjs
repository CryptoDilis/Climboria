import {createPrivateExpeditionStation} from './private-expedition-station.mjs';
import {createPrivateCampsiteRegistry} from './private-campsite-registry.mjs';
import {createPrivateCraftingLedger} from './private-crafting-ledger.mjs';

// Private authored approach fixture only. The forest-camp ledger slot is
// explicitly mapped to Expedition Camp for this fixture, not a public land claim.
const ROOM='preview-crafting-fixture', CAMP_ROOM='preview-campsite-fixture', SLOT='forest-camp';
export function createPrivateExpeditionCooking({roomId,storage,clock,resolveOwner}={}){
 if(roomId!==ROOM||typeof storage?.transaction!=='function'||typeof resolveOwner!=='function')throw Error('Explicit private expedition cooking authority required');
 const station=createPrivateExpeditionStation({roomId,clock,resolveOwner,resolveLitFire:()=>null});
 function placement(s,slot,r){
  const p=station.resolveStation(s,ROOM);
  if(!p||slot!==SLOT||r!==CAMP_ROOM)return null;
  const owner=resolveOwner(s,CAMP_ROOM);
  if(owner?.sessionId!==s||owner.roomId!==CAMP_ROOM||owner.accountId!==p.accountId)return null;
  return {...owner,slot,inRange:true,grounded:true,clear:true,inCombat:false};
 }
 // Combat is absent from the bounded private movement fixture. No claim of
 // safe public geometry, combat state, or authenticated production transport.
 const craft=createPrivateCraftingLedger({roomId,storage,resolveOwner,resolveStation:station.resolveStation,
  observeCookingFire:(tx,s,a)=>camp.observeCookingFire(tx,s,a,SLOT)});
 const camp=createPrivateCampsiteRegistry({roomId:CAMP_ROOM,storage,clock,resolveOwner,resolvePlacement:placement,planCampfireRefuel:craft.planCampfireRefuel});
 return Object.freeze({join:station.join,input:station.input,tick:station.tick,disconnect:station.disconnect,suspendForDeath:station.suspendForDeath,
  inspectCamp:camp.inspect,inspectStock:craft.inspect,provision:craft.provision,
  place:(s,r)=>camp.place(s,SLOT,r),ignite:(s,r)=>camp.ignite(s,SLOT,r),extinguish:(s,r)=>camp.extinguish(s,SLOT,r),
  refuel:(s,c,i)=>camp.refuel(s,SLOT,c,i),cook:(s,r)=>craft.craft(s,'cooked-fish',r),reviewedForProduction:false});
}
