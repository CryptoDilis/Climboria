import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{PreviewCombatRoom} from './preview-worker.mjs';
const A='f3ead054-abb4-47ba-b311-5aa7fe483f10',B='2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
const request=(path,opts)=>new Request('https://game-combat-preview.climboria.fun'+path,opts);
function fixture(){
 let rows=new Map(),tail=Promise.resolve();
 const storage={transaction(fn){
  const work=tail.then(async()=>{
   const draft=new Map(structuredClone([...rows]));
   const result=await fn({get:async k=>draft.get(k),put:async(k,v)=>draft.set(k,structuredClone(v)),
    delete:async k=>draft.delete(k),list:async({prefix,limit})=>new Map([...draft].filter(([k])=>k.startsWith(prefix)).slice(0,limit))});
   rows=draft;return result;
  });tail=work.catch(()=>{});return work;
 }};
 const env={PREVIEW_ENABLED:'true',PREVIEW_ACCOUNT_ALLOWLIST:A+','+B,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST12345678'};
 const room=new PreviewCombatRoom({storage},env);
 env.PREVIEW_ROOMS={idFromName:id=>id,get:()=>({fetch:req=>room.fetch(req)})};
 return {env,room};
}
test('preview has separate disabled deployment configuration and no production import',async()=>{
 const config=readFileSync(new URL('./wrangler.preview.toml',import.meta.url),'utf8');
 const prod=readFileSync(new URL('./index.mjs',import.meta.url),'utf8');
 assert.ok(config.includes('name = "climboria-game-combat-preview"'));
 assert.ok(config.includes('workers_dev = false'));assert.ok(config.includes('preview_urls = false'));
 assert.ok(config.includes('PREVIEW_ENABLED = "false"'));
 assert.ok(config.includes('class_name = "PreviewCombatRoom"'));
 assert.ok(!prod.includes('preview-worker.mjs'));
 const {env}=fixture();
 assert.equal((await worker.fetch(request('/ticket',{method:'POST'}),{...env,PREVIEW_ENABLED:'false'})).status,503);
 assert.equal((await worker.fetch(request('/ticket',{method:'POST'}),{...env,PREVIEW_ACCOUNT_ALLOWLIST:A})).status,503);
});
test('preview ticket route uses verified registered account and ignores browser identity',async()=>{
 const {env}=fixture(),original=globalThis.fetch;
 let verified={id:A},calls=0;
 globalThis.fetch=async(url,opts)=>{
  assert.equal(String(url),'https://unadepiwbovblkfjlksk.supabase.co/auth/v1/user');
  assert.equal(opts.headers.Authorization,'Bearer mock.token.value');calls++;
  return new Response(JSON.stringify(verified),{status:200});
 };
 try{
  const issue=()=>worker.fetch(request('/ticket',{method:'POST',headers:{Authorization:'Bearer mock.token.value'},body:JSON.stringify({userId:B})}),env);
  const allowed=await issue();assert.equal(allowed.status,200);
  const result=await allowed.json();assert.match(result.ticket,/^[a-f0-9]{64}$/);assert.equal(result.fixture,'synthetic-combat');
  assert.equal(result.protocol,'climboria-preview-v1');
  verified={id:A,is_anonymous:true};assert.equal((await issue()).status,403);
  verified={id:'00000000-0000-4000-8000-000000000001'};assert.equal((await issue()).status,403);
  assert.equal(calls,3);
 }finally{globalThis.fetch=original}
});
test('outer route refuses cross-origin requests, internal ticket route and malformed socket tickets',async()=>{
 const {env}=fixture();
 assert.equal((await worker.fetch(request('/ticket',{method:'POST',headers:{Origin:'https://evil.example'}}),env)).status,403);
 assert.equal((await worker.fetch(request('/_ticket',{method:'POST',body:'{}'}),env)).status,404);
 assert.equal((await worker.fetch(request('/ws',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-v1,t-'+'a'.repeat(64)}}),env)).status,401);
 assert.equal((await worker.fetch(request('/ticket',{method:'POST'}),env)).status,401);
});
test('private DO refuses nonallowlisted and unexpected identity payloads, without starting scheduler',async()=>{
 const {room}=fixture();
 const issue=data=>room.fetch(request('/_ticket',{method:'POST',body:JSON.stringify(data)}));
 assert.equal((await issue({userId:A,roomId:'jarrell-peak'})).status,403);
 assert.equal((await issue({userId:'00000000-0000-4000-8000-000000000001'})).status,403);
 assert.equal((await issue({userId:A})).status,200);
 assert.equal(room.timer,null);assert.equal(room.sockets.size,0);
});


test('enabled preview refuses any nonapproved origin before storage or upstream auth',async()=>{
 const {env}=fixture();
 let touches=0;
 const trap={...env,PREVIEW_ROOMS:{idFromName(){touches++;throw Error('must not touch storage')}}};
 for(const origin of ['https://rooms.climboria.fun','https://climboria.fun','https://game-combat-preview.climboria.fun.evil.example','http://game-combat-preview.climboria.fun','https://game-combat-preview.climboria.fun:8443']){
  const headers={Origin:origin,Authorization:'Bearer mock.token.value'};
  const ticket=await worker.fetch(new Request(origin+'/ticket',{method:'POST',headers}),trap);
  assert.equal(ticket.status,403);assert.equal((await ticket.json()).error,'preview-host-not-allowed');
  const ws=await worker.fetch(new Request(origin+'/ws',{headers:{Origin:origin,Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1,t-'+'a'.repeat(64)}}),trap);
  assert.equal(ws.status,403);assert.equal((await ws.json()).error,'preview-host-not-allowed');
 }
 assert.equal(touches,0);
});
