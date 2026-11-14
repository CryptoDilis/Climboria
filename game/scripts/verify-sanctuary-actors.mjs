// Byte-for-byte release gate for the two optimized owner-supplied static GLBs.
// Run: node game/scripts/verify-sanctuary-actors.mjs
import {readFileSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const specs=[
 {name:'Arcane Cart vendor',path:'assets/characters/Climboria_Arcane_Cart_optimized.glb',
  size:5719576,sha:'99ef9b9d50c4afeb64a20d6f4858452928581532339f61797968841c34a13b65',faces:120738,images:1},
 {name:'Sanctuary tambay NPC',path:'assets/characters/Climboria_Starting_Tambay_NPC_optimized.glb',
  size:5465860,sha:'f070a77cbc4505676feb75dc7def96dc3a55ec7861f30b9f23fb877e15c00e84',faces:30628,images:3}
];
function check(ok,msg){if(!ok)throw Error(msg)}
let errors=0;
for(const spec of specs){
 try{
  const path=resolve(root,spec.path);
  check(existsSync(path),'BINARY NOT COMMITTED: '+spec.path);
  const b=readFileSync(path);
  check(b.length===spec.size,`${spec.name}: wrong byte length ${b.length}`);
  check(createHash('sha256').update(b).digest('hex')===spec.sha,`${spec.name}: SHA-256 source mismatch`);
  check(b.toString('ascii',0,4)==='glTF'&&b.readUInt32LE(4)===2&&b.readUInt32LE(8)===b.length,'bad GLB2 header');
  const jl=b.readUInt32LE(12);
  check(b.toString('ascii',16,20)==='JSON'&&jl<b.length-30,'missing glTF JSON chunk');
  const g=JSON.parse(b.toString('utf8',20,20+jl));
  const faces=(g.meshes||[]).flatMap(x=>x.primitives||[]).reduce((n,p)=>{
   const a=p.indices!=null?g.accessors[p.indices]:g.accessors[p.attributes.POSITION];
   return n+Math.floor(a.count/3);
  },0);
  check(faces===spec.faces,`${spec.name}: triangle mismatch ${faces}`);
  check((g.images||[]).length===spec.images,`${spec.name}: missing PBR maps`);
  check((g.animations||[]).length===0&&(g.skins||[]).length===0,`${spec.name}: expected static unrigged scenery`);
  console.log('PASS',spec.name,b.length,'bytes,',faces,'triangles, SHA-256',spec.sha);
 }catch(e){errors++;console.error('FAIL',spec.name,e.message)}
}
for(const name of ['Climboria_Hero.glb','Climboria_Jarrell.glb','Climboria_Lheiz.glb']){
 const path=resolve(root,'assets/characters',name);
 if(!existsSync(path)||statSync(path).size<1_000_000){errors++;console.error('FAIL previously supported hero is missing:',name)}
}
if(errors)process.exitCode=1;
