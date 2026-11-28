import test from "node:test";
import assert from "node:assert/strict";
import { CANDIDATES, observe, makeRpc } from "./observe-dependencies.mjs";

const hash="0x"+"a".repeat(64), other="0x"+"b".repeat(64);
const block=(number="0x10",h=hash)=>({number,hash:h,timestamp:"0x6b123456"});
function mock(chain="8453",protocol="v2",override=()=>undefined){
  const c=CANDIDATES[chain+":"+protocol],calls=[];
  return {calls,rpc:async(method,params)=>{
    calls.push({method,params});
    const changed=override(method,params);
    if(changed!==undefined)return changed;
    if(method==="eth_chainId")return "0x"+BigInt(chain).toString(16);
    if(method==="eth_getBlockByNumber")return block();
    if(method==="eth_getCode"){assert.deepEqual(params[1],{blockHash:hash,requireCanonical:true});return "0x6000";}
    if(method==="eth_call"){
      assert.deepEqual(params[1],{blockHash:hash,requireCanonical:true});
      assert.equal(params[0].to,c.entry);
      assert.ok(["0xc45a0155",c.wethSelector].includes(params[0].data));
      return "0x"+"0".repeat(24)+(params[0].data==="0xc45a0155"?c.factory:c.weth).slice(2);
    }
    throw Error("Unexpected method");
  }};
}
const run=(a,b,chain="8453",protocol="v2")=>observe({chain,protocol,rpcA:a.rpc,rpcB:b.rpc});
test("documented role and chain are not interchangeable",()=>{
  assert.equal(CANDIDATES["8453:v2"].entry,CANDIDATES["84532:v3"].factory);
  assert.notEqual(CANDIDATES["8453:v3"].entry,CANDIDATES["84532:v3"].entry);
  assert.equal(CANDIDATES["84532:v2"],undefined);
});
for(const [chain,protocol] of [["8453","v2"],["8453","v3"],["84532","v3"]]){
  test("exact shared-block observation "+chain+":"+protocol,async()=>{
    const a=mock(chain,protocol),b=mock(chain,protocol),result=await run(a,b,chain,protocol);
    assert.equal(result.status,"DUAL_RPC_DEPENDENCY_OBSERVATION_NO_GO");
    assert.equal(result.blockHash,hash);assert.equal(result.testnet,"NO_GO");assert.equal(result.mainnet,"NO_GO");
    assert.equal(result.sourceRuntimeMatch,"NOT_VERIFIED");
    assert.equal(a.calls.length,8);assert.equal(b.calls.length,8);
    assert.equal(Object.keys(result.contracts).length,3);
  });
}
test("select lower finalized-reported tip",async()=>{
  const a=mock(),b=mock("8453","v2",(m,p)=>m==="eth_getBlockByNumber"&&p[0]==="finalized"?block("0x11",other):undefined);
  assert.equal((await run(a,b)).blockNumber,"16");
});
test("reject undocumented chain/protocol before RPC",async()=>{
  const a=mock(),b=mock();await assert.rejects(run(a,b,"84532","v2"),/UNSUPPORTED_CHAIN_PROTOCOL/);assert.equal(a.calls.length,0);
});
test("reject wrong chain",async()=>assert.rejects(run(mock(),mock("84532","v3")),/CHAIN_MISMATCH/));
test("reject different block hash",async()=>assert.rejects(run(mock(),mock("8453","v2",(m,p)=>m==="eth_getBlockByNumber"&&p[0]==="0x10"?block("0x10",other):undefined)),/BLOCK_MISMATCH/));
test("reject finalized-tip inconsistency",async()=>assert.rejects(run(mock(),mock("8453","v2",(m,p)=>m==="eth_getBlockByNumber"&&p[0]==="finalized"?block("0x10",other):undefined)),/FINALIZED_TIP_MISMATCH/));
test("reject runtime mismatch",async()=>assert.rejects(run(mock(),mock("8453","v2",m=>m==="eth_getCode"?"0x6001":undefined)),/RUNTIME_MISMATCH_FACTORY/));
test("reject empty code",async()=>assert.rejects(run(mock(),mock("8453","v2",m=>m==="eth_getCode"?"0x":undefined)),/INVALID_RUNTIME/));
test("reject wrong factory getter",async()=>assert.rejects(run(mock(),mock("8453","v2",(m,p)=>m==="eth_call"&&p[0].data==="0xc45a0155"?"0x"+"0".repeat(64):undefined)),/GETTER_MISMATCH_FACTORY/));
test("reject wrong wrapped-native getter",async()=>assert.rejects(run(mock(),mock("8453","v2",(m,p)=>m==="eth_call"&&p[0].data==="0xad5c4648"?"0x"+"0".repeat(64):undefined)),/GETTER_MISMATCH_WRAPPEDNATIVE/));
test("no fallback if canonical hash requests unsupported",async()=>{
  const a=mock(),b=mock("8453","v2",m=>{if(m==="eth_getCode")throw Error("B_UNSUPPORTED");});
  await assert.rejects(run(a,b),/B_UNSUPPORTED/);
  assert.equal(a.calls.filter(c=>c.method==="eth_getCode").length,1);
});
test("forbid writes before network request",async()=>assert.rejects(makeRpc("https://example.invalid","A")("eth_sendRawTransaction",[]),/FORBIDDEN_METHOD/));
test("reject non-HTTPS and embedded credentials",()=>{
  assert.throws(()=>makeRpc("http://example.invalid","A"),/INVALID_ENDPOINT/);
  assert.throws(()=>makeRpc("https://u:p@example.invalid","A"),/INVALID_ENDPOINT/);
});
