/**
 * Authored cave-wall swept collision, in feet-space.
 * This checks ONLY the 49 registered wall segments, not roofs, all rocks,
 * floor walkability or full map coverage. No production integration.
 * Ordinary walls retain browser's conservative all-height barrier.
 * Coastal walls follow the authored sloped floor band; clip the sweep
 * to times when the player body intersects that band (not endpoint only).
 */
import {authoredCaveWallSegments,JARRELL_CAVE_ORIGIN,CAVE_COASTAL_ROUTE} from './jarrell-cave-wall-inventory.mjs';
import {sampleJarrellTerrain} from './jarrell-terrain-reference.mjs';
const walls=authoredCaveWallSegments();
const route=CAVE_COASTAL_ROUTE;
const base=sampleJarrellTerrain(JARRELL_CAVE_ORIGIN.x,JARRELL_CAVE_ORIGIN.z);
const yaw=Math.atan2(-JARRELL_CAVE_ORIGIN.x,-JARRELL_CAVE_ORIGIN.z),cs=Math.cos(yaw),sn=Math.sin(yaw);
const valid=n=>Number.isFinite(n)&&Math.abs(n)<50000;
const point=p=>p&&['x','y','z'].every(k=>valid(p[k]));
const lerp=(a,b,t)=>a+(b-a)*t;
const localZ=p=>(p.x-JARRELL_CAVE_ORIGIN.x)*sn+(p.z-JARRELL_CAVE_ORIGIN.z)*cs;
const floor=z=>lerp(base,route.exitFloor,Math.max(0,Math.min(1,(route.startZ-z)/(route.startZ-route.exitZ))));
function distance(p,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
 const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;
 return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
function cross(a,b,c){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)}
function on(a,b,p){return p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.z>=Math.min(a.z,b.z)-1e-8&&p.z<=Math.max(a.z,b.z)+1e-8}
function segmentDistance(a,b,c,d){
 const q=cross(a,b,c),r=cross(a,b,d),s=cross(c,d,a),t=cross(c,d,b);
 if(((q>0&&r<0)||(q<0&&r>0))&&((s>0&&t<0)||(s<0&&t>0)))return 0;
 if((Math.abs(q)<1e-8&&on(a,b,c))||(Math.abs(r)<1e-8&&on(a,b,d))||
    (Math.abs(s)<1e-8&&on(c,d,a))||(Math.abs(t)<1e-8&&on(c,d,b)))return 0;
 return Math.min(distance(a,c,d),distance(b,c,d),distance(c,a,b),distance(d,a,b));
}
const at=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)});
// Intersect one linear inequality f(t)>=0 with the current interval.
function clip(lo,hi,fa,fb,a,b){
 if(fa<0&&fb<0)return null;
 if(fa>=0&&fb>=0)return [lo,hi];
 const t=lerp(a,b,fa/(fa-fb));
 if(fa<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
 return lo<=hi?[lo,hi]:null;
}
function coastalIntervals(a,b,height){
 const za=localZ(a),zb=localZ(b),cuts=[0,1];
 if(za!==zb)for(const z of [route.startZ,route.exitZ]){
  const t=(z-za)/(zb-za);if(t>0&&t<1)cuts.push(t);
 }
 cuts.sort((x,y)=>x-y);
 const intervals=[];
 for(let i=1;i<cuts.length;i++){
  const lo=cuts[i-1],hi=cuts[i],delta=t=>lerp(a.y,b.y,t)-floor(lerp(za,zb,t));
  const da=delta(lo),db=delta(hi);
  // Browser coastal wall band: floor-2 to floor+8.8. Server
  // conservatively includes the entire player height and closed contacts.
  const lower=clip(lo,hi,da+height+2,db+height+2,lo,hi);
  if(!lower)continue;
  const upper=clip(lower[0],lower[1],8.8-da,8.8-db,lo,hi);
  if(upper)intervals.push(upper);
 }
 return intervals;
}
export function checkJarrellCaveWallSweep(a,b,{radius=.4,height=1.9}={}){
 if(!point(a)||!point(b)||!valid(radius)||radius<0||radius>1||!valid(height)||height<0||height>3)
  return {ok:false,reason:'invalid-cave-sweep'};
 let coastal=null;
 for(const wall of walls){
  const limit=wall.thickness*.5+radius;
  if(segmentDistance(a,b,wall.a,wall.b)>limit+1e-8)continue;
  if(!wall.coastal)return {ok:false,reason:'cave-wall',label:wall.label};
  coastal??=coastalIntervals(a,b,height);
  for(const [lo,hi] of coastal)
   if(segmentDistance(at(a,b,lo),at(a,b,hi),wall.a,wall.b)<=limit+1e-8)
    return {ok:false,reason:'cave-wall',label:wall.label};
 }
 return {ok:true}; // wall category only, not authorization to move or attack
}
