/**
 * Exact authored continuous cave ceiling plates, in cave-local coordinates.
 * NOT the complete cave mesh: irregular boulders, stalactites, cladding and
 * terrain are separate categories. No production authority or live wiring.
 */
import {JARRELL_CAVE_ORIGIN as origin,CAVE_COASTAL_ROUTE as route} from './jarrell-cave-wall-inventory.mjs';
import {sampleJarrellTerrain} from './jarrell-terrain-reference.mjs';
const base=sampleJarrellTerrain(origin.x,origin.z);
const yaw=Math.atan2(-origin.x,-origin.z),cs=Math.cos(yaw),sn=Math.sin(yaw);
const grade=(base-route.exitFloor)/(route.startZ-route.exitZ);
const tilt=-Math.atan(grade);
const plates=Object.freeze([
 {label:'grotto-ceiling',x:20,y:7.05,z:42,width:10,height:.3,depth:10,tilt:0},
 {label:'geode-ceiling',x:54,y:7.05,z:42,width:12,height:.3,depth:12,tilt:0},
 {label:'main-continuous-ceiling',x:6,y:9.15,z:16,width:78,height:1.25,depth:66,tilt:0},
 {label:'western-continuous-ceiling',x:-51,y:9.15,z:-17,width:57,height:1.25,depth:92,tilt:0},
 {label:'coastal-continuous-ceiling',x:route.localX,y:(base+route.exitFloor)/2-base+8.65,z:(route.startZ+route.exitZ)/2,
  width:13.7,height:1.55,depth:Math.hypot(route.startZ-route.exitZ,base-route.exitFloor),tilt}
].map(Object.freeze));
export function authoredJarrellCeilingPlates(){return plates.map(p=>({...p}))}
const finite=n=>Number.isFinite(n)&&Math.abs(n)<50000;
const point=p=>p&&['x','y','z'].every(k=>finite(p[k]));
function local(p){
 const dx=p.x-origin.x,dz=p.z-origin.z;
 return {x:dx*cs-dz*sn,y:p.y-base,z:dx*sn+dz*cs};
}
function relative(p,plate){
 const x=p.x-plate.x,y=p.y-plate.y,z=p.z-plate.z,c=Math.cos(plate.tilt),s=Math.sin(plate.tilt);
 return {x,y:y*c+z*s,z:-y*s+z*c};
}
function intersects(a,b,half){
 let lo=0,hi=1;
 for(const k of ['x','y','z']){
  const d=b[k]-a[k],h=half[k]+1e-8;
  if(d===0){if(Math.abs(a[k])>h)return false;continue}
  let enter=(-h-a[k])/d,exit=(h-a[k])/d;
  if(enter>exit)[enter,exit]=[exit,enter];
  lo=Math.max(lo,enter);hi=Math.min(hi,exit);
  if(lo>hi)return false;
 }
 return true;
}
/**
 * Conservative swept player box: transform the center-line into each OBB.
 * Inflate half-extents by projections of the horizontal circle and vertical
 * half-height. The resulting Minkowski bounding box is conservative, not
 * an exact capsule-vs-mesh test. Closed contact is blocked.
 */
export function checkJarrellCeilingSweep(a,b,{radius=.4,height=1.9}={}){
 if(!point(a)||!point(b)||!finite(radius)||radius<0||radius>1||
    !finite(height)||height<0||height>3)return {ok:false,reason:'invalid-ceiling-sweep'};
 const start=local({...a,y:a.y+height/2}),end=local({...b,y:b.y+height/2});
 for(const p of plates){
  const c=Math.abs(Math.cos(p.tilt)),s=Math.abs(Math.sin(p.tilt));
  const half={x:p.width/2+radius,y:p.height/2+c*height/2+s*radius,z:p.depth/2+s*height/2+c*radius};
  if(intersects(relative(start,p),relative(end,p),half))return {ok:false,reason:'cave-ceiling',label:p.label};
 }
 return {ok:true}; // ceiling plate category only
}
