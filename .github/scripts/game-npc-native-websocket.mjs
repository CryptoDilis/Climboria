import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {WebSocketServer} from 'ws';
import {PresenceRoom} from '../../game/multiplayer/presence-room.mjs';
import {createAutonomousAdventurer} from '../../game/npc/autonomous-adventurer.mjs';
import {createNpcRoomScheduler} from '../../game/npc/npc-room-scheduler.mjs';
// Loopback-only acceptance fixture. Actual native browser WebSockets and room
// scheduler; synthetic credentials, terrain and controlled server clock.
// Never import this file in a deployed Worker or expose its test admissions.
const nodes=[{id:'rest',x:254.5,z:80,action:'rest'},{id:'fish',x:248.5,z:80,action:'fish'},
 {id:'shore',x:248.5,z:86,action:'explore'},{id:'swim',x:223.6,z:86,action:'swim'}];
const edges=[['rest','fish'],['fish','rest'],['fish','shore'],['shore','fish'],['shore','swim'],['swim','shore']];
const world={sample:x=>x<240?{ground:-1,water:0}:{ground:0,water:null},canTraverse:()=>true,canAct:()=>true};
const factory=identity=>createAutonomousAdventurer({nodes,edges,world,spawn:identity.name==='Aurelion'?'rest':'shore',identityId:identity.id,personalityEnabled:true});
const room=new PresenceRoom(),sent=[],rejected=[],connections=new Map(),timers=new Map();
let now=0,timerId=0;
const scheduler=createNpcRoomScheduler({enabled:true,room,sessionId:'native-loopback',createActor:factory,
 now:()=>now,setTimer(fn,ms){assert.equal(ms,100);const id=++timerId;timers.set(id,fn);return id},clearTimer:id=>timers.delete(id)});
const server=createServer((req,res)=>{if(req.url!=='/'){res.writeHead(404).end();return}res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'}).end('<html><body></body></html>')});
const wss=new WebSocketServer({noServer:true,maxPayload:512,handleProtocols:p=>p.has('climboria-v1')?'climboria-v1':false});
const tickets=new Map([['a'.repeat(64),0],['b'.repeat(64),1]]);
const errors=[];
server.on('upgrade',(req,socket,head)=>{
 const protocols=(req.headers['sec-websocket-protocol']??'').split(',').map(v=>v.trim());
 const ticket=protocols.find(v=>/^t-[ab]{64}$/.test(v))?.slice(2);
 if(req.url!=='/ws'||req.headers.origin!==origin||protocols.length!==2||!protocols.includes('climboria-v1')||!tickets.has(ticket)){
  socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;
 }
 const i=tickets.get(ticket);tickets.delete(ticket);
 wss.handleUpgrade(req,socket,head,ws=>admit(ws,i));
});
function admit(ws,i){
 const id='s_'+String(i+1).repeat(32),entry={ws,id,spawn:false};
 connections.set(id,entry);
 const send=p=>{if(ws.readyState!==1)return;if(p.type==='npc-world-chat')sent.push({id,packet:p});ws.send(JSON.stringify(p))};
 const joined=room.connect({trustedSessionId:id,name:'QA Explorer '+i,model:'Jarrell',send,announceImmediately:false});
 if(!joined.ok){ws.close(1008);return}
 ws.on('error',e=>errors.push(e.message));
 ws.on('close',()=>{connections.delete(id);room.disconnect(id);if(!connections.size)scheduler.close()});
 ws.on('message',(raw,binary)=>{
  try{
   if(binary)throw Error('binary packet');
   const p=JSON.parse(raw.toString());
   if(p.type==='spawn'&&!entry.spawn&&p.position?.x===0&&p.position?.y===9.55&&p.position?.z===-30){
    entry.spawn=true;
    if(connections.size===2&&[...connections.values()].every(c=>c.spawn)){
     for(const c of connections.values())room.announce(c.id);
     assert.ok(scheduler.start());
     for(const c of connections.values())c.ws.send(JSON.stringify({type:'spawn-accepted',id:c.id,position:{x:0,y:9.55,z:-30},peers:room.snapshot().filter(p=>p.id!==c.id),npcChatEnabled:scheduler.capability()}));
    }
    return;
   }
   if(p.type==='move')return; // fixture does not exercise player movement
   rejected.push({id,type:p.type});ws.send(JSON.stringify({type:'rejected',reason:'unsupported-packet'}));
  }catch(e){errors.push(e.message);ws.close(1008)}
 });
}
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const clients=[];
 for(const [i,viewport] of [{width:1280,height:800},{width:390,height:844}].entries()){
  const context=await browser.newContext({viewport,isMobile:i===1,hasTouch:i===1});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');
  await page.evaluate(({i,origin})=>{
   if(i===1)document.body.classList.add('mobile-device');
   window.__climboriaGameReady=true;window.__climboriaCreatedHero={name:'QA Explorer '+i,model:'Jarrell'};
   window.__climboriaJarrellsPeak={player:{x:0,y:9.55,z:-30,mode:'walk'}};
   window.__fixturePeers=[];window.__CLIMBORIA_GAME_PEERS={add:p=>window.__fixturePeers.push(p.id),move(){},remove:id=>{window.__fixturePeers=window.__fixturePeers.filter(x=>x!==id)}};
   window.__CLIMBORIA_GAME_SAVE_CLIENT={auth:{getSession:async()=>({data:{session:{user:{id:'fixture-'+i},access_token:'fixture-token'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
   window.fetch=async url=>{
    if(String(url).includes('client-config.json'))return {ok:true,json:async()=>({schema:1,enabled:true,endpoint:'https://rooms.climboria.fun/'})};
    if(String(url)==='https://rooms.climboria.fun/ticket')return {ok:true,json:async()=>({ticket:(i?'b':'a').repeat(64),protocol:'climboria-v1',ttlSeconds:30})};
    throw Error('Unexpected fixture fetch');
   };
   const Native=window.WebSocket;
   window.WebSocket=class extends Native{
    constructor(url,protocols){
     if(String(url)!=='wss://rooms.climboria.fun/ws')throw Error('Unexpected WebSocket destination');
     super(origin.replace(/^http:/,'ws:')+'/ws',protocols);window.__fixtureSocket=this;
    }
   };
  },{i,origin});
  await page.addScriptTag({path:resolve('game/multiplayer/client-presence.js')});
  clients.push(page);
 }
 for(const page of clients){
  await page.waitForFunction(()=>document.querySelector('#climboria-room-status')?.textContent==='ONLINE: 2');
  assert.equal(await page.locator('#climboria-npc-chat-mute').isVisible(),true);
  await page.getByRole('textbox',{name:'World Chat message'}).fill('unsent human draft');
 }
 assert.equal(room.snapshot().length,2);assert.equal(scheduler.capability(),true);
 // Drive the server's deterministic clock only from this test process, not clients.
 for(let i=0;i<599;i++){
  const [id,fn]=timers.entries().next().value;timers.delete(id);now+=100;fn();
  if(sent.some(e=>e.packet.replyTo))break;
 }
 const events=sent.filter(e=>e.id==='s_'+'1'.repeat(32)).map(e=>e.packet);
 assert.ok(events.some(e=>e.replyTo&&events.some(p=>p.messageId===e.replyTo)));
 assert.deepEqual(sent.filter(e=>e.id==='s_'+'2'.repeat(32)).map(e=>e.packet),events);
 for(const page of clients){
  const log=page.locator('#climboria-world-chat-log [data-chat-kind="npc"]');
  await page.waitForFunction(n=>document.querySelectorAll('#climboria-world-chat-log [data-chat-kind="npc"]').length===n,events.length);
  assert.deepEqual(await log.allTextContents(),events.map(e=>e.name+': '+e.text));
  assert.equal(await page.getByRole('textbox',{name:'World Chat message'}).inputValue(),'unsent human draft');
  assert.equal(await page.evaluate(()=>window.__fixturePeers.length),1);
 }
 // A real inbound socket frame cannot create an NPC chat event.
 await clients[0].evaluate(p=>window.__fixtureSocket.send(JSON.stringify(p)),events[0]);
 for(let i=0;i<100&&!rejected.length;i++)await new Promise(r=>setTimeout(r,10));
 assert.deepEqual(rejected,[{id:'s_'+'1'.repeat(32),type:'npc-world-chat'}]);assert.equal(sent.length,events.length*2);
 // Real transport close clears transcript and visible room member.
 for(const page of clients)await page.evaluate(()=>window.__fixtureSocket.close(4001,'fixture-ended'));
 for(const page of clients){
  await page.waitForFunction(()=>document.querySelector('#climboria-world-chat-log')?.children.length===0);
  assert.equal(await page.locator('#climboria-npc-chat-mute').isVisible(),false);
 }
 for(let i=0;i<100&&connections.size;i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(connections.size,0);assert.equal(room.snapshot().length,0);assert.equal(scheduler.capability(),false);assert.equal(timers.size,0);
 assert.deepEqual(errors,[]);
 console.log('NPC native loopback WebSocket PASS',JSON.stringify({events:events.length,linkedReply:true,clients:2,nativeSocket:true,forgedPacketRejected:true,roomEmpty:true,scheduler:scheduler.audit()}));
}finally{
 scheduler.close();await browser.close();for(const ws of wss.clients)ws.terminate();wss.close();await new Promise(r=>server.close(r));
}
