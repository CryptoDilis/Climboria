import test from "node:test";
import assert from "node:assert/strict";
import {BASE_ALLOWANCE_HOLDER,inspectAllowanceState} from "../../dex/base-execution/allowance-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006",taker="0x"+"1".repeat(40);
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",minimumBuyAmount:"57000000000000",taker};
const observation={chainId:8453,owner:taker,token:usdc,spender:BASE_ALLOWANCE_HOLDER,block:"0x3b24e40",balance:"1000000",allowance:"0"};
test("zero allowance proposes exact amount only, never a transaction",()=>{
 const result=inspectAllowanceState(intent,observation);
 assert.equal(result.next,"exact-approval-review-required");
 assert.equal(result.proposedApprovalAmount,"100000");
 assert.equal(result.executable,false);assert.equal(result.observationOnly,true);
 assert.equal(Object.hasOwn(result,"transaction"),false);
});
test("existing exact allowance is observed, other nonzero grants require reset review",()=>{
 assert.equal(inspectAllowanceState(intent,{...observation,allowance:"100000"}).next,"exact-allowance-observed");
 for(const allowance of ["1","99999","100001",((1n<<256n)-1n).toString()]){
  const result=inspectAllowanceState(intent,{...observation,allowance});
  assert.equal(result.next,"existing-allowance-reset-review-required");
  assert.equal(result.proposedApprovalAmount,"0");
 }
 assert.equal(inspectAllowanceState(intent,{...observation,balance:"99999"}).next,"insufficient-balance");
});
test("reject wrong chain, owner, token, spender, malformed block and amounts",()=>{
 for(const bad of [{chainId:1},{owner:usdc},{token:weth},{spender:taker},{block:"latest"},{block:"0x00"},{balance:"-1"},{allowance:"01"},{allowance:(1n<<256n).toString()}])assert.throws(()=>inspectAllowanceState(intent,{...observation,...bad}));
 assert.throws(()=>inspectAllowanceState({...intent,sellAmount:((1n<<256n)-1n).toString()},observation));
});
test("reverse direction matches exact WETH balance and allowance",()=>{
 const reverse={...intent,sellToken:weth,buyToken:usdc,sellAmount:"100000000000000",minimumBuyAmount:"160000"};
 const result=inspectAllowanceState(reverse,{...observation,token:weth,balance:"100000000000000",allowance:"0"});
 assert.equal(result.proposedApprovalAmount,reverse.sellAmount);
});
