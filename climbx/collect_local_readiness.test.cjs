'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {collectLocalReadiness}=require('./collect_local_readiness.cjs');
const present=()=>({status:0,stdout:'tool 1.0\n',stderr:''});
test('missing tool fails closed without RPC request',async()=>{
 let rpcCalls=0;
 const result=await collectLocalReadiness({run:()=>({error:Error('missing'),status:null}),probeRpc:async()=>{rpcCalls++;return {healthy:true,mayExecute:false}}});
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.mayExecute,false);
 assert.equal(rpcCalls,0);
});
test('complete versions and healthy local RPC only mark development readiness',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>({healthy:true,mayExecute:false,reason:'RPC_HEALTH_CHECK'})});
 assert.equal(result.readyForLocalDevelopment,true);
 assert.equal(result.mayExecute,false);
 assert.equal(result.toolchain.length,5);
});
test('unhealthy local RPC fails readiness',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>({healthy:false,mayExecute:false})});
 assert.equal(result.readyForLocalDevelopment,false);
});
test('RPC probe error fails closed',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>{throw Error('rpc unavailable')}});
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.rpc.reason,'RPC_PROBE_ERROR');
});
test('RPC result claiming execution authority cannot pass',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>({healthy:true,mayExecute:true})});
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.mayExecute,false);
});


test('null readiness options fail closed',async()=>assert.deepEqual(await collectLocalReadiness(null),{readyForLocalDevelopment:false,mayExecute:false,toolchain:[],rpc:{healthy:false,mayExecute:false,reason:'INVALID_READINESS_INPUT'}}));
test('hostile options getter fails closed',async()=>{
 const input=Object.defineProperty({},'run',{get(){throw Error('hostile')}});
 const result=await collectLocalReadiness(input);
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.mayExecute,false);
});
test('invalid probe dependency is rejected without execution',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:42});
 assert.equal(result.rpc.reason,'INVALID_READINESS_INPUT');
});
test('null RPC probe response fails closed',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>null});
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.mayExecute,false);
});
test('hostile RPC result getter fails closed',async()=>{
 const result=await collectLocalReadiness({run:present,probeRpc:async()=>Object.defineProperty({},'healthy',{get(){throw Error('hostile')}})});
 assert.equal(result.readyForLocalDevelopment,false);
 assert.equal(result.mayExecute,false);
});
