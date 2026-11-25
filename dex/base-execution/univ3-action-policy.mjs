// Offline inspection of a conservative single-hop Uniswap V3 action.
// Source: 0x Settler edd3dd4cdd4018d8461c6e5c8f3a9d271cba3806.
// A matching path is not pool authenticity, actual quote compatibility or execution approval.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
export const UNIV3_ACTION_SELECTOR="0x8d68a156";
export const BASE_UNIV3_FACTORY="0x33128a8fc17869897dce68ed026d694621f6fdfd";
export const BASE_UNIV3_INIT_HASH="0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54";
const MAX_UINT256=(1n<<256n)-1n;
const MIN_SQRT_RATIO=4295128739n,MAX_SQRT_RATIO=1461446703485210103287273052203988822378723970342n;
function address(v){
 if(typeof v!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(v)||/^0x(?:0{40}|e{40})$/i.test(v))throw Error("Invalid reviewed address");
 return v.toLowerCase();
}
function raw(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>MAX_UINT256)throw Error("Invalid reviewed raw amount");return BigInt(v);}
export function inspectSingleHopUniswapV3(input,action,policy={}){
 const intent=normalizeExecutionIntent(input);
 const recipient=address(policy.reviewedSettler),reviewedFloor=raw(policy.reviewedMinimumBuyAmount),reviewedLimit=raw(policy.reviewedSqrtPriceLimitX96);
 if(reviewedFloor<BigInt(intent.minimumBuyAmount)||!Number.isInteger(policy.reviewedPoolId)||policy.reviewedPoolId<=0||policy.reviewedPoolId>=1000000||reviewedLimit<=MIN_SQRT_RATIO||reviewedLimit>=MAX_SQRT_RATIO)throw Error("Independent path policy required");
 if(typeof action!=="string"||!/^0x[0-9a-fA-F]{456}$/.test(action)||action.slice(0,10).toLowerCase()!==UNIV3_ACTION_SELECTOR)throw Error("Unsupported single-hop action");
 const hex=action.slice(10).toLowerCase(),word=i=>hex.slice(i*64,i*64+64),uint=i=>BigInt("0x"+word(i));
 if(!/^0{24}[0-9a-f]{40}$/.test(word(0))||address("0x"+word(0).slice(24))!==recipient||uint(1)!==1000000n||uint(2)!==128n||uint(3)<reviewedFloor||uint(4)!==64n)throw Error("Unreviewed swap envelope");
 const path=hex.slice(5*64);
 if(path.length!==128)throw Error("Noncanonical single-hop path");
 const sellToken=address("0x"+path.slice(0,40)),forkId=parseInt(path.slice(40,42),16),poolId=parseInt(path.slice(42,48),16),sqrtPriceLimitX96=BigInt("0x"+path.slice(48,88)),buyToken=address("0x"+path.slice(88,128));
 if(sellToken!==intent.sellToken||buyToken!==intent.buyToken||forkId!==0||poolId!==policy.reviewedPoolId||sqrtPriceLimitX96!==reviewedLimit)throw Error("Unreviewed route, fork, pool ID or price limit");
 return Object.freeze({action:"UNISWAPV3",recipient,sellToken,buyToken,forkId,poolId,sqrtPriceLimitX96:sqrtPriceLimitX96.toString(),minimumBuyAmount:uint(3).toString(),factory:BASE_UNIV3_FACTORY,initHash:BASE_UNIV3_INIT_HASH,requiresIndependentPoolAndSimulationEvidence:true,observationOnly:true,executable:false});
}
