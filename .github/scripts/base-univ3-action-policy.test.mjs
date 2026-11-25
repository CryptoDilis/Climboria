import test from "node:test";
import assert from "node:assert/strict";
import {inspectSingleHopUniswapV3,UNIV3_ACTION_SELECTOR,BASE_UNIV3_FACTORY} from "../../dex/base-execution/univ3-action-policy.mjs";
const sell="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",buy="0x4200000000000000000000000000000000000006",taker="0x"+"1".repeat(40),settler="0x"+"2".repeat(40);
const intent={chainId:8453,sellToken:sell,buyToken:buy,sellAmount:"100000",minimumBuyAmount:"100",taker};
const limit=79228162514264337593543950336n;
const policy={reviewedSettler:settler,reviewedMinimumBuyAmount:"110",reviewedSqrtPriceLimitX96:limit.toString(),reviewedPoolId:500};
const word=v=>typeof v==="string"&&v.startsWith("0x")?v.slice(2).padStart(64,"0"):BigInt(v).toString(16).padStart(64,"0");
const action=({recipient=settler,ppm=1000000n,offset=128n,min=110n,length=64n,input=sell,output=buy,fork=0,pool=500,price=limit}={})=>UNIV3_ACTION_SELECTOR+[recipient,ppm,offset,min,length].map(word).join("")+input.slice(2)+fork.toString(16).padStart(2,"0")+pool.toString(16).padStart(6,"0")+price.toString(16).padStart(40,"0")+output.slice(2);
test("canonical single-hop route remains observation only",()=>{
 const r=inspectSingleHopUniswapV3(intent,action(),policy);
 assert.equal(r.factory,BASE_UNIV3_FACTORY);assert.equal(r.poolId,500);assert.equal(r.minimumBuyAmount,"110");assert.equal(r.executable,false);assert.equal(r.requiresIndependentPoolAndSimulationEvidence,true);
});
test("reject incorrect recipient, amount, path, fork, fee, minimum and price limit",()=>{
 for(const patch of [{recipient:taker},{ppm:999999n},{ppm:1000001n},{offset:160n},{min:109n},{length:63n},{input:buy},{output:sell},{fork:1},{pool:3000},{price:limit+1n}]){
  assert.throws(()=>inspectSingleHopUniswapV3(intent,action(patch),policy));
 }
 assert.throws(()=>inspectSingleHopUniswapV3(intent,action()+"00",policy));
 assert.throws(()=>inspectSingleHopUniswapV3(intent,action(),{}));
 assert.throws(()=>inspectSingleHopUniswapV3(intent,action(),{...policy,reviewedMinimumBuyAmount:"99"}));
 assert.throws(()=>inspectSingleHopUniswapV3(intent,action({price:0n}),{...policy,reviewedSqrtPriceLimitX96:"0"}));
});
