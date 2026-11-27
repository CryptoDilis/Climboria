import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {Miniflare} from 'miniflare';
const origin='http://127.0.0.1:4173';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const mf=new Miniflare({host:'127.0.0.1',port:0,modules:true,modulesRoot:resolve('.'),
 scriptPath:resolve('.github/scripts/game-authored-browser-local-worker.mjs'),
 compatibilityDate:'2026-08-06',bindings:{AUTHORED_BROWSER_CI:'true'},
 durableObjects:{ROOM:{className:'AuthoredLocalRoom',useSQLite:true}}});
let browser;
try{
 const address=await mf.ready;
 assert.equal(address.hostname,'127.0.0.1');
 const wsURL='ws://127.0.0.1:'+address.port+'/ws';
 const ns=await mf.getDurableObjectNamespace('ROOM'),stub=ns.get(ns.idFromName('preview-jarrell-camp-v1'));
 async function ticket(id){
  const r=await stub.fetch('https://local.internal/ticket',{method:'POST',body:id});
  assert.equal(r.status,200);return (await r.json()).ticket;
 }
 async function tick(n){
  for(let i=0;i<n;i++){
   const r=await stub.fetch('https://local.internal/tick',{method:'POST'});
   assert.equal((await r.json()).ok,true);
  }
 }
 assert.equal((await mf.dispatchFetch(address.href+'ticket',{method:'POST'})).status,404);
 browser=await chromium.launch({headless:true});
 async function player(id,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  const token=await ticket(id);
  const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<button id="move">Move</button><button id="attack">Attack</button><output id="state"></output>
<script type="module">
import {attachAuthoredLocalCombatTransport} from '/game/multiplayer/preview-combat-client-transport.mjs';
import {bindAuthoredLocalCombatControls} from '/game/multiplayer/authored-local-combat-controls.mjs';
const socket=new WebSocket(${JSON.stringify(wsURL)},['climboria-preview-v1',${JSON.stringify('t-'+token)}]);
socket.addEventListener('message',function joined(e){
 const p=JSON.parse(e.data);if(p.type!=='preview-joined')return;
 socket.removeEventListener('message',joined);
 const transport=attachAuthoredLocalCombatTransport(socket,p),frames=[];
 const move=document.querySelector('#move'),attack=document.querySelector('#attack'),output=document.querySelector('#state');
 const ui=bindAuthoredLocalCombatControls({transport,render(f){
  move.disabled=attack.disabled=!f.controlsEnabled;output.textContent=JSON.stringify(f);
 }});
 let time=0,peer=null;
 socket.addEventListener('message',e=>frames.push(JSON.parse(e.data)));
 move.onclick=()=>ui.move(1,0,true);
 attack.onclick=()=>ui.attack(peer);
 window.qa={id:p.id,transport,ui,frames,setPeer:id=>peer=id,
  draw(){ui.frame(time++)},poll(){time+=200;ui.frame(time++)}};
});
</script>`;
  await context.route(origin+'/__authored_runtime_ci__',route=>route.fulfill({contentType:'text/html',body:html}));
  const page=await context.newPage();await page.goto(origin+'/__authored_runtime_ci__');
  await page.waitForFunction(()=>!!window.qa,{},{timeout:10000});
  return {page,context,id:await page.evaluate(()=>qa.id),
   state:()=>page.locator('#state').textContent().then(JSON.parse),
   tap:s=>mobile?page.locator(s).tap():page.locator(s).click(),
   ready:()=>page.waitForFunction(()=>qa.transport.canAct(),{},{timeout:10000}),
   draw:()=>page.evaluate(()=>qa.draw())};
 }
 const a=await player(A,false),b=await player(B,true);
 await a.page.evaluate(id=>qa.setPeer(id),b.id);
 await b.page.evaluate(id=>qa.setPeer(id),a.id);
 assert.equal((await b.state()).snapshot.health,500);
 await a.tap('#attack');await a.ready();
 await b.page.waitForFunction(()=>qa.transport.read()?.health===495&&qa.transport.canAct(),{},{timeout:10000});
 // First frame triggers a snapshot; wait for it before enabling controls.
 await b.draw();await b.ready();await b.draw();
 assert.equal((await b.state()).snapshot.health,495);
 await b.tap('#move');await b.ready();
 await tick(10);
 await b.page.evaluate(()=>qa.poll());await b.ready();await b.draw();
 assert.ok((await b.state()).snapshot.position.x>-197.2);
 await a.draw();await a.ready();await a.draw();
 await a.tap('#attack');await a.ready();
 assert.ok(await a.page.evaluate(()=>qa.frames.some(p=>p.type==='result'&&p.reason==='target-out-of-range')));
 assert.equal((await b.state()).snapshot.health,495);
 await b.page.evaluate(()=>qa.ui.close());
 assert.equal((await b.state()).status,'closed');
 await a.page.evaluate(()=>qa.ui.close());
 await a.context.close();await b.context.close();
 console.log('PASS: native Chromium desktop and touch WebSockets, committed HP and movement, range denial, UI close');
}finally{if(browser)await browser.close();await mf.dispose()}
