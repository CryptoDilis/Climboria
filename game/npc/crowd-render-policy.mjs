// Pure renderer planning. Not a presence, admission, combat or network policy.
// Input is a bounded set of already-authorized remote player descriptors.
const limits=Object.freeze({
 mobile:Object.freeze({heavy:2,light:8,markers:16}),
 desktop:Object.freeze({heavy:3,light:12,markers:24})
});
const compareId=(a,b)=>a<b?-1:a>b?1:0;
const finitePosition=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=100000&&Math.abs(p.z)<=100000;
export function planCrowdRendering({players,viewer,device,pressure='normal',npcCap=5,previous=[]}={}){
 if(!Array.isArray(players)||players.length>100||!finitePosition(viewer)||!Object.hasOwn(limits,device)||
    !['normal','constrained','critical'].includes(pressure)||!Number.isInteger(npcCap)||npcCap<0||npcCap>5)
  throw Error('Invalid crowd planning input');
 if(!Array.isArray(previous)||previous.length>100||previous.some(a=>!a||typeof a.id!=='string'||!['heavy','light','marker','hidden'].includes(a.tier)))throw Error('Invalid previous render tiers');
 const prior=new Map(previous.map(a=>[a.id,a.tier]));
 const ids=new Set();
 const ranked=players.map(p=>{
  if(!finitePosition(p)||typeof p.id!=='string'||!p.id||p.id.length>128||ids.has(p.id)||
     p.kind!=='player'||typeof p.hasModel!=='boolean')throw Error('Invalid/duplicate player descriptor');
  ids.add(p.id);
  return {id:p.id,distance:Math.hypot(p.x-viewer.x,p.z-viewer.z),hasModel:p.hasModel};
 }).sort((a,b)=>a.distance-b.distance||compareId(a.id,b.id));
 const max=limits[device],reduction=pressure==='critical'?0:pressure==='constrained'?.5:1;
 const caps={heavy:pressure==='critical'?0:Math.max(1,Math.floor(max.heavy*reduction)),
  light:Math.floor(max.light*reduction),markers:pressure==='critical'?Math.floor(max.markers/2):max.markers};
 // Keep a marker for closest players even under critical pressure. No effect on actual ONLINE.
 // Small retention bonus prevents repeated GLB reloads as distances cross.
 // Absolute visibility ranges and pressure caps always override retention.
 const select=(tier,eligible,cap)=>new Set(ranked.filter(eligible).sort((a,b)=>(a.distance-(prior.get(a.id)===tier?3:0))-(b.distance-(prior.get(b.id)===tier?3:0))||compareId(a.id,b.id)).slice(0,cap).map(p=>p.id));
 const heavyIds=select('heavy',p=>p.distance<120&&p.hasModel,caps.heavy);
 const lightIds=select('light',p=>p.distance<120&&!heavyIds.has(p.id),caps.light);
 const markerIds=select('marker',p=>p.distance<350&&!heavyIds.has(p.id)&&!lightIds.has(p.id),caps.markers);
 const heavy=heavyIds.size,light=lightIds.size,markers=markerIds.size;
 const assignments=ranked.map(p=>Object.freeze({id:p.id,tier:heavyIds.has(p.id)?'heavy':lightIds.has(p.id)?'light':markerIds.has(p.id)?'marker':'hidden',distance:p.distance}));
 const nearby=ranked.filter(p=>p.distance<120).length;
 const desired=nearby===0?5:nearby<=5?3:nearby<=10?2:nearby<=20?1:0;
 const ambient=pressure==='critical'?0:pressure==='constrained'?Math.min(1,desired):desired;
 // Default full NPC GLB reserve: a real player slot must remain available.
 // This is only a target. Actual renderer must account for loading/resident resources.
 const npcHeavyTarget=Math.min(ambient,npcCap,Math.max(0,caps.heavy-Math.max(1,heavy)));
 return Object.freeze({assignments:Object.freeze(assignments),receivedPlayerCount:players.length,nearby,
  counts:Object.freeze({heavy,light,markers,hidden:players.length-heavy-light-markers}),
  caps:Object.freeze(caps),npcTarget:Math.min(ambient,npcCap),npcHeavyTarget});
}
