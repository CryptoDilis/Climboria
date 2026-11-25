import test from "node:test";
import assert from "node:assert/strict";
import {readAllowanceObservation,assertBaseBlockIdentity} from "../../dex/base-execution/allowance-observation.mjs";
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
 const identity={number:"0x3b24e40",hash:"0x"+"a".repeat(64)};
 for(const [results,count] of [[["0x1"],1],[["0x2105","latest"],2],[["0x2105","0x3b24e40",identity,"0x"],4],[["0x2105","0x3b24e40",identity,"0x"+"00".repeat(1009)],4]]){
  const f=fixture(results);await assert.rejects(readAllowanceObservation(intent,f));assert.equal(f.calls.length,count);
  assert.ok(f.calls.every(x=>["eth_chainId","eth_blockNumber","eth_getBlockByNumber","eth_getCode"].includes(x.method)));
  if(count===4){
   assert.deepEqual(f.calls[2].params,["0x3b24e40",false]);
   assert.deepEqual(f.calls[3].params,[BASE_ALLOWANCE_HOLDER,{blockHash:identity.hash,requireCanonical:true}]);
  }
 }
});
test("block identity validates exact number, strict hash, and rejects reorg before any allowance decision",async()=>{
 const height="0x3b24e40",a="0x"+"a".repeat(64),b="0x"+"b".repeat(64);
 assert.equal(assertBaseBlockIdentity({number:height,hash:a.toUpperCase().replace("0X","0x")},height),a);
 assert.equal(assertBaseBlockIdentity({number:height,hash:a},height,a),a);
 assert.throws(()=>assertBaseBlockIdentity({number:height,hash:b},height,a),/block changed/);
 for(const data of [null,{},[],{number:"0x3b24e41",hash:a},{number:height,hash:"0x"},
  {number:height,hash:"0x"+"0".repeat(64)},{number:height,hash:"0x"+"z".repeat(64)},
  {number:height,hash:b+"suffix"}])assert.throws(()=>assertBaseBlockIdentity(data,height));
 for(const bad of [{number:"0x3b24e41",hash:a},{number:height,hash:null},{number:height,hash:"0x"+"0".repeat(64)}]){
  const f=fixture(["0x2105",height,bad]);
  await assert.rejects(readAllowanceObservation(intent,f),/Invalid Base block identity/);
  assert.equal(f.calls.length,3,"fail before holder or token code calls");
  assert.deepEqual(f.calls.map(x=>x.method),["eth_chainId","eth_blockNumber","eth_getBlockByNumber"]);
 }
});
test("RPC errors and mismatched IDs are rejected without retries",async()=>{
 for(const body of [{jsonrpc:"2.0",id:999,result:"0x2105"},{jsonrpc:"2.0",id:1,error:{code:-32000}},{jsonrpc:"2.0",id:1}]){
  let calls=0;await assert.rejects(readAllowanceObservation(intent,{fetchImpl:async()=>{calls++;return new Response(JSON.stringify(body));}}));assert.equal(calls,1);
 }
});

test("hash-based state rejects unsupported EIP-1898 RPCs; never retries by block number",async()=>{
 const height="0x3b24e40",hash="0x"+"a".repeat(64),calls=[];
 await assert.rejects(readAllowanceObservation(intent,{fetchImpl:async(url,options)=>{
   assert.equal(url,"https://mainnet.base.org");
   const req=JSON.parse(options.body);
   calls.push(req);
   const initial=["0x2105",height,{number:height,hash}];
   if(calls.length===4){
     assert.equal(req.method,"eth_getCode");
     assert.deepEqual(req.params,[BASE_ALLOWANCE_HOLDER,{blockHash:hash,requireCanonical:true}]);
     return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,error:{code:-32602,message:"unsupported block reference"}}));
   }
   return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,result:initial[calls.length-1]}));
 }}),/Invalid RPC result/);
 assert.deepEqual(calls.map(x=>x.method),["eth_chainId","eth_blockNumber","eth_getBlockByNumber","eth_getCode"]);
});
