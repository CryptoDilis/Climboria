import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// GAME ONLY: sandboxed loader logic unit tests. No network, no GLBs required.
// Real WebGL quality and mobile FPS still need separate visual acceptance.
const script = readFileSync('game/meshy-world-assets.js', 'utf8');

function harness(manifest, mobile = false) {
  const calls = [],frames=[];
  let now = 2_000;
  const window = {requestAnimationFrame(fn){frames.push(fn);return frames.length}};
  const sandbox = {
    window,
    performance: {now: () => now},
    navigator: {maxTouchPoints: mobile ? 1 : 0},
    fetch: async () => ({ok:true, json:async () => manifest})
  };
  vm.runInNewContext(script, sandbox, {filename:'game/meshy-world-assets.js'});
  const opts = {
    T3: {
      GLTFLoader: class {
        // Leave the requested model pending to exercise the queue capacity.
        load(url, success, progress, error) { calls.push({url, success, error}); }
      }
    },
    scene: {},
    soldiers: [],
    POI: {
      park:{x:0,z:0},camp:{x:1000,z:1000},
      cave:{x:-760,z:-520},summit:{x:640,z:-620}
    },
    heightAt:() => 1
  };
  return {
    api:window.ClimboriaMeshyAssets,opts,calls,
    nextFrame:()=>{const queued=frames.splice(0);queued.forEach(fn=>fn());},
    framesWaiting:()=>frames.length,
    advance: () => { now += 1_500; }
  };
}
const disabled = harness({schema:1, enabled:false, guardModels:['ok.glb'], decorations:[{file:'ok.glb',anchor:'park',dx:0,dz:0,height:3}]});
await disabled.api.install(disabled.opts);
disabled.api.tick({x:0,z:0});
assert.equal(disabled.api.audit().enabled,false);
assert.equal(disabled.calls.length,0);
console.log('PASS disabled manifest makes zero requests');

const invalid = harness({schema:1,enabled:true,guardModels:[],decorations:[
 {file:'../escape.glb',anchor:'park',dx:0,dz:0,height:3},
 {file:'premium.glb',anchor:'park',dx:0,dz:0,height:3,desktopOnly:true},
 {file:'ok.glb',anchor:'park',dx:0,dz:0,height:3},
 {file:'ok2.glb',anchor:'park',dx:4,dz:0,height:3},
 {file:'ok3.glb',anchor:'park',dx:8,dz:0,height:3}
]},true);
await invalid.api.install(invalid.opts);
assert.equal(invalid.api.audit().enabled,true);
invalid.api.tick({x:0,z:0});
invalid.advance();invalid.api.tick({x:0,z:0});
invalid.advance();invalid.api.tick({x:0,z:0});
assert.equal(invalid.calls.length,2,'Mobile cap is two concurrent scenery loads');
assert.equal(invalid.api.audit().activeLoads,2);
assert.equal(invalid.calls.every(c=>c.url.startsWith('../assets/game/new_optimized/')),true);
assert.equal(invalid.calls.some(c=>c.url.includes('escape')),false);
assert.equal(invalid.calls.some(c=>c.url.includes('premium')),false,'Mobile must never request desktop-only high-poly scenery');
console.log('PASS path traversal rejected and mobile asset request cap enforced');

const idle = harness({schema:1,enabled:true,guardModels:['ok.glb'],decorations:[]});
await idle.api.install(idle.opts);
idle.api.tick({x:0,z:0});
assert.equal(idle.calls.length,0);
console.log('PASS guards stay lazy when player is away from camp and cave');

// Rejected over-budget GLBs must release GPU allocations without double-free,
// even if multiple submeshes share the same optimized material and texture.
const reject=harness({schema:1,enabled:true,guardModels:[],decorations:[
 {file:'oversized.glb',anchor:'park',dx:0,dz:0,height:4}
]},true);
await reject.api.install(reject.opts);
reject.api.tick({x:0,z:0});
assert.equal(reject.calls.length,1);
const freed={geometry:0,material:0,texture:0};
const geometry={index:{count:120003},dispose(){freed.geometry++}};
const texture={isTexture:true,dispose(){freed.texture++}};
const material={map:texture,normalMap:texture,dispose(){freed.material++}};
const firstMesh={isMesh:true,geometry,material};
const secondMesh={isMesh:true,geometry,material};
reject.calls[0].success({scene:{traverse(fn){fn(firstMesh);fn(secondMesh)}}});
for(let i=0;i<6;i++)await Promise.resolve();
assert.equal(reject.api.audit().activeLoads,0);
assert.equal(reject.api.audit().failedFiles.length,1);
assert.deepEqual(freed,{geometry:1,material:1,texture:1},
 'Rejected shared GLB GPU allocations must dispose exactly once');
console.log('PASS failed mobile GLBs reclaim shared GPU resources without double-dispose');

// A good Meshy tree must replace exactly one old tree only when its actual
// GLB resolves; restore the original visibility + collision on streaming out.
const swap=harness({schema:1,enabled:true,guardModels:[],decorations:[
 {file:'approved-tree.glb',anchor:'park',dx:0,dz:0,height:6,loadRadius:120,replaceLegacyTrees:true,colliderRadius:1.4}
]});
let swaps=0,restores=0,adds=0,removes=0,disposals=0;
swap.opts.replaceLegacyTrees=(x,z,radius,colliderRadius)=>{
 assert.equal(x,0);assert.equal(z,0);assert.equal(radius,28);assert.equal(colliderRadius,1.4);
 swaps++;return()=>restores++;
};
swap.opts.scene={add(){adds++},remove(){removes++}};
swap.opts.T3.Vector3=class {constructor(){this.x=0;this.y=0;this.z=0}};
swap.opts.T3.Box3=class {
 constructor(){this.min={y:0}}
 setFromObject(){return this}
 getSize(v){v.y=8;return v}
 getCenter(v){v.x=0;v.y=4;v.z=0;return v}
};
swap.opts.T3.Group=class {
 constructor(){this.children=[];this.position={set() {}}}
 add(v){this.children.push(v)}
 traverse(fn){for(const c of this.children)c.traverse(fn)}
};
await swap.api.install(swap.opts);
swap.api.tick({x:0,z:0});
assert.equal(swaps,0,'Original trees must remain while GLB is pending');
const goodMesh={isMesh:true,geometry:{index:{count:600},dispose(){disposals++}},
 material:{dispose(){disposals++}}};
const root={scale:{setScalar(){}},position:{set(){}},traverse(fn){fn(goodMesh)}};
swap.calls[0].success({scene:root});
for(let i=0;i<6;i++)await Promise.resolve();
assert.equal(swaps,1,'Only successfully loaded natural tree hides old forest/collider');
assert.equal(adds,1);
assert.equal(swap.api.audit().loadedDecorations,1);
swap.advance();
swap.api.tick({x:1200,z:1200});
assert.equal(restores,1,'Distant new model restores old tree AND its collider');
assert.equal(removes,1);
assert.equal(disposals,2,'Expired new model frees its geometry and material');
assert.equal(swap.api.audit().loadedDecorations,0);
console.log('PASS approved Meshy tree replaces only after load and restores CC0 forest on unload');

// A user may move hundreds of meters while an approved GLB is still loading.
// Late success must release its decoded buffers and NOT spawn a distant model,
// hide legacy trees or permanently blacklist an otherwise-valid model.
const stale=harness({schema:1,enabled:true,guardModels:[],decorations:[
 {file:'late-but-valid-tree.glb',anchor:'park',dx:0,dz:0,height:8,
  loadRadius:110,replaceLegacyTrees:true,colliderRadius:1.2}
]});
let lateAdded=0,lateReplacements=0,lateDisposed=0;
stale.opts.scene={add(){lateAdded++},remove(){}};
stale.opts.replaceLegacyTrees=()=>{lateReplacements++;return()=>{};};
stale.opts.T3.Vector3=class {constructor(){this.x=this.y=this.z=0}};
stale.opts.T3.Box3=class {
 constructor(){this.min={y:0}}
 setFromObject(){return this}
 getSize(out){out.y=8;return out}
 getCenter(out){out.x=0;out.y=4;out.z=0;return out}
};
await stale.api.install(stale.opts);
stale.api.tick({x:0,z:0});
assert.equal(stale.calls.length,1);
stale.advance();stale.api.tick({x:900,z:900});
const lateMesh={isMesh:true,geometry:{index:{count:240},dispose(){lateDisposed++}},
 material:{dispose(){lateDisposed++}}};
const lateRoot={scale:{setScalar(){}},position:{set(){}},traverse(fn){fn(lateMesh)}};
stale.calls[0].success({scene:lateRoot});
for(let i=0;i<6;i++)await Promise.resolve();
assert.equal(stale.api.audit().loadedDecorations,0,'Too-far completed load must not enter scene');
assert.equal(lateAdded,0);
assert.equal(lateReplacements,0,'Must not hide existing trees after player travels');
assert.equal(lateDisposed,2,'Late GLB buffers should be reclaimed');
assert.equal(stale.api.audit().failedFiles.length,0,'Valid far-away GLB may retry later');
stale.advance();stale.api.tick({x:0,z:0});
assert.equal(stale.calls.length,2,'Return to area should allow a fresh load');
console.log('PASS in-flight Meshy model unloaded safely after player teleports away');

// Loading both armored prefabs may complete in the same millisecond, but
// applying the 12 real camp NPC replacements must take >=6 render frames.
const guards=harness({schema:1,enabled:true,guardModels:['guard-a.glb','guard-b.glb'],decorations:[]});
guards.opts.soldiers=Array.from({length:12},()=>{
 const fallback={visible:true};
 return {s:{children:[fallback],add(obj){this.children.push(obj)}},fallback};
});
guards.opts.T3.Vector3=class {constructor(){this.x=this.y=this.z=0}};
guards.opts.T3.Box3=class {
 constructor(){this.min={y:0}}
 setFromObject(){return this}
 getSize(v){v.y=2;return v}
 getCenter(v){v.x=0;v.y=1;v.z=0;return v}
};
await guards.api.install(guards.opts);
guards.api.tick({x:1000,z:1000});
assert.equal(guards.calls.length,2,'Camp receives exactly two approved guard prefab requests');
const clone=()=>({
 scale:{setScalar(){}},position:{set(){}},
 traverse(fn){fn({isMesh:true,geometry:{index:{count:240}}})}
});
const prefab={traverse(fn){fn({isMesh:true,geometry:{index:{count:240}}})},clone};
for(const call of guards.calls)call.success({scene:prefab});
for(let k=0;k<8;k++)await Promise.resolve();
assert.equal(guards.api.audit().guardCount,0,'Never swap every guard in one decode callback');
assert.equal(guards.framesWaiting(),1,'Begin installing guards on next animation frame');
for(let frame=1;frame<=6;frame++){
 guards.nextFrame();
 assert.equal(guards.api.audit().guardCount,frame*2,
  'At most 2 guard NPC visual replacements per animation frame');
}
assert.equal(guards.framesWaiting(),0);
assert.equal(guards.opts.soldiers.filter(x=>!x.fallback.visible&&x.s.children.length===2).length,12,
 'All original camp soldier fallbacks remain preserved but visually replaced');
assert.equal(guards.api.audit().failedFiles.length,0);
console.log('PASS 12 armored guards stream at 2 per frame with fallback preserved');

console.log('PASS all Game Meshy loader unit tests');
