import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Miniflare} from 'miniflare';
const origin='http://127.0.0.1:4175';
const modulePaths=['preview-combat-client-transport.mjs','preview-combat-client-state.mjs','authored-local-combat-controls.mjs','authored-local-character-projection.mjs'];
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<button id="move">Move</button><button id="attack">Attack</button><output id="state"></output><div id="scene"></div>
<script src="/__ci/three.js"></script>
<script src="/__ci/GLTFLoader.js"></script>
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
const token=location.hash.slice(1);
history.replaceState(null,'',location.pathname);
if(!/^[a-f0-9]{64}$/.test(token))throw Error('Missing test ticket');
const socket=new WebSocket('ws://'+location.host+'/ws',['climboria-preview-v1','t-'+token]);
window.qaSocketStatus='connecting';
socket.addEventListener('open',()=>{window.qaSocketStatus='open'});
socket.addEventListener('error',()=>{window.qaSocketStatus='error'});
socket.addEventListener('close',e=>{window.qaSocketStatus='closed:'+e.code});
socket.addEventListener('message',function joined(e){
 const p=JSON.parse(e.data);if(p.type!=='preview-joined')return;
 socket.removeEventListener('message',joined);
 const transport=attachAuthoredLocalCombatTransport(socket,p),frames=[];
 const move=document.querySelector('#move'),attack=document.querySelector('#attack'),output=document.querySelector('#state');
 const ui=bindAuthoredLocalCombatControls({transport,render(f){
  move.disabled=attack.disabled=!f.controlsEnabled;output.textContent=JSON.stringify(f);
  renderCharacter(f);
 }});
 let time=0,peer=null;
 socket.addEventListener('message',e=>frames.push(JSON.parse(e.data)));
 move.onclick=()=>ui.move(1,0,true);
 attack.onclick=()=>ui.attack(peer);
 window.qa={id:p.id,transport,ui,frames,setPeer:id=>peer=id,
 sceneState(){root.updateMatrixWorld(true);return {attached:root.parent===scene,meshes,visible:root.visible,x:root.position.x,y:root.position.y,z:root.position.z,offset,ground:new T.Box3().setFromObject(root).min.y,triangles:renderer.info.render.triangles,hud}},
 dispose(){projection.close();renderer.dispose()},

  draw(){ui.frame(time++)},poll(){time+=200;ui.frame(time++)}};
});
</script>`;
const [CI_TRANSPORT,CI_STATE,CI_CONTROLS,CI_PROJECTION]=await Promise.all(modulePaths.map(name=>readFile(resolve('game/multiplayer',name),'utf8')));
const mf=new Miniflare({host:'127.0.0.1',port:4175,modules:true,modulesRoot:resolve('.'),
 scriptPath:resolve('.github/scripts/game-authored-browser-native-glb-worker.mjs'),
 compatibilityDate:'2026-08-06',bindings:{AUTHORED_BROWSER_CI:'true',CI_PAGE:html,CI_TRANSPORT,CI_STATE,CI_CONTROLS,CI_PROJECTION},
 durableObjects:{ROOM:{className:'AuthoredLocalRoom',useSQLite:true}}});
let browser;
try{
 const address=await mf.ready;
 assert.equal(address.origin,origin);
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
 const rejected=await mf.dispatchFetch(address.href+'ws',{headers:{Origin:origin,Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+'0'.repeat(64)}});
 assert.equal(rejected.status,401,'loopback upgrade must reach private ticket validation');
 browser=await chromium.launch({headless:true,args:['--no-proxy-server','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 async function player(id,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  const token=await ticket(id);assert.match(token,/^[a-f0-9]{64}$/);

  // Only exact asset subresources are fulfilled; page navigation and WS use real loopback workerd.
  for(const [url,path,type] of [['/__ci/three.js','node_modules/three/build/three.min.js','text/javascript'],['/__ci/GLTFLoader.js','node_modules/three/examples/js/loaders/GLTFLoader.js','text/javascript'],['/assets/characters/Climboria_Jarrell.glb','assets/characters/Climboria_Jarrell.glb','model/gltf-binary']]){
   await context.route(origin+url,route=>route.fulfill({path:resolve(path),contentType:type}));
  }
  const page=await context.newPage();
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  const diagnostic={handshake:[],pageErrors:[],consoleErrors:[],socketErrors:[]};
  const sanitize=s=>String(s).replace(/[a-f0-9]{64}/gi,'[redacted]').slice(0,300);
  page.on('console',m=>{if(m.type()==='error')diagnostic.consoleErrors.push(sanitize(m.text()))});
  page.on('websocket',ws=>ws.on('socketerror',e=>diagnostic.socketErrors.push(sanitize(e))));
  cdp.on('Network.webSocketHandshakeResponseReceived',e=>diagnostic.handshake.push(e.response.status));
  page.on('pageerror',e=>diagnostic.pageErrors.push(e.message.replace(/[a-f0-9]{64}/gi,'[redacted]').slice(0,300)));
  const response=await page.goto(origin+'/__authored_runtime_ci__#'+token);
  assert.equal(response.status(),200);
  assert.equal(await page.evaluate(()=>location.origin),origin);
  try{await page.waitForFunction(()=>!!window.qa,{},{timeout:60000})}
  catch(error){console.error('Native browser admission diagnostic',JSON.stringify({...diagnostic,socketStatus:await page.evaluate(()=>window.qaSocketStatus??'module-not-started')}));throw error}
  return {page,context,id:await page.evaluate(()=>qa.id),
   state:()=>page.locator('#state').textContent().then(JSON.parse),
   scene:()=>page.evaluate(()=>qa.sceneState()),
   tap:s=>mobile?page.locator(s).tap():page.locator(s).click(),
   ready:()=>page.waitForFunction(()=>qa.transport.canAct(),{},{timeout:10000}),
   draw:()=>page.evaluate(()=>qa.draw())};
 }
 const a=await player(A,false),b=await player(B,true);
 await a.page.evaluate(id=>qa.setPeer(id),b.id);
 await b.page.evaluate(id=>qa.setPeer(id),a.id);
 for(const player of [a,b]){
  const f=(await player.state()).snapshot,v=await player.scene();
  assert.ok(v.attached&&v.visible&&v.meshes>0&&v.triangles>0);
  assert.equal(v.hud.health,500);assert.equal(v.x,f.position.x);assert.equal(v.z,f.position.z);assert.ok(Math.abs(v.ground-f.position.y)<.001);
 }
 assert.equal((await b.state()).snapshot.health,500);
 await a.tap('#attack');await a.ready();
 await b.page.waitForFunction(()=>qa.transport.read()?.health===495&&qa.transport.canAct(),{},{timeout:10000});
 // First frame triggers a snapshot; wait for it before enabling controls.
 await b.draw();await b.ready();await b.draw();
 assert.equal((await b.state()).snapshot.health,495);
 assert.equal((await b.scene()).hud.health,495);
 const old=await b.scene();
 await b.tap('#move');
 assert.equal((await b.scene()).x,old.x,'input must not move the mesh speculatively');await b.ready();
 await tick(10);
 await b.page.evaluate(()=>qa.poll());await b.ready();await b.draw();
 const moved=(await b.state()).snapshot,mesh=await b.scene();
 assert.ok(moved.position.x>-197.2);assert.equal(mesh.x,moved.position.x);assert.equal(mesh.z,moved.position.z);assert.ok(Math.abs(mesh.ground-moved.position.y)<.001);assert.equal(mesh.hud.stamina,moved.stamina);assert.ok(mesh.triangles>0);
 await a.draw();await a.ready();await a.draw();
 await a.tap('#attack');await a.ready();
 assert.ok(await a.page.evaluate(()=>qa.frames.some(p=>p.type==='result'&&p.reason==='target-out-of-range')));
 assert.equal((await b.state()).snapshot.health,495);
 await b.page.evaluate(()=>qa.ui.close());
 assert.equal((await b.state()).status,'closed');
 const closed=await b.scene();assert.equal(closed.visible,false);assert.equal(closed.triangles,0);assert.equal(closed.hud.controlsEnabled,false);
 await b.page.evaluate(()=>qa.dispose());
 await a.page.evaluate(()=>{qa.ui.close();qa.dispose()});
 await a.context.close();await b.context.close();
 console.log('PASS: native Chromium desktop and touch workerd WebSockets drive actual Jarrell GLB transforms, HP, stamina, range denial and close');
}finally{if(browser)await browser.close();await mf.dispose()}
