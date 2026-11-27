import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Test-only DOM and deterministic socket double. The independent workerd
// workflow verifies the real socket; this does not claim a live browser game.
const origin='http://127.0.0.1:4173';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<button id="move">Move</button><button id="attack">Attack</button><output id="state"></output>
<script type="module">
import {attachAuthoredLocalCombatTransport} from '/game/multiplayer/preview-combat-client-transport.mjs';
import {bindAuthoredLocalCombatControls} from '/game/multiplayer/authored-local-combat-controls.mjs';
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
}});
move.addEventListener('click',()=>ui.move(1,0,true));
attack.addEventListener('click',()=>ui.attack(peer));
window.addEventListener('blur',()=>ui.blur());
window.qa={socket,ui,transport,peer,id,
 frame:t=>ui.frame(t),
 snapshot(patch={}){snapshot={...snapshot,...patch};socket.reply({type:'result',ok:true,snapshot})},
 reply:p=>socket.reply(p),
 hit:health=>socket.reply({type:'preview-hit',actorId:peer,targetId:id,health,damage:5,downed:health===0}),
 respawn:()=>socket.reply({type:'preview-respawn',targetId:id})};
</script>`;
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  try{
   await context.route(origin+'/__authored_combat_ci__',route=>route.fulfill({contentType:'text/html',body:html}));
   const page=await context.newPage();await page.goto(origin+'/__authored_combat_ci__');
   await page.waitForFunction(()=>!!window.qa);
   const state=()=>page.locator('#state').textContent().then(JSON.parse);
   const tap=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
   assert.equal((await state()).snapshot.health,500);
   await tap('#move');
   assert.equal((await state()).controlsEnabled,false);
   assert.equal((await state()).snapshot.position.x,-200);
   await page.evaluate(()=>{qa.reply({type:'result',ok:true});qa.frame(0);qa.snapshot({position:{x:-197,y:9,z:-170},observedAtMs:40200,stamina:197.6});qa.frame(1)});
   assert.equal((await state()).snapshot.position.x,-197);
   await tap('#attack');
   assert.equal((await state()).controlsEnabled,false);
   await page.evaluate(()=>{qa.reply({type:'result',ok:true,targetId:qa.peer,damage:5});qa.hit(0);qa.frame(2)});
   assert.equal((await state()).snapshot,null);
   assert.equal(await page.locator('#move').isDisabled(),true);
   await page.evaluate(()=>{qa.snapshot({health:0,downed:true,respawnAtMs:45200});qa.frame(3)});
   assert.equal((await state()).status,'downed');
   assert.equal(await page.locator('#attack').isDisabled(),true);
   await page.evaluate(()=>{qa.respawn();qa.snapshot({health:500,downed:false,respawnAtMs:null,position:{x:-200,y:9,z:-170},observedAtMs:45200,stamina:200});qa.frame(4)});
   assert.equal((await state()).controlsEnabled,true);
   await page.evaluate(()=>qa.ui.close());
   assert.equal((await state()).status,'closed');
   assert.equal(await page.locator('#move').isDisabled(),true);
  }finally{await context.close()}
 }
 console.log('PASS: authored combat DOM controls and authoritative snapshots in desktop and touch Chromium (socket double)');
}finally{await browser.close()}
