'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {probeLocalValidator}=require('./local_validator_rpc_probe.cjs');
async function withServer(handler,fn){
 const server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn(server.address().port)}finally{await new Promise(resolve=>server.close(resolve))}
}
test('rejects remote endpoint without network request',async()=>{
 assert.deepEqual(await probeLocalValidator({host:'example.com'}),{healthy:false,mayExecute:false,reason:'INVALID_LOCAL_ENDPOINT'});
});
test('rejects invalid port and timeout',async()=>{
 assert.equal((await probeLocalValidator({port:0})).healthy,false);
 assert.equal((await probeLocalValidator({timeoutMs:0})).healthy,false);
});
test('local getHealth ok response is health evidence only',async()=>withServer((req,res)=>{
 let body='';req.on('data',x=>body+=x);req.on('end',()=>{
  const payload=JSON.parse(body);assert.equal(req.method,'POST');assert.equal(payload.method,'getHealth');
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:'ok'}));
 });
},async port=>assert.deepEqual(await probeLocalValidator({port}),{healthy:true,mayExecute:false,reason:'RPC_HEALTH_CHECK'})));
test('unhealthy local RPC fails closed',async()=>withServer((req,res)=>{res.writeHead(200);res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:'behind'}))},async port=>assert.equal((await probeLocalValidator({port})).healthy,false)));
test('malformed JSON fails closed',async()=>withServer((req,res)=>res.end('not-json'),async port=>assert.equal((await probeLocalValidator({port})).reason,'INVALID_RPC_RESPONSE')));
test('wrong response ID fails closed',async()=>withServer((req,res)=>res.end(JSON.stringify({jsonrpc:'2.0',id:2,result:'ok'})),async port=>assert.equal((await probeLocalValidator({port})).healthy,false)));


test('null options fail closed without throwing',async()=>assert.deepEqual(await probeLocalValidator(null),{healthy:false,mayExecute:false,reason:'INVALID_LOCAL_ENDPOINT'}));
test('hostile options getter fails closed',async()=>{const input=Object.defineProperty({},'host',{get(){throw Error('hostile')}});assert.equal((await probeLocalValidator(input)).healthy,false)});
test('non-ok RPC health reports unhealthy',async()=>withServer((req,res)=>res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:'behind'})),async port=>assert.deepEqual(await probeLocalValidator({port}),{healthy:false,mayExecute:false,reason:'RPC_UNHEALTHY'})));
test('stalled local RPC response times out',async()=>withServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.write(' ');},async port=>{const result=await probeLocalValidator({port,timeoutMs:150});assert.equal(result.healthy,false);assert.equal(result.mayExecute,false);assert.equal(result.reason,'RPC_TIMEOUT')}));


test('trickling RPC response cannot bypass absolute deadline',async()=>withServer((req,res)=>{
 res.writeHead(200,{'content-type':'application/json'});
 const interval=setInterval(()=>{if(!res.destroyed)res.write(' ');else clearInterval(interval)},25);
 res.on('close',()=>clearInterval(interval));
},async port=>{
 const started=Date.now();
 const result=await probeLocalValidator({port,timeoutMs:180});
 assert.equal(result.healthy,false);
 assert.equal(result.reason,'RPC_TIMEOUT');
 assert.ok(Date.now()-started<2500);
}));
test('oversized RPC response fails closed',async()=>withServer((req,res)=>{
 res.writeHead(200,{'content-type':'application/json'});
 res.end('x'.repeat(9000));
},async port=>{
 const result=await probeLocalValidator({port});
 assert.equal(result.healthy,false);
 assert.equal(result.reason,'OVERSIZED_RPC_RESPONSE');
}));


test('local RPC connection uses fresh loopback socket',async()=>withServer((req,res)=>{
 assert.equal(req.socket.localAddress,'127.0.0.1');
 assert.equal(req.socket.remoteAddress,'127.0.0.1');
 res.writeHead(200,{'content-type':'application/json'});
 res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:'ok'}));
},async port=>{
 const result=await probeLocalValidator({port});
 assert.equal(result.healthy,true);
 assert.equal(result.mayExecute,false);
}));
