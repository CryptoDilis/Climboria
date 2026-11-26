import test from "node:test";
import assert from "node:assert/strict";
import {corroborateBaseReceipt} from "../../dex/base-execution/receipt-cross-rpc-observation.mjs";
const h=c=>"0x"+c.repeat(64),a=c=>"0x"+c.repeat(40);
const expected={chainId:8453,transactionHash:h("1"),from:a("2"),to:a("3"),input:"0x12345678"};
function mock(mutate=()=>{}){
 const calls=[];const fetchImpl=async(url,options)=>{
  const req=JSON.parse(options.body);calls.push({url,req});
  assert.equal(options.redirect,"error");assert.equal(options.credentials,"omit");
  const tx={chainId:"0x2105",hash:h("1"),from:a("2"),to:a("3"),input:"0x12345678",value:"0x0",blockHash:h("4"),blockNumber:"0x10",transactionIndex:"0x0",gas:"0x10000"};
  const receipt={transactionHash:h("1"),from:a("2"),to:a("3"),status:"0x1",contractAddress:null,blockHash:h("4"),blockNumber:"0x10",transactionIndex:"0x0",gasUsed:"0x5208",effectiveGasPrice:"0x1",l1Fee:"0x10",logs:[{address:a("6"),topics:[h("7")],data:"0x1234",logIndex:"0x5",transactionHash:h("1"),blockHash:h("4"),blockNumber:"0x10",transactionIndex:"0x0",removed:false}]};
  let result;
  switch(req.method){
   case "eth_chainId":result="0x2105";break;
   case "eth_getTransactionByHash":result=tx;break;
   case "eth_getTransactionReceipt":result=receipt;break;
   case "eth_getBlockByNumber":result=req.params[0]==="finalized"?{number:url.includes("publicnode")?"0x12":"0x11",hash:h("5")}:{number:"0x10",hash:h("4"),transactions:[h("1")]};break;
   default:assert.fail("Unexpected RPC method");
  }
  const envelope={jsonrpc:"2.0",id:req.id,result};mutate(envelope,req,url);
  return new Response(JSON.stringify(envelope));
 };return {calls,fetchImpl};
}
test("both hosts independently report matching receipt, no finality or settlement claim",async()=>{
 const m=mock();const r=await corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl});
 assert.equal(r.reportedReceiptEvidenceMatched,true);assert.equal(r.reportedLogsAndL1FeeMatched,true);assert.equal(r.rpcHostsCompared,2);
 for(const k of ["executable","executionReady","receiptFinalityVerified","walletAuthorizationVerified","tokenSettlementVerified","providerIndependenceVerified","allInFeeVerified","operatorFeeVerified"])assert.equal(r[k],false);
 assert.equal(m.calls.length,18);
 assert.equal(new Set(m.calls.map(c=>c.url)).size,2);
 for(const {req} of m.calls)assert.ok(["eth_chainId","eth_getTransactionByHash","eth_getTransactionReceipt","eth_getBlockByNumber"].includes(req.method));
});
test("no opt-in or malformed intent produces no RPC",async()=>{
 const m=mock();await assert.rejects(corroborateBaseReceipt(expected,{fetchImpl:m.fetchImpl}));
 await assert.rejects(corroborateBaseReceipt({...expected,input:"0x"},{authorized:true,fetchImpl:m.fetchImpl}));
 assert.equal(m.calls.length,0);
});
for(const [name,mutate] of [
 ["second gas disagreement",(e,r,u)=>{if(u.includes("publicnode")&&r.method==="eth_getTransactionReceipt")e.result.gasUsed="0x5300";}],
 ["secondary stale finalized height",(e,r,u)=>{if(u.includes("publicnode")&&r.params[0]==="finalized")e.result.number="0xf";}],
 ["mid-read reorg",(e,r)=>{if(r.id===7)e.result.hash=h("9");}],
 ["receipt changed",(e,r)=>{if(r.id===8)e.result.effectiveGasPrice="0x2";}],
 ["bad envelope",(e,r)=>{if(r.id===2)e.id=0;}],
 ["missing receipt",(e,r)=>{if(r.id===3)e.result=null;}],
 ["RPC error",(e,r)=>{if(r.id===5)e.error={code:-32601};}]
])test("reject "+name,async()=>{const m=mock(mutate);await assert.rejects(corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl}));});
test("caller abort prevents calls",async()=>{const m=mock(),c=new AbortController();c.abort();await assert.rejects(corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl,signal:c.signal}));assert.equal(m.calls.length,0);});

for(const [name,change] of [
 ["cross-host L1 fee disagreement",(r)=>{r.l1Fee="0x11";}],
 ["cross-host log data disagreement",(r)=>{r.logs[0].data="0x1235";}],
 ["cross-host log omission",(r)=>{r.logs=[];}],
 ["cross-host topics disagreement",(r)=>{r.logs[0].topics=[h("8")];}]
])test("reject "+name,async()=>{
 const m=mock((e,req,url)=>{if(url.includes("publicnode")&&req.method==="eth_getTransactionReceipt")change(e.result);});
 await assert.rejects(corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl}),/Public RPC receipt mismatch/);
});
for(const [name,change] of [
 ["mid-read L1 fee change",(r)=>{r.l1Fee="0x12";}],
 ["mid-read log change",(r)=>{r.logs[0].address=a("9");}]
])test("reject "+name,async()=>{
 const m=mock((e,req)=>{if(req.id===8&&req.method==="eth_getTransactionReceipt")change(e.result);});
 await assert.rejects(corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl}),/Receipt changed during observation/);
});
for(const [name,change] of [
 ["missing L1 fee",(r)=>{delete r.l1Fee;}],
 ["noncanonical L1 fee",(r)=>{r.l1Fee="0x01";}],
 ["missing logs",(r)=>{delete r.logs;}],
 ["duplicate log index",(r)=>{r.logs.push({...r.logs[0]});}],
 ["removed log",(r)=>{r.logs[0].removed=true;}],
 ["unrelated log",(r)=>{r.logs[0].transactionHash=h("9");}],
 ["malformed topic",(r)=>{r.logs[0].topics=["0x01"];}],
 ["oversized logs",(r)=>{r.logs=Array(513).fill(r.logs[0]);}]
])test("reject "+name,async()=>{
 const m=mock((e,req)=>{if(req.method==="eth_getTransactionReceipt")change(e.result);});
 await assert.rejects(corroborateBaseReceipt(expected,{authorized:true,fetchImpl:m.fetchImpl}));
});
