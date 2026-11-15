import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('game/multiplayer/client-presence.js','utf8');
const config=JSON.parse(readFileSync('game/multiplayer/client-config.json','utf8'));
const peer={id:'s_'+'a'.repeat(32),name:'Explorer B',model:'Jarrell',position:{x:0,y:9.5,z:-30}};
function harness(enabled,{initialSession={user:{id:'verified-uuid'},access_token:'verified-token'},ticketGate=null,sessionGate=null,ticketFailures=0}={}){
 const state={session:initialSession,ticketFailures};
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
 const document={documentElement:{dataset:{}},body:createElement('body'),
  createElement,addEventListener(){}};
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
 class Socket{
  static OPEN=1;static CLOSED=3;
  constructor(url,protocols){this.url=url;this.protocols=protocols;this.readyState=1;this.sent=[];clients.push(this)}
  send(data){this.sent.push(JSON.parse(data))}
  close(){this.readyState=3;this.onclose?.({})}
 }
 const fetch=async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).includes('client-config.json'))return {ok:true,json:async()=>({schema:1,enabled,endpoint:enabled?'https://rooms.climboria.fun/':null})};
  if(String(url)==='https://rooms.climboria.fun/ticket'){
   assert.equal(options.headers.Authorization,'Bearer '+state.session?.access_token);
   if(ticketGate)await ticketGate;
   if(state.ticketFailures-->0)return {ok:false};
   return {ok:true,json:async()=>({ticket:'b'.repeat(64)})};
  }
  throw Error('unexpected fetch');
 };
 const context={window,document,fetch,URL,WebSocket:Socket,
  location:{href:'https://climboria.fun/game/play.html'},
  setTimeout:(fn,delay)=>{timers.push({fn,delay,cancelled:false});return timers.length},
  setInterval:()=>1,clearInterval(){},clearTimeout:id=>{if(timers[id-1])timers[id-1].cancelled=true},console};
 vm.runInNewContext(source,context,{filename:'client-presence.js'});
 return {window,document,clients,adds,moves,removes,punches,calls,timers,created,
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
 assert.equal(config.enabled,false);
 const h=harness(false);await flush();
 assert.equal(h.clients.length,0);assert.equal(h.adds.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'disabled');
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
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 assert.equal(log.children.length,0,'local send is not forged as server acknowledgement');
 socket.onmessage({data:JSON.stringify({
  type:'world-chat',id:peer.id,name:'Explorer B',
  text:'Welcome <img onerror=alert(1)>',at:1730000000000
 })});
 assert.equal(log.children.length,1);
 assert.equal(log.children[0].textContent,'Explorer B: Welcome <img onerror=alert(1)>');
 assert.equal(log.children[0].children.length,0,
  'remote HTML-like text is never interpreted into child elements');
 socket.onmessage({data:JSON.stringify({
  type:'world-chat',id:'s_'+'d'.repeat(32),name:'Unknown',text:'forged',at:1730000000000
 })});
 assert.equal(log.children.length,1,'unknown room peers may not inject text');
 socket.onmessage({data:JSON.stringify({type:'rejected',reason:'world-chat-rate-limit'})});
 assert.ok(notice.textContent.includes('wait'));
 socket.onmessage({data:JSON.stringify({type:'player-left',id:peer.id})});
 assert.ok(panel.children[0].textContent.includes('1 ONLINE'));
 socket.close();
 assert.equal(toggle.style.display,'none');
 assert.equal(panel.style.display,'none');
 assert.equal(log.children.length,0,'disconnect erases room-only transcript');
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
 first.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 second.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'e'.repeat(32),position:{x:0,y:9.55,z:-30}})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.equal(toggle.style.display,'block','new verified session restores chat panel');
 assert.equal(h.adds.length,1,'no fabricated peers on second account');
});

test('account switch closes previous socket; token refresh does not duplicate session',async()=>{
 const h=harness(true);await flush();
 await waitFor(()=>h.clients.length===1);
 const first=h.clients[0];first.onopen();
 first.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[peer]})});
 first.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'c'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 next.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'e'.repeat(32),position:{x:0,y:9.55,z:-30}})});
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
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'b'.repeat(32),position:{x:0,y:9.55,z:-30}})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
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
 ws.onmessage({data:JSON.stringify({type:'spawn-accepted',id:'s_'+'b'.repeat(32),position:{x:0,y:9.55,z:-30}})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
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
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',
  id:'s_'+'d'.repeat(32),position:{x:0,y:9.55,z:-30}})});
 assert.equal(h.created.some(el=>el.id==='climboria-world-chat-toggle'),false,
  'another session ID cannot authorize local World Chat');
 socket.onmessage({data:JSON.stringify({type:'spawn-accepted',id,position:{x:0,y:9.55,z:-30}})});
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'connected');
 assert.ok(h.created.some(el=>el.id==='climboria-world-chat-toggle'));
 assert.ok(h.created.some(el=>el.id==='climboria-duel-toggle'));
});
