// GAME ONLY — static safety checks for the disabled owner Meshy 3D scene plan.
// Does not load or accept binary models: actual visual/gameplay/FPS QA still required.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='assets/game/new_optimized/';
const config=JSON.parse(readFileSync(base+'manifest.json','utf8'));
const source=JSON.parse(readFileSync(base+'source_manifest.json','utf8'));
const allowed=new Map(source.models.map(m=>[m.file,m]));
assert.equal(source.models.length,44,'Immutable approved models count changed');
assert.equal(config.schema,1);
assert.equal(config.enabled,false,'Do not activate unreviewed scenery and guards');
assert.equal(config.guardModels.length,2,'Use exactly two single-character guard choices');
assert.ok(Array.isArray(config.decorations) && config.decorations.length<=20);
const guards=new Set();
for(const file of config.guardModels){
 assert.ok(!guards.has(file),'Duplicate guard');
 guards.add(file);
 assert.ok(allowed.has(file),`Unknown guard: ${file}`);
 assert.ok(allowed.get(file).triangles<=12000,`Guard is too heavy: ${file}`);
 assert.ok(!/Medieval_Guards_|Titanic|T_rex/.test(file),'Off-theme or two-person guard');
}
const keys=new Set();
const anchors=new Set(['park','camp','cave','coast','summit']);
let mobile=0,desktop=0;
for(const d of config.decorations){
 assert.ok(allowed.has(d.file),`Unknown scene prop: ${d.file}`);
 assert.ok(anchors.has(d.anchor),`Unknown placement region: ${d.anchor}`);
 assert.ok(Number.isFinite(d.dx)&&Number.isFinite(d.dz)&&Math.abs(d.dx)<=500&&Math.abs(d.dz)<=500);
 assert.ok(Number.isFinite(d.height)&&d.height>0&&d.height<=45);
 assert.ok(Number.isFinite(d.loadRadius)&&d.loadRadius>=50&&d.loadRadius<=300);
 assert.ok(!keys.has(d.file),`Unexpected duplicate GLB placement: ${d.file}`);
 keys.add(d.file);
 assert.ok(!/Titanic|T_rex|Mushroom_Tree|Galleon_Odyssey|Medieval_Guards_/.test(d.file),
   `Excluded/off-theme prop in scene: ${d.file}`);
 const triangles=allowed.get(d.file).triangles;
 assert.ok(triangles<=65000,`Desktop per-prop triangle budget exceeded: ${d.file}`);
 if(d.desktopOnly===true)desktop++;
 else {mobile++;assert.ok(triangles<=35000,`Mobile per-prop triangle budget exceeded: ${d.file}`);}
}
assert.equal(config.decorations.length,15);
assert.equal(mobile+desktop,15);
console.log(`PASS disabled curated Meshy scene: ${guards.size} single guards, ${mobile} mobile-suitable props, ${desktop} desktop-only, 44 model hash allowlist`);
