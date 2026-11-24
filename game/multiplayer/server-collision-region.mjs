/**
 * Game-only collision geometry for a future server-owned map.
 * No default map, live Worker integration, or client-position authority.
 * Bounds describe ONLY a server-reviewed fully covered region; do not
 * declare the whole Jarrell map covered before exporting every collider.
 * Closed AABB contacts are conservatively blocked.
 */
const AXES=['x','y','z'];
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<50000;
const point=p=>p&&AXES.every(k=>finite(p[k]));
const copy=p=>Object.freeze({x:p.x,y:p.y,z:p.z});
function box(raw){
 if(!point(raw?.min)||!point(raw?.max)||AXES.some(k=>raw.min[k]>=raw.max[k]))
  throw Error('Invalid server collision bounds');
 return Object.freeze({min:copy(raw.min),max:copy(raw.max)});
}
function within(p,b){
 return point(p)&&AXES.every(k=>p[k]>=b.min[k]&&p[k]<=b.max[k]);
}
// Exact segment vs closed AABB, including a zero-length point and tangency.
function intersects(a,b,bounds){
 let enter=0,exit=1;
 for(const k of AXES){
  const d=b[k]-a[k];
  if(d===0){
   if(a[k]<bounds.min[k]||a[k]>bounds.max[k])return false;
   continue;
  }
  let lo=(bounds.min[k]-a[k])/d,hi=(bounds.max[k]-a[k])/d;
  if(lo>hi)[lo,hi]=[hi,lo];
  enter=Math.max(enter,lo);exit=Math.min(exit,hi);
  if(enter>exit)return false;
 }
 return true;
}
export function createServerCollisionRegion({roomId,coverage,solids}={}){
 if(typeof roomId!=='string'||!roomId||!Array.isArray(solids)||solids.length>4096)
  throw Error('Explicit server collision region required');
 const region=box(coverage);
 const obstacles=solids.map(box);
 if(obstacles.some(b=>!within(b.min,region)||!within(b.max,region)))
  throw Error('Collider exceeds reviewed coverage');
 const covered=(a,b,shrink={x:0,y:0,z:0},head=0)=>point(a)&&point(b)&&
  [a,b].every(p=>AXES.every(k=>p[k]>=region.min[k]+shrink[k]&&
    p[k]<=region.max[k]-shrink[k]-(k==='y'?head:0)));
 function clearPath(a,b,id){
  if(id!==roomId||!covered(a,b))return false;
  return !obstacles.some(s=>intersects(a,b,s));
 }
 // Feet-space swept conservative rectangular player volume. Height is
 // above feet; radius expands X/Z. Floor contact is represented by the
 // region minimum, not a solid that overlaps the player's feet.
 function clearMovement(a,b,id,{radius=.4,height=1.9}={}){
  if(id!==roomId||!finite(radius)||radius<=0||radius>1||
     !finite(height)||height<=0||height>3||
     !covered(a,b,{x:radius,y:0,z:radius},height))return false;
  return !obstacles.some(s=>intersects(a,b,{
   min:{x:s.min.x-radius,y:s.min.y-height,z:s.min.z-radius},
   max:{x:s.max.x+radius,y:s.max.y,z:s.max.z+radius}
  }));
 }
 return Object.freeze({roomId,clearPath,clearMovement});
}
