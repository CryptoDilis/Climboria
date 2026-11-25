// Offline composition of a single conservative four-action candidate.
// Never used to sign, approve, broadcast or enable execution.
import {normalizeExecutionIntent,inspectFirmQuoteCandidate,BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {inspectAllowanceHolderExec} from "./allowanceholder-calldata.mjs";
import {inspectForwardedFundingAction,TRANSFER_FROM_SELECTOR} from "./funding-action-policy.mjs";
import {inspectBasicFeeAction,inspectPositiveSlippageAction,BASIC_SELECTOR,POSITIVE_SLIPPAGE_SELECTOR} from "./fee-action-policy.mjs";
import {inspectCandidatePoolPriceDirection} from "./univ3-pool-price-policy.mjs";
import {UNIV3_ACTION_SELECTOR} from "./univ3-action-policy.mjs";
const HOLDER="0x0000000000001ff3684f28c67538d4d072c22734";
const order=[TRANSFER_FROM_SELECTOR,BASIC_SELECTOR,UNIV3_ACTION_SELECTOR,POSITIVE_SLIPPAGE_SELECTOR];
function raw(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>=(1n<<256n))throw Error("Invalid reviewed raw amount");return BigInt(v);}
export function inspectFourActionQuote(input,quote,contractPolicy,review={},state={}){
 if(BASE_EXECUTION_ENABLED!==false)throw Error("Offline gate required");
 const intent=normalizeExecutionIntent(input),candidate=inspectFirmQuoteCandidate(intent,quote,contractPolicy);
 if(quote.transaction.to.toLowerCase()!==HOLDER)throw Error("Unsupported holder");
 const target=review.reviewedSettler;
 if(typeof target!=="string"||!/^0x[0-9a-f]{40}$/.test(target)||[HOLDER,intent.taker,intent.sellToken,intent.buyToken].includes(target))throw Error("Independent Settler required");
 if(review.reviewedMinimumBuyAmount!==candidate.providerMinBuyAmount||raw(review.reviewedExpectedBuyAmount)<raw(review.reviewedMinimumBuyAmount)||quote.buyAmount!==review.reviewedExpectedBuyAmount)throw Error("Independent quote amounts required");
 if(!Number.isSafeInteger(review.observedTimestamp)||review.observedTimestamp!==state.timestamp)throw Error("Independent state timestamp required");
 let funding,fee,swap,surplus;
 const outer=inspectAllowanceHolderExec(quote.transaction.data,{inspectAction(action,index,count){
  if(count!==4||action.slice(0,10)!==order[index])throw Error("Unexpected action order or count");
  if(index===0)funding=inspectForwardedFundingAction(intent,action,review);
  if(index===1)fee=inspectBasicFeeAction(intent,action,review);
  if(index===2)swap=inspectCandidatePoolPriceDirection(intent,action,review,state);
  if(index===3)surplus=inspectPositiveSlippageAction(intent,action,review);
 }});
 if(outer.operator!==target||outer.target!==target||outer.settler.minAmountOut!==review.reviewedMinimumBuyAmount||!funding||!fee||!swap||!surplus)throw Error("Unreviewed outer target or action composition");
 if(surplus.expectedAmount!==review.reviewedExpectedBuyAmount)throw Error("Surplus threshold differs from independently reviewed output");
 if([target,HOLDER,intent.taker,intent.sellToken,intent.buyToken,swap.pool].includes(fee.recipient)||[target,HOLDER,intent.taker,intent.sellToken,intent.buyToken,swap.pool].includes(surplus.recipient))throw Error("Unsupported fee recipient");
 // Upper bound assumes only the exact funded amount. Existing Settler balances,
 // actual transfers and provider fee reconciliation MUST be independently simulated.
 const nominalSellFee=(raw(funding.amount)*raw(fee.ppm)+999999n)/1000000n;
 if(nominalSellFee>raw(review.reviewedMaxNominalSellFee)||nominalSellFee>=raw(funding.amount))throw Error("Nominal sell fee exceeds independently reviewed cap");
 return Object.freeze({chainId:8453,actionCount:4,nominalSellFeeUpperBound:nominalSellFee.toString(),pool:swap.pool,blockHash:swap.blockHash,observationOnly:true,executable:false,stateAuthenticated:false,actualQuoteVerified:false,requiresBalanceAndFeeSimulation:true,requiresIndependentSettlementReview:true});
}
