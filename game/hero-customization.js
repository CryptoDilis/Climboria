/* Shared Climboria hero records and capability-gated appearance editing. */
(function(){
'use strict';
const STORE='climboria-saved-heroes';
const MODEL='Climboria_Hero.glb';
const TONES={original:'#ffffff',warm:'#f2c5a5',deep:'#bb8064',rich:'#86563e'};
const COLORS={black:'#2b211f',brown:'#70442c',auburn:'#a64b2a',blond:'#d5b56b',silver:'#c8ccd1',blue:'#6faeff',green:'#55bb83',hazel:'#ad874b'};
function emptyAppearance(){return{skinTone:'original',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',face:{},outfit:'original',accessories:null}}
function normalize(record){
 if(!record||typeof record!=='object')return null;
 const appearance=record.appearance&&typeof record.appearance==='object'?record.appearance:{};
 return{
  id:typeof record.id==='string'&&record.id.length<100?record.id:'',
  name:typeof record.name==='string'?record.name.trim().slice(0,32):'',
  model:record.model===MODEL?MODEL:MODEL,
  appearance:{...emptyAppearance(),...appearance,face:appearance.face&&typeof appearance.face==='object'?appearance.face:{},accessories:Array.isArray(appearance.accessories)?appearance.accessories.filter(x=>typeof x==='string').slice(0,24):null}
 };
}
function defaultHero(){return{id:'climboria-hero-default',name:'Climboria Hero',model:MODEL,appearance:emptyAppearance(),builtIn:true}}
function readHeroes(){
 try{
  const parsed=JSON.parse(localStorage.getItem(STORE)||'[]');
  if(!Array.isArray(parsed))return[defaultHero()];
  const heroes=parsed.map(normalize).filter(h=>h&&h.id&&h.name&&!h.builtIn);
  const unique=new Map(heroes.map(h=>[h.id,h]));
  return[defaultHero(),...unique.values()].slice(0,25);
 }catch(_){return[defaultHero()]}
}
function saveHero(record){
 const hero=normalize(record);if(!hero)throw new Error('Invalid hero record');
 if(!hero.id)hero.id='hero-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 if(!hero.name)hero.name='Explorer';
 const current=readHeroes().filter(h=>!h.builtIn&&h.id!==hero.id);
 const next=[...current,hero].slice(-24);
 localStorage.setItem(STORE,JSON.stringify(next));
 return hero;
}
function inspect(root,animations=[]){
 const meshes=[],materials=[],morphs=[],bones=[];
 root.traverse(o=>{
  if(o.isBone)bones.push(o.name||'(unnamed bone)');
  if(o.isMesh){
   const mats=Array.isArray(o.material)?o.material:[o.material];
   const matNames=mats.filter(Boolean).map(m=>m.name||'');
   meshes.push({name:o.name||'(unnamed mesh)',materials:matNames,morphs:Object.keys(o.morphTargetDictionary||{}),visible:o.visible!==false});
   for(const m of mats)if(m&&!materials.some(x=>x.ref===m))materials.push({name:m.name||'',mesh:o.name||'',ref:m});
   for(const name of Object.keys(o.morphTargetDictionary||{}))morphs.push({mesh:o.name||'',name});
  }
 });
 const matchMaterials=(re)=>materials.filter(m=>re.test(m.name)).map(m=>m.name);
 const matchMeshes=(re)=>meshes.filter(m=>re.test(m.name)).map(m=>m.name);
 const hairstyleVariants=matchMeshes(/(?:hair|hairstyle).*(?:style|variant|alternate|alt|(?:^|[._ -])(?:[2-9]|[1-9][0-9]+)$)/i);
 const outfitVariants=matchMeshes(/(?:outfit|clothes|armor|jacket|shirt|pants).*(?:style|variant|alternate|alt|(?:^|[._ -])(?:[2-9]|[1-9][0-9]+)$)/i);
 const facialMorphs=morphs.filter(m=>/(face|eye|brow|smile|mouth|jaw|expression)/i.test(m.name));
 return{
  summary:{meshCount:meshes.length,materialCount:materials.length,boneCount:bones.length,animationCount:animations.length,morphTargetCount:morphs.length},
  meshes:meshes.map(({name,materials,morphs})=>({name,materials,morphs})),
  materials:materials.map(({name,mesh})=>({name,mesh})),
  bones,morphs,
  capabilities:{
   skinTone:matchMaterials(/skin|face/i).length>0,
   hairStyle:hairstyleVariants.length>1,
   hairColor:matchMaterials(/hair|scalp/i).length>0,
   eyeStyle:facialMorphs.some(m=>/eye|brow/i.test(m.name)),
   eyeColor:matchMaterials(/eye|iris/i).length>0,
   facial:facialMorphs.length>0,
   outfit:outfitVariants.length>1,
   accessories:matchMeshes(/accessory|hat|glasses|necklace|scarf|backpack|bracelet|earring/i).length>0
  },
  options:{hairstyleVariants,outfitVariants,facialMorphs:facialMorphs.map(m=>m.name),accessories:matchMeshes(/accessory|hat|glasses|necklace|scarf|backpack|bracelet|earring/i),accessoryDefaults:meshes.filter(m=>/accessory|hat|glasses|necklace|scarf|backpack|bracelet|earring/i.test(m.name)&&m.visible).map(m=>m.name)}
 };
}
function apply(root,appearance={},capabilities=inspect(root).capabilities){
 const skin=TONES[appearance.skinTone]||TONES.original,hair=COLORS[appearance.hairColor]||COLORS.black,eyes=COLORS[appearance.eyeColor]||COLORS.blue;const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255}),tint=(color,base,hex)=>{const c=rgb(hex);color.setRGB(base.r*c.r,base.g*c.g,base.b*c.b)};
 root.traverse(o=>{
  if(!o.isMesh)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const m of mats){if(!m?.color)continue;const n=(m.name||'')+' '+(o.name||'');m.userData=m.userData||{};if(!m.userData.climboriaBaseColor)m.userData.climboriaBaseColor=m.color.clone();
   if(capabilities.skinTone&&/skin|face/i.test(n)&&appearance.skinTone!=='original')tint(m.color,m.userData.climboriaBaseColor,skin);
   else if(capabilities.hairColor&&/hair|scalp/i.test(n)&&appearance.hairColor!=='original')tint(m.color,m.userData.climboriaBaseColor,hair);
   else if(capabilities.eyeColor&&/eye|iris/i.test(n)&&appearance.eyeColor!=='original')tint(m.color,m.userData.climboriaBaseColor,eyes);
   else m.color.copy(m.userData.climboriaBaseColor);
  }
  if(o.morphTargetDictionary&&o.morphTargetInfluences){for(const [name,index] of Object.entries(o.morphTargetDictionary)){if(Object.prototype.hasOwnProperty.call(appearance.face||{},name))o.morphTargetInfluences[index]=Math.max(0,Math.min(1,Number(appearance.face[name])||0))}}
 });
 if(capabilities.hairStyle&&appearance.hairStyle&&appearance.hairStyle!=='original'){for(const name of inspect(root).options.hairstyleVariants){const o=root.getObjectByName(name);if(o)o.visible=name===appearance.hairStyle}}
 if(capabilities.outfit&&appearance.outfit&&appearance.outfit!=='original'){for(const name of inspect(root).options.outfitVariants){const o=root.getObjectByName(name);if(o)o.visible=name===appearance.outfit}}
 if(Array.isArray(appearance.accessories)){const accessories=new Set(appearance.accessories);for(const name of inspect(root).options.accessories){const o=root.getObjectByName(name);if(o)o.visible=accessories.has(name)}}
 return inspect(root);
}
window.ClimboriaHeroData={STORE,MODEL,readHeroes,saveHero,normalize,defaultHero,emptyAppearance,inspect,apply,tones:Object.keys(TONES),colors:Object.keys(COLORS)};
})();