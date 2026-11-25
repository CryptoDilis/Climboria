import test from "node:test";
import assert from "node:assert/strict";
import {readAllowanceObservation} from "../../dex/base-execution/allowance-observation.mjs";
import {BASE_ALLOWANCE_HOLDER} from "../../dex/base-execution/allowance-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",minimumBuyAmount:"1",taker:usdc};
function fixture(results){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  assert.equal(url,"https://mainnet.base.org");assert.equal(options.method,"POST");assert.equal(options.redirect,"error");assert.equal(options.credentials,"omit");
  const request=JSON.parse(options.body);calls.push(request);
  const result=results[calls.length-1];
  return new Response(JSON.stringify({jsonrpc:"2.0",id:request.id,result}));
 };
 return {calls,fetchImpl};
}
test("invalid intent and aborted observations never make network requests",async()=>{
 const f=fixture([]);await assert.rejects(readAllowanceObservation({...intent,chainId:1},f));assert.equal(f.calls.length,0);
 const controller=new AbortController();controller.abort();await assert.rejects(readAllowanceObservation(intent,{...f,signal:controller.signal}));assert.equal(f.calls.length,0);
});
test("wrong chain, invalid block and incorrect holder runtime fail closed",async()=>{
 for(const [results,count] of [[["0x1"],1],[["0x2105","latest"],2],[["0x2105","0x3b24e40","0x"],3],[["0x2105","0x3b24e40","0x"+"00".repeat(1009)],3]]){
  const f=fixture(results);await assert.rejects(readAllowanceObservation(intent,f));assert.equal(f.calls.length,count);
  assert.ok(f.calls.every(x=>["eth_chainId","eth_blockNumber","eth_getCode"].includes(x.method)));
  if(count===3)assert.deepEqual(f.calls[2].params,[BASE_ALLOWANCE_HOLDER,"0x3b24e40"]);
 }
});
test("RPC errors and mismatched IDs are rejected without retries",async()=>{
 for(const body of [{jsonrpc:"2.0",id:999,result:"0x2105"},{jsonrpc:"2.0",id:1,error:{code:-32000}},{jsonrpc:"2.0",id:1}]){
  let calls=0;await assert.rejects(readAllowanceObservation(intent,{fetchImpl:async()=>{calls++;return new Response(JSON.stringify(body));}}));assert.equal(calls,1);
 }
});
