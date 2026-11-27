/**
 * Offline/private authored-map combat candidate. Not imported by a Worker.
 * The fixed identity partitions durable checkpoints from the synthetic room
 * and public presence. No browser-selected region, spawn or terrain provider.
 * This is not proof of full map coverage, nor approval for deployment.
 */
import {createJarrellDryRegionPrototype} from './jarrell-dry-region-prototype.mjs';
import {createTransactionalRoomPrototype} from './transactional-room-prototype.mjs';
export const JARRELL_PRIVATE_COMBAT_FIXTURE=Object.freeze({
 roomId:'preview-jarrell-camp-v1',
 bounds:Object.freeze({minX:-220,maxX:-180,minZ:-190,maxZ:-150}),
 spawn:Object.freeze({x:-200,z:-170}),
 reviewedForProduction:false
});
export function createJarrellPrivateCombatFixture(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>!['storage','clock'].includes(k))||
    typeof options.storage?.transaction!=='function'||
    (options.clock!==undefined&&typeof options.clock!=='function'))
  throw Error('Fixed offline fixture requires transactional storage and optional server clock');
 const {roomId,bounds,spawn}=JARRELL_PRIVATE_COMBAT_FIXTURE;
 const map=createJarrellDryRegionPrototype({roomId,bounds});
 const y=map.sampleWalkableGround(spawn.x,spawn.z,roomId);
 const p={...spawn,y};
 if(!Number.isFinite(y)||map.collision.clearMovement(p,p,roomId)!==true)
  throw Error('Unverified private fixture spawn');
 return createTransactionalRoomPrototype({roomId,spawn,storage:options.storage,clock:options.clock,
  collision:map.collision,sampleWalkableGround:map.sampleWalkableGround});
}
