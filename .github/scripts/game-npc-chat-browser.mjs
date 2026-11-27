import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {PresenceRoom} from '../../game/multiplayer/presence-room.mjs';
import {createAutonomousAdventurer} from '../../game/npc/autonomous-adventurer.mjs';
import {createNpcRoomDialogue} from '../../game/npc/npc-room-dialogue.mjs';
// Actual Chromium DOM + actual room bridge; injected local transport and auth
// fixtures only. No external network, production WSS, credentials or real accounts.
const nodes=[{id:'rest',x:254.5,z:80,action:'rest'},{id:'fish',x:248.5,z:80,action:'fish'},
 {id:'shore',x:248.5,z:86,action:'explore'},{id:'swim',x:223.6,z:86,action:'swim'}];
const edges=[['rest','fish'],['fish','rest'],['fish','shore'],['shore','fish'],['shore','swim'],['swim','shore']];
const world={sample:x=>x<240?{ground:-1,water:0}:{ground:0,water:null},canTraverse:()=>true,canAct:()=>true};
const factory=identity=>createAutonomousAdventurer({nodes,edges,world,spawn:identity.name==='Aurelion'?'rest':'shore',identityId:identity.id,personalityEnabled:true});
const room=new PresenceRoom(),bridge=createNpcRoomDialogue({enabled:true,room,sessionId:'browser-fixture',createActor:factory});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
try{
 const clients=[];
 for(const [i,viewport] of [{width:1280,height:800},{width:390,height:844}].entries()){
  const context=await browser.newContext({viewport,isMobile:i===1,hasTouch:i===1});
  await context.route('**/*',route=>route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html><body></body></html>');
  await page.evaluate(({i})=>{
   if(i===1)document.body.classList.add('mobile-device');
   window.__climboriaGameReady=true;window.__climboriaCreatedHero={name:'QA Explorer '+i,model:'Jarrell'};
   window.__climboriaJarrellsPeak={player:{x:0,y:9.55,z:-30,mode:'walk'}};
   window.__fixturePeers=[];window.__CLIMBORIA_GAME_PEERS={add:p=>window.__fixturePeers.push(p.id),move(){},remove:id=>{window.__fixturePeers=window.__fixturePeers.filter(x=>x!==id)}};
   window.__CLIMBORIA_GAME_SAVE_CLIENT={auth:{getSession:async()=>({data:{session:{user:{id:'fixture-'+i},access_token:'fixture-token'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
   window.fetch=async url=>{
    if(String(url).includes('client-config.json'))return {ok:true,json:async()=>({schema:1,enabled:true,endpoint:'https://rooms.climboria.fun/'})};
    if(String(url)==='https://rooms.climboria.fun/ticket')return {ok:true,json:async()=>({ticket:'b'.repeat(64),protocol:'climboria-v1',ttlSeconds:30})};
    throw Error('Unexpected fixture network request');
   };
   window.WebSocket=class{
    static OPEN=1;static CLOSED=3;
    constructor(){this.readyState=1;this.bufferedAmount=0;this.sent=[];window.__fixtureSocket=this}
    send(data){this.sent.push(JSON.parse(data))}
    close(){this.readyState=3;this.onclose?.({code:4001})}
   };
  },{i});
  await page.addScriptTag({path:resolve('game/multiplayer/client-presence.js')});
  await page.waitForFunction(()=>!!window.__fixtureSocket?.onopen);
  await page.evaluate(()=>window.__fixtureSocket.onopen());
  const id='s_'+String(i+1).repeat(32),packets=[];
  assert.ok(room.connect({trustedSessionId:id,name:'QA Explorer '+i,model:'Jarrell',send:p=>packets.push(p)}).ok);
  clients.push({page,id,packets});
 }
 async function deliver(c,p){await c.page.evaluate(packet=>window.__fixtureSocket.onmessage({data:JSON.stringify(packet)}),p)}
 for(const c of clients){
  await deliver(c,c.packets.find(p=>p.type==='welcome'));
  await deliver(c,{type:'spawn-accepted',id:c.id,position:{x:0,y:9.55,z:-30},peers:room.snapshot().filter(p=>p.id!==c.id),npcChatEnabled:true});
  assert.equal(await c.page.locator('#climboria-room-status').textContent(),'ONLINE: 2');
  assert.equal(await c.page.locator('#climboria-npc-chat-mute').isVisible(),true);
  await c.page.getByRole('textbox',{name:'World Chat message'}).fill('unsent human draft');
 }
 const events=[];let now=0;
 for(;now<600000;now+=100){const p=bridge.tick(now);if(p)events.push(p);if(events.some(e=>e.replyTo))break}
 assert.ok(events.length>=2);const reply=events.find(e=>e.replyTo);assert.ok(events.some(e=>e.messageId===reply.replyTo));
 for(const c of clients){
  const packets=c.packets.filter(p=>p.type==='npc-world-chat');assert.deepEqual(packets,events);
  for(const p of packets)await deliver(c,p);
  await deliver(c,packets.at(-1)); // duplicate is ignored
  const log=c.page.locator('#climboria-world-chat-log [data-chat-kind="npc"]');
  assert.deepEqual(await log.allTextContents(),events.map(e=>e.name+': '+e.text));
  assert.equal(await c.page.getByRole('textbox',{name:'World Chat message'}).inputValue(),'unsent human draft');
  assert.equal(await c.page.locator('#climboria-room-status').textContent(),'ONLINE: 2');
  assert.equal(await c.page.evaluate(()=>window.__fixturePeers.length),1);
 }
 const [a,b]=clients;await b.page.locator('#climboria-npc-chat-mute').click();
 let next=null;for(now+=100;now<900000;now+=100){next=bridge.tick(now);if(next)break}
 assert.ok(next);for(const c of clients)await deliver(c,next);
 assert.equal(await a.page.locator('#climboria-world-chat-log [data-chat-kind="npc"]').count(),events.length+1);
 assert.equal(await b.page.locator('#climboria-world-chat-log [data-chat-kind="npc"]').count(),events.length);
 await b.page.locator('#climboria-npc-chat-mute').click();await deliver(b,next);
 assert.equal(await b.page.locator('#climboria-world-chat-log [data-chat-kind="npc"]').count(),events.length);
 for(const c of clients){
  assert.equal(room.receive(c.id,next).ok,false);
  await c.page.evaluate(()=>window.__fixtureSocket.close());
  assert.equal(await c.page.locator('#climboria-world-chat-log').locator('div').count(),0);
  assert.equal(await c.page.locator('#climboria-npc-chat-mute').isVisible(),false);
 }
 assert.deepEqual(errors,[]);
 console.log('NPC two-browser private room fixture PASS',JSON.stringify({events:events.map(e=>({id:e.messageId,name:e.name,text:e.text,replyTo:e.replyTo})),desktop:1280,mobile:390,online:2,muting:true,duplicateRejected:true,draftsPreserved:true}));
}finally{bridge.close();await browser.close()}
