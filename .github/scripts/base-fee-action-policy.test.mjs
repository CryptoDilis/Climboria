import test from "node:test";
import assert from "node:assert/strict";
import {inspectBasicFeeAction,inspectPositiveSlippageAction,BASIC_SELECTOR,POSITIVE_SLIPPAGE_SELECTOR} from "../../dex/base-execution/fee-action-policy.mjs";
const sell="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buy="0x4200000000000000000000000000000000000006",taker="0x"+"1".repeat(40),fee="0x"+"2".repeat(40),other="0x"+"3".repeat(40);
const intent={chainId:8453,sellToken:sell,buyToken:buy,sellAmount:"100000",minimumBuyAmount:"100",taker};
const policy={sellFeeRecipient:fee,maxSellFeePpm:"1500",surplusRecipient:fee,maxSurplusPpm:"10000",maxSurplusCapPpm:"5000",reviewedMinimumBuyAmount:"110"};
const word=v=>typeof v==="string"&&v.startsWith("0x")?v.slice(2).padStart(64,"0"):BigInt(v).toString(16).padStart(64,"0");
const basic=({token=sell,ppm=1500n,pool=sell,offset=36n,dynamicOffset=160n,length=68n,selector="a9059cbb",recipient=fee,placeholder=0n,padding="0".repeat(56)}={})=>BASIC_SELECTOR+[token,ppm,pool,offset,dynamicOffset,length].map(word).join("")+selector+word(recipient)+word(placeholder)+padding;
const positive=(values=[fee,buy,110n,10000n,5000n])=>POSITIVE_SLIPPAGE_SELECTOR+values.map(word).join("");
test("canonical BASIC ERC20 fee self-call is observation only",()=>{
 const r=inspectBasicFeeAction(intent,basic(),policy);assert.equal(r.ppm,"1500");assert.equal(r.recipient,fee);assert.equal(r.executable,false);assert.equal(r.requiresBalanceAndFeeSimulation,true);
});
test("reject arbitrary pool, call, fee destination, amount offset, padding and unreviewed ppm",()=>{
 for(const patch of [{token:buy},{pool:other},{ppm:1501n},{ppm:0n},{offset:4n},{dynamicOffset:192n},{length:67n},{selector:"095ea7b3"},{recipient:other},{placeholder:1n},{padding:"1"+"0".repeat(55)}])assert.throws(()=>inspectBasicFeeAction(intent,basic(patch),policy));
 assert.throws(()=>inspectBasicFeeAction(intent,basic(),{}));assert.throws(()=>inspectBasicFeeAction(intent,basic()+"00",policy));assert.throws(()=>inspectBasicFeeAction(intent,basic(),{...policy,maxSellFeePpm:"1000001"}));
});
test("positive slippage requires independently reviewed recipient, buy token, expected floor and caps",()=>{
 const r=inspectPositiveSlippageAction(intent,positive(),policy);assert.equal(r.expectedAmount,"110");assert.equal(r.executable,false);assert.equal(r.requiresBalanceAndFeeSimulation,true);
 for(const [index,value] of [[0,other],[1,sell],[2,109n],[3,10001n],[4,5001n]]){
  const values=[fee,buy,110n,10000n,5000n];values[index]=value;assert.throws(()=>inspectPositiveSlippageAction(intent,positive(values),policy));
 }
 assert.throws(()=>inspectPositiveSlippageAction(intent,positive(),{}));assert.throws(()=>inspectPositiveSlippageAction(intent,positive(),{...policy,reviewedMinimumBuyAmount:"99"}));assert.throws(()=>inspectPositiveSlippageAction(intent,positive()+"00",policy));
});
