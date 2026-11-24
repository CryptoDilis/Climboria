/**
 * Game-only deterministic terrain height reference from game/play.html.
 * Exact source sections are verified by CI. No live Worker integration.
 * A height sample does NOT establish a navigable surface, ceiling, collider
 * coverage, grounded player state, swimming physics or combat authority.
 */
const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h)};
const vn=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx*=fx*(3-2*fx);fy*=fy*(3-2*fy);
 const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy};
const fbm=(x,y,o=4)=>{let s=0,a=.5;for(let i=0;i<o;i++){s+=a*vn(x,y);x=x*2.03+17;y=y*2.03+5;a*=.5}return s};
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
/* ---------- world definition ---------- */
const POI={sanct:{x:0,z:-90,r:60},park:{x:-170,z:90,r:75},camp:{x:-200,z:-170,r:50},cave:{x:-760,z:-520,r:34},summit:{x:640,z:-620,r:0}};
const RICE={x:560,z:330};
let caveG=null;
// Explicit water bodies share the rendered water plane (Y=0). Freshwater basins
// are carved into terrain below; their query bounds drive swimming and tests.
const WATER_BODIES=[
 {id:'woodland_pond',name:'Woodland Pond',kind:'freshwater',x:-360,z:230,radius:48,surfaceY:0,depth:3.2},
 {id:'moonpool',name:'Moonpool',kind:'freshwater',x:390,z:-260,radius:42,surfaceY:0,depth:3.2},
 {id:'sanctuary_lake',name:'Sanctuary Lake',kind:'freshwater',x:190,z:80,radius:56,surfaceY:0,depth:3.2},
 {id:'long_river',name:'The Long River',kind:'river',surfaceY:0,depth:3.2},
 {id:'open_sea',name:'Open Sea',kind:'ocean',surfaceY:0,depth:26}
];
const freshwaterMask=(x,z)=>WATER_BODIES.filter(b=>b.kind==='freshwater').reduce((m,b)=>Math.max(m,1-ss(b.radius*.62,b.radius,Math.hypot(x-b.x,z-b.z))),0);
const rx=z=>160+90*Math.sin(z*.0042)+45*Math.sin(z*.011+2);
const desF=(x,z)=>ss(650,1000,z+(fbm(x*.002,z*.002,2)-.5)*200);
const fd=(x,z)=>fbm(x*.006+7,z*.006-3,3);
function rawH(x,z){
 const d=Math.hypot(x,z);let h=4+fbm(x*.004,z*.004,4)*14;
 const mN=ss(.52,.72,fbm(x*.0005+9,z*.0005-4,3))*ss(300,650,d),ring=Math.exp(-Math.pow((d-1150)/260,2));
 const rv=Math.abs(x-rx(z)),sea=ss(-900,-1180,x+(fbm(x*.002,z*.002,3)-.5)*260);
 const m=Math.max(mN,ring*ss(110,300,rv))*(1-sea)*(1-desF(x,z)*.85);
 const rid=1-Math.abs(fbm(x*.0016+3,z*.0016+7,5)*2-1);
 h+=m*(40+Math.pow(rid,2.2)*270);
 const ds=Math.hypot(x-POI.summit.x,z-POI.summit.z);
 h+=230*Math.exp(-ds*ds/24200)*(.8+.4*fbm(x*.02,z*.02,3));
 const des=desF(x,z)*(1-m);
 h+=des*(8+9*Math.sin(x*.012+fbm(x*.01,z*.01,2)*6)*Math.cos(z*.009)+6*fbm(x*.02,z*.02,3));
 const rw=1-ss(190,300,Math.hypot(x-RICE.x,z-RICE.z));
 if(rw>0)h=mix(h,Math.round(h/1.6)*1.6,rw);
 const W=13+7*Math.sin(z*.003),rc=(1-ss(W,W*3.2,rv))*(1-mN)*(1-sea);
 h=mix(h,-3.2,Math.pow(rc,.8));
 const lake=freshwaterMask(x,z);
 h=mix(h,-3.2,Math.pow(lake,.8));
 return mix(h,-26,sea);
}
['sanct','park','camp','cave'].forEach(k=>{const p=POI[k];p.h=Math.max(rawH(p.x,p.z),k=='cave'?-99:4)});
const FLAT=['sanct','park','camp','cave'];
function caveApproachMask(x,z){
 // Cut a broad, gently blended exterior apron into the mountain slope.
 // The cave portal faces local +Z; the approach runs along local -Z.
 const p=POI.cave,angle=Math.atan2(-p.x,-p.z),cs=Math.cos(angle),sn=Math.sin(angle);
 const dx=x-p.x,dz=z-p.z,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
 const across=1-ss(26,52,Math.abs(lx));
 const along=ss(-145,-98,lz)*(1-ss(-12,9,lz));
 return across*along;
}
/* A genuine underground coastal passage exits the northern cave chamber.
   The terrain and movement floor use the same local-space sloped centerline.
   Open-air coastline begins beyond the rock roof; no teleport or painted exit. */
const CAVE_COASTAL_ROUTE={localX:-55,startZ:-50,exitZ:-313,exitFloor:3,walkHalfWidth:5.6};
function caveLocalCoords(x,z){
 const p=POI.cave,yaw=Math.atan2(-p.x,-p.z),cs=Math.cos(yaw),sn=Math.sin(yaw);
 const dx=x-p.x,dz=z-p.z;
 return {x:dx*cs-dz*sn,z:dx*sn+dz*cs};
}
function caveCoastalFloorAt(localZ){
 const r=CAVE_COASTAL_ROUTE;
 return mix(POI.cave.h,r.exitFloor,Math.max(0,Math.min(1,(r.startZ-localZ)/(r.startZ-r.exitZ))));
}
function caveCoastalTerrainAt(x,z){
 const local=caveLocalCoords(x,z),r=CAVE_COASTAL_ROUTE;
 // The 5m terrain triangles must remain flat across the full player-capsule
 // sweep; narrow masks sampled the surrounding cliff and created false walls.
 const cross=1-ss(r.walkHalfWidth+2.9,r.walkHalfWidth+8.4,Math.abs(local.x-r.localX));
 // Fully flatten the existing north-chamber threshold before the descent:
 // leaving the blend at -50 previously made a 6.9-grade upward seam at -50.08.
 const start=ss(-38,-43,local.z),end=1-ss(r.exitZ,r.exitZ-20,local.z);
 return {local,mask:cross*start*end,floor:caveCoastalFloorAt(local.z)};
}
function caveNorthChamberTerrainMask(localX,localZ){
 // Interior chambers must sit BELOW the mountain, not poke into the exterior.
 const rooms=[[-63,-41,-20,5],[-69,-41,-51,-29],[-60,-50,-30,-18],[-43,-29,-12,-4]];
 let weight=0;
 for(const [minX,maxX,minZ,maxZ] of rooms){
  const edge=Math.min(localX-minX,maxX-localX,localZ-minZ,maxZ-localZ);
  weight=Math.max(weight,ss(-2,2,edge));
 }
 return weight;
}
function heightAt(x,z){
 let h=rawH(x,z);
 for(const k of FLAT){const p=POI[k],d=Math.hypot(x-p.x,z-p.z);if(d<p.r*1.7)h=mix(h,p.h,1-ss(p.r*.8,p.r*1.7,d))}
 // Keep the walk-in corridor at cave-base elevation so the surrounding
 // mountain ridge cannot form a high brown wall across the portal approach.
 const apron=caveApproachMask(x,z);
 if(apron>0)h=mix(h,POI.cave.h,apron);
 const coast=caveCoastalTerrainAt(x,z);
 if(coast.mask>0)h=mix(h,coast.floor,coast.mask);
 const interior=caveNorthChamberTerrainMask(coast.local.x,coast.local.z);
 if(interior>0)h=mix(h,POI.cave.h,interior);
 return h;
}
// Match the rendered terrain's 5-unit triangle grid exactly. Sampling the smooth
// procedural function between vertices can place the hero below the visible mesh.
const TERRAIN_STEP=5;
// Mirror the authored cave group initialization without Three.js.
POI.cave.h=heightAt(POI.cave.x,POI.cave.z);
caveG={position:{x:POI.cave.x,y:POI.cave.h,z:POI.cave.z},rotation:{y:Math.atan2(-POI.cave.x,-POI.cave.z)}};
function caveFloorHeightAt(x,z){
 if(!caveG)return null;
 const dx=x-caveG.position.x,dz=z-caveG.position.z,ry=caveG.rotation.y,cs=Math.cos(ry),sn=Math.sin(ry);
 const lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
 const floors=[
  [8,22,21,29], [22,40,16,34], [25,35,40,45], [15,25,37,47],
  [-42,-30,-11,-5], [-62,-42,-20,5], [-58,-52,-30,-20], [-68,-42,-50,-30],
  [40,48,22,28], [48,54,20,30], [48,54,30,36], [48,60,36,48]
 ];
 return floors.some(([minX,maxX,minZ,maxZ])=>lx>=minX&&lx<=maxX&&lz>=minZ&&lz<=maxZ)?caveG.position.y+.08:null;
}
function groundAt(x,z){
 const caveFloor=caveFloorHeightAt(x,z);
 if(caveFloor!==null)return caveFloor;
 const gx=x/TERRAIN_STEP,gz=z/TERRAIN_STEP,ix=Math.floor(gx),iz=Math.floor(gz);
 const u=gx-ix,v=gz-iz;
 const h00=heightAt(ix*TERRAIN_STEP,iz*TERRAIN_STEP);
 const h10=heightAt((ix+1)*TERRAIN_STEP,iz*TERRAIN_STEP);
 const h01=heightAt(ix*TERRAIN_STEP,(iz+1)*TERRAIN_STEP);
 const h11=heightAt((ix+1)*TERRAIN_STEP,(iz+1)*TERRAIN_STEP);
 return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}
const valid=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<50000&&Math.abs(z)<50000;
export function sampleJarrellTerrain(x,z){return valid(x,z)?heightAt(x,z):null}
export function sampleJarrellGround(x,z){return valid(x,z)?groundAt(x,z):null}
export function sampleJarrellCaveFloor(x,z){return valid(x,z)?caveFloorHeightAt(x,z):null}
