/**
 * Game-only authored cave-wall inventory, extracted from game/play.html.
 * Partial X/Z geometry ONLY: not complete terrain, wall heights, solids,
 * or server authority. Coastal segments also require floor-height gating.
 * CI checks source parity; unknown coverage must still deny real combat.
 */
export const JARRELL_CAVE_ORIGIN=Object.freeze({x:-760,z:-520});
export const JARRELL_SANCTUARY_MAP=Object.freeze({x:0,z:-90,radius:60});
export const CAVE_COASTAL_ROUTE=Object.freeze({localX:-55,startZ:-50,exitZ:-313,exitFloor:3,walkHalfWidth:5.6});
export const CAVE_WALL_THICKNESS=1.1;
export const CAVE_WALLS_LOCAL=Object.freeze([
 [9,21,22,21,"side-passage-south"],
 [9,29,22,29,"side-passage-north"],
 [22,16,40,16,"side-room-south"],
 [40,16,40,22,"side-room-east-south"],
 [40,28,40,34,"side-room-east-north"],
 [22,34,27,34,"side-room-north-west"],
 [33,34,40,34,"side-room-north-east"],
 [22,16,22,21,"side-room-west-lower"],
 [22,29,22,34,"side-room-west-upper"],
 [27,34,27,40,"annex-passage-west"],
 [33,34,33,40,"annex-passage-east"],
 [25,40,27,40,"annex-room-south-west"],
 [33,40,35,40,"annex-room-south-east"],
 [35,40,35,45,"annex-room-east"],
 [29,45,35,45,"annex-room-north-east"],
 [25,37,25,40,"grotto-room-east-south"],
 [25,45,25,47,"grotto-room-east-north"],
 [15,37,25,37,"grotto-room-south"],
 [25,47,15,47,"grotto-room-north"],
 [15,47,15,37,"grotto-room-west"],
 [-30,-11,-42,-11,"west-passage-south"],
 [-30,-5,-42,-5,"west-passage-north"],
 [-42,-20,-42,-11,"west-room-east-south"],
 [-42,-5,-42,5,"west-room-east-north"],
 [-42,-20,-62,-20,"west-room-north"],
 [-62,-20,-62,5,"west-room-west"],
 [-62,5,-42,5,"west-room-south"],
 [-58,-20,-58,-30,"north-maze-passage-west"],
 [-52,-20,-52,-30,"north-maze-passage-east"],
 [-68,-30,-58,-30,"north-chamber-south-west"],
 [-52,-30,-42,-30,"north-chamber-south-east"],
 [-68,-30,-68,-50,"north-chamber-west"],
 [-68,-50,-58,-50,"north-chamber-north-west"],
 [-52,-50,-42,-50,"north-chamber-north-east"],
 [-42,-50,-42,-30,"north-chamber-east"],
 [40,22,48,22,"east-branch-south"],
 [40,28,48,28,"east-branch-north"],
 [48,20,48,22,"east-room-entry-south"],
 [48,28,48,30,"east-room-entry-north"],
 [48,20,54,20,"east-room-south"],
 [54,20,54,30,"east-room-east"],
 [48,30,48,36,"geode-passage-west"],
 [54,30,54,36,"geode-passage-east"],
 [54,36,60,36,"geode-chamber-south"],
 [60,36,60,48,"geode-chamber-east"],
 [60,48,48,48,"geode-chamber-north"],
 [48,48,48,42,"geode-chamber-west"]
].map(Object.freeze));
const yaw=Math.atan2(-JARRELL_CAVE_ORIGIN.x,-JARRELL_CAVE_ORIGIN.z);
const cs=Math.cos(yaw),sn=Math.sin(yaw);
export function caveLocalToWorld(x,z){
 return {x:JARRELL_CAVE_ORIGIN.x+x*cs+z*sn,z:JARRELL_CAVE_ORIGIN.z-x*sn+z*cs};
}
export function authoredCaveWallSegments(){
 const regular=CAVE_WALLS_LOCAL.map(([x1,z1,x2,z2,label])=>({
  a:caveLocalToWorld(x1,z1),b:caveLocalToWorld(x2,z2),label,thickness:CAVE_WALL_THICKNESS,coastal:false
 }));
 const r=CAVE_COASTAL_ROUTE;
 const coastal=[r.localX-6.6,r.localX+6.6].map(x=>({
  a:caveLocalToWorld(x,r.startZ),b:caveLocalToWorld(x,r.exitZ+6),
  label:x<r.localX?'coastal-tunnel-west':'coastal-tunnel-east',thickness:1.4,coastal:true
 }));
 return [...regular,...coastal];
}
