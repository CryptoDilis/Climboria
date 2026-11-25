import test from "node:test";
import assert from "node:assert/strict";
import {BASE_EXECUTION_ENABLED,normalizeExecutionIntent,inspectFirmQuoteCandidate} from "../../dex/base-execution/intent-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
const taker="0x"+"1".repeat(40),holder="0x"+"2".repeat(40),target="0x"+"3".repeat(40);
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",taker};
// Synthetic addresses only; not deployed contracts or production policy.
const policy={chainId:8453,allowanceHolders:[holder],transactionTargets:[target]};
const quote={chainId:8453,sellToken:usdc,buyToken:weth,taker,sellAmount:"100000",buyAmount:"59000000000000",minBuyAmount:"58000000000000",liquidityAvailable:true,fees:{zeroExFee:{amount:"150",token:usdc},integratorFee:null,gasFee:null},issues:{allowance:{spender:holder,actual:"0"},balance:null,simulationIncomplete:false},allowanceTarget:holder,transaction:{to:target,value:"0",data:"0x12345678"}};
test("execution is disabled; exact Base pair and explicit taker required",()=>{
 assert.equal(BASE_EXECUTION_ENABLED,false);assert.deepEqual(normalizeExecutionIntent(intent),intent);
 for(const bad of [{chainId:1},{taker:"bad"},{sellAmount:"0"},{recipient:taker},{buyToken:holder}])assert.throws(()=>normalizeExecutionIntent({...intent,...bad}));
});
test("no default contract policy and no executable data in candidate observation",()=>{
 assert.throws(()=>inspectFirmQuoteCandidate(intent,quote));
 const candidate=inspectFirmQuoteCandidate(intent,quote,policy);
 assert.deepEqual(candidate,{chainId:8453,provider:"0x",candidateOnly:true,executable:false,requestedSellAmount:"100000",estimatedBuyAmount:"59000000000000",providerMinBuyAmount:"58000000000000",allowanceRequired:true});
});
test("reject wrong taker, unreviewed spender or destination, native value and unsafe preflight",()=>{
 for(const bad of [{taker:holder},{allowanceTarget:target},{transaction:{...quote.transaction,to:holder}},{transaction:{...quote.transaction,value:"1"}},{transaction:{...quote.transaction,data:"0x12"}},{issues:{...quote.issues,allowance:{spender:target,actual:"0"}}},{issues:{...quote.issues,simulationIncomplete:true}},{issues:{...quote.issues,balance:{actual:"0"}}},{permit2:{}},{fees:{...quote.fees,integratorFee:{amount:"1",token:usdc}}}])assert.throws(()=>inspectFirmQuoteCandidate(intent,{...quote,...bad},policy));
});
