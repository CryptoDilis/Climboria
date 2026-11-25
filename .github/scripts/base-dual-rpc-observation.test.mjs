import test from "node:test";
import assert from "node:assert/strict";
import {validatePublicBaseRpcUrl} from "../../dex/base-execution/allowance-observation.mjs";
import {corroborateBaseAllowanceObservation} from "../../dex/base-execution/dual-rpc-observation.mjs";

const primary="https://mainnet.base.org";
const second="https://secondary.base-rpc.example.com";
const hash="0x"+"a".repeat(64);
const tokenHash="f".repeat(64);
const observation=Object.freeze({
 chainId:8453,observationOnly:true,executable:false,
 observedBlock:"0x3b38c41",observedBlockHash:hash,observedSellTokenCodeSha256:tokenHash,
 sellToken:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
 spender:"0x0000000000001ff3684f28c67538d4d072c22734",
 requestedSellAmount:"100000",observedBalance:"1000000",observedAllowance:"0",
 next:"exact-approval-review-required",proposedApprovalAmount:"100000"
});
const input=Object.freeze({
 chainId:8453,sellToken:observation.sellToken,
 buyToken:"0x4200000000000000000000000000000000000006",
 sellAmount:"100000",minimumBuyAmount:"1",
 taker:"0x"+"1".repeat(40)
});
function stub(secondary=observation){
 const calls=[];
 const readImpl=async (i,options)=>{
  assert.equal(i,input);
  calls.push(options);
  if(calls.length===1)assert.equal(options.rpcUrl,primary);
  else{
   assert.equal(options.rpcUrl,second);
   assert.deepEqual(options.referenceBlock,{number:observation.observedBlock,hash});
  }
  return calls.length===1?observation:secondary;
 };
 return {calls,readImpl};
}
test("public RPC validator requires keyless public HTTPS hostname, no query, IP, secret, path, or redirect target",()=>{
 assert.equal(validatePublicBaseRpcUrl(primary),primary);
 assert.equal(validatePublicBaseRpcUrl(second),second);
 assert.equal(validatePublicBaseRpcUrl(second+"/"),second);
 for(const bad of [
 undefined,"","  "+primary,"http://mainnet.base.org","https://localhost",
 "https://127.0.0.1","https://10.2.3.4","https://192.168.2.4",
 "https://[::1]/","https://node.internal","https://node.local",
 "https://example.test","https://node.invalid",
 "https://user:pass@mainnet.base.org","https://mainnet.base.org/secret",
 "https://mainnet.base.org?key=secret","https://mainnet.base.org/#anchor",
 "https://mainnet.base.org:8443","https://mainnet.base.org.evil.com/secret",
 "https://mainnet.base.org@evil.example/bypass","https://node..example.com",
 "javascript:alert(1)"
 ])assert.throws(()=>validatePublicBaseRpcUrl(bad),String(bad));
});
test("corroborates both fixed-hash observations while refusing to infer actual operator independence",async()=>{
 const {calls,readImpl}=stub();
 const result=await corroborateBaseAllowanceObservation(input,{
  secondaryRpcUrl:second,readImpl
 });
 assert.equal(calls.length,2);
 assert.equal(result.readOnly,true);
 assert.equal(result.executable,false);
 assert.equal(result.observationOnly,true);
 assert.equal(result.matchedAcrossDistinctRpcHosts,true);
 assert.equal(result.providerIndependenceVerified,false);
 assert.equal(result.observedBlockHash,hash);
 assert.equal(result.observedSellTokenCodeSha256,tokenHash);
 assert.equal(result.observedBalance,"1000000");
 assert.equal(result.next,"exact-approval-review-required");
 assert.equal("transaction" in result,false);
 assert.equal("rpcUrl" in result,false);
 assert.equal(Object.isFrozen(result),true);
});
test("bad or same-host secondary RPC never starts a primary request",async()=>{
 for(const endpoint of [undefined,"",primary,primary+"/","http://other.base.org",primary+"?token=secret"]){
  const {calls,readImpl}=stub();
  await assert.rejects(corroborateBaseAllowanceObservation(input,{
   secondaryRpcUrl:endpoint,readImpl
  }));
  assert.equal(calls.length,0,String(endpoint));
 }
});
test("fails closed if secondary RPC disagrees on any state, token runtime, spender, height or hash",async()=>{
 for(const [key,value] of [
  ["observedBlockHash","0x"+"b".repeat(64)],
  ["observedBlock","0x3b38c42"],
  ["observedSellTokenCodeSha256","b".repeat(64)],
  ["observedBalance","1000001"],
  ["observedAllowance","100000"],
  ["sellToken",input.buyToken],
  ["spender",input.taker],
  ["requestedSellAmount","1"],
  ["next","insufficient-balance"],
  ["proposedApprovalAmount","0"],
  ["chainId",1]
 ]){
  const {calls,readImpl}=stub({...observation,[key]:value});
  await assert.rejects(corroborateBaseAllowanceObservation(input,{
   secondaryRpcUrl:second,readImpl
  }),/disagree|Unexpected executable/,key);
  assert.equal(calls.length,2,key);
 }
});
test("rejects a malformed primary identity and never contacts the second RPC",async()=>{
 for(const changed of [
  {observedBlockHash:"0x"+"0".repeat(64)},
  {observedBlock:"latest"},{observedSellTokenCodeSha256:"00"},
  {chainId:1},{executable:true},{observationOnly:false}
 ]){
  const calls=[];
  await assert.rejects(corroborateBaseAllowanceObservation(input,{
   secondaryRpcUrl:second,readImpl:async(_,options)=>{
    calls.push(options.rpcUrl);
    return {...observation,...changed};
   }
  }),/Invalid primary Base observation identity/);
  assert.deepEqual(calls,[primary]);
 }
});
test("secondary transport failure, unsupported EIP-1898 or revoked canonical block never yields a success result",async()=>{
 for(const message of ["Base block changed during allowance observation","Invalid RPC result","RPC unavailable"]){
  const calls=[];
  await assert.rejects(corroborateBaseAllowanceObservation(input,{
   secondaryRpcUrl:second,
   readImpl:async(_,options)=>{calls.push(options.rpcUrl);
    if(calls.length===1)return observation;
    throw Error(message);
   }
  }),new RegExp(message));
  assert.deepEqual(calls,[primary,second]);
 }
});
test("caller abort prevents both RPCs before starting the first read",async()=>{
 const controller=new AbortController();controller.abort();
 const {calls,readImpl}=stub();
 await assert.rejects(corroborateBaseAllowanceObservation(input,{
  secondaryRpcUrl:second,signal:controller.signal,readImpl
 }));
 assert.equal(calls.length,0);
});
