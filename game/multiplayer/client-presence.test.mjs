import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('game/multiplayer/client-presence.js','utf8');
const config=JSON.parse(readFileSync('game/multiplayer/client-config.json','utf8'));
const peer={id:'s_'+'a'.repeat(32),name:'Explorer B',model:'Jarrell',position:{x:0,y:9.5,z:-30}};
function harness(enabled){
 const clients=[],adds=[],moves=[],removes=[],punches=[],calls=[],timers=[];
 const document={documentElement:{dataset:{}},body:{appendChild(){}},
  createElement:tag=>({style:{},textContent:''}),
  addEventListener(){}};
 const window={__climboriaGameReady:true,__climboriaCreatedHero:{name:'Explorer A',model:'Jarrell'},
  __climboriaJarrellsPeak:{player:{x:0,y:9.55,z:-30,mode:'walk'}},
  __CLIMBORIA_GAME_PEERS:{
   add:x=>adds.push(x),move:(id,pos)=>moves.push({id,pos}),
   remove:id=>removes.push(id),punch:id=>punches.push(id)
  },
  __CLIMBORIA_GAME_SAVE_CLIENT:{auth:{
   getSession:async()=>({data:{session:{user:{id:'verified-uuid'},access_token:'verified-token'}}}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
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
   assert.equal(options.headers.Authorization,'Bearer verified-token');
   return {ok:true,json:async()=>({ticket:'b'.repeat(64)})};
  }
  throw Error('unexpected fetch');
 };
 const context={window,document,fetch,URL,WebSocket:Socket,
  location:{href:'https://climboria.fun/game/play.html'},
  setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length},
  setInterval:()=>1,clearInterval(){},clearTimeout(){},console};
 vm.runInNewContext(source,context,{filename:'client-presence.js'});
 return {window,document,clients,adds,moves,removes,punches,calls,timers};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve()}
test('disabled multiplayer never creates fake socket or player',async()=>{
 assert.equal(config.enabled,false);
 const h=harness(false);await flush();
 assert.equal(h.clients.length,0);assert.equal(h.adds.length,0);
 assert.equal(h.document.documentElement.dataset.climboriaMultiplayer,'disabled');
});
test('real authenticated WebSocket messages are required before peers appear',async()=>{
 const h=harness(true);await flush();
 assert.equal(h.clients.length,1,JSON.stringify({status:h.document.documentElement.dataset,requests:h.calls.map(c=>c.url),timers:h.timers.map(t=>t.delay)}));
 assert.equal(h.adds.length,0,'no synthesized/ghost players before trusted welcome');
 const socket=h.clients[0];
 socket.onopen();
 assert.equal(socket.sent[0].type,'spawn');
 assert.ok(socket.protocols.includes('climboria-v1'));
 assert.equal(socket.url,'wss://rooms.climboria.fun/ws');
 socket.onmessage({data:JSON.stringify({type:'welcome',selfId:'s_'+'c'.repeat(32),peers:[]})});
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
