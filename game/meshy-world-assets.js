/* Climboria GAME ONLY — optional owner-approved Meshy scenery and guard models.
 * Fail-closed: manifest.enabled stays false until verified binary assets are imported.
 * The existing game, hero, collisions and chest system remain authoritative.
 */
(function(){
'use strict';
const BASE='../assets/game/new_optimized/';
const manifestURL=BASE+'manifest.json';
const allowed=/^[A-Za-z0-9_.() -]+\.glb$/;
const state={started:false,enabled:false,guardCount:0,decorations:0,failures:[],queued:0,loaded:0};
let opts=null,settings=null,decorations=[],lastTick=0,guardStarted=false,lastCamera=null;
function safeURL(name){return typeof name==='string'&&allowed.test(name)&&!name.includes('..')?BASE+encodeURIComponent(name):null;}
function groundPosition(anchor,dx,dz){
 const p=opts.POI;
 let center=p[anchor];
 if(anchor==='coast'){
  const cave=p.cave,theta=Math.atan2(-cave.x,-cave.z),s=Math.sin(theta),c=Math.cos(theta);
  center={x:cave.x-55*c+(-313)*s,z:cave.z+55*s+(-313)*c};
 }
 if(!center)return null;
 const x=center.x+(Number(dx)||0),z=center.z+(Number(dz)||0);
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 return {x,z};
}
function audit(){
 return {enabled:state.enabled,guardCount:state.guardCount,loadedDecorations:state.decorations,loadedFiles:decorations.filter(d=>!!d.mesh).map(d=>d.file),replacedTreeCount:decorations.filter(d=>d.mesh&&typeof d.restoreLegacy==='function').length,failedFiles:state.failures.slice(),activeLoads:state.queued,assetDirectory:BASE};
}
function glbLoad(path){
 return new Promise(resolve=>{
  try{new opts.T3.GLTFLoader().load(path,g=>resolve(g.scene||null),undefined,()=>resolve(null));}
  catch(e){resolve(null);}
 });
}
function dimensions(root,target){
 const b=new opts.T3.Box3().setFromObject(root),size=new opts.T3.Vector3();
 b.getSize(size);
 if(!Number.isFinite(size.y)||size.y<=0||size.y>100000)return false;
 const factor=Math.min(100,Math.max(.0001,target/size.y));
 const center=b.getCenter(new opts.T3.Vector3());
 root.scale.setScalar(factor);
 root.position.set(-center.x*factor,-b.min.y*factor,-center.z*factor);
 root.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=false;n.frustumCulled=true;}});
 return true;
}
// Static Meshy GLBs own their loader allocations. Dispose rejected/distant
// scenery exactly once per shared resource; never dispose live guard prefabs.
function disposeMeshyRoot(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse?.(n=>{
  if(!n.isMesh)return;
  if(n.geometry&&!geometries.has(n.geometry)){
   geometries.add(n.geometry);n.geometry.dispose?.();
  }
  const mats=Array.isArray(n.material)?n.material:[n.material];
  for(const mat of mats){
   if(!mat||materials.has(mat))continue;
   materials.add(mat);
   for(const key of ['map','normalMap','metalnessMap','roughnessMap','aoMap','emissiveMap','alphaMap','bumpMap']){
    const tex=mat[key];
    if(tex?.isTexture&&!textures.has(tex)){textures.add(tex);tex.dispose?.();}
   }
   mat.dispose?.();
  }
 });
}
function geometryCount(root){
 let sum=0;root.traverse(n=>{if(n.isMesh&&n.geometry){
  const geo=n.geometry;sum+=geo.index?geo.index.count/3:geo.attributes.position?geo.attributes.position.count/3:0;
 }});return sum;
}
function loadGuards(){
 if(guardStarted||!settings.guardModels?.length||!opts.soldiers.length)return;
 guardStarted=true;
 const files=settings.guardModels.slice(0,2).filter(safeURL);
 if(!files.length)return;
 Promise.all(files.map(f=>glbLoad(safeURL(f)))).then(models=>{
  const ready=models.filter((m)=>m&&geometryCount(m)<=12000);
  models.forEach(m=>{if(m&&!ready.includes(m))disposeMeshyRoot(m);});
  if(!ready.length){state.failures.push('guards: unavailable or over budget');return;}
  // Avoid a single 12-NPC GPU/scene-graph spike when first entering camp.
  // Keep original soldier fallback visible until EACH real mesh passes scale QA.
  let index=0;
  const populateFrame=()=>{
   const upper=Math.min(index+2,opts.soldiers.length);
   for(;index<upper;index++){
    const o=opts.soldiers[index];
    try{
     const prefab=ready[index%ready.length].clone(true);
     if(!dimensions(prefab,2.55)){
      state.failures.push('guard scale rejected: '+index);
      continue;
     }
     const previous=o.s.children.slice();
     o.s.add(prefab);
     previous.forEach(child=>child.visible=false);
     state.guardCount++;
    }catch(e){state.failures.push('guard install rejected: '+index);}
   }
   if(index<opts.soldiers.length)window.requestAnimationFrame(populateFrame);
  };
  window.requestAnimationFrame(populateFrame);
 }).catch(()=>state.failures.push('guard loading failed'));
}
function unload(obj){
 if(!obj.mesh)return;
 opts.scene.remove(obj.mesh);
 if(typeof obj.restoreLegacy==='function'){obj.restoreLegacy();obj.restoreLegacy=null;}
 disposeMeshyRoot(obj.mesh);
 obj.mesh=null;state.decorations=Math.max(0,state.decorations-1);
}
function prepareDecorations(entries){
 decorations=(Array.isArray(entries)?entries:[]).slice(0,30).map(d=>{
  const at=groundPosition(d.anchor,d.dx,d.dz);
  if(!at||!safeURL(d.file)||!(d.height>0&&d.height<=45)||
   (d.replaceLegacyTrees===true&&(!Number.isFinite(d.colliderRadius)||d.colliderRadius<.7||d.colliderRadius>3.2)))return null;
  return {at,file:d.file,height:d.height,water:!!d.water,desktopOnly:d.desktopOnly===true,replaceLegacyTrees:d.replaceLegacyTrees===true,colliderRadius:d.replaceLegacyTrees===true?d.colliderRadius:0,restoreLegacy:null,loadRadius:Math.min(300,Math.max(50,d.loadRadius||145)),mesh:null,pending:false,failed:false};
 }).filter(Boolean);
}
function tick(camera){
 if(!state.enabled||!camera||!Number.isFinite(camera.x)||!Number.isFinite(camera.z))return;
 lastCamera={x:camera.x,z:camera.z};
 const now=performance.now();if(now-lastTick<1300)return;lastTick=now;
 const mobile=('ontouchstart' in window)||navigator.maxTouchPoints>0;
 const maxLoaded=mobile?2:4;
 if(!guardStarted){
  const camp=opts.POI.camp,cave=opts.POI.cave;
  if(Math.hypot(camera.x-camp.x,camera.z-camp.z)<130||Math.hypot(camera.x-cave.x,camera.z-cave.z)<105)loadGuards();
 }
 for(const d of decorations){
  const dist=Math.hypot(camera.x-d.at.x,camera.z-d.at.z);
  if(d.mesh){d.mesh.visible=dist<d.loadRadius+85;if(dist>d.loadRadius+250)unload(d);}
 }
 const active=decorations.filter(d=>d.mesh).length;
 if(active+state.queued>=maxLoaded)return;
 const candidate=decorations.find(d=>!d.mesh&&!d.pending&&!d.failed&&(!mobile||!d.desktopOnly)&&Math.hypot(camera.x-d.at.x,camera.z-d.at.z)<d.loadRadius);
 if(!candidate)return;
 candidate.pending=true;state.queued++;
 glbLoad(safeURL(candidate.file)).then(root=>{
  candidate.pending=false;state.queued--;
  if(!root||geometryCount(root)>(mobile?35000:65000)||!dimensions(root,candidate.height)){
   if(root)disposeMeshyRoot(root);
   candidate.failed=true;state.failures.push(candidate.file);return;
  }
  const x=candidate.at.x,z=candidate.at.z;
  // A multi-MB GLB may finish after travel/teleport. Never upload geometry
  // into the scene or replace an old tree if it is now far outside the view.
  if(lastCamera&&Math.hypot(lastCamera.x-x,lastCamera.z-z)>candidate.loadRadius+85){
   disposeMeshyRoot(root);return;
  }
  const h=candidate.water?0:opts.heightAt(x,z);
  if(!Number.isFinite(h)){disposeMeshyRoot(root);candidate.failed=true;return;}
  const group=new opts.T3.Group();group.name='OptionalMeshy:'+candidate.file;
  group.position.set(x,h,z);group.add(root);opts.scene.add(group);
  candidate.mesh=group;state.decorations++;
  // Replace one nearby existing CC0 tree only after the Meshy model really
  // loaded. The cleanup restores both the old mesh and its original collider.
  if(candidate.replaceLegacyTrees&&typeof opts.replaceLegacyTrees==='function'){
   try{candidate.restoreLegacy=opts.replaceLegacyTrees(x,z,28,candidate.colliderRadius);}
   catch(e){state.failures.push('legacy-tree-replacement:'+candidate.file);}
  }
 }).catch(()=>{candidate.pending=false;state.queued--;candidate.failed=true;state.failures.push(candidate.file);});
}
async function install(options){
 if(state.started)return;state.started=true;opts=options;
 try{
  const res=await fetch(manifestURL,{cache:'no-store'});
  if(!res.ok)return;
  const data=await res.json();
  if(data.schema!==1||data.enabled!==true)return;
  if(!opts||!opts.T3||!opts.scene||!opts.POI||!opts.soldiers||!opts.heightAt)return;
  settings=data;state.enabled=true;prepareDecorations(data.decorations);
 }catch(e){state.failures.push('manifest unavailable');}
}
window.ClimboriaMeshyAssets={install,tick,audit};
})();
