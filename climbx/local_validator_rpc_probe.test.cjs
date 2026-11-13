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
