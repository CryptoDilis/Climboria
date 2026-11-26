// Optional extension of a manually authorized single quote probe.
// Only sanitized route diagnostics and public pool state; never trade approval.
import {BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {observeFirmQuote} from "./firm-quote-observation.mjs";
import {observeQuoteBlockPool} from "./quote-block-pool-observation.mjs";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const expected=["0xc1fb425e","0x38c9c147","0x8d68a156","0x5f80abae"];
export function matchesReviewedPoolDiagnostic(observation){
 const d=observation?.decoded,a=d?.actions;
 if(observation?.chainId!==8453||observation.executable!==false||observation.validEnvelope!==true||observation.allowanceHolderMatches!==true||observation.permit2Present!==false||!d||
 d.outerTokenMatches!==true||d.outerAmountMatches!==true||d.nestedRecipientMatches!==true||d.nestedBuyTokenMatches!==true||d.nestedMinimumMatches!==true||d.nestedSelector!=="0x1fff991f"||
 typeof observation.reportedProviderBlock!=="string"||!/^[1-9][0-9]{0,13}$/.test(observation.reportedProviderBlock)||
 !Array.isArray(a)||a.length!==4||!a.every((x,i)=>x?.selector===expected[i]&&x.parameterEvidence!==null&&typeof x.parameterEvidence==="object"))return false;
 const swap=a[2].parameterEvidence;
 return swap.type==="UNISWAPV3_SINGLE_HOP"&&swap.sellToken===USDC&&swap.buyToken===WETH&&swap.forkId===0&&swap.poolId===500;
}
export async function observeFirmQuoteAndPool({authorized=false,poolAuthorized=false,taker,apiKey,fetchImpl,rpcFetchImpl,signal}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true||poolAuthorized!==true)throw Error("Explicit single quote and public pool observation authorization required");
 signal?.throwIfAborted?.();
 const observation=await observeFirmQuote({authorized,taker,apiKey,fetchImpl});
 signal?.throwIfAborted?.();
 if(!matchesReviewedPoolDiagnostic(observation))return Object.freeze({observation,pool:null,poolObservationStatus:"unsupported-or-incomplete-route",actualQuotePoolVerified:false,executable:false});
 // No raw quote, taker or API key enters the pool RPC call.
 let pool;
 try{pool=await observeQuoteBlockPool({authorized:true,reportedBlockNumber:observation.reportedProviderBlock,fetchImpl:rpcFetchImpl,signal});}
 catch{return Object.freeze({observation,pool:null,poolObservationStatus:"rpc-verification-failed",actualQuotePoolVerified:false,executable:false});}
 return Object.freeze({observation,pool,poolObservationStatus:"two-host-state-observed",actualQuotePoolVerified:false,executable:false});
}
