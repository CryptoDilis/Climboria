import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TextEncoder} from 'node:util';

const source=readFileSync('game/multiplayer/client-presence.js','utf8');
const config=JSON.parse(readFileSync('game/multiplayer/client-config.json','utf8'));
const peer={id:'s_'+'a'.repeat(32),name:'Explorer B',model:'Jarrell',position:{x:0,y:9.5,z:-30}};
function harness(enabled,{initialSession={user:{id:'verified-uuid'},access_token:'verified-token'},ticketGate=null,ticketJSONGate=null,sessionGate=null,ticketFailures=0,ticketStatuses=[],ticketPayloads=[],delayedClients=false,configUnavailable=false,configFailures=0,configGate=null,configBadSchema=false,refreshMode=null}={}){
 const state={session:initialSession,ticketFailures,ticketStatuses:[...ticketStatuses],ticketPayloads:[...ticketPayloads],configFailures,configCalls:0};
 const authListeners=[];
 const clients=[],adds=[],moves=[],removes=[],punches=[],calls=[],timers=[],created=[];
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
 const window={__climboriaGameReady:true,__climboriaCreatedHero:{name:'Explorer A',model:'Jarrell'},
  __climboriaJarrellsPeak:{player:{x:0,y:9.55,z:-30,mode:'walk'}},
  __CLIMBORIA_GAME_PEERS:{
   add:x=>adds.push(x),move:(id,pos)=>moves.push({id,pos}),
   remove:id=>removes.push(id),punch:id=>punches.push(id)
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
 return {window,document,clients,adds,moves,removes,punches,calls,timers,created,refreshCounts,events,
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
 assert.ok(badge.textContent.includes('VERIFYING SANCTUARY SPAWN'));
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
test('live Game maps the touch return event to its existing authorized local Digit1 teleport',()=>{
 const game=readFileSync('game/play.html','utf8');
 assert.match(game,/document\.addEventListener\('climboria:room-return-to-sanctuary',[\s\S]{0,180}TP\[1\]\(\)/,
  'Game must handle touch request with existing local Sanctuary teleport only');
 assert.match(game,/const TP=\{1:\(\)=>tp\(0,-30,0\)/,
  'Game must keep Sanctuary at the actual protected server spawn center');
 assert.match(game,/client-presence\.js\?v=20261118-teleport-resync-9/,
  'production Game must request the fresh mobile room client');
});

test('mobile blocked-room touch button emits only a real player Sanctuary return action',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'awaiting-sanctuary');
 const button=h.created.find(node=>node.id==='climboria-room-return-sanctuary');
 assert.ok(button,'Android users need an accessible touch return control instead of Digit1');
 assert.equal(button.textContent,'RETURN TO SANCTUARY');
 assert.equal(h.clients.length,0,'out-of-zone hero is not admitted or fabricated');
 button.click();
 assert.equal(h.events.at(-1),'climboria:room-return-to-sanctuary');
 // The real Game listener executes its existing TP[1] teleport on this event.
 // Reflect that action in this isolated client harness, not as a forged
 // server spawn or client-side network admission.
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.runNextTimer(),1200);
 await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 assert.equal(h.created.some(node=>node.id==='climboria-world-chat-toggle'),false,
  'mobile return is a local control, not proof of server room admission');
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(node=>node.id==='climboria-world-chat-toggle'));
 button.click();
 assert.equal(h.events.length,1,'return button must stop acting after joining');
});

test('a real Game teleport invalidates stale room position and requires fresh Sanctuary admission',async()=>{
 const h=harness(true);await flush();await waitFor(()=>h.clients.length===1);
 const ws=h.clients[0];ws.onopen();
 const own='s_'+'c'.repeat(32);
 ws.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[peer]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(h.adds.length,1);
 const chatToggle=h.created.find(node=>node.id==='climboria-world-chat-toggle');
 assert.equal(chatToggle.style.display,'block');
 // A local game waypoint jump must not be forwarded as an impossible 28 m/s
 // room move or preserve ghosts at the previous room location.
 h.window.__climboriaJarrellsPeak.player.x=500;
 h.document.dispatchEvent({type:'climboria:local-teleport'});
 assert.equal(ws.readyState,3,'old authenticated socket is closed');
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'rejoining');
 assert.deepEqual(h.removes,[peer.id]);
 assert.equal(chatToggle.style.display,'none','old chat is hidden on local teleport');
 assert.equal(h.runNextTimer(),0,'the rejoin starts without waiting for a stale room timer');
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'awaiting-sanctuary');
 assert.equal(h.clients.length,1,'off-Sanctuary teleport cannot open a room socket');
 // Return via the real gameplay TP[1] location before entering a new room.
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.runNextTimer(),1200);
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2,'room issues a new authenticated session ticket');
 assert.equal(chatToggle.style.display,'none','ticket alone cannot enable World Chat');
 const next=h.clients[1];next.onopen();
 next.onmessage({data:JSON.stringify({type:'welcome',selfId:own,peers:[]})});
 next.onmessage({data:JSON.stringify({type:'spawn-accepted',id:own,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(chatToggle.style.display,'block','only trusted fresh spawn restores chat');
});
test('local teleport during a pending ticket invalidates old room admission',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'ticket-request');
 h.document.dispatchEvent({type:'climboria:local-teleport'});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'rejoining');
 assert.equal(h.runNextTimer(),0);
 release();await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1,'only the new valid ticket request may produce a socket');
 assert.equal(h.adds.length,0,'stale ticket cannot create remote players');
});
test('Game waypoint teleport explicitly emits the room-resync event after moving locally',()=>{
 const game=readFileSync('game/play.html','utf8');
 assert.match(game,/function tp\\(x,z,yaw\\)\\{[\\s\\S]{0,460}document\\.dispatchEvent\\(new Event\\('climboria:local-teleport'\\)\\)/,
  'all waypoint keys and touch Sanctuary return must notify authenticated room resync');
 assert.match(game,/client-presence\\.js\\?v=20261118-teleport-resync-9/,
  'production Game must avoid caching the older room client');
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

test('staged duel panel is interactive only after authenticated real peers, never enables damage',async()=>{
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
 const socket=h.clients[0];socket.onopen();
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[peer]})});
 const toggle=h.created.find(node=>node.id==='climboria-duel-toggle');
 const panel=h.created.find(node=>node.id==='climboria-duel-panel');
 assert.ok(toggle&&panel,'DUELS toggle requires server-verified initial spawn');
 const buttons=()=>{const result=[];const visit=node=>{
  if(node.tag==='button')result.push(node);
  for(const child of node.children||[])visit(child);
 };visit(panel);return result};
 toggle.click();
 assert.equal(panel.style.display,'block');
 buttons().find(node=>node.textContent==='CHALLENGE').click();
 assert.equal(socket.sent.at(-1).type,'duel-request');
 assert.equal(socket.sent.at(-1).targetId,peer.id);
 // A peer may disconnect after the button click but before server processing:
 // do not leave the UI stuck in a "Waiting..." state after a rejection.
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'invalid-or-unspawned-peer'})});
 assert.ok(buttons().some(node=>node.textContent==='CHALLENGE'),
  'server denial must clear optimistic duel request and allow future choices');
 buttons().find(node=>node.textContent==='CHALLENGE').click();
 assert.equal(socket.sent.at(-1).targetId,peer.id);
 socket.onmessage({data:JSON.stringify({type:'duel-request-sent',targetId:peer.id,combatDamageEnabled:false})});
 socket.onmessage({data:JSON.stringify({type:'duel-response-received',fromId:peer.id,accepted:true,combatDamageEnabled:false})});
 buttons().find(node=>node.textContent==='CANCEL DUEL').click();
 assert.equal(socket.sent.at(-1).type,'duel-cancel');
 socket.onmessage({data:JSON.stringify({type:'duel-cancelled',fromId:peer.id,combatDamageEnabled:false})});
 // A forged message claiming live damage must not produce an Accept control.
 socket.onmessage({data:JSON.stringify({type:'duel-invitation',fromId:peer.id,combatDamageEnabled:true})});
 assert.equal(buttons().some(node=>node.textContent==='ACCEPT'),false);
 socket.onmessage({data:JSON.stringify({type:'duel-invitation',fromId:peer.id,combatDamageEnabled:false})});
 buttons().find(node=>node.textContent==='ACCEPT').click();
 assert.equal(socket.sent.at(-1).type,'duel-response');
 assert.equal(socket.sent.at(-1).challengerId,peer.id);
 assert.equal(socket.sent.at(-1).accepted,true);
 socket.onmessage({data:JSON.stringify({type:'duel-response-sent',challengerId:peer.id,accepted:true,combatDamageEnabled:false})});
 assert.ok(panel.children.some(node=>node.textContent.includes('CONSENT ONLY')));
 socket.close();
 assert.equal(toggle.style.display,'none','room disconnect hides invitation UI');
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
 assert.ok(panel.children[0].textContent.includes('2 ONLINE'));
 toggle.click();
 assert.equal(panel.style.display,'block');
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
 assert.ok(panel.children[0].textContent.includes('1 ONLINE'));
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

test('real hero outside Sanctuary must return before issuing a room ticket, then reconnects',async()=>{
 const h=harness(true);
 h.window.__climboriaJarrellsPeak.player.x=70;
 await flush();
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'awaiting-sanctuary');
 assert.equal(h.clients.length,0);
 assert.equal(h.calls.filter(c=>c.url.includes('/ticket')).length,0,
  'out-of-Sanctuary initial position must never consume a room ticket');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false);
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.runNextTimer(),1200);
 await flush();await waitFor(()=>h.clients.length===1);
 assert.equal(h.clients.length,1);
 const socket=h.clients[0];socket.onopen();
 assert.equal(socket.sent.at(-1).type,'spawn');
 const id='s_'+'c'.repeat(32);
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,
  position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(el=>el.id==='climboria-world-chat-toggle'));
});

test('moving outside Sanctuary while room ticket is pending cannot spoof an initial spawn',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve});
 const h=harness(true,{ticketGate:gate});
 await flush();
 assert.ok(h.calls.some(c=>c.url.endsWith('/ticket')));
 h.window.__climboriaJarrellsPeak.player.x=100;
 release();
 await flush();await waitFor(()=>h.clients.length===1);
 const old=h.clients[0];old.onopen();
 assert.equal(old.sent.length,0,'invalid first position must not be sent');
 assert.equal(old.readyState,3);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'awaiting-sanctuary');
 h.window.__climboriaJarrellsPeak.player.x=0;
 assert.equal(h.runNextTimer(),1200);
 await flush();await waitFor(()=>h.clients.length===2);
 assert.equal(h.clients.length,2,'real return to Sanctuary must allow fresh ticket and socket');
});

test('unconfirmed spawn cannot advertise connection, chat, or duel UI',async()=>{
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1);
 const socket=h.clients[0];socket.onopen();
 const id='s_'+'c'.repeat(32);
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connecting');
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false,
  'ticket alone is insufficient for a functional World Chat');
 assert.equal(h.created.some(el=>el.id==='climboria-duel-toggle'),false);
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'invalid-initial-spawn'})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'spawn-rejected');
 assert.equal(socket.readyState,3,'rejected first spawn must close the unusable socket');
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false,
  'late packets from the rejected socket cannot authorize World Chat');
 assert.equal(h.runNextTimer(),1200,'rejected admission must schedule a safe retry');
 await flush();
 await waitFor(()=>h.clients.length===2);
 const fresh=h.clients[1];fresh.onopen();
 fresh.onmessage({data:JSON.stringify({type:'welcome',selfId:id,peers:[]})});
 fresh.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:'s_'+'d'.repeat(32),position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false,
  'wrong second session ID cannot authorize World Chat');
 fresh.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30},peers:[]})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(el=>el.id==='climboria-world-chat-toggle'));
 assert.ok(h.created.some(el=>el.id==='climboria-duel-toggle'));
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
