import test from "node:test";
import assert from "node:assert/strict";
import {BASE_EXECUTION_ENABLED,normalizeExecutionIntent,inspectFirmQuoteCandidate} from "../../dex/base-execution/intent-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
const taker="0x"+"1".repeat(40),holder="0x"+"2".repeat(40),target="0x"+"3".repeat(40);
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",taker,minimumBuyAmount:"57000000000000"};
// Synthetic addresses only; not deployed contracts or production policy.
const policy={chainId:8453,allowanceHolders:[holder],transactionTargets:[holder],nestedRoutes:[{operator:target,target,selector:"0x1fff991f",actionSelectors:["0x12345678"]}]};
const word=v=>v.replace(/^0x/,"").padStart(64,"0");
const uint=n=>word(BigInt(n).toString(16));
const nested=({recipient=taker,buyToken=weth,min="58000000000000",offset=160,count=1,actionOffset=32,actionLength=4,action="12345678".padEnd(64,"0")}={})=>"1fff991f"+word(recipient)+word(buyToken)+uint(min)+uint(offset)+uint(0)+uint(count)+uint(actionOffset)+uint(actionLength)+action;
const encode=({operator=target,token=usdc,amount="100000",destination=target,offset=160,inner=nested(),length=inner.length/2,payload=inner.padEnd(Math.ceil(inner.length/64)*64,"0")}={})=>"0x2213bc0b"+word(operator)+word(token)+uint(amount)+word(destination)+uint(offset)+uint(length)+payload;
const quote={chainId:8453,sellToken:usdc,buyToken:weth,taker,sellAmount:"100000",buyAmount:"59000000000000",minBuyAmount:"58000000000000",liquidityAvailable:true,fees:{zeroExFee:{amount:"150",token:usdc},integratorFee:null,gasFee:null},issues:{allowance:{spender:holder,actual:"0"},balance:null,simulationIncomplete:false},allowanceTarget:holder,transaction:{to:holder,value:"0",data:encode()}};
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
 for(const bad of [{taker:holder},{allowanceTarget:target},{transaction:{...quote.transaction,to:target}},{transaction:{...quote.transaction,value:"1"}},{transaction:{...quote.transaction,data:"0x12"}},{issues:{...quote.issues,allowance:{spender:target,actual:"0"}}},{issues:{...quote.issues,simulationIncomplete:true}},{issues:{...quote.issues,balance:{actual:"0"}}},{permit2:{}},{fees:{...quote.fees,integratorFee:{amount:"1",token:usdc}}}])assert.throws(()=>inspectFirmQuoteCandidate(intent,{...quote,...bad},policy));
});

test("reject mismatched outer token/amount, route and noncanonical ABI",()=>{
 for(const data of [
  encode({token:weth}),encode({amount:"100001"}),encode({amount:"99999"}),encode({amount:"0"}),
  encode({operator:holder}),encode({destination:holder}),encode({payload:"deadbeef".padEnd(64,"0")}),
  encode({offset:192}),encode({length:3}),encode({length:33}),encode({length:"99999999999999999999999999999"}),
  encode({payload:"12345678".padEnd(63,"0")+"1"}),encode()+"00",encode().slice(0,-2),
  encode().replace("0x2213bc0b","0x095ea7b3"),
  encode().slice(0,10)+"1"+encode().slice(11)
 ])assert.throws(()=>inspectFirmQuoteCandidate(intent,{...quote,transaction:{...quote.transaction,data}},policy));
 assert.throws(()=>inspectFirmQuoteCandidate(intent,quote,{...policy,nestedRoutes:[]}));
 assert.throws(()=>inspectFirmQuoteCandidate(intent,quote,{...policy,allowanceHolders:[holder,target],transactionTargets:[target]}));
});

test("nested execute binds independent minimum, recipient and buy token; action arguments not approved",()=>{
 for(const inner of [nested({recipient:holder}),nested({buyToken:usdc}),nested({min:"0"}),nested({min:"57000000000000"}),nested({count:0}),nested({count:33}),nested({offset:192}),nested({actionOffset:0}),nested({actionOffset:64}),nested({actionLength:33}),nested({action:"deadbeef".padEnd(64,"0")}),nested({action:"12345678".padEnd(63,"0")+"1"}),nested()+"00"]){
  assert.throws(()=>inspectFirmQuoteCandidate(intent,{...quote,transaction:{...quote.transaction,data:encode({inner})}},policy));
 }
 assert.throws(()=>inspectFirmQuoteCandidate({...intent,minimumBuyAmount:"59000000000000"},quote,policy));
 assert.throws(()=>normalizeExecutionIntent({...intent,minimumBuyAmount:"0"}));
 assert.throws(()=>inspectFirmQuoteCandidate(intent,quote,{...policy,nestedRoutes:[{...policy.nestedRoutes[0],actionSelectors:[]}]}));
});
