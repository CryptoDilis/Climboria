// Offline policy for the next Base execution integration. NOT wired to HTTP or wallet.
import {normalizePriceIntent,normalizePriceResponse} from "../base-price-provider/zeroex-indicative.mjs";
import {inspectAllowanceHolderExec} from "./allowanceholder-calldata.mjs";
export const BASE_EXECUTION_ENABLED=false;
export const FIRM_QUOTE_ENDPOINT="https://api.0x.org/swap/allowance-holder/quote";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const MAX=(1n<<256n)-1n;
function address(v){
 if(typeof v!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(v)||/^0x(?:0{40}|e{40})$/i.test(v))throw Error("Invalid address");
 return v.toLowerCase();
}
function amount(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>MAX)throw Error("Invalid amount");return BigInt(v);}
export function normalizeExecutionIntent(input){
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).sort().join(",")!=="buyToken,chainId,minimumBuyAmount,sellAmount,sellToken,taker")throw Error("Unexpected execution intent fields");
 const {taker,minimumBuyAmount,...price}=input,normalized=normalizePriceIntent(price);
 if(amount(minimumBuyAmount)===0n)throw Error("Independent minimum output required");
 if(!((normalized.sellToken===USDC&&normalized.buyToken===WETH)||(normalized.sellToken===WETH&&normalized.buyToken===USDC)))throw Error("Unsupported execution pair");
 return Object.freeze({...normalized,taker:address(taker),minimumBuyAmount});
}
// Addresses must come from a reviewed, independently verified deployment policy,
// never from the quote itself. Until such a policy exists, this rejects every quote.
export function inspectFirmQuoteCandidate(input,data,policy){
 const intent=normalizeExecutionIntent(input);
 if(!policy||policy.chainId!==8453||!Array.isArray(policy.allowanceHolders)||!policy.allowanceHolders.length||!Array.isArray(policy.transactionTargets)||!policy.transactionTargets.length||!Array.isArray(policy.nestedRoutes)||!policy.nestedRoutes.length)throw Error("Reviewed contract policy required");
 const holders=new Set(policy.allowanceHolders.map(address)),targets=new Set(policy.transactionTargets.map(address));
 const {taker,minimumBuyAmount,...price}=intent;
 const observation=normalizePriceResponse(price,data);
 if(Object.hasOwn(data,"taker")&&address(data.taker)!==taker)throw Error("Quote taker mismatch");
 if(data.permit2!=null||data.issues?.simulationIncomplete!==false||data.issues?.balance!==null||!Object.hasOwn(data.issues??{},"allowance"))throw Error("Quote preflight incomplete");
 const tx=data.transaction;
 if(!tx||!targets.has(address(tx.to))||amount(tx.value)!==0n||typeof tx.data!=="string"||!/^0x(?:[0-9a-fA-F]{2}){4,32768}$/.test(tx.data))throw Error("Unreviewed transaction envelope");
 // The outer call must be to the reviewed AllowanceHolder, not Settler.
 if(!holders.has(address(tx.to)))throw Error("Transaction must target AllowanceHolder");
 const outer=inspectAllowanceHolderExec(tx.data);
 if(outer.token!==intent.sellToken||outer.amount!==intent.sellAmount)throw Error("Outer calldata does not match sell intent");
 // A specific operator/target/selector tuple must be independently reviewed.
 const route=policy.nestedRoutes.find(route=>route&&address(route.operator)===outer.operator&&address(route.target)===outer.target&&route.selector===outer.nestedSelector);
 if(!route||!Array.isArray(route.actionSelectors)||!route.actionSelectors.length)throw Error("Unreviewed nested route");
 const nested=outer.settler;
 if(nested.recipient!==taker||nested.buyToken!==intent.buyToken||nested.minAmountOut!==observation.providerMinBuyAmount||amount(nested.minAmountOut)<amount(minimumBuyAmount))throw Error("Nested recipient, token or slippage mismatch");
 if(!nested.actions.every(action=>route.actionSelectors.includes(action.selector)))throw Error("Unreviewed nested action selector");
 const allowance=data.issues.allowance;
 if(allowance!==null){
  if(!holders.has(address(allowance.spender))||address(allowance.spender)!==address(tx.to)||amount(allowance.actual)>=amount(intent.sellAmount))throw Error("Unexpected allowance issue");
 }
 if(data.allowanceTarget!=null&&(!holders.has(address(data.allowanceTarget))||address(data.allowanceTarget)!==address(tx.to)))throw Error("Unreviewed allowance target");
 if(allowance!==null&&data.allowanceTarget!=null&&address(allowance.spender)!==address(data.allowanceTarget))throw Error("Allowance target mismatch");
 // Outer and nested ABI framing only. No complete action argument semantics, simulation proof,
 // transaction or approval is provided to callers. No execution authorization.
 return Object.freeze({chainId:8453,provider:"0x",candidateOnly:true,executable:false,requestedSellAmount:observation.requestedSellAmount,estimatedBuyAmount:observation.estimatedBuyAmount,providerMinBuyAmount:observation.providerMinBuyAmount,allowanceRequired:allowance!==null});
}
