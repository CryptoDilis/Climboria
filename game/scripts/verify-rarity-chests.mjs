// Release gate: validate all FIVE owner-supplied optimized chest GLBs.
// This script intentionally FAILS until the actual binaries are installed.
// Run from repo root: node game/scripts/verify-rarity-chests.mjs
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const EXPECTED=Object.freeze({
 common:{bytes:1358448,sha256:'ef18bfd30eee4da3f6df06144c04acd0fc277089fbd729706b3c57d9caeefc7b',triangles:25999,images:4},
 uncommon:{bytes:559748,sha256:'cacc85ac63792556c5907076fbcb1ce99b1be79c558ccc48f4b0d2fc67c08bdb',triangles:4996,images:1},
 rare:{bytes:1581236,sha256:'96c8a4911312efdf1cbab974a4ec21b9f66b70c8556b645c7a502b83e7424d6f',triangles:30754,images:3},
 epic:{bytes:1208104,sha256:'d74a80d50402458c5e2202c2d22d3d4fe413423aa1d70814a6312b6009d4ac60',triangles:17000,images:1},
 legendary:{bytes:746592,sha256:'53a9e94a16db3977347981caad6aa7e8f213ee52cfb7166afd165744466a7fb4',triangles:7058,images:1}
});
function assert(condition,error){if(!condition)throw Error(error)}
let total=0;
try{
 for(const [rarity,expected] of Object.entries(EXPECTED)){
  const path=resolve(root,'assets/chests/Climboria_Chest_'+rarity[0].toUpperCase()+rarity.slice(1)+'.glb');
  assert(existsSync(path),'Missing optimized '+rarity+' chest: '+path);
  const bytes=readFileSync(path);total+=bytes.length;
  assert(bytes.length===expected.bytes,'Wrong '+rarity+' size: '+bytes.length);
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert(digest===expected.sha256,'Optimized '+rarity+' SHA-256 mismatch: '+digest);
  assert(bytes.toString('ascii',0,4)==='glTF'&&bytes.readUInt32LE(4)===2
    &&bytes.readUInt32LE(8)===bytes.length,'Invalid '+rarity+' GLB 2.0 header');
  const jsonLen=bytes.readUInt32LE(12);
  assert(bytes.toString('ascii',16,20)==='JSON'&&jsonLen>0&&jsonLen<bytes.length-32,
    'Invalid '+rarity+' JSON chunk');
  const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLen));
  const prim=gltf.meshes?.[0]?.primitives?.[0];
  assert(!!prim&&gltf.meshes.length===1&&prim.mode===4,
    'Expected one static triangulated mesh for '+rarity);
  assert((gltf.skins||[]).length===0&&(gltf.animations||[]).length===0,
    'Static chest accidentally contains skin/animation: '+rarity);
  const position=gltf.accessors[prim.attributes.POSITION];
  const uv=gltf.accessors[prim.attributes.TEXCOORD_0];
  const normal=gltf.accessors[prim.attributes.NORMAL];
  const idx=gltf.accessors[prim.indices];
  assert(position.count===uv.count&&position.count===normal.count,'Mismatched static attributes for '+rarity);
  assert(idx.count%3===0&&idx.count/3===expected.triangles,
    'Wrong '+rarity+' triangle count: '+idx.count/3);
  assert(gltf.images?.length===expected.images,'Wrong embedded texture maps for '+rarity);
  assert(gltf.images.every(img=>img.bufferView!=null&&img.mimeType==='image/jpeg'),
    'Optimized '+rarity+' GLB has invalid/missing embedded texture images');
  assert(Array.isArray(position.min)&&Array.isArray(position.max)
    &&position.min.length===3&&position.max.length===3
    &&position.min.every(Number.isFinite)&&position.max.every(Number.isFinite),
    'Invalid '+rarity+' vertex bounds');
  console.log('PASS',rarity,'GLB',bytes.length,'bytes',expected.triangles,'triangles',expected.images,'textures',digest);
 }
 assert(total<6_000_000,'Total chest payload must be under 6MB');
 console.log('PASS all 5 chest GLB assets',total,'bytes aggregate');
}catch(error){
 console.error('FAIL optimized chest verification:',error.message);
 process.exitCode=1;
}
