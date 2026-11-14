// Ella replacement asset release gate. This intentionally fails until the
// actual optimized binary is uploaded to the Game PR branch.
// Run: node game/scripts/verify-ella-default.mjs
import {readFileSync, existsSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ellaPath=resolve(root,'assets/characters/Climboria_Ella.glb');
const oldPath=resolve(root,'assets/characters/Climboria_Hero.glb');
const companions=['Climboria_Jarrell.glb','Climboria_Lheiz.glb'];
const expectedSha='f5b5e5fd42ffbe24f151b64b4e7902d48676199830b27319bbd8c641a7de41d5';
const expectedClips=['Running','Walking','Climb_Attempt_and_Fall_4','Fall2','Jumping_Punch','Right_Jab_from_Guard','Swim_Forward','climbing_up_wall'];
function assert(condition,message){if(!condition)throw Error(message)}
try{
 assert(existsSync(ellaPath),'Ella binary NOT uploaded: assets/characters/Climboria_Ella.glb');
 const file=readFileSync(ellaPath);
 assert(file.length===14714996,'wrong Ella GLB size: '+file.length);
 assert(createHash('sha256').update(file).digest('hex')===expectedSha,'Ella binary SHA-256 mismatch');
 assert(file.toString('ascii',0,4)==='glTF'&&file.readUInt32LE(4)===2&&file.readUInt32LE(8)===file.length,'invalid GLB 2.0 header');
 const len=file.readUInt32LE(12);
 assert(file.toString('ascii',16,20)==='JSON'&&len>0&&len<file.length-40,'invalid GLB JSON chunk');
 const gltf=JSON.parse(file.toString('utf8',20,20+len));
 const names=(gltf.animations||[]).map(a=>a.name);
 assert((gltf.skins||[]).length===1,'expected Ella skinned skeleton');
 const bones=gltf.skins[0].joints.map(i=>gltf.nodes?.[i]?.name||'');
 for(const name of ['mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:Hips'])
  assert(bones.includes(name),'missing Mixamo bone '+name);
 assert(names.length===8&&expectedClips.every(x=>names.includes(x)),'wrong Ella animation list: '+JSON.stringify(names));
 const tris=(gltf.meshes||[]).flatMap(m=>m.primitives||[]).reduce((n,p)=>{
  const index=p.indices!=null?gltf.accessors[p.indices].count:gltf.accessors[p.attributes.POSITION].count;
  return n+Math.floor(index/3);
 },0);
 assert(tris===31145,'wrong Ella triangle count '+tris);
 assert((gltf.images||[]).length===3,'missing Ella PBR texture maps');
 for(const image of gltf.images){assert(image.bufferView!=null,'Ella texture must be embedded')}
 for(const legacy of [oldPath,...companions.map(name=>resolve(root,'assets/characters',name))])
  assert(existsSync(legacy)&&statSync(legacy).size>1_000_000,'existing hero backup/option missing: '+legacy);
 console.log('PASS Ella default import',file.length,'bytes,',tris,'tris,',names.length,'animations, SHA-256',expectedSha);
 console.log('PASS original Adventurer / Jarrell / Lheiz binaries preserved');
}catch(e){
 console.error('FAIL Ella default import:',e.message);
 process.exitCode=1;
}
