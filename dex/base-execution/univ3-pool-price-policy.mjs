// Offline only. The caller must independently review and authenticate pool state.
// Narrow candidate pool whose runtime fingerprints matched in PR #788. Never a live allowlist.
import {inspectSingleHopUniswapV3,BASE_UNIV3_FACTORY} from "./univ3-action-policy.mjs";
export const CANDIDATE_POOL="0xd0b53d9277642d899df5c87a3966a349a798f224";
const token0="0x4200000000000000000000000000000000000006",token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const poolHash="0d14cff6e9be9c1cf4ff7a4856a44e5d17b8a92db7e1f41f2fb5e73ad8b5419a";
const factoryHash="8545609892cc8d7d608dd4420ee110ab98448730570824fb029228e33846d28c";
const MIN=4295128739n,MAX=1461446703485210103287273052203988822378723970342n;
function uint(v,max){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,48})$/.test(v)||BigInt(v)>max)throw Error("Invalid reviewed unsigned amount");return BigInt(v);}
export function inspectCandidatePoolPriceDirection(intent,action,policy={},state={}){
 const route=inspectSingleHopUniswapV3(intent,action,policy);
 // These hashes are historical source-match fingerprints, not authenticated RPC data.
 if(route.poolId!==500||state.chainId!==8453||state.pool!==CANDIDATE_POOL||state.factory!==BASE_UNIV3_FACTORY||state.token0!==token0||state.token1!==token1||state.fee!=="500"||state.poolRuntimeSha256!==poolHash||state.factoryRuntimeSha256!==factoryHash)throw Error("Unsupported candidate pool identity");
 if(typeof policy.reviewedBlockHash!=="string"||!/^0x[0-9a-f]{64}$/.test(policy.reviewedBlockHash)||/^0x0{64}$/.test(policy.reviewedBlockHash)||state.blockHash!==policy.reviewedBlockHash)throw Error("Independent block binding required");
 if(typeof state.blockNumber!=="string"||!/^0x[1-9a-f][0-9a-f]{0,15}$/.test(state.blockNumber)||state.blockNumber!==policy.reviewedBlockNumber)throw Error("Independent block number required");
 if(state.unlocked!==true||uint(state.liquidity,(1n<<128n)-1n)===0n)throw Error("Inactive or locked pool");
 const price=uint(state.sqrtPriceX96,(1n<<160n)-1n),limit=BigInt(route.sqrtPriceLimitX96);
 if(price<=MIN||price>=MAX)throw Error("Invalid pool price");
 const zeroForOne=route.sellToken===token0&&route.buyToken===token1;
 if(!zeroForOne&&!(route.sellToken===token1&&route.buyToken===token0))throw Error("Unsupported token direction");
 if(zeroForOne?limit>=price:limit<=price)throw Error("Price limit on wrong side of pool price");
 // Explicit independently reviewed bound on raw token1/token0 spot-price movement,
 // not a quote slippage guarantee. Squared Q64.96 values avoid floating point.
 const bps=policy.reviewedMaxSpotPriceMovementBps;
 if(!Number.isInteger(bps)||bps<=0||bps>1000)throw Error("Independent narrow spot movement bound required");
 const p2=price*price,l2=limit*limit,delta=zeroForOne?p2-l2:l2-p2;
 if(delta*10000n>p2*BigInt(bps))throw Error("Price limit exceeds independent spot movement bound");
 return Object.freeze({pool:CANDIDATE_POOL,blockHash:state.blockHash,blockNumber:state.blockNumber,zeroForOne,sqrtPriceX96:price.toString(),sqrtPriceLimitX96:limit.toString(),reviewedMaxSpotPriceMovementBps:bps,observationOnly:true,stateAuthenticated:false,actualQuotePoolVerified:false,requiresIndependentSimulation:true,executable:false});
}
