const test=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createWalletApi}=require('./wallet_api_factory.cjs');
const token='a'.repeat(40),userId='00000000-0000-4000-8000-000000000001',key='test_public_anon_key_1234567890';
function setup({fetchImpl=async()=>({status:200,json:async()=>({id:userId})}),rateCount=1,dbError=false}={}){
 const calls=[];const pool={
  query:async(sql,params)=>{calls.push({sql,params});if(dbError)throw Error('db down');if(sql.includes('wallet_api_rate_limits'))return {rows:[{request_count:rateCount}]};return {rows:[]};},
  connect:async()=>({query:async()=>({rows:[]}),release(){}})
 };
 const handler=createWalletApi({pool,supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,fetchImpl,maxRequests:3,now:()=>new Date(100000)});
 function request(body={wallet:'bad'},path='/api/climbx/wallet/challenge'){
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method='POST';req.url=path;req.headers={origin:'https://climboria.fun','content-type':'application/json',authorization:'Bearer '+token};
  const res={status:0,payload:null,writeHead(s){this.status=s;},end(s){this.payload=JSON.parse(s);}};
  return {req,res,run:async()=>{await handler(req,res);return res;}};
 }
 return {calls,request};
}
test('authenticated challenge reaches persistent limiter then server validation',async()=>{const f=setup();const r=await f.request().run();assert.equal(r.status,400);assert.equal(r.payload.status,'INVALID');assert.equal(f.calls.length,1);});
test('invalid Supabase token denies issuance',async()=>{const f=setup({fetchImpl:async()=>({status:401})});const r=await f.request().run();assert.equal(r.status,401);assert.equal(f.calls.length,1);});
test('Supabase outage denies issuance',async()=>{const f=setup({fetchImpl:async()=>{throw Error('offline');}});const r=await f.request().run();assert.equal(r.status,401);});
test('rate limit blocks before Supabase verification',async()=>{let authCalls=0;const f=setup({rateCount:4,fetchImpl:async()=>{authCalls++;return {status:200,json:async()=>({id:userId})};}});const r=await f.request().run();assert.equal(r.status,429);assert.equal(authCalls,0);});
test('database outage returns 503 without credential leak',async()=>{const f=setup({dbError:true});const r=await f.request().run();assert.equal(r.status,503);assert.equal(r.payload.status,'RATE_LIMIT_UNAVAILABLE');});
test('bind request rejects unknown challenge',async()=>{const f=setup();const r=await f.request({wallet:'w',nonce:'n',signature:'s'},'/api/climbx/wallet/bind').run();assert.equal(r.status,400);assert.equal(r.payload.status,'UNKNOWN');});
test('rejects missing pool',()=>assert.throws(()=>createWalletApi({supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key})));
test('rejects missing Supabase API key',()=>assert.throws(()=>createWalletApi({pool:{query(){},connect(){}},supabaseUrl:'https://example.supabase.co'})));
test('rejects HTTP origin configuration',()=>assert.throws(()=>createWalletApi({pool:{query(){},connect(){}},supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,origin:'http://climboria.fun'})));
test('rejects zero rate limit',()=>assert.throws(()=>createWalletApi({pool:{query(){},connect(){}},supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,maxRequests:0})));

test('rejects invalid operation deadline configuration',()=>assert.throws(()=>createWalletApi({pool:{query(){},connect(){}},supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,operationTimeoutMs:50})));
test('returns 503 when rate limiter stalls',async()=>{const f=setup();const pool={query:()=>new Promise(()=>{}),connect:async()=>({query:async()=>({rows:[]}),release(){}})};const handler=createWalletApi({pool,supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,fetchImpl:async()=>({status:200,json:async()=>({id:userId})}),operationTimeoutMs:100});const q=f.request();const r=await handler(q.req,q.res);assert.equal(q.res.status,503);assert.equal(q.res.payload.status,'RATE_LIMIT_UNAVAILABLE');});
test('returns 503 when Supabase verification stalls',async()=>{const pool={query:async()=>({rows:[{request_count:1}]}),connect:async()=>({query:async()=>({rows:[]}),release(){}})};const handler=createWalletApi({pool,supabaseUrl:'https://example.supabase.co',supabaseAnonKey:key,fetchImpl:()=>new Promise(()=>{}),operationTimeoutMs:100});const f=setup();const q=f.request();await handler(q.req,q.res);assert.equal(q.res.status,503);assert.equal(q.res.payload.status,'UNAVAILABLE');});
