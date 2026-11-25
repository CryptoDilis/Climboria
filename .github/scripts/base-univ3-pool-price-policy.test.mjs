import test from "node:test";
import assert from "node:assert/strict";
import {inspectCandidatePoolPriceDirection,CANDIDATE_POOL} from "../../dex/base-execution/univ3-pool-price-policy.mjs";
import {BASE_UNIV3_FACTORY,UNIV3_ACTION_SELECTOR} from "../../dex/base-execution/univ3-action-policy.mjs";
const token0="0x4200000000000000000000000000000000000006",token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",taker="0x"+"1".repeat(40),settler="0x"+"2".repeat(40);
const price=BigInt("0x2b0208b01e834bd8c6b0e");
const blockHash="0xac6a3fc3509fb628d87b7d61e21b9fdcd9c8d466022cab50ce40d53227f8d64d",blockNumber="0x3b55a4c";
const state={chainId:8453,pool:CANDIDATE_POOL,factory:BASE_UNIV3_FACTORY,token0,token1,fee:"500",poolRuntimeSha256:"0d14cff6e9be9c1cf4ff7a4856a44e5d17b8a92db7e1f41f2fb5e73ad8b5419a",factoryRuntimeSha256:"8545609892cc8d7d608dd4420ee110ab98448730570824fb029228e33846d28c",blockHash,blockNumber,sqrtPriceX96:price.toString(),liquidity:"705020726429923728",unlocked:true};
const word=v=>(typeof v==="string"&&v.startsWith("0x")?v.slice(2):BigInt(v).toString(16)).padStart(64,"0");
function check({zeroForOne=false,limit=zeroForOne?price*999n/1000n:price*1001n/1000n,pool=500,patch={},policyPatch={}}={}){
 const sell=zeroForOne?token0:token1,buy=zeroForOne?token1:token0;
 const intent={chainId:8453,sellToken:sell,buyToken:buy,sellAmount:"100000",minimumBuyAmount:"100",taker};
 const policy={reviewedSettler:settler,reviewedMinimumBuyAmount:"110",reviewedSqrtPriceLimitX96:limit.toString(),reviewedPoolId:pool,reviewedBlockHash:blockHash,reviewedBlockNumber:blockNumber,reviewedMaxSpotPriceMovementBps:30,...policyPatch};
 const action=UNIV3_ACTION_SELECTOR+[settler,1000000n,128n,110n,64n].map(word).join("")+sell.slice(2)+"00"+pool.toString(16).padStart(6,"0")+limit.toString(16).padStart(40,"0")+buy.slice(2);
 return inspectCandidatePoolPriceDirection(intent,action,policy,{...state,...patch});
}
test("both directions with narrow synthetic limits remain non-executable",()=>{
 for(const zeroForOne of [false,true]){
  const r=check({zeroForOne});assert.equal(r.zeroForOne,zeroForOne);assert.equal(r.executable,false);assert.equal(r.stateAuthenticated,false);assert.equal(r.actualQuotePoolVerified,false);
 }
});
test("wrong side, equality and excessive squared price movement rejected",()=>{
 for(const zeroForOne of [false,true]){
  for(const limit of [price,zeroForOne?price+1n:price-1n,zeroForOne?price*9n/10n:price*11n/10n])assert.throws(()=>check({zeroForOne,limit}));
 }
 for(const bps of [undefined,0,1,1001,1.5,"30"])assert.throws(()=>check({policyPatch:{reviewedMaxSpotPriceMovementBps:bps}}));
});
test("reject unreviewed state, mismatched block, identity and inactive pool",()=>{
 for(const patch of [{chainId:1},{pool:"0x"+"3".repeat(40)},{factory:token0},{token0:token1},{fee:"3000"},{poolRuntimeSha256:"0".repeat(64)},{factoryRuntimeSha256:"0".repeat(64)},{blockHash:"0x"+"4".repeat(64)},{blockNumber:"0x1"},{unlocked:false},{liquidity:"0"},{liquidity:"-1"},{sqrtPriceX96:"0"}])assert.throws(()=>check({patch}));
 assert.throws(()=>check({pool:3000}));assert.throws(()=>check({policyPatch:{reviewedBlockHash:undefined}}));
});

import {decodeCandidateSlot0,observeQuoteBlockPool,assertReviewedPoolObservation} from "../../dex/base-execution/quote-block-pool-observation.mjs";
test("slot0 canonical widths, signed tick and unlocked flag",()=>{
 const slot=(tick=-1n,unlocked=1n)=>"0x"+[price,BigInt.asUintN(256,tick),0n,1n,1n,0n,unlocked].map(word).join("");
 assert.deepEqual(decodeCandidateSlot0(slot()),{sqrtPriceX96:price.toString(),unlocked:true,tick:-1});
 for(const invalid of [slot(887273n),slot(0n,0n),slot(0n,2n),slot().slice(0,-2),slot(0n).slice(0,66)+word(16777215n)+slot(0n).slice(130)])assert.throws(()=>decodeCandidateSlot0(invalid));
});
test("reviewed state must equal every observed field",()=>{
 const a={block:blockNumber,hash:blockHash},reviewed={...state,timestamp:1800000000},observed={...reviewed,twoHostsAgreed:true,executable:false,stateAuthenticated:false};
 assert.doesNotThrow(()=>assertReviewedPoolObservation(reviewed,observed,a));
 for(const patch of [{timestamp:1800000001},{sqrtPriceX96:"1"},{liquidity:"1"},{unlocked:false},{poolRuntimeSha256:"0".repeat(64)}])assert.throws(()=>assertReviewedPoolObservation({...reviewed,...patch},observed,a));
 assert.throws(()=>assertReviewedPoolObservation(reviewed,{...observed,twoHostsAgreed:false},a));
});
test("pool probe rejects unauthorized, wrong block and changed runtime before contract calls",async()=>{
 const calls=[],a={block:blockNumber,hash:blockHash};
 let wrong=false;
 const fetchImpl=async(url,opts)=>{
  const req=JSON.parse(opts.body);calls.push(req.method);
  let result;
  if(req.method==="eth_chainId")result="0x2105";
  else if(req.method==="eth_getBlockByNumber")result={number:blockNumber,hash:wrong?"0x"+"b".repeat(64):blockHash,timestamp:"0x6b49d200"};
  else if(req.method==="eth_getCode"){assert.deepEqual(req.params[1],{blockHash,requireCanonical:true});result="0x6000";}
  else throw Error("Unexpected contract call");
  return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,result}));
 };
 await assert.rejects(observeQuoteBlockPool({referenceBlock:a,fetchImpl}),/authorization/);assert.deepEqual(calls,[]);
 wrong=true;await assert.rejects(observeQuoteBlockPool({authorized:true,referenceBlock:a,fetchImpl}),/block changed/);assert.deepEqual(calls,["eth_chainId","eth_getBlockByNumber"]);
 calls.length=0;wrong=false;await assert.rejects(observeQuoteBlockPool({authorized:true,referenceBlock:a,fetchImpl}),/runtime changed/);assert.deepEqual(calls,["eth_chainId","eth_getBlockByNumber","eth_getCode"]);
});
