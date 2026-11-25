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
