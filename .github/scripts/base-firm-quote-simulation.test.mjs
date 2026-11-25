import test from "node:test";
import assert from "node:assert/strict";
import {observeBaseFirmQuoteSimulation} from "../../dex/base-execution/firm-quote-simulation.mjs";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";

const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
const taker="0x"+"1".repeat(40),holder="0x"+"2".repeat(40),target="0x"+"3".repeat(40);
const hash="0x"+"a".repeat(64),block="0x3b3c210";
const anchor=Object.freeze({block,hash});
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",taker,minimumBuyAmount:"57000000000000"};
const policy={chainId:8453,allowanceHolders:[holder],transactionTargets:[holder],nestedRoutes:[{operator:target,target,selector:"0x1fff991f",actionSelectors:["0x12345678"]}]};
const word=v=>v.replace(/^0x/,"").padStart(64,"0");
const uint=n=>word(BigInt(n).toString(16));
const nested=()=>"1fff991f"+word(taker)+word(weth)+uint("58000000000000")+uint(160)+uint(0)+uint(1)+uint(32)+uint(4)+"12345678".padEnd(64,"0");
const inner=nested();
const calldata="0x2213bc0b"+word(target)+word(usdc)+uint("100000")+word(target)+uint(160)+uint(inner.length/2)+inner.padEnd(Math.ceil(inner.length/64)*64,"0");
const quote={chainId:8453,sellToken:usdc,buyToken:weth,taker,sellAmount:"100000",buyAmount:"59000000000000",minBuyAmount:"58000000000000",liquidityAvailable:true,fees:{zeroExFee:{amount:"150",token:usdc},integratorFee:null,gasFee:null},issues:{allowance:{spender:holder,actual:"0"},balance:null,simulationIncomplete:false},allowanceTarget:holder,transaction:{to:holder,value:"0",data:calldata}};
function fixture({badChain=false,badBlock=false,rpcError=null,badOutput=false,respondHttp=200}={}){
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  assert.equal(url,"https://mainnet.base.org");
  assert.equal(opts.redirect,"error");assert.equal(opts.credentials,"omit");assert.equal(opts.method,"POST");
  const x=JSON.parse(opts.body);calls.push(x);
  let result;
  switch(x.method){
   case "eth_chainId":result=badChain?"0x1":"0x2105";break;
   case "eth_getBlockByNumber":assert.deepEqual(x.params,[block,false]);result={number:block,hash:badBlock?"0x"+"b".repeat(64):hash};break;
   case "eth_call":
    assert.deepEqual(x.params,[{from:taker,to:holder,data:calldata,value:"0x0",gas:"0x124f80"},{blockHash:hash,requireCanonical:true}]);
    result=badOutput?"INVALID":"0x";break;
   default:throw Error("Unexpected write method "+x.method);
  }
  return new Response(JSON.stringify(rpcError?{jsonrpc:"2.0",id:x.id,error:{code:-32000,message:"Revert with private data"}}:{jsonrpc:"2.0",id:x.id,result}),{status:respondHttp,headers:{"content-type":"application/json"}});
 };
 return {calls,fetchImpl};
}
test("missing owner authorization and unreviewed policy fail before any RPC",async()=>{
 const f=fixture();
 await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,policy,{referenceBlock:anchor,fetchImpl:f.fetchImpl}),/explicit opt-in/);
 await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,null,{authorized:true,referenceBlock:anchor,fetchImpl:f.fetchImpl}),/Reviewed contract policy/);
 assert.deepEqual(f.calls,[]);
 assert.equal(BASE_EXECUTION_ENABLED,false);
});
test("correct reviewed candidate is only a nonexecutable read-only eth_call observation",async()=>{
 const f=fixture();
 const result=await observeBaseFirmQuoteSimulation(intent,quote,policy,{authorized:true,referenceBlock:anchor,fetchImpl:f.fetchImpl});
 assert.deepEqual(f.calls.map(x=>x.method),["eth_chainId","eth_getBlockByNumber","eth_call","eth_chainId","eth_getBlockByNumber"]);
 assert.equal(result.simulationObserved,true);
 assert.equal(result.executionReady,false);
 assert.equal(result.executable,false);
 assert.equal(result.nestedActionArgumentsVerified,false);
 assert.equal(result.independentRpcVerified,false);
 assert.equal(result.walletAuthorizationVerified,false);
 assert.equal(result.receiptFinalityVerified,false);
 assert.equal("transaction" in result,false);
 assert.equal("calldata" in result,false);
 assert.equal("rawResult" in result,false);
 assert.equal(result.providerMinBuyAmount,"58000000000000");
 assert.equal(Object.isFrozen(result),true);
});
test("wrong chain, changed block, RPC revert and malformed simulation fail closed",async()=>{
 for(const opts of [{badChain:true},{badBlock:true},{rpcError:true},{badOutput:true},{respondHttp:503}]){
  const f=fixture(opts);
  await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,policy,{authorized:true,referenceBlock:anchor,fetchImpl:f.fetchImpl}));
  assert.ok(f.calls.length>0);
  assert.ok(f.calls.every(x=>["eth_chainId","eth_getBlockByNumber","eth_call"].includes(x.method)));
 }
});
test("wrong taker, slippage, spender and transaction cannot enter simulation",async()=>{
 for(const [name,changedIntent,changedQuote] of [
  ["taker",{...intent,taker:target},quote],
  ["slippage",{...intent,minimumBuyAmount:"59000000000000"},quote],
  ["spender",intent,{...quote,allowanceTarget:target}],
  ["transaction",intent,{...quote,transaction:{...quote.transaction,to:target}}],
  ["native value",intent,{...quote,transaction:{...quote.transaction,value:"1"}}],
  ["permit2",intent,{...quote,permit2:{}}],
  ["missing simulation",intent,{...quote,issues:{...quote.issues,simulationIncomplete:true}}]
 ]){
  const f=fixture();
  await assert.rejects(observeBaseFirmQuoteSimulation(changedIntent,changedQuote,policy,{authorized:true,referenceBlock:anchor,fetchImpl:f.fetchImpl}),name);
  assert.equal(f.calls.length,0,name);
 }
});
test("malformed block and gas cap fail before first RPC",async()=>{
 for(const blockRef of [null,{},[],{block:"latest",hash},{block,hash:"0x"+"0".repeat(64)},{block:"0x1",hash:"0x123"}]){
  const f=fixture();
  await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,policy,{authorized:true,referenceBlock:blockRef,fetchImpl:f.fetchImpl}));
  assert.equal(f.calls.length,0);
 }
 for(const simulationGasLimit of ["0","210","3000001","-1","1e6",21000,null]){
  const f=fixture();
  await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,policy,{authorized:true,referenceBlock:anchor,simulationGasLimit,fetchImpl:f.fetchImpl}));
  assert.equal(f.calls.length,0);
 }
});
test("abort signal prevents any network call",async()=>{
 const controller=new AbortController();controller.abort();
 const f=fixture();
 await assert.rejects(observeBaseFirmQuoteSimulation(intent,quote,policy,{authorized:true,referenceBlock:anchor,signal:controller.signal,fetchImpl:f.fetchImpl}));
 assert.equal(f.calls.length,0);
});
