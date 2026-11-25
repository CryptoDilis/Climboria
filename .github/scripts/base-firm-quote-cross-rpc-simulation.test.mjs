import test from "node:test";
import assert from "node:assert/strict";
import {corroborateBaseFirmQuoteSimulation} from "../../dex/base-execution/firm-quote-cross-rpc-simulation.mjs";
const hash="0x"+"a".repeat(64),digest="b".repeat(64);
const first=Object.freeze({
 chainId:8453,provider:"0x",simulationObserved:true,block:"0x3b3c210",
 blockHash:hash,candidateOnly:true,observationOnly:true,executable:false,
 executionReady:false,readOnly:true,nestedActionArgumentsVerified:false,
 independentRpcVerified:false,walletAuthorizationVerified:false,receiptFinalityVerified:false,
 simulationGasCap:"1200000",requestedSellAmount:"100000",
 providerMinBuyAmount:"58000000000000",simulationResultSha256:digest
});
const PRIMARY="https://mainnet.base.org",SECONDARY="https://base-rpc.publicnode.com";
function fixture(other=first){
 const calls=[];
 return {calls,simulationImpl:async(_,__,___,options)=>{
  calls.push(options);
  return calls.length===1?first:other;
 }};
}
test("no explicit opt-in, invalid endpoint or duplicate host reaches neither RPC",async()=>{
 for(const opts of [
  {authorized:false,secondaryRpcUrl:SECONDARY},
  {authorized:true,secondaryRpcUrl:PRIMARY},
  {authorized:true,secondaryRpcUrl:"http://base-rpc.publicnode.com"},
  {authorized:true,secondaryRpcUrl:"https://127.0.0.1"},
  {authorized:true,secondaryRpcUrl:"https://base-rpc.publicnode.com/path"}
 ]){
  const f=fixture();
  await assert.rejects(corroborateBaseFirmQuoteSimulation({}, {}, {},{...opts,simulationImpl:f.simulationImpl}));
  assert.equal(f.calls.length,0);
 }
});
test("identical pinned read-only results from two hosts yield non-executable digest only",async()=>{
 const f=fixture(),anchor={block:first.block,hash};
 const result=await corroborateBaseFirmQuoteSimulation({}, {}, {},{
  authorized:true,referenceBlock:anchor,secondaryRpcUrl:SECONDARY,
  simulationImpl:f.simulationImpl
 });
 assert.deepEqual(f.calls.map(c=>c.publicRpcUrl),[PRIMARY,SECONDARY]);
 assert.ok(f.calls.every(c=>c.referenceBlock===anchor&&c.authorized===true));
 assert.equal(result.twoHostsAgreed,true);
 assert.equal(result.providerIndependenceVerified,false);
 assert.equal(result.executable,false);
 assert.equal(result.executionReady,false);
 assert.equal(result.walletAuthorizationVerified,false);
 assert.equal(result.routeActionArgumentsVerified,false);
 assert.equal(result.receiptFinalityVerified,false);
 assert.equal(result.simulationResultSha256,digest);
 assert.equal(Object.isFrozen(result),true);
 assert.equal("transaction" in result,false);
 assert.equal("calldata" in result,false);
});
test("mismatch on any output or safety-critical observation rejects",async()=>{
 for(const [name,val] of [
  ["block","0x3b3c211"],["blockHash","0x"+"c".repeat(64)],
  ["simulationResultSha256","d".repeat(64)],
  ["requestedSellAmount","1"],["providerMinBuyAmount","1"],
  ["executionReady",true],["executable",true],["nestedActionArgumentsVerified",true],
  ["chainId",1],["simulationGasCap","40000"]
 ]){
  const f=fixture({...first,[name]:val});
  await assert.rejects(corroborateBaseFirmQuoteSimulation({}, {}, {},{
   authorized:true,secondaryRpcUrl:SECONDARY,simulationImpl:f.simulationImpl
  }),/disagree|Untrusted secondary/,name);
  assert.equal(f.calls.length,2,name);
 }
});
test("malformed primary evidence aborts before contacting secondary RPC",async()=>{
 for(const changed of [
  {executable:true},{simulationObserved:false},{nestedActionArgumentsVerified:true},
  {simulationResultSha256:"x"},{readOnly:false}
 ]){
  const f=fixture();
  await assert.rejects(corroborateBaseFirmQuoteSimulation({}, {}, {},{
   authorized:true,secondaryRpcUrl:SECONDARY,
   simulationImpl:async(...args)=>{
    f.calls.push(args.at(-1));
    return {...first,...changed};
   }
  }),/Untrusted primary/);
  assert.equal(f.calls.length,1);
 }
});
test("primary and secondary RPC errors never become a success result",async()=>{
 for(const at of [1,2]){
  const calls=[];
  await assert.rejects(corroborateBaseFirmQuoteSimulation({}, {}, {},{
   authorized:true,secondaryRpcUrl:SECONDARY,
   simulationImpl:async()=>{calls.push(1);if(calls.length===at)throw Error("RPC revert");return first;}
  }),/RPC revert/);
  assert.equal(calls.length,at);
 }
});
test("aborted caller makes zero RPC requests",async()=>{
 const controller=new AbortController();controller.abort();
 const f=fixture();
 await assert.rejects(corroborateBaseFirmQuoteSimulation({}, {}, {},{
  authorized:true,secondaryRpcUrl:SECONDARY,signal:controller.signal,
  simulationImpl:f.simulationImpl
 }));
 assert.equal(f.calls.length,0);
});
