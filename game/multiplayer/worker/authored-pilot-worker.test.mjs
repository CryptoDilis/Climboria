import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredPilotWorker,AuthoredPilotRoom} from './authored-pilot-worker.mjs';
const host='https://game-authored-pilot.climboria.fun';
const ids='f3ead054-abb4-47ba-b311-5aa7fe483f10,2790d4fe-1a26-4f5c-96d2-9a0fbcfb3021';
function setup(){
 const calls=[];
 const env={AUTHORED_PILOT_ENABLED:'true',AUTHORED_PILOT_ACCOUNT_ALLOWLIST:ids,SUPABASE_PUBLISHABLE_KEY:'test-public-key-not-real',
 AUTHORED_PILOT_ROOMS:{idFromName(name){calls.push(name);return name},get(name){return {fetch(req){calls.push({name,path:new URL(req.url).pathname,method:req.method});return new Response(null,{status:429})}}}}};
 return {env,calls};
}
const req=(path,opts={})=>new Request(host+path,{...opts,headers:{Origin:host,...opts.headers}});
test('pilot is fail closed and distinct from synthetic preview',async()=>{
 const {env,calls}=setup();
 for(const patch of [{AUTHORED_PILOT_ENABLED:'false',PREVIEW_ENABLED:'true'},{AUTHORED_PILOT_ENABLED:undefined},{AUTHORED_PILOT_ACCOUNT_ALLOWLIST:ids.split(',')[0]},{AUTHORED_PILOT_ACCOUNT_ALLOWLIST:ids.split(',')[0]+','+ids.split(',')[0]}]){
  assert.equal((await authoredPilotWorker.fetch(req('/ticket',{method:'POST'}),{...env,...patch})).status,503);
 }
 assert.deepEqual(calls,[]);
 assert.equal(typeof AuthoredPilotRoom,'function');
});
test('pilot rejects absent/foreign origin and synthetic host',async()=>{
 const {env,calls}=setup();
 for(const request of [new Request(host+'/ticket',{method:'POST'}),req('/ws',{headers:{Origin:'https://climboria.fun',Upgrade:'websocket'}}),new Request('https://game-combat-preview.climboria.fun/ticket',{method:'POST',headers:{Origin:host}})]){
  assert.equal((await authoredPilotWorker.fetch(request,env)).status,403);
 }
 assert.deepEqual(calls,[]);
});
test('only fixed authored room selected; unauthenticated ticket, internal path and malformed socket rejected',async()=>{
 const {env,calls}=setup();
 assert.equal((await authoredPilotWorker.fetch(req('/ticket',{method:'POST'}),env)).status,401);
 assert.equal((await authoredPilotWorker.fetch(req('/_ticket',{method:'POST'}),env)).status,404);
 assert.equal((await authoredPilotWorker.fetch(req('/ws?room=preview-combat-fixture',{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'climboria-preview-v1'}}),env)).status,401);
 assert.ok(calls.length>0);assert.ok(calls.every(x=>x==='preview-jarrell-camp-v1'));
 calls.length=0;
 const res=await authoredPilotWorker.fetch(req('/ticket',{method:'POST',headers:{Authorization:'Bearer test.invalid.token'}}),env);
 assert.equal(res.status,429);
 assert.deepEqual(calls,['preview-jarrell-camp-v1',{name:'preview-jarrell-camp-v1',path:'/_auth',method:'POST'}]);
});
