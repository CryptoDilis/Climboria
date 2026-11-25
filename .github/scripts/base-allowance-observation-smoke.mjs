import assert from "node:assert/strict";
import {readAllowanceObservation} from "../../dex/base-execution/allowance-observation.mjs";
import {BASE_ALLOWANCE_HOLDER} from "../../dex/base-execution/allowance-policy.mjs";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
// Public token contract is a non-personal fixture, not a funded test wallet.
for(const [sellToken,buyToken,sellAmount] of [[usdc,weth,"100000"],[weth,usdc,"100000000000000"]]){
 const calls=[];
 const result=await readAllowanceObservation({chainId:8453,sellToken,buyToken,sellAmount,minimumBuyAmount:"1",taker:usdc},{fetchImpl:async(url,options)=>{
  assert.equal(url,"https://mainnet.base.org");assert.equal(options.method,"POST");
  const request=JSON.parse(options.body);calls.push(request);
  assert.ok(["eth_chainId","eth_blockNumber","eth_getCode","eth_call"].includes(request.method));
  return fetch(url,options);
 }});
 assert.deepEqual(calls.map(x=>x.method),["eth_chainId","eth_blockNumber","eth_getCode","eth_getCode","eth_call","eth_call","eth_chainId"]);
 const block=result.observedBlock;
 assert.deepEqual(calls[2].params,[BASE_ALLOWANCE_HOLDER,block]);assert.deepEqual(calls[3].params,[sellToken,block]);
 const word=v=>v.slice(2).padStart(64,"0");
 assert.deepEqual(calls[4].params,[{to:sellToken,data:"0x70a08231"+word(usdc)},block]);
 assert.deepEqual(calls[5].params,[{to:sellToken,data:"0xdd62ed3e"+word(usdc)+word(BASE_ALLOWANCE_HOLDER)},block]);
 assert.equal(result.executable,false);assert.equal(result.observationOnly,true);
 console.log(JSON.stringify({chainId:result.chainId,token:sellToken,block,observedBalance:result.observedBalance,observedAllowance:result.observedAllowance,next:result.next,executable:false}));
}
console.log("PASS: both Base token directions observed at fixed blocks; verified holder runtime and read-only balance/allowance, no signing or approval.");
