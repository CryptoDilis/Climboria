import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Test-only DOM and deterministic socket double. The independent workerd
// workflow verifies the real socket; this does not claim a live browser game.
const origin='http://127.0.0.1:4173';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<button id="move">Move</button><button id="attack">Attack</button><output id="state"></output><div id="scene"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script type="module">
import {attachAuthoredLocalCombatTransport} from '/game/multiplayer/preview-combat-client-transport.mjs';
import {bindAuthoredLocalCombatControls} from '/game/multiplayer/authored-local-combat-controls.mjs';
import {createAuthoredLocalCharacterProjection} from '/game/multiplayer/authored-local-character-projection.mjs';
const T=window.THREE;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,320/200,.1,100);
const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(320,200);
document.querySelector('#scene').append(renderer.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x777777,1.5));
const gltf=await new T.GLTFLoader().loadAsync('/assets/characters/Climboria_Jarrell.glb');
const root=gltf.scene;let meshes=0;root.traverse(o=>{if(o.isMesh)meshes++});
const height=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
if(!Number.isFinite(height)||height<=0||!meshes)throw Error('Missing actual Jarrell GLB geometry');
root.scale.setScalar(1.9/height);root.updateMatrixWorld(true);
const offset=-new T.Box3().setFromObject(root).min.y;
scene.add(root);
let hud;
const projection=createAuthoredLocalCharacterProjection({root,footOffset:offset,renderHud:value=>hud=value});
function renderCharacter(frame){
 projection.render(frame);
 if(root.visible){camera.position.set(root.position.x+4,root.position.y+3,root.position.z+6);camera.lookAt(root.position.x,root.position.y+.9,root.position.z)}
 renderer.render(scene,camera);
}
const id='s_'+'1'.repeat(32),peer='s_'+'2'.repeat(32);
let snapshot={serverId:id,roomId:'preview-jarrell-camp-v1',health:500,maxHealth:500,downed:false,respawnAtMs:null,position:{x:-200,y:9,z:-170},observedAtMs:40000,stamina:200,sprintExhausted:false};
class Socket extends EventTarget {
 readyState=1; sent=[];
 send(raw){this.sent.push(JSON.parse(raw))}
 reply(packet){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(packet)}))}
 close(){this.readyState=3;this.dispatchEvent(new Event('close'))}
}
const socket=new Socket(),transport=attachAuthoredLocalCombatTransport(socket,{type:'preview-joined',fixture:'authored-camp-local',id,snapshot});
const move=document.querySelector('#move'),attack=document.querySelector('#attack'),output=document.querySelector('#state');
const ui=bindAuthoredLocalCombatControls({transport,render(frame){
 move.disabled=attack.disabled=!frame.controlsEnabled;
 output.textContent=JSON.stringify(frame);
 renderCharacter(frame);
}});
move.addEventListener('click',()=>ui.move(1,0,true));
attack.addEventListener('click',()=>ui.attack(peer));
window.addEventListener('blur',()=>ui.blur());
window.qa={socket,ui,transport,peer,id,
 sceneState(){root.updateMatrixWorld(true);return {attached:root.parent===scene,meshes,visible:root.visible,x:root.position.x,y:root.position.y,z:root.position.z,offset,ground:new T.Box3().setFromObject(root).min.y,triangles:renderer.info.render.triangles,hud}},
 dispose(){projection.close();renderer.dispose()},
 frame:t=>ui.frame(t),
 snapshot(patch={}){snapshot={...snapshot,...patch};socket.reply({type:'result',ok:true,snapshot})},
 reply:p=>socket.reply(p),
 hit:health=>socket.reply({type:'preview-hit',actorId:peer,targetId:id,health,damage:5,downed:health===0}),
 respawn:()=>socket.reply({type:'preview-respawn',targetId:id})};
</script>`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  try{
   await context.route(origin+'/__authored_combat_ci__',route=>route.fulfill({contentType:'text/html',body:html}));
   const page=await context.newPage();await page.goto(origin+'/__authored_combat_ci__');
   await page.waitForFunction(()=>!!window.qa,{},{timeout:45000});
   const sceneState=()=>page.evaluate(()=>qa.sceneState());
   const initial=await sceneState();
   assert.equal(initial.attached,true);assert.ok(initial.meshes>0&&initial.triangles>0);
   assert.equal(initial.visible,true);assert.equal(initial.x,-200);assert.equal(initial.z,-170);
   assert.ok(Math.abs(initial.ground-9)<.001);assert.equal(initial.hud.health,500);
   const state=()=>page.locator('#state').textContent().then(JSON.parse);
   const tap=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
   assert.equal((await state()).snapshot.health,500);
   await tap('#move');
   assert.equal((await state()).controlsEnabled,false);
   assert.equal((await state()).snapshot.position.x,-200);
   await page.evaluate(()=>{qa.reply({type:'result',ok:true});qa.frame(0);qa.snapshot({position:{x:-197,y:9,z:-170},observedAtMs:40200,stamina:197.6});qa.frame(1)});
   assert.equal((await state()).snapshot.position.x,-197);
   const moved=await sceneState();assert.equal(moved.x,-197);assert.ok(Math.abs(moved.ground-9)<.001);assert.equal(moved.hud.stamina,197.6);assert.ok(moved.triangles>0);
   await tap('#attack');
   assert.equal((await state()).controlsEnabled,false);
   await page.evaluate(()=>{qa.reply({type:'result',ok:true,targetId:qa.peer,damage:5});qa.hit(0);qa.frame(2)});
   assert.equal((await state()).snapshot,null);
   const stale=await sceneState();assert.equal(stale.visible,false);assert.equal(stale.triangles,0);assert.equal(stale.hud.health,null);
   assert.equal(await page.locator('#move').isDisabled(),true);
   await page.evaluate(()=>{qa.snapshot({health:0,downed:true,respawnAtMs:45200});qa.frame(3)});
   assert.equal((await state()).status,'downed');
   const downed=await sceneState();assert.equal(downed.visible,true);assert.equal(downed.hud.health,0);assert.equal(downed.hud.controlsEnabled,false);
   assert.equal(await page.locator('#attack').isDisabled(),true);
   await page.evaluate(()=>{qa.respawn();qa.snapshot({health:500,downed:false,respawnAtMs:null,position:{x:-200,y:9,z:-170},observedAtMs:45200,stamina:200});qa.frame(4)});
   assert.equal((await state()).controlsEnabled,true);
   const respawned=await sceneState();assert.equal(respawned.visible,true);assert.equal(respawned.x,-200);assert.equal(respawned.hud.health,500);
   await page.evaluate(()=>qa.ui.close());
   assert.equal((await state()).status,'closed');
   const closed=await sceneState();assert.equal(closed.visible,false);assert.equal(closed.triangles,0);assert.equal(closed.hud.status,'closed');
   await page.evaluate(()=>qa.dispose());
   assert.equal(await page.locator('#move').isDisabled(),true);
  }finally{await context.close()}
 }
 console.log('PASS: authored combat DOM controls and actual Jarrell GLB scene projection in desktop and touch Chromium (socket double)');
}finally{await browser.close()}
