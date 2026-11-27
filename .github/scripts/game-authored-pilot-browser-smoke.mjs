import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {Miniflare} from 'miniflare';
const origin='http://127.0.0.1:4176';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<button id="move">Move</button><button id="attack">Attack</button><output id="state"></output><div id="scene"></div>
<script src="/__ci/three.js"></script><script src="/__ci/GLTFLoader.js"></script>
<script type="module">
import {mountAuthoredPilotCharacter} from '/game/multiplayer/authored-pilot-character-session.mjs';
const T=window.THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(45,320/200,.1,100);
const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(320,200);document.querySelector('#scene').append(renderer.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x777777,1.5));
const gltf=await new T.GLTFLoader().loadAsync('/assets/characters/Climboria_Jarrell.glb');
const root=new T.Group();root.add(gltf.scene);let meshes=0;root.traverse(o=>{if(o.isMesh)meshes++});
const height=new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
if(!Number.isFinite(height)||height<=0||!meshes)throw Error('Missing Jarrell geometry');
root.scale.setScalar(1.9/height);root.updateMatrixWorld(true);
const offset=-new T.Box3().setFromObject(root).min.y;scene.add(root);
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
if(!/^[a-f0-9]{64}$/.test(token))throw Error('Missing test ticket');
const socket=new WebSocket('ws://'+location.host+'/ws',['climboria-preview-v1','t-'+token]);
const move=document.querySelector('#move'),attack=document.querySelector('#attack'),output=document.querySelector('#state');
move.disabled=attack.disabled=true;
let hud,peer,time=0,lastSnapshot,frames=[];
socket.addEventListener('message',function receive(e){
 const p=JSON.parse(e.data);frames.push(p);
 if(p.type==='result'&&p.ok&&p.snapshot)lastSnapshot=p.snapshot;
 if(p.type!=='preview-joined')return;
 if(window.qa)throw Error('Unexpected second admission');
 lastSnapshot=p.snapshot;
 const ui=mountAuthoredPilotCharacter({socket,joined:p,root,footOffset:offset,clock:()=>time,renderHud:value=>{
  hud=value;move.disabled=attack.disabled=!value.controlsEnabled;output.textContent=JSON.stringify(value);
  if(root.visible){camera.position.set(root.position.x+4,root.position.y+3,root.position.z+6);camera.lookAt(root.position.x,root.position.y-offset+.9,root.position.z)}
  renderer.render(scene,camera);
 }});
 move.onclick=()=>ui.move(1,0,true);attack.onclick=()=>ui.attack(peer);
 window.qa={id:p.id,ui,frames,setPeer:id=>peer=id,last:()=>lastSnapshot,socketState:()=>socket.readyState,
 draw(){time++;return ui.frame()},poll(){time+=200;return ui.frame()},
 expire(){time+=p.expiresInMs;return ui.frame()},
 sceneState(){root.updateMatrixWorld(true);return {attached:root.parent===scene,meshes,visible:root.visible,x:root.position.x,y:root.position.y,z:root.position.z,ground:new T.Box3().setFromObject(root).min.y,triangles:renderer.info.render.triangles,hud}},
 dispose(){ui.close();renderer.dispose()}};
});
</script>`;
const moduleNames=['preview-combat-client-transport.mjs','preview-combat-client-state.mjs','authored-local-combat-controls.mjs','authored-local-character-projection.mjs','authored-pilot-character-session.mjs'];
const [CI_TRANSPORT,CI_STATE,CI_CONTROLS,CI_PROJECTION,CI_SESSION]=await Promise.all(moduleNames.map(name=>readFile(resolve('game/multiplayer',name),'utf8')));
const mf=new Miniflare({host:'127.0.0.1',port:4176,modules:true,modulesRoot:resolve('.'),scriptPath:resolve('.github/scripts/game-authored-pilot-browser-worker.mjs'),compatibilityDate:'2026-08-06',
 bindings:{AUTHORED_PILOT_BROWSER_CI:'true',AUTHORED_PILOT_ENABLED:'true',AUTHORED_PILOT_ACCOUNT_ALLOWLIST:A+','+B,CI_PAGE:html,CI_TRANSPORT,CI_STATE,CI_CONTROLS,CI_PROJECTION,CI_SESSION},
 durableObjects:{AUTHORED_PILOT_ROOMS:{className:'AuthoredPilotRoom',useSQLite:true}}});
let browser;
try{
 const address=await mf.ready;assert.equal(address.origin,origin);
 const ns=await mf.getDurableObjectNamespace('AUTHORED_PILOT_ROOMS'),stub=ns.get(ns.idFromName('preview-jarrell-camp-v1'));
 assert.equal((await mf.dispatchFetch(origin+'/_ticket',{method:'POST'})).status,404);
 async function ticket(id){
  const r=await stub.fetch('https://authored-pilot.internal/_ticket',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:id})});
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.fixture,'authored-camp-pilot');return data.ticket;
 }
 browser=await chromium.launch({headless:true,args:['--no-proxy-server','--enable-webgl','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 async function player(id,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1280,height:800}});
  for(const [url,path,type] of [['/__ci/three.js','node_modules/three/build/three.min.js','text/javascript'],['/__ci/GLTFLoader.js','node_modules/three/examples/js/loaders/GLTFLoader.js','text/javascript'],['/assets/characters/Climboria_Jarrell.glb','assets/characters/Climboria_Jarrell.glb','model/gltf-binary']])await context.route(origin+url,route=>route.fulfill({path:resolve(path),contentType:type}));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message).replace(/[a-f0-9]{64}/gi,'[redacted]').slice(0,250)));
  const token=await ticket(id);assert.match(token,/^[a-f0-9]{64}$/);
  const response=await page.goto(origin+'/__authored_runtime_ci__#'+token);assert.equal(response.status(),200);
  try{await page.waitForFunction(()=>!!window.qa,{},{timeout:25000})}catch(e){console.error('pilot page errors',errors);throw e}
  return {page,context,id:await page.evaluate(()=>qa.id),scene:()=>page.evaluate(()=>qa.sceneState()),snapshot:()=>page.evaluate(()=>qa.last()),tap:s=>mobile?page.locator(s).tap():page.locator(s).click()};
 }
 async function refresh(p){
  const n=await p.page.evaluate(()=>qa.frames.length);await p.page.evaluate(()=>qa.poll());
  await p.page.waitForFunction(n=>qa.frames.slice(n).some(f=>f.type==='result'&&f.ok&&f.snapshot),n,{timeout:5000});
  await p.page.evaluate(()=>qa.draw());
 }
 function geometry(v,s){
  assert.ok(v.attached&&v.visible&&v.meshes>0&&v.triangles>0);
  assert.equal(v.x,s.position.x);assert.equal(v.z,s.position.z);assert.ok(Math.abs(v.ground-s.position.y)<.001);
  assert.equal(v.hud.health,s.health);assert.equal(v.hud.stamina,s.stamina);
 }
 const a=await player(A,false),b=await player(B,true);
 await a.page.evaluate(id=>qa.setPeer(id),b.id);await b.page.evaluate(id=>qa.setPeer(id),a.id);
 geometry(await a.scene(),await a.snapshot());geometry(await b.scene(),await b.snapshot());
 await a.tap('#attack');
 await b.page.waitForFunction(()=>qa.last().health===495,{},{timeout:5000});
 await refresh(b);geometry(await b.scene(),await b.snapshot());
 assert.ok(await b.page.locator('#move').isEnabled());assert.equal((await b.scene()).hud.health,495);
 const old=(await b.scene()).x;
 await b.tap('#move');assert.equal((await b.scene()).x,old);
 await b.page.waitForFunction(()=>qa.frames.some(f=>f.type==='result'&&f.ok&&!f.snapshot),{},{timeout:5000});
 let moved;const until=Date.now()+4000;
 do{await new Promise(r=>setTimeout(r,120));await refresh(b);moved=await b.snapshot()}while(moved.position.x<=old+.05&&Date.now()<until);
 assert.ok(moved.position.x>old+.05);geometry(await b.scene(),moved);
 // Suspend UI time then cross the advertised session deadline: input and mesh must close.
 assert.equal(await b.page.evaluate(()=>qa.expire()),false);
 await b.page.waitForFunction(()=>qa.socketState()===WebSocket.CLOSED,{},{timeout:5000});
 const closed=await b.scene();assert.equal(closed.visible,false);assert.equal(closed.triangles,0);assert.equal(closed.hud.status,'closed');
 assert.ok(await b.page.locator('#move').isDisabled());assert.ok(await b.page.locator('#attack').isDisabled());
 await a.page.evaluate(()=>qa.dispose());await b.page.evaluate(()=>qa.dispose());await a.context.close();await b.context.close();
 console.log('PASS: actual private pilot DO native desktop/touch browser sockets, Jarrell GLB, committed HP/movement and deadline cleanup');
}finally{if(browser)await browser.close();await mf.dispose()}
