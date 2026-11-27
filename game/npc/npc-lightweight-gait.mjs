// Low-cost displacement-driven gait for the seven-mesh NPC silhouette.
// No geometry/material allocations, root motion, skeletal mixer or authority.
export function createNpcLightweightGait(body){
 const limbs=body?.children?.slice(3,7);
 if(body?.children?.length!==7||!limbs?.every(l=>[l.position?.y,l.position?.z,l.rotation?.x].every(Number.isFinite)))throw Error('Invalid NPC silhouette');
 const neutral=limbs.map(l=>({y:l.position.y,z:l.position.z,x:l.rotation.x}));
 let phase=0,frames=0,peak=0,closed=false;
 function pose(angles){
  limbs.forEach((l,i)=>{const a=angles[i],n=neutral[i],half=.42;
   l.rotation.x=n.x+a;l.position.y=n.y+half*(1-Math.cos(a));l.position.z=n.z-half*Math.sin(a);
  });
 }
 function frame(mode,distance){
  if(closed)return false;
  if(!Number.isFinite(distance)||distance<0||distance>.300001)return false;
  if(distance<=.00001||!['walk','run','climb','swim'].includes(mode)){pose([0,0,0,0]);return true}
  const stride=mode==='run'?1.1:mode==='swim'?1.25:.8;
  phase=(phase+distance/stride*Math.PI*2)%(Math.PI*2);
  const amp=mode==='run'?.70:mode==='swim'?.55:.42;
  const a=Math.sin(phase)*amp,b=-a;
  pose([b,a,a,b]);frames++;peak=Math.max(peak,Math.abs(a));return true;
 }
 return Object.freeze({frame,close(){if(closed)return;pose([0,0,0,0]);closed=true},audit:()=>Object.freeze({frames,peak,closed})});
}
