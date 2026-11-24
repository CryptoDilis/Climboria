/**
 * Pre-release dry exterior region prototype, composed from authored browser
 * collision references. NOT a reviewed production map or a live Worker.
 * Explicit operator-owned bounds are required; no client chooses coverage.
 * Cave/coastal envelope, water, steep terrain, jump/swim and unreviewed mesh
 * surfaces are intentionally not supported. Independent region review and
 * actual browser QA are still required before combat can use this provider.
 */
import {authoredJarrellFixedColliders,authoredJarrellForestColliderCandidates,
 sampleJarrellStreamedColliders,sampleJarrellDryTerrainFootprint} from './jarrell-terrain-reference.mjs';
const R=.4,STEP=.2,CHUNK=200,MAX_SPAN=200,MAX_PATH=3;
const finite=n=>Number.isFinite(n)&&Math.abs(n)<50000;
const point=p=>p&&['x','y','z'].every(k=>finite(p[k]));
const segmentDistance=(a,b,p)=>{
 const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
 const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;
 return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
};
export function createJarrellDryRegionPrototype({roomId,bounds}={}){
 if(typeof roomId!=='string'||!roomId||roomId.length>128||
    !['minX','maxX','minZ','maxZ'].every(k=>finite(bounds?.[k]))||
    bounds.maxX-bounds.minX<=2*R||bounds.maxZ-bounds.minZ<=2*R||
    bounds.maxX-bounds.minX>MAX_SPAN||bounds.maxZ-bounds.minZ>MAX_SPAN)
  throw Error('Explicit bounded dry region required');
 const box=Object.freeze({minX:bounds.minX,maxX:bounds.maxX,minZ:bounds.minZ,maxZ:bounds.maxZ});
 const circles=[...authoredJarrellFixedColliders(),...authoredJarrellForestColliderCandidates()];
 // All neighboring chunks that could supply a circle intersecting the
 // region, even when the browser has not streamed that chunk yet.
 for(let x=Math.floor(box.minX/CHUNK)-1;x<=Math.floor(box.maxX/CHUNK)+1;x++)
  for(let z=Math.floor(box.minZ/CHUNK)-1;z<=Math.floor(box.maxZ/CHUNK)+1;z++){
   const rows=sampleJarrellStreamedColliders(x,z);
   if(!Array.isArray(rows))throw Error('Unavailable streamed collision chunk');
   circles.push(...rows);
  }
 if(circles.some(c=>!finite(c.x)||!finite(c.z)||!finite(c.r)||c.r<=0||c.r>32))
  throw Error('Invalid authored collider');
 const local=circles.filter(c=>c.x+c.r+R>=box.minX&&c.x-c.r-R<=box.maxX&&
   c.z+c.r+R>=box.minZ&&c.z-c.r-R<=box.maxZ);
 const inside=(x,z,r=R)=>finite(x)&&finite(z)&&x-r>=box.minX&&x+r<=box.maxX&&z-r>=box.minZ&&z+r<=box.maxZ;
 const blocked=(a,b,r)=>local.some(c=>segmentDistance(a,b,c)<=c.r+r+1e-8);
 function sampleWalkableGround(x,z,id){
  if(id!==roomId||!inside(x,z)||blocked({x,z},{x,z},R))return null;
  return sampleJarrellDryTerrainFootprint(x,z,{radius:R});
 }
 function clear(a,b,id,r,maxDistance){
  if(id!==roomId||!point(a)||!point(b)||!inside(a.x,a.z,r)||!inside(b.x,b.z,r))return false;
  const len=Math.hypot(b.x-a.x,b.z-a.z);
  if(len>maxDistance+1e-8||blocked(a,b,r))return false;
  const start=sampleWalkableGround(a.x,a.z,id),end=sampleWalkableGround(b.x,b.z,id);
  if(start===null||end===null||Math.abs(start-a.y)>1e-6||Math.abs(end-b.y)>1e-6)return false;
  const steps=Math.max(1,Math.ceil(len/STEP));
  // Each midpoint's expanded footprint covers the whole swept horizontal
  // subsegment, not merely its center/endpoints. Conservative near edges.
  const pad=r+len/(2*steps);
  for(let i=0;i<steps;i++){
   const t=(i+.5)/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   if(!inside(x,z,pad)||sampleJarrellDryTerrainFootprint(x,z,{radius:pad})===null)return false;
  }
  return true;
 }
 const collision=Object.freeze({
  roomId,
  clearMovement(a,b,id){return clear(a,b,id,R,.25)},
  // Feet-based melee category: deny a blocked/unknown ground corridor.
  // This is not complete 3D visibility or a reviewed attack authorization.
  clearPath(a,b,id){return clear(a,b,id,R,MAX_PATH)}
 });
 return Object.freeze({roomId,bounds:box,sampleWalkableGround,collision,reviewedForProduction:false});
}
