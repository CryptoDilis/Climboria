import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TextEncoder} from 'node:util';

const source=readFileSync('game/multiplayer/client-presence.js','utf8');
const config=JSON.parse(readFileSync('game/multiplayer/client-config.json','utf8'));
const peer={id:'s_'+'a'.repeat(32),name:'Explorer B',model:'Jarrell',position:{x:0,y:9.5,z:-30}};
function harness(enabled,{initialSession={user:{id:'verified-uuid'},access_token:'verified-token'},ticketGate=null,ticketJSONGate=null,sessionGate=null,ticketFailures=0,ticketStatuses=[],ticketPayloads=[],delayedClients=false,configUnavailable=false,configFailures=0,configGate=null,configBadSchema=false,refreshMode=null,guest=false,heroOwner=null,mobile=false}={}){
 const state={session:initialSession,ticketFailures,ticketStatuses:[...ticketStatuses],ticketPayloads:[...ticketPayloads],configFailures,configCalls:0};
 const authListeners=[];
 const clients=[],adds=[],moves=[],removes=[],punches=[],speeches=[],calls=[],timers=[],created=[];
 const createElement=tag=>{
  const node={tag,style:{},children:[],textContent:'',id:'',listeners:new Map(),
   appendChild(child){this.children.push(child);return child},
   replaceChildren(...children){this.children=children},
   addEventListener(kind,fn){
    if(!this.listeners.has(kind))this.listeners.set(kind,[]);
    this.listeners.get(kind).push(fn);
   },
   click(){for(const fn of this.listeners.get('click')||[])fn()},
   setAttribute(name,value){this[name]=value}
  };
  created.push(node);return node;
 };
 const events=[],documentListeners=new Map();
 const document={documentElement:{dataset:{}},body:createElement('body'),
  createElement,addEventListener(kind,fn){
   if(!documentListeners.has(kind))documentListeners.set(kind,[]);
   documentListeners.get(kind).push(fn);
  },
  dispatchEvent(event){
   events.push(event.type);
   for(const fn of documentListeners.get(event.type)||[])fn(event);
   return true;
  }};
 document.body.classList={contains:name=>mobile&&name==='mobile-device'};
 const window={__climboriaGameReady:true,__climboriaCreatedHero:{name:'Explorer A',model:'Jarrell',...(heroOwner===null?{}:{ownerId:heroOwner})},__climboriaGuestMode:guest,
  __climboriaJarrellsPeak:{
   player:{x:0,y:9.55,z:-30,mode:'walk'},
   enterRoomEntry(){Object.assign(this.player,{x:0,y:9.55,z:-30});return true},
   resumeAtRoomPosition(pos){
    if(!pos||!['x','y','z'].every(k=>Number.isFinite(pos[k])))return false;
    Object.assign(this.player,{x:pos.x,y:pos.y,z:pos.z});
    return true;
   }
  },
  __CLIMBORIA_GAME_PEERS:{
   add:x=>adds.push(x),move:(id,pos)=>moves.push({id,pos}),
   remove:id=>removes.push(id),punch:id=>punches.push(id),speak:(id,text)=>speeches.push({id,text})
  },
  __CLIMBORIA_GAME_SAVE_CLIENT:{auth:{
   getSession:async()=>{const snapshot=state.session;if(sessionGate)await sessionGate;return {data:{session:snapshot}}},
   onAuthStateChange:fn=>{authListeners.push(fn);return {data:{subscription:{unsubscribe(){const i=authListeners.indexOf(fn);if(i>=0)authListeners.splice(i,1)}}}}}
  }},addEventListener(){}};
 const refreshCounts={calls:0};
 if(refreshMode){
  window.__CLIMBORIA_GAME_SAVE_CLIENT.auth.refreshSession=async()=>{
   refreshCounts.calls++;
   if(refreshMode==='success'){
    state.session={...state.session,access_token:'refreshed-token'};
    return {data:{session:state.session},error:null};
   }
   if(refreshMode==='different-user')return {data:{session:{user:{id:'another-user'},access_token:'different-user-token'}},error:null};
   if(refreshMode==='anonymous')return {data:{session:{user:{id:state.session.user.id,is_anonymous:true},access_token:'anonymous-token'}},error:null};
   return {data:{session:null},error:new Error('refresh unavailable')};
  };
 }
 const lateAuth=window.__CLIMBORIA_GAME_SAVE_CLIENT;
 const latePeers=window.__CLIMBORIA_GAME_PEERS;
 if(delayedClients){
  delete window.__CLIMBORIA_GAME_SAVE_CLIENT;
  delete window.__CLIMBORIA_GAME_PEERS;
 }
 class Socket{
  static OPEN=1;static CLOSED=3;
  constructor(url,protocols){this.url=url;this.protocols=protocols;this.readyState=1;this.sent=[];clients.push(this)}
  send(data){this.sent.push(JSON.parse(data))}
  close(){this.readyState=3;this.onclose?.({})}
 }
 const fetch=async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).includes('client-config.json')){
   state.configCalls++;
   if(state.configCalls===1&&configGate)await configGate;
   if(configUnavailable||state.configFailures-->0)return {ok:false,status:503};
   return {ok:true,json:async()=>({schema:configBadSchema?2:1,enabled,
    endpoint:enabled?'https://rooms.climboria.fun/':null})};
  }
  if(String(url)==='https://rooms.climboria.fun/ticket'){
   assert.equal(options.headers.Authorization,'Bearer '+state.session?.access_token);
   if(ticketGate)await ticketGate;
   if(state.ticketStatuses.length)return {ok:false,status:state.ticketStatuses.shift()};
   if(state.ticketFailures-->0)return {ok:false};
   return {ok:true,json:async()=>{if(ticketJSONGate)await ticketJSONGate;
    if(state.ticketPayloads.length)return state.ticketPayloads.shift();
    return {ticket:'b'.repeat(64),protocol:'climboria-v1',ttlSeconds:30};
   }};
  }
  throw Error('unexpected fetch');
 };
 const context={window,document,fetch,URL,TextEncoder,AbortController,WebSocket:Socket,
  Event:class{constructor(type){this.type=type}},
  location:{href:'https://climboria.fun/game/play.html'},
  setTimeout:(fn,delay)=>{timers.push({fn,delay,cancelled:false});return timers.length},
  setInterval:()=>1,clearInterval(){},clearTimeout:id=>{if(timers[id-1])timers[id-1].cancelled=true},console};
 vm.runInNewContext(source,context,{filename:'client-presence.js'});
 return {window,document,clients,adds,moves,removes,punches,speeches,calls,timers,created,refreshCounts,events,
  releaseGameClients:()=>{
   window.__CLIMBORIA_GAME_SAVE_CLIENT=lateAuth;
   window.__CLIMBORIA_GAME_PEERS=latePeers;
  },
  authChange:(session,event=session?'SIGNED_IN':'SIGNED_OUT')=>{
   state.session=session;
   for(const fn of [...authListeners])fn(event,session);
  },
  runNextTimer:()=>{
   const timer=timers.find(t=>!t.cancelled);
   if(!timer)throw Error('No active connection or UI timer to run');
   timer.cancelled=true;timer.fn();return timer.delay;
  },
  state
 };
}
async function flush(){
  for(let i=0;i<12;i++)await Promise.resolve();
  await new Promise(resolve=>setImmediate(resolve));
}
async function waitFor(check, ms=600){
  const deadline=Date.now()+ms;
  while(!check()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
}
test('disabled multiplayer never creates fake socket or player',async()=>{
 assert.equal(config.enabled,true);
 assert.equal(config.endpoint,'https://rooms.climboria.fun/');
 const h=harness(false);await flush();
 assert.equal(h.clients.length,0);assert.equal(h.adds.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'disabled');
});
test('live Game waits for delayed Supabase and renderer instead of permanently losing multiplayer and World Chat',async()=>{
 const h=harness(true,{delayedClients:true});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'starting');
 assert.equal(h.clients.length,0);
 assert.ok(h.created.some(node=>node.id==='climboria-room-status'&&node.textContent.includes('LOADING GAME')));
 h.releaseGameClients();
 assert.equal(h.runNextTimer(),500);
 await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
 const ws=h.clients[0];
 ws.onopen();
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(node=>node.id==='climboria-world-chat-toggle'));
});
test('slow Game login and renderer load recover beyond original 30-second terminal timeout',async()=>{
 const h=harness(true,{delayedClients:true});
 await flush();
 for(let i=0;i<60;i++){
  assert.equal(h.runNextTimer(),500,'initial dependency retry every 500ms');
  await flush();
 }
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'slow-start');
 assert.equal(h.clients.length,0);
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,0,
  'missing Game auth dependencies must never mint a ticket or fake online');
 h.releaseGameClients();
 assert.equal(h.runNextTimer(),3000,'late dependency check must back off but keep trying');
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'legitimate late renderer and Game auth recover automatically');
 const ws=h.clients[0];ws.onopen();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'spawn-pending');
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false);
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(node=>node.id==='climboria-world-chat-toggle'));
});

test('visible room stage status distinguishes ticket, socket and Sanctuary spawn without claiming online',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'ticket-request');
 const badge=h.created.find(node=>node.id==='climboria-room-status');
 assert.ok(badge.textContent.includes('VERIFYING ROOM ACCESS'));
 assert.equal(h.clients.length,0);
 release();
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'socket-connecting');
 assert.ok(badge.textContent.includes('CONNECTING TO WORLD'));
 const ws=h.clients[0];ws.onopen();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'spawn-pending');
 assert.ok(badge.textContent.includes('VERIFYING SAVED POSITION'));
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false);
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting');
 assert.ok(badge.textContent.includes('JOINING WORLD'));
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(badge.textContent.includes('ONLINE'));
});

test('expired registered session ticket gives clear sign-in status and no fake chat',async()=>{
 const h=harness(true,{ticketStatuses:[401]});
 await flush();
 await waitFor(()=>h.document.documentElement.dataset.climboriaMultiplayer==='login-required');
 assert.equal(h.clients.length,0);
 assert.equal(h.adds.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.ok(h.created.some(node=>node.id==='climboria-room-status'&&node.textContent.includes('SIGN IN AGAIN')));
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false);
});
test('origin-denied game ticket stays offline without fake peers or chat',async()=>{
 const h=harness(true,{ticketStatuses:[403]});
 await flush();
 await waitFor(()=>h.document.documentElement.dataset.climboriaMultiplayer==='offline');
 assert.equal(h.clients.length,0);
 assert.equal(h.adds.length,0);
 assert.ok(h.created.some(node=>node.id==='climboria-room-status'&&node.textContent.includes('ROOM ACCESS DENIED')));
});

test('multiplayer config failures stay visibly retryable without fake chat or socket',async()=>{
 const h=harness(true,{configUnavailable:true});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'config-unavailable');
 assert.equal(h.runNextTimer(),600);
 await flush();
 assert.equal(h.runNextTimer(),600);
 await flush();
 assert.equal(h.runNextTimer(),3000,'temporary CDN outage must keep a slow retry alive');
 await flush();
 assert.equal(h.state.configCalls,4,'a fourth config attempt must be possible');
 assert.equal(h.clients.length,0);
 assert.equal(h.adds.length,0);
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false);
 assert.ok(h.created.some(node=>node.id==='climboria-room-status'&&node.textContent.includes('SETTINGS UNAVAILABLE')));
});
test('temporary multiplayer config outage recovers after the old three-attempt limit',async()=>{
 const h=harness(true,{configFailures:4});
 await flush();
 for(const delay of [600,600,3000,3000]){
  assert.equal(h.runNextTimer(),delay,'retry backoff must be bounded');
  await flush();
 }
 assert.equal(h.state.configCalls,5);
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'same Game page must authenticate after CDN recovers');
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false,
  'successful config alone never unlocks chat without a trusted spawn');
});
test('stalled Game room config fetch is bounded and recovers on a second request',async()=>{
 const h=harness(true,{configGate:new Promise(()=>{})});
 await flush();
 assert.equal(h.clients.length,0);
 assert.equal(h.runNextTimer(),8000,'config fetch and body parsing must have a deadline');
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'config-unavailable');
 assert.equal(h.runNextTimer(),600);
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.state.configCalls,2);
 assert.equal(h.clients.length,1,'hung config response must not block recovery forever');
});
test('invalid multiplayer settings schema fails closed with no retries or room socket',async()=>{
 const h=harness(true,{configBadSchema:true});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'config-unavailable');
 assert.equal(h.clients.length,0);
 assert.equal(h.state.configCalls,1);
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false);
});
test('live Game refuses the retired forced-Sanctuary mobile prompt',()=>{
 const game=readFileSync('game/play.html','utf8');
 assert.doesNotMatch(game,/climboria:room-return-to-sanctuary/);
 assert.match(game,/const TP=\{1:\(\)=>tp\(0,-30,0\)/,
  'Game must keep Sanctuary at the actual protected server spawn center');
 assert.match(game,/client-presence\.js\?v=20261126-game-mobile-chat-2/,
  'production Game must load fresh Nearby Chat and remote size renderer');
});

test('saved location does not show a Sanctuary prompt or fabricate peer admission',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 assert.equal(h.created.some(n=>n.id==='climboria-room-return-sanctuary'),false);
 assert.equal(h.clients.length,0,'untrusted ticket without resume cannot spawn a remote hero');
 assert.equal(h.calls.filter(x=>x.url.includes('/ticket')).length,1,
  'a single signed-in ticket lookup can check for a server resume anchor');
 assert.equal(h.created.some(n=>n.id==='climboria-world-chat-panel'),false);
});

test('local waypoint change preserves player location and invalidates old room without forced return',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.adds.length,1);
 const chat=h.created.find(el=>el.id==='climboria-world-chat-toggle');
 h.window.__climboriaJarrellsPeak.player.x=500;
 h.document.dispatchEvent({type:'climboria:local-teleport'});
 assert.equal(ws.readyState,3);
 assert.deepEqual(h.removes,[peer.id]);
 assert.equal(chat.style.display,'none');
 assert.equal(h.window.__climboriaJarrellsPeak.player.x,500,'local saved position is not overwritten');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 assert.equal(h.created.some(el=>el.id==='climboria-room-return-sanctuary'),false);
 assert.equal(h.clients.length,1,'debug waypoint cannot forge rejoin/remote players');
});
test('local teleport aborts an unverified pending room ticket, without new fake admission',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'ticket-request');
 h.document.dispatchEvent({type:'climboria:local-teleport'});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 const original=h.calls.find(call=>call.url.endsWith('/ticket'));
 assert.equal(original.options.signal.aborted,true);
 release();await flush();
 assert.equal(h.clients.length,0,'cancelled ticket must never create an old socket');
});
test('Game waypoint travel publishes network-invalidation without Sanctuary coercion',()=>{
 const game=readFileSync('game/play.html','utf8');
 assert.ok(game.includes("document.dispatchEvent(new Event('climboria:local-teleport'))"));
 assert.equal(game.includes('climboria:room-return-to-sanctuary'),false);
});
test('server close 4001 shows a truthful same-account warning instead of WebSocket eviction loops',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(node=>node.id==='climboria-world-chat-toggle'));
 ws.onclose({code:4001,reason:'replaced-by-same-account'});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'same-account-in-use');
 assert.equal(h.adds.length,0);
 assert.equal(h.created.find(node=>node.id==='climboria-world-chat-toggle').style.display,'none');
 assert.ok(h.created.some(node=>node.id==='climboria-room-status'&&node.textContent.includes('SAME ACCOUNT')));
 assert.equal(h.timers.filter(t=>!t.cancelled&&t.delay===5000).length,0,
  'duplicate same identity must not automatically fight the newer socket');
 h.authChange(h.state.session,'TOKEN_REFRESHED');
 await flush();
 assert.equal(h.clients.length,1,'same-user token refresh cannot revive an eviction loop');
 const retry=h.created.find(node=>node.id==='climboria-room-retry-same-account');
 assert.ok(retry,'player may explicitly retry after closing the other tab');
 retry.click();
 assert.equal(h.runNextTimer(),0);
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2,'retry is explicit and obtains another real verified ticket');
 assert.equal(h.created.find(node=>node.id==='climboria-world-chat-toggle').style.display,'none',
  'retry alone does not create a fake chat');
});
test('different authenticated account can recover after previous same-account replacement',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 h.clients[0].onclose({code:4001,reason:'replaced-by-same-account'});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'same-account-in-use');
 h.authChange({user:{id:'different-registered-uuid'},access_token:'different-registered-token'});
 assert.equal(h.runNextTimer(),0,'identity switch clears same-account block');
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2);
 const tickets=h.calls.filter(c=>c.url.endsWith('/ticket'));
 assert.equal(tickets.at(-1).options.headers.Authorization,'Bearer different-registered-token');
});
test('real authenticated WebSocket messages are required before peers appear',async()=>{
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1||h.document.documentElement.dataset.climboriaMultiplayer==='offline');
 assert.equal(h.clients.length,1,JSON.stringify({status:h.document.documentElement.dataset,requests:h.calls.map(c=>c.url),timers:h.timers.map(t=>t.delay)}));
 assert.equal(h.adds.length,0,'no synthesized/ghost players before trusted welcome');
 const socket=h.clients[0];
 socket.onopen();
 assert.equal(socket.sent[0].type,'spawn');
 assert.ok(socket.protocols.includes('climboria-v1'));
 assert.equal(socket.url,'wss://rooms.climboria.fun/ws');
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(h.adds.length,0);
 socket.onmessage({data:JSON.stringify({type:'player-joined',player:peer})});
 assert.equal(h.adds.length,1);assert.equal(h.adds[0].name,'Explorer B');
 socket.onmessage({data:JSON.stringify({type:'player-moved',id:peer.id,position:{x:.5,y:9.5,z:-30}})});
 assert.equal(h.moves.length,1);
 socket.onmessage({data:JSON.stringify({type:'player-punched',id:peer.id})});
 assert.equal(h.punches[0],peer.id);
 socket.close();
 assert.equal(h.removes[0],peer.id);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
});

test('no Duel invitation UI: authenticated explorers can attack any time as cosmetic animation',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.created.some(node=>node.id==='climboria-duel-toggle'),false);
 assert.equal(h.created.some(node=>node.id==='climboria-duel-panel'),false);
 ws.onmessage({data:JSON.stringify({type:'duel-invitation',fromId:peer.id,combatDamageEnabled:false})});
 assert.equal(h.created.some(node=>node.id?.startsWith('climboria-duel')),false,
  'unsolicited or legacy duel packets must never recreate the deleted UI');
 const before=ws.sent.length;
 h.document.dispatchEvent({type:'climboria:visual-punch'});
 assert.equal(ws.sent.length,before+1);
 assert.equal(ws.sent.at(-1).type,'punch','attack animation needs no duel invitation');
 assert.equal(ws.sent.some(m=>m.type==='duel-request'||m.type==='attack'),false,
  'client never claims unsafely authorized hit or damage');
});

test('World Chat is room-gated, server-confirmed, safe as text and cleared on disconnect',async()=>{
 const offline=harness(false);await flush();
 assert.equal(offline.created.some(node=>node.id==='climboria-world-chat-toggle'),false,
  'offline Game cannot expose a fake usable World Chat');
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
 const socket=h.clients[0];socket.onopen();
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-panel'),false,
  'unverified socket does not make World Chat visible before welcome');
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[peer]})});
 const toggle=h.created.find(node=>node.id==='climboria-world-chat-toggle');
 const panel=h.created.find(node=>node.id==='climboria-world-chat-panel');
 assert.ok(toggle&&panel,'server-accepted initial spawn creates World Chat');
 assert.equal(panel.children[0].textContent,'WORLD CHAT','online count is in top HUD badge only');
 assert.equal(panel.style.display,'block','compact World Chat starts visible without any click');
 assert.equal(toggle.textContent,'HIDE CHAT');
 toggle.click();
 assert.equal(panel.style.display,'none','user can collapse visible chat');
 toggle.click();
 assert.equal(panel.style.display,'block','user can reopen compact chat');
 const log=panel.children[1],controls=panel.children[2],notice=panel.children[3];
 const input=controls.children[0],sendButton=controls.children[1];
 assert.equal(log.children.length,0,'no invented messages before server echo');
 input.value='Kamusta all <script>alert(1)</script>';
 sendButton.click();
 assert.equal(socket.sent.at(-1).type,'world-chat');
 assert.equal(socket.sent.at(-1).text,'Kamusta all <script>alert(1)</script>');
 assert.equal(socket.sent.at(-1).chatSeq,1,'authenticated client binds chat send to a request sequence');
 assert.equal(input.value,'Kamusta all <script>alert(1)</script>',
  'an unconfirmed send must preserve the typed draft for server rejection');
 assert.equal(log.children.length,0,'local send is not forged as server acknowledgement');
 socket.onmessage({data:JSON.stringify({
  type:'world-chat',id:peer.id,name:'Explorer B',
  text:'Welcome <img onerror=alert(1)>',at:1730000000000
 })});
 assert.equal(log.children.length,1);
 assert.equal(log.children[0].textContent,'Explorer B: Welcome <img onerror=alert(1)>');
 assert.equal(log.children[0].children.length,0,
  'remote HTML-like text is never interpreted into child elements');
 assert.equal(input.value,'Kamusta all <script>alert(1)</script>',
  'a different explorer speaking must not confirm or clear our unsent draft');
 socket.onmessage({data:JSON.stringify({
  type:'world-chat',id:'s_'+'d'.repeat(32),name:'Unknown',text:'forged',at:1730000000000
 })});
 assert.equal(log.children.length,1,'unknown room peers may not inject text');
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'world-chat-rate-limit',
  chatSeq:socket.sent.at(-1).chatSeq})});
 assert.ok(notice.textContent.includes('wait'));
 assert.equal(input.value,'Kamusta all <script>alert(1)</script>',
  'server chat cooldown rejection must not destroy typed messages');
 const sentAfterRejected=socket.sent.length;
 sendButton.click();
 assert.equal(socket.sent.length,sentAfterRejected+1,'rejected chat can be manually retried once');
 const retrySeq=socket.sent.at(-1).chatSeq;
 assert.equal(retrySeq,2,'explicit retry must use a NEW message confirmation sequence');
 socket.onmessage({data:JSON.stringify({type:'world-chat',id:'s_'+'c'.repeat(32),
  name:'Explorer A',text:'Kamusta all <script>alert(1)</script>',
  chatSeq:retrySeq,at:1730000000000})});
 assert.equal(input.value,'','only a real trusted self echo confirms delivery');
 assert.equal(log.children.length,2,'transcript contains only authenticated server echoes');
 socket.onmessage({data:JSON.stringify({type:'player-left',id:peer.id})});
 assert.equal(panel.children[0].textContent,'WORLD CHAT');
 socket.close();
 assert.equal(toggle.style.display,'none');
 assert.equal(panel.style.display,'none');
 assert.equal(log.children.length,0,'disconnect erases room-only transcript');
});


test('World Chat preserves text rejected by UTF-8 wire limit or Unicode controls',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const socket=h.clients[0];socket.onopen();
 const id='s_'+'c'.repeat(32);
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 const panel=h.created.find(el=>el.id==='climboria-world-chat-panel');
 assert.ok(panel,'only a confirmed server spawn grants chat input');
 const controls=panel.children[2],input=controls.children[0];
 const sendButton=controls.children[1],notice=panel.children[3],log=panel.children[1];
 const before=socket.sent.length;
 const oversized='€'.repeat(150); // 150 Unicode chars, 450 UTF-8 bytes
 input.value=oversized;sendButton.click();
 assert.equal(socket.sent.length,before,'server-invalid wire bytes never leave the browser');
 assert.equal(input.value,oversized,'rejected message must remain editable instead of vanishing');
 assert.match(notice.textContent,/384 UTF-8 bytes/);
 input.value='safe\u202Ebad';sendButton.click();
 assert.equal(socket.sent.length,before,'bidi-control payload is denied locally');
 assert.ok(input.value.includes('\u202E'),'invalid text stays in the input for correction');
 input.value='Cafe\u0301';sendButton.click();
 assert.equal(socket.sent.at(-1).type,'world-chat');
 assert.equal(socket.sent.at(-1).text,'Café','NFC normalization matches the room server');
 assert.equal(input.value,'Cafe\u0301','before server-confirmed echo, valid text stays editable');
 assert.equal(log.children.length,0,'client never fabricates an unconfirmed chat echo');
 socket.onmessage({data:JSON.stringify({type:'world-chat',id,name:'Explorer A',text:'Café',
  chatSeq:socket.sent.at(-1).chatSeq,at:1730000000000})});
 assert.equal(input.value,'','only the real normalized server echo clears the matching draft');
 assert.equal(log.children.length,1,'confirmed chat renders once from the real server');
});

test('World Chat one-message in flight avoids duplicates and preserves edits on server confirmation',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const socket=h.clients[0];socket.onopen();
 const id='s_'+'c'.repeat(32);
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 const panel=h.created.find(el=>el.id==='climboria-world-chat-panel');
 const controls=panel.children[2],input=controls.children[0];
 const sendButton=controls.children[1],notice=panel.children[3],log=panel.children[1];
 input.value='First message';sendButton.click();
 const sent=socket.sent.length;
 assert.equal(input.value,'First message','WebSocket.send is not a delivery acknowledgement');
 sendButton.click();
 assert.equal(socket.sent.length,sent,'double-click cannot create duplicate pending messages');
 assert.match(notice.textContent,/Waiting for the server/);
 input.value='Second draft while waiting';
 socket.onmessage({data:JSON.stringify({type:'world-chat',id,
  name:'Explorer A',text:'First message',chatSeq:socket.sent.at(-1).chatSeq,at:1730000000000})});
 assert.equal(input.value,'Second draft while waiting',
  'a genuine first-message acknowledgement cannot erase newer typed edits');
 assert.equal(log.children.length,1);
 sendButton.click();
 assert.equal(socket.sent.at(-1).text,'Second draft while waiting');
 assert.equal(input.value,'Second draft while waiting');
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'world-chat-invalid-text',
  chatSeq:socket.sent.at(-1).chatSeq})});
 assert.equal(input.value,'Second draft while waiting','async server invalid-text rejection preserves draft');
 assert.match(notice.textContent,/still editable/);
 sendButton.click(); // explicit user retry, never background resend
 assert.equal(socket.sent.at(-1).text,'Second draft while waiting');
 assert.equal(h.runNextTimer(),8000,'pending confirmation is bounded');
 assert.equal(input.value,'Second draft while waiting','missing acknowledgement never erases text');
 assert.match(notice.textContent,/Not confirmed/);
 socket.close();
 assert.equal(input.value,'','logout/disconnect clears temporary room-only draft for privacy');
 assert.equal(log.children.length,0,'chat transcript is room-scoped');
});

test('World Chat late identical self echo never confirms a newer retry sequence',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const socket=h.clients[0];socket.onopen();
 const id='s_'+'c'.repeat(32);
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 const panel=h.created.find(el=>el.id==='climboria-world-chat-panel');
 const controls=panel.children[2],input=controls.children[0],sendButton=controls.children[1],notice=panel.children[3];
 input.value='Same content';sendButton.click();
 const older=socket.sent.at(-1).chatSeq;
 assert.equal(older,1);
 assert.equal(h.runNextTimer(),8000,'first send must release after bounded missing ack');
 sendButton.click(); // manual retry of same draft, never auto-resend
 const newer=socket.sent.at(-1).chatSeq;
 assert.ok(newer>older,'retry uses a new correlation sequence');
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'world-chat-rate-limit',chatSeq:older})});
 assert.equal(input.value,'Same content','delayed older rejection must not erase draft');
 assert.match(notice.textContent,/awaiting room confirmation/i);
 const sentBefore=socket.sent.length;sendButton.click();
 assert.equal(socket.sent.length,sentBefore,'older rejection cannot release the current pending send');
 socket.onmessage({data:JSON.stringify({type:'world-chat',id,name:'Explorer A',
  text:'Same content',chatSeq:older,at:1730000000000})});
 assert.equal(input.value,'Same content','delayed echo from timed-out send must NOT clear new draft');
 assert.match(notice.textContent,/Waiting for the server/i,
  'pending status must remain after stale echo, even if player clicked SEND twice');
 socket.onmessage({data:JSON.stringify({type:'world-chat',id,name:'Explorer A',
  text:'Same content',at:1730000000001})});
 assert.equal(input.value,'Same content','legacy unsequenced self echo must not fake current confirmation');
 socket.onmessage({data:JSON.stringify({type:'world-chat',id,name:'Explorer A',
  text:'Same content',chatSeq:newer,at:1730000000002})});
 assert.equal(input.value,'','only exact authenticated new self echo confirms the matching draft');
});

test('Supabase anonymous guest with a valid access token does not open an authenticated Game room',async()=>{
 const guest={user:{id:'guest-uuid',is_anonymous:true},access_token:'valid-guest-supabase-token'};
 const h=harness(true,{initialSession:guest});
 await flush();
 assert.equal(h.clients.length,0,'valid anonymous Supabase session is not a registered multiplayer account');
 assert.equal(h.calls.filter(c=>c.url.includes('/ticket')).length,0,
  'anonymous credentials must never request a one-time World Chat ticket');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 h.authChange({user:{id:'registered-account',is_anonymous:false},access_token:'real-token'},'SIGNED_IN');
 assert.equal(h.runNextTimer(),0,'account upgrade must reconnect without reloading Game');
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'verified account can open authenticated room after guest upgrade');
});

test('switching from registered player to anonymous guest drops old room, avatars and transcript',async()=>{
 const registered={user:{id:'registered-1',is_anonymous:false,app_metadata:{provider:'email'}},access_token:'registered-token'};
 const h=harness(true,{initialSession:registered});
 await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];
 ws.onopen();
 const selfId='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:selfId,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.adds.length,1);
 const toggle=h.created.find(el=>el.id==='climboria-world-chat-toggle');
 const panel=h.created.find(el=>el.id==='climboria-world-chat-panel');
 assert.equal(toggle.style.display,'block');
 const ticketCount=h.calls.filter(c=>c.url.includes('/ticket')).length;
 h.authChange({user:{id:'guest-id',is_anonymous:true,app_metadata:{provider:'anonymous'}},access_token:'guest-token'},'SIGNED_IN');
 assert.equal(ws.readyState,3,'switching to guest immediately closes registered player socket');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.deepEqual(h.removes,[peer.id],'switch to guest clears remote avatar');
 assert.equal(toggle.style.display,'none');
 assert.equal(panel.style.display,'none');
 await flush();
 assert.equal(h.clients.length,1,'anonymous session cannot spawn a second socket');
 assert.equal(h.calls.filter(c=>c.url.includes('/ticket')).length,ticketCount,
  'guest must not inherit or obtain authenticated room ticket');
 h.authChange({user:{id:'registered-2',is_anonymous:false,app_metadata:{provider:'email'}},access_token:'registered-token-2'},'SIGNED_IN');
 assert.equal(h.runNextTimer(),0,'upgraded account may reconnect in existing Game page');
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2);
});

test('login after first guest load connects without reloading; logout clears World Chat and new login reconnects',async()=>{
 const h=harness(true,{initialSession:null});
 await flush();
 assert.equal(h.clients.length,0,'anonymous session must not open room WebSocket');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 const session={user:{id:'account-a'},access_token:'token-a'};
 h.authChange(session);
 assert.equal(h.runNextTimer(),0,'successful login should retry immediately');
 await flush();
 await waitFor(()=>h.clients.length===1);
 const first=h.clients[0];
 first.onopen();
 first.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 first.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.adds.length,1);
 const toggle=h.created.find(el=>el.id==='climboria-world-chat-toggle');
 const panel=h.created.find(el=>el.id==='climboria-world-chat-panel');
 assert.equal(toggle.style.display,'block');
 h.authChange(null);
 assert.equal(first.readyState,3,'logout closes prior authenticated room socket');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.deepEqual(h.removes,[peer.id],'logout removes real avatar to prevent ghosts');
 assert.equal(toggle.style.display,'none');
 assert.equal(panel.children[1].children.length,0,'logout deletes ephemeral chat');
 const before=h.adds.length;
 first.onmessage({data:JSON.stringify({type:'player-joined',player:{...peer,id:'s_'+'d'.repeat(32)}})});
 assert.equal(h.adds.length,before,'stale socket cannot revive players after logout');
 h.authChange({user:{id:'account-b'},access_token:'token-b'});
 assert.equal(h.runNextTimer(),0,'independent new account must reconnect without reload');
 await flush();
 await waitFor(()=>h.clients.length===2);
 const second=h.clients[1];second.onopen();
 second.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'e'.repeat(32),peers:[]})});
 second.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'e'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(toggle.style.display,'block','new verified session restores chat panel');
 assert.equal(h.adds.length,1,'no fabricated peers on second account');
});

test('account switch closes previous socket; token refresh does not duplicate session',async()=>{
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1);
 const first=h.clients[0];first.onopen();
 first.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 first.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[peer]})});
 h.authChange({user:{id:'verified-uuid'},access_token:'new-token'},'TOKEN_REFRESHED');
 assert.equal(first.readyState,1,'same account token refresh keeps healthy room session');
 assert.equal(h.clients.length,1);
 h.authChange({user:{id:'different-account'},access_token:'account-b-token'},'SIGNED_IN');
 assert.equal(first.readyState,3,'switching verified user evicts prior socket');
 assert.equal(h.removes.at(-1),peer.id,'old account avatars must be removed');
 assert.equal(h.runNextTimer(),0);
 await flush();await waitFor(()=>h.clients.length===2);
 const next=h.clients[1];next.onopen();
 next.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'e'.repeat(32),peers:[]})});
 next.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'e'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});

test('logout during delayed authenticated ticket prevents stale WebSocket resurrection',async()=>{
 let releaseTicket;
 const ticketGate=new Promise(resolve=>{releaseTicket=resolve});
 const h=harness(true,{ticketGate});
 await flush();
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,1,'ticket request is in flight');
 assert.equal(h.clients.length,0);
 h.authChange(null);
 releaseTicket();
 await flush();
 assert.equal(h.clients.length,0,'stale ticket must not open room after logout');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.equal(h.timers.filter(t=>!t.cancelled&&[5000,10000].includes(t.delay)).length,0,
  'old connection must not enqueue retries after logout');
});

test('temporary ticket request failure retries once and recovers without duplicate sockets',async()=>{
 const h=harness(true,{ticketFailures:1});
 await flush();
 assert.equal(h.clients.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.runNextTimer(),10000,'failed ticket should schedule a bounded retry');
 await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'successful retry opens exactly one room socket');
 const ws=h.clients[0];ws.onopen();
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'b'.repeat(32),peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'b'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});


test('actual player ticket fetch cannot strand Game connecting when an upstream ignores abort',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'ticket-request');
 assert.equal(h.clients.length,0,'no WebSocket exists without a verified ticket');
 const first=h.calls.find(c=>c.url==='https://rooms.climboria.fun/ticket');
 assert.ok(first?.options?.signal,'Game ticket fetch needs an abort signal');
 assert.equal(h.runNextTimer(),18000,'ticket fetch and reply must share a finite deadline');
 await flush();
 assert.equal(first.options.signal.aborted,true,'deadline cancels hung authenticated fetch');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.clients.length,0,'a timed-out ticket cannot create a phantom room peer');
 release(); // A very late first HTTP success cannot upgrade that failed attempt.
 await flush();
 assert.equal(h.clients.length,0);
 assert.equal(h.runNextTimer(),10000,'transient unavailability retries rather than blocking indefinitely');
 await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'new independent verified ticket can connect on retry');
});

test('actual player ticket JSON parser cannot hang connecting, then allows retry',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketJSONGate:gate});
 await flush();
 const first=h.calls.find(c=>c.url==='https://rooms.climboria.fun/ticket');
 assert.ok(first?.options?.signal);
 assert.equal(h.runNextTimer(),18000,'JSON body parsing is in same 18-second timeout');
 await flush();
 assert.equal(first.options.signal.aborted,true);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.clients.length,0);
 release(); // Unblock the stale response after deadline.
 await flush();
 assert.equal(h.clients.length,0,'late parsed ticket cannot open a stale socket');
 assert.equal(h.runNextTimer(),10000);
 await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
});

test('invalid successful HTTP room-ticket envelopes never open a socket and retry safely',async()=>{
 const valid={ticket:'b'.repeat(64),protocol:'climboria-v1',ttlSeconds:30};
 const forged=[
  {label:'wrong protocol',payload:{...valid,protocol:'wrong-room'}},
  {label:'wrong TTL',payload:{...valid,ttlSeconds:31}},
  {label:'upper-case token',payload:{...valid,ticket:'B'.repeat(64)}},
  {label:'truncated token',payload:{...valid,ticket:'b'.repeat(63)}},
  {label:'missing envelope',payload:null}
 ];
 for(const {label,payload} of forged){
  const h=harness(true,{ticketPayloads:[payload]});
  await flush();
  assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline',label);
  assert.equal(h.clients.length,0,label+' must not create a WebSocket');
  assert.equal(h.adds.length,0,label+' must not create a phantom peer');
  assert.equal(h.runNextTimer(),10000,label+' should safely retry');
  await flush();
  await waitFor(()=>h.clients.length===1);
  assert.equal(h.clients.length,1,label+' must recover only with a fresh verified ticket');
 }
});

test('HTTP 401 and 503 ticket failures never open sockets and retry without false online state',async()=>{
 for(const status of [401,503]){
  const h=harness(true,{ticketStatuses:[status]});
  await flush();
  assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,status===401?'login-required':'offline','HTTP '+status);
  assert.equal(h.clients.length,0,'HTTP '+status+' cannot open a room socket');
  assert.equal(h.runNextTimer(),10000,'HTTP '+status+' is unavailable, not room capacity');
  await flush();
  await waitFor(()=>h.clients.length===1);
  assert.equal(h.clients.length,1,'healthy retry should recover after HTTP '+status);
 }
});

test('expired room ticket refreshes exactly once for the same registered user then joins',async()=>{
 const h=harness(true,{ticketStatuses:[401],refreshMode:'success'});
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.refreshCounts.calls,1,'one forced refresh only');
 const tickets=h.calls.filter(c=>c.url.endsWith('/ticket'));
 assert.equal(tickets.length,2,'initial expired ticket plus one refreshed request');
 assert.equal(tickets[0].options.headers.Authorization,'Bearer verified-token');
 assert.equal(tickets[1].options.headers.Authorization,'Bearer refreshed-token');
 const ws=h.clients[0];ws.onopen();
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(node=>node.id==='climboria-world-chat-toggle'));
});
test('room ticket refresh never adopts another account or anonymous credentials',async()=>{
 for(const refreshMode of ['different-user','anonymous','failure']){
  const h=harness(true,{ticketStatuses:[401],refreshMode});
  await flush();
  await waitFor(()=>h.document.documentElement.dataset.climboriaMultiplayer==='login-required');
  assert.equal(h.refreshCounts.calls,1,refreshMode);
  assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,1,refreshMode);
  assert.equal(h.clients.length,0,refreshMode);
  assert.equal(h.adds.length,0,refreshMode);
  assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false,refreshMode);
 }
});
test('temporary room capacity 429 displays busy without fake peers then retries successfully',async()=>{
 const h=harness(true,{ticketStatuses:[429]});
 await flush();
 assert.equal(h.clients.length,0,'full room cannot fabricate a WebSocket or remote player');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'room-busy');
 const badge=h.created.find(node=>node.id==='climboria-room-status');
 assert.ok(badge?.textContent.includes('ROOM BUSY'));
 assert.equal(h.runNextTimer(),10000,'capacity response should retry in a bounded 10 seconds');
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.calls.filter(call=>call.url.endsWith('/ticket')).length,2,
  'retry should use a new authenticated ticket without duplicate requests');
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(h.adds.length,0,'connected roster contains no invented peers');
});

test('stalled initial Supabase session lookup times out and retries without ghost room state',async()=>{
 let releaseSession;
 const gate=new Promise(resolve=>{releaseSession=resolve});
 const h=harness(true,{sessionGate:gate});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'session-check');
 assert.equal(h.clients.length,0,'no socket before a verified session');
 assert.equal(h.runNextTimer(),8000,'session lookup must have an independent finite deadline');
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,0,
  'stalled identity must not create an authenticated room ticket');
 assert.equal(h.clients.length,0,'timeout must not create fake remote peers');
 releaseSession(); // A very late first lookup must not create an old-epoch socket.
 await flush();
 assert.equal(h.clients.length,0);
 assert.equal(h.runNextTimer(),10000,'unavailable session should retry, not strand CONNECTING');
 await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'second fresh authenticated session may recover');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,1);
});

test('logout cancels an unresolved initial session deadline and prevents late stale socket',async()=>{
 let releaseSession;
 const gate=new Promise(resolve=>{releaseSession=resolve});
 const h=harness(true,{sessionGate:gate});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'session-check');
 assert.ok(h.timers.some(timer=>timer.delay===8000&&!timer.cancelled));
 h.authChange(null);
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.equal(h.timers.filter(timer=>timer.delay===8000&&!timer.cancelled).length,0,
  'logout must cancel a stale session timer');
 releaseSession();
 await flush();
 assert.equal(h.clients.length,0,'logged-out identity must never open a WebSocket');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,0);
});

test('session transition during unresolved getSession never authenticates an old player',async()=>{
 let releaseSession;
 const sessionGate=new Promise(resolve=>{releaseSession=resolve});
 const h=harness(true,{sessionGate});
 await flush();
 assert.equal(h.clients.length,0,'initial getSession is unresolved');
 h.authChange({user:{id:'new-account'},access_token:'fresh-login-token'});
 assert.equal(h.runNextTimer(),0,'auth change should invalidate the old in-flight session');
 releaseSession();
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.calls.filter(x=>x.url.endsWith('/ticket')).length,1,
  'only the latest authenticated user may request a room ticket');
 assert.equal(h.calls.find(x=>x.url.endsWith('/ticket')).options.headers.Authorization,'Bearer fresh-login-token');
 const ws=h.clients[0];ws.onopen();
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'b'.repeat(32),peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'b'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});

test('actual WebSocket never-opening handshake times out and retries without ghost peers',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
 const old=h.clients[0];
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'socket-connecting');
 assert.equal(h.runNextTimer(),12000,'WebSocket opening needs a bounded deadline');
 assert.equal(old.readyState,3,'unopened socket must be explicitly closed');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.adds.length,0);
 old.onopen(); // An obsolete open event cannot use its stale one-time ticket.
 await flush();
 assert.equal(h.clients.length,1);
 assert.equal(h.runNextTimer(),5000,'failed admission retries independently');
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2,'retry must issue a fresh ticket and socket');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,2);
});

test('trusted welcome without valid spawn-accepted never renders peers and retries safely',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const old=h.clients[0];old.onopen();
 const own='s_'+'c'.repeat(32);
 old.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[peer]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting');
 assert.equal(h.adds.length,0,'provisional welcome must not render a remote 3D player');
 old.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:'s_'+'d'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting',
  'forged spawn id must not confirm admission');
 assert.equal(h.created.some(n=>n.id==='climboria-world-chat-panel'),false);
 assert.equal(h.runNextTimer(),12000,'server spawn confirmation also needs a deadline');
 assert.equal(old.readyState,3);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline');
 assert.equal(h.adds.length,0,'no remote 3D peers ever appeared before accepted spawn');
 old.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:own,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'offline',
  'late stale server acknowledgement cannot revive a timed-out socket');
 assert.equal(h.runNextTimer(),5000);
 await flush();await waitFor(()=>h.clients.length===2);
 const fresh=h.clients[1];fresh.onopen();
 fresh.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 fresh.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:own,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected',
  'only a new authenticated server-confirmed spawn may show online');
});

test('verified server spawn cancels both admission deadlines and keeps live socket',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:own,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(h.timers.filter(t=>t.delay===12000&&!t.cancelled).length,0,
  'both WebSocket open and spawn-ack timers must be cancelled');
 assert.equal(ws.readyState,1,'healthy verified room socket must stay open');
 assert.equal(h.clients.length,1);
});

test('logout during pending WebSocket admission cancels timer without reconnect',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const old=h.clients[0];
 assert.equal(h.timers.filter(t=>t.delay===12000&&!t.cancelled).length,1);
 h.authChange(null);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.equal(old.readyState,3,'sign-out closes unverified room socket');
 assert.equal(h.timers.filter(t=>t.delay===12000&&!t.cancelled).length,0);
 old.onopen();
 old.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 await flush();
 assert.equal(h.clients.length,1,'old account must not retry after logout');
 assert.equal(h.adds.length,0,'stale socket must not add ghost peer models');
});

test('out-of-Sanctuary registered hero only rejoins with authenticated server resume anchor',async()=>{
 const pos={x:70,y:9.55,z:-30};
 const h=harness(true,{ticketPayloads:[{ticket:'b'.repeat(64),protocol:'climboria-v1',
  ttlSeconds:30,resumePosition:pos}]});
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 assert.equal(ws.sent.at(-1).type,'spawn');
 assert.equal(ws.sent.at(-1).position.x,70);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:pos,peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(h.created.some(el=>el.id==='climboria-room-return-sanctuary'),false);
});
test('moving away while ticket without resume is pending cannot forge initial spawn',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});await flush();
 h.window.__climboriaJarrellsPeak.player.x=100;
 release();await flush();
 assert.equal(h.clients.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-panel'),false);
});
test('unconfirmed or server-rejected spawn cannot advertise online status, World Chat or Duel UI',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false);
 assert.equal(h.created.some(el=>el.id==='climboria-duel-toggle'),false);
 ws.onmessage({data:JSON.stringify({type:'rejected',reason:'invalid-initial-spawn'})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'spawn-rejected');
 assert.equal(ws.readyState,3);
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false);
 assert.equal(h.clients.length,1,'rejected spawn must not rejoin automatically from untrusted location');
});
test('welcome and provisional peer events cannot render ghost avatars before spawn admission',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'player-joined',player:peer})});
 ws.onmessage({data:JSON.stringify({type:'player-moved',id:peer.id,position:{x:3,y:9.5,z:-30}})});
 ws.onmessage({data:JSON.stringify({type:'player-punched',id:peer.id})});
 ws.onmessage({data:JSON.stringify({type:'world-chat',id:peer.id,name:peer.name,text:'premature',at:1730000000000})});
 assert.equal(h.adds.length,0,'no remote 3D allocations before server-accepted spawn');
 assert.equal(h.moves.length,0);
 assert.equal(h.punches.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false);
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.adds.length,1,'accepted roster creates one real peer');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 // Late/replayed welcome packets cannot reset an established verified room.
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 assert.equal(h.adds.length,1,'late welcome must not erase verified remote peers');
 assert.equal(h.removes.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});

test('spawn-accepted roster corrects missed join/leave and avoids duplicate 3D peers',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();const id='s_'+'c'.repeat(32);
 // The welcome roster can go stale while our own initial spawn is pending:
 // a provisional peer may leave before the authoritative spawn roster arrives.
 const former={...peer,id:'s_'+'d'.repeat(32),name:'Explorer Former'};
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[former]})});
 assert.equal(h.adds.length,0,'welcome peers are provisional, not rendered');
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,
  position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.removes.includes(former.id),false,'provisional stale peers were never added');
 assert.equal(h.adds.length,1,'only the server-accepted peer is created once');
 assert.equal(h.adds.at(-1).id,peer.id);
 const initialAdds=h.adds.length;
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,
  position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.adds.length,initialAdds,'repeat roster never duplicates remote GLB');
 assert.ok(h.moves.some(m=>m.id===peer.id),'existing verified model may update position');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});

test('Nearby Chat sends real authenticated channel packets and renders only verified remote speech',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const me='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:me,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:me,position:{x:0,y:9.55,z:-30},peers:[peer],nearbyChatEnabled:true})});
 const panel=h.created.find(n=>n.id==='climboria-world-chat-panel');
 assert.ok(panel,'confirmed Game join is necessary');
 const controls=panel.children[2],input=controls.children[0],send=controls.children[1],channel=controls.children[2];
 assert.equal(channel.textContent,'NEARBY','World Chat remains default to preserve existing UI');
 ws.onmessage({data:JSON.stringify({
  type:'world-chat',id:peer.id,name:peer.name,text:'World broadcasts do not become overhead speech',at:1730000000000
 })});
 assert.equal(h.speeches.length,0,'global World Chat does not spam nearby speech bubbles');
 channel.click();
 assert.equal(channel.textContent,'WORLD','player may switch back to global World Chat');
 assert.ok(panel.children[0].textContent.includes('NEARBY CHAT'));
 input.value='Hi friends';send.click();
 assert.equal(ws.sent.at(-1).type,'nearby-chat');
 assert.equal(ws.sent.at(-1).text,'Hi friends');
 assert.equal(input.value,'Hi friends','client keeps draft before server echo');
 channel.click();
 assert.ok(panel.children[3].textContent.includes('Wait'),'pending message locks channel');
 ws.onmessage({data:JSON.stringify({
  type:'nearby-chat',id:peer.id,name:peer.name,text:'Close enough!',at:1730000000001
 })});
 assert.deepEqual(h.speeches,[{id:peer.id,text:'Close enough!'}],
  'only authenticated known remote peer chat generates a bubble');
 ws.onmessage({data:JSON.stringify({
  type:'nearby-chat',id:'s_'+'d'.repeat(32),name:'Unknown',text:'forged',at:1730000000002
 })});
 assert.equal(h.speeches.length,1,'unknown/forged room peer cannot render speech');
 ws.onmessage({data:JSON.stringify({
  type:'nearby-chat',id:me,name:'Explorer A',text:'Hi friends',
  chatSeq:ws.sent.at(-1).chatSeq,at:1730000000003
 })});
 assert.equal(input.value,'','nearby self echo confirms same channel and same send sequence');
 assert.equal(h.speeches.length,1,'local sender is not an invented remote hero');
 channel.click();
 assert.ok(panel.children[0].textContent.includes('WORLD CHAT'),'switch back works after echo');
 ws.onmessage({data:JSON.stringify({type:'player-left',id:peer.id})});
 ws.onmessage({data:JSON.stringify({
  type:'nearby-chat',id:peer.id,name:peer.name,text:'ghost speech',at:1730000000004
 })});
 assert.equal(h.speeches.length,1,'departed players cannot create fake bubbles');
});

test('older live Game Worker cannot accidentally advertise a broken Nearby channel',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({
  type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[peer]
 })});
 const panel=h.created.find(n=>n.id==='climboria-world-chat-panel');
 const controls=panel.children[2],input=controls.children[0],send=controls.children[1],channel=controls.children[2];
 assert.equal(channel.disabled,true,'unupgraded Worker must not expose nonfunctional local chat');
 assert.match(channel.textContent,/UPDATING/);
 channel.click();
 input.value='World still works';send.click();
 assert.equal(ws.sent.at(-1).type,'world-chat','compatibility gate cannot break public World Chat');
 ws.onmessage({data:JSON.stringify({type:'nearby-chat',id:peer.id,name:peer.name,text:'not enabled',at:1730000000000})});
 assert.equal(h.speeches.length,0,'legacy Worker cannot generate a fake nearby bubble');
});

test('Game guest exploration makes no config request, room ticket, socket or fake World Chat',async()=>{
 const h=harness(true,{guest:true,initialSession:null});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'guest');
 assert.equal(h.clients.length,0);
 assert.equal(h.calls.length,0,'guest mode must not fetch multiplayer configuration or tickets');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false);
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-panel'),false);
});

test('voluntary walking to trusted spawn reopens room admission without ticket polling elsewhere',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 const tickets=()=>h.calls.filter(c=>c.url.endsWith('/ticket')).length;
 assert.equal(tickets(),1);
 for(let i=0;i<3;i++){
  assert.equal(h.runNextTimer(),1200);await flush();
  assert.equal(tickets(),1);assert.equal(h.clients.length,0);
  assert.equal(h.window.__climboriaJarrellsPeak.player.x,70);
 }
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.runNextTimer(),1200);await flush();
 assert.equal(tickets(),2);assert.equal(h.clients.length,1);
 const ws=h.clients[0],id='s_'+'c'.repeat(32);ws.onopen();
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 assert.notEqual(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});
test('voluntary spawn wait is cancelled by sign-out and cannot issue another ticket',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'saved-location');
 h.authChange(null);await flush();
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
 assert.equal(h.timers.filter(t=>!t.cancelled).length,0);
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,1);
 assert.equal(h.clients.length,0);
});

test('IME candidate confirmation cannot send World Chat before composition finishes',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[],nearbyChatEnabled:true})});
 const panel=h.created.find(n=>n.id==='climboria-world-chat-panel');
 const input=panel.children[2].children[0];
 input.value='こんにちは';
 const before=ws.sent.length;
 let stopped=0,prevented=0;
 const enter=extra=>{for(const fn of input.listeners.get('keydown')||[])fn({key:'Enter',stopPropagation(){stopped++},preventDefault(){prevented++},...extra})};
 enter({isComposing:true});enter({keyCode:229});
 assert.equal(ws.sent.length,before);assert.equal(prevented,0);assert.equal(stopped,2);
 assert.equal(input.value,'こんにちは');
 enter({isComposing:false,keyCode:13});
 assert.equal(prevented,1);assert.equal(ws.sent.length,before+1);assert.equal(ws.sent.at(-1).text,'こんにちは');
});
test('send exceptions do not erase chat draft or create a pending phantom send',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 const panel=h.created.find(n=>n.id==='climboria-world-chat-panel');
 const [input,button]=panel.children[2].children;
 const send=ws.send.bind(ws);ws.send=()=>{throw Error('socket not writable')};
 input.value='Keep this draft';const before=ws.sent.length;
 assert.doesNotThrow(()=>button.click());assert.equal(input.value,'Keep this draft');
 assert.match(panel.children[3].textContent,/Not connected/);assert.equal(ws.sent.length,before);
 ws.send=send;button.click();assert.equal(ws.sent.length,before+1);
 assert.equal(ws.sent.at(-1).text,'Keep this draft');
});
test('local attack cannot send a room packet before authoritative spawn acceptance',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 const before=ws.sent.length;
 h.document.dispatchEvent({type:'climboria:visual-punch'});
 assert.equal(ws.sent.length,before);
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 h.document.dispatchEvent({type:'climboria:visual-punch'});
 assert.equal(ws.sent.at(-1).type,'punch');
});

test('owner-bound hero from another account cannot request a room ticket',async()=>{
 const h=harness(true,{heroOwner:'previous-owner'});
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'hero-account-mismatch');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,0);
 assert.equal(h.clients.length,0);
});
test('switching accounts closes owner-bound hero socket and prevents cross-account ticket; original login recovers',async()=>{
 const h=harness(true,{heroOwner:'verified-uuid'});
 await flush();assert.equal(h.clients.length,1);
 const old=h.clients[0];old.onopen();
 h.authChange({user:{id:'different-account'},access_token:'account-b-token'});
 assert.equal(old.readyState,3);
 h.runNextTimer();await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'hero-account-mismatch');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,1);
 assert.equal(h.clients.length,1);
 h.authChange({user:{id:'verified-uuid'},access_token:'new-owner-token'});
 h.runNextTimer();await flush();
 assert.equal(h.clients.length,2);
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,2);
});

test('Android saved location remains untouched until explicit JOIN WORLD, then obtains a fresh registered ticket',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 const join=h.created.find(n=>n.id==='climboria-room-join-world');
 assert.ok(join);assert.equal(h.window.__climboriaJarrellsPeak.player.x,70);
 assert.equal(h.clients.length,0);
 join.click();await flush();
 assert.equal(h.calls.filter(c=>c.url.endsWith('/ticket')).length,2);
 assert.equal(h.window.__climboriaJarrellsPeak.player.x,0);
 assert.equal(h.window.__climboriaJarrellsPeak.player.z,-30);
 assert.equal(h.clients.length,1);
 const ws=h.clients[0];ws.onopen();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'spawn-pending');
 assert.equal(h.created.some(n=>n.id==='climboria-world-chat-panel'),false);
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
});
test('explicit JOIN WORLD prefers newly issued server resume anchor over entry',async()=>{
 const anchor={x:80,y:10,z:-85};
 const h=harness(true,{ticketPayloads:[
  {ticket:'b'.repeat(64),protocol:'climboria-v1',ttlSeconds:30},
  {ticket:'c'.repeat(64),protocol:'climboria-v1',ttlSeconds:30,resumePosition:anchor}
 ]});
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 h.created.find(n=>n.id==='climboria-room-join-world').click();await flush();
 assert.equal(h.window.__climboriaJarrellsPeak.player.x,anchor.x);
 assert.equal(h.window.__climboriaJarrellsPeak.player.z,anchor.z);
 assert.equal(h.clients.length,1);
});
test('explicit JOIN WORLD cannot move or admit a logged-out player',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 const join=h.created.find(n=>n.id==='climboria-room-join-world');
 h.authChange(null);
 join.click();await flush();
 assert.equal(h.window.__climboriaJarrellsPeak.player.x,70);
 assert.equal(h.clients.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'login-required');
});

test('mobile chat starts visible, uses compact labels and keeps draft while collapsed',async()=>{
 const h=harness(true,{mobile:true});await flush();
 const ws=h.clients[0];ws.onopen();
 const id='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[peer]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[peer]})});
 const panel=h.created.find(n=>n.id==='climboria-world-chat-panel');
 const toggle=h.created.find(n=>n.id==='climboria-world-chat-toggle');
 const input=panel.children[2].children[0];
 assert.equal(panel.style.display,'block');
 assert.equal(toggle.textContent,'HIDE');assert.equal(toggle['aria-expanded'],'true');
 assert.equal(input.placeholder,'Message…');assert.equal(input.enterkeyhint,'send');
 assert.equal(panel.children[0].id,'climboria-world-chat-title');
 input.value='draft on Android';toggle.click();
 assert.equal(panel.style.display,'none');assert.equal(toggle.textContent,'CHAT');
 assert.equal(toggle['aria-expanded'],'false');
 toggle.click();assert.equal(panel.style.display,'block');assert.equal(input.value,'draft on Android');
 h.authChange(null);await flush();
 assert.equal(panel.style.display,'none');assert.equal(toggle['aria-expanded'],'false');assert.equal(input.value,'');
});
test('mobile World Chat CSS is device scoped, bounded and keeps compose controls separate',()=>{
 const game=readFileSync('game/play.html','utf8');
 assert.match(game,/body\.mobile-device #climboria-world-chat-panel\{/);
 assert.match(game,/--mobile-chat-bottom:max\(8px,env\(safe-area-inset-bottom\)\)/);
 assert.match(game,/bottom:calc\(var\(--mobile-chat-bottom\) \+ 35px\)!important/);
 assert.doesNotMatch(game,/--mobile-chat-top/);
 assert.match(game,/--mobile-chat-width:min\(252px,43vw\)/);
 assert.match(game,/grid-template-columns:minmax\(0,1fr\) auto auto/);
 assert.match(game,/body\.mobile-device #climboria-world-chat-notice:empty\{display:none\}/);
 assert.match(game,/body\.mobile-device #climboria-world-chat-toggle\[aria-expanded="true"\]/);
 assert.match(game,/body\.mobile-device #climboria-world-chat-controls input\{[\s\S]*?font-size:16px/);
});
