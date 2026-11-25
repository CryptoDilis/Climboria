import test from "node:test";
import assert from "node:assert/strict";
import {inspectForwardedFundingAction,TRANSFER_FROM_SELECTOR} from "../../dex/base-execution/funding-action-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006",taker="0x"+"1".repeat(40),settler="0x7130a552999c7e2cae6b38f9336e90c457abd47d";
const intent={chainId:8453,sellToken:usdc,buyToken:weth,sellAmount:"100000",minimumBuyAmount:"1",taker};
const context={reviewedSettler:settler,observedTimestamp:1800000000};
const word=v=>typeof v==="string"&&v.startsWith("0x")?v.slice(2).padStart(64,"0"):BigInt(v).toString(16).padStart(64,"0");
const action=(values=[settler,usdc,100000n,0n,1800000120n,192n,0n])=>TRANSFER_FROM_SELECTOR+values.map(word).join("");
test("canonical exact forwarded funding action is observation only",()=>{
 const result=inspectForwardedFundingAction(intent,action(),context);
 assert.equal(result.amount,"100000");assert.equal(result.recipient,settler);assert.equal(result.token,usdc);assert.equal(result.executable,false);assert.equal(result.observationOnly,true);
});
test("reject wrong recipient, token, amount, nonce, deadline, offset and signature",()=>{
 const original=[settler,usdc,100000n,0n,1800000120n,192n,0n];
 for(const [index,value] of [[0,taker],[1,weth],[2,100001n],[3,1n],[4,1800000000n],[4,1800000301n],[5,224n],[6,1n]]){
  const values=[...original];values[index]=value;assert.throws(()=>inspectForwardedFundingAction(intent,action(values),context));
 }
 assert.throws(()=>inspectForwardedFundingAction(intent,action()+"00",context));
 assert.throws(()=>inspectForwardedFundingAction(intent,action().replace(/^0x.{8}/,"0x00000000"),context));
 assert.throws(()=>inspectForwardedFundingAction(intent,action(),{}));
 assert.throws(()=>inspectForwardedFundingAction(intent,action(),{...context,reviewedSettler:taker}));
});
test("reject proportional sentinel even when sell amount matches intent",()=>{
 const amount=(1n<<256n)-1n;
 assert.throws(()=>inspectForwardedFundingAction({...intent,sellAmount:amount.toString()},action([settler,usdc,amount,0n,1800000120n,192n,0n]),context));
});
