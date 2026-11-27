/**
 * Render-only adapter for a dedicated authored local combat character.
 * Never pass the public game player/save object or mutate its health, loot,
 * movement, camera, or presence state. Server coordinates are ground height.
 * The mesh's own measured foot offset matches play.html's GLB convention.
 */
export function createAuthoredLocalCharacterProjection({root,footOffset=0,renderHud}={}){
 if(typeof root?.position?.set!=='function'||typeof renderHud!=='function'||
    !Number.isFinite(footOffset)||Math.abs(footOffset)>10)
  throw Error('Dedicated character root and HUD required');
 let closed=false,lastObserved=-1;
 const hidden=(status)=>{
  root.visible=false;
  renderHud(Object.freeze({status,health:null,maxHealth:null,stamina:null,controlsEnabled:false}));
  return false;
 };
 function render(frame){
  if(closed)return false;
  if(frame?.status==='closed'){closed=true;return hidden('closed')}
  const s=frame?.snapshot,p=s?.position;
  if(!p||![p.x,p.y,p.z].every(Number.isFinite)||
     p.x< -219.6-1e-6||p.x> -180.4+1e-6||p.z< -189.6-1e-6||p.z> -150.4+1e-6||Math.abs(p.y)>=50000||
     !Number.isSafeInteger(s.observedAtMs)||s.observedAtMs<lastObserved||
     s.maxHealth!==500||!Number.isInteger(s.health)||s.health<0||s.health>500||s.health%5!==0||
     s.downed!==(s.health===0)||!Number.isFinite(s.stamina)||s.stamina<0||s.stamina>200||
     frame.status!==(s.downed?'downed':'ready'))return hidden('synchronizing');
  lastObserved=s.observedAtMs;
  root.position.set(p.x,p.y+footOffset,p.z);
  root.visible=true;
  renderHud(Object.freeze({status:frame.status,health:s.health,maxHealth:s.maxHealth,stamina:s.stamina,
   controlsEnabled:!s.downed&&frame.controlsEnabled===true}));
  return true;
 }
 function close(){if(!closed){closed=true;hidden('closed')}}
 root.visible=false;
 return Object.freeze({render,close});
}
