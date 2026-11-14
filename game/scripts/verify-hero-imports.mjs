// Validate the two user-supplied Meshy character GLBs after they are manually uploaded.
// Run: node game/scripts/verify-hero-imports.mjs
// This does NOT create or upload binaries.
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const candidates=[
 {label:'Jarrell',path:'assets/characters/Climboria_Jarrell.glb',bytes:7911328,sha:'1249df0a1839c3ae69cecbe9e4f74c89ba4786fc64feb6354647430ced36933b',tris:29880,clips:['Running','Walking','Fall1','Idle_03','Punch_Combo','Regular_Jump','Swim_Forward','climbing_up_wall']},
 {label:'Lheiz',path:'assets/characters/Climboria_Lheiz.glb',bytes:12465796,sha:'d0c063c9f1e62242a58d69f92e5c956abd303d4408eacda8096b3a1b2e09de81',tris:31679,clips:['Running','Walking','Fall1','Idle_03','Jumping_Punch','Right_Hand_Sword_Slash','Right_Jab_from_Guard','Swim_Forward','climbing_up_wall']}
];
let errors=0;
for(const spec of candidates){
 const full=resolve(root,spec.path);
 try{
  if(!existsSync(full))throw Error('GLB binary not uploaded to repo');
  const bytes=readFileSync(full);
  if(bytes.length!==spec.bytes)throw Error('byte length mismatch: '+bytes.length+' instead of '+spec.bytes);
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('invalid GLB 2.0 header');
  const jsonLen=bytes.readUInt32LE(12),jsonType=bytes.toString('ascii',16,20);
  if(jsonType!=='JSON'||jsonLen>bytes.length-20)throw Error('invalid JSON chunk');
  const json=JSON.parse(bytes.toString('utf8',20,20+jsonLen));
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==spec.sha)throw Error('SHA-256 mismatch (verify it is the original file)');
  if((json.skins||[]).length<1)throw Error('no skeleton skin');
  const jointNames=(json.skins||[]).flatMap(s=>(s.joints||[]).map(i=>json.nodes?.[i]?.name||''));
  if(!jointNames.some(n=>n.startsWith('mixamorig:')))throw Error('expected Mixamo bones absent');
  const clips=(json.animations||[]).map(a=>a.name);
  if(spec.clips.some(c=>!clips.includes(c)))throw Error('missing expected animations');
  const triangles=(json.meshes||[]).flatMap(m=>m.primitives||[]).reduce((n,p)=>{
   const count=p.indices!=null?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count;
   return n+Math.floor(count/3);
  },0);
  if(triangles!==spec.tris)throw Error('triangle count mismatch: '+triangles);
  console.log('PASS',spec.label,spec.path,bytes.length,'bytes,',triangles,'tris,',clips.length,'clips');
 }catch(e){errors++;console.error('FAIL',spec.label,spec.path,e.message)}
}
if(errors)process.exitCode=1;
