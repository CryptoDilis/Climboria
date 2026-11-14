import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// GAME ONLY: sandboxed loader logic unit tests. No network, no GLBs required.
// Real WebGL quality and mobile FPS still need separate visual acceptance.
const script = readFileSync('game/meshy-world-assets.js', 'utf8');

function harness(manifest, mobile = false) {
  const calls = [];
  let now = 2_000;
  const window = {};
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
console.log('PASS path traversal rejected and mobile asset request cap enforced');

const idle = harness({schema:1,enabled:true,guardModels:['ok.glb'],decorations:[]});
await idle.api.install(idle.opts);
idle.api.tick({x:0,z:0});
assert.equal(idle.calls.length,0);
console.log('PASS guards stay lazy when player is away from camp and cave');

console.log('PASS all Game Meshy loader unit tests');
