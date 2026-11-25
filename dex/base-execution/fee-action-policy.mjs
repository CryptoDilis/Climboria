// Offline narrow review of the observed BASIC and POSITIVE_SLIPPAGE action types.
// The provider response exposed selectors/lengths only. No actual fee recipient
// or nested call has been reviewed. Never infer authorization from these checks.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
export const BASIC_SELECTOR="0x38c9c147",POSITIVE_SLIPPAGE_SELECTOR="0x5f80abae";
const BASIS=1000000n;
function address(v){
 if(typeof v!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(v)||/^0x(?:0{40}|e{40})$/i.test(v))throw Error("Invalid reviewed address");
 return v.toLowerCase();
}
function amount(v){
 if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>=(1n<<256n))throw Error("Invalid reviewed amount");
 return BigInt(v);
}
function cap(v){const n=amount(v);if(n>BASIS)throw Error("Invalid reviewed ppm cap");return n;}
function decoder(action,selector,bytes){
 if(typeof action!=="string"||action.length!==2+bytes*2||!/^0x[0-9a-fA-F]+$/.test(action)||action.slice(0,10).toLowerCase()!==selector)throw Error("Unsupported canonical action");
 const hex=action.slice(10).toLowerCase();
 const word=i=>{const w=hex.slice(i*64,i*64+64);if(w.length!==64)throw Error("Truncated word");return w;};
 const uint=i=>BigInt("0x"+word(i));
 const addr=i=>{const w=word(i);if(!/^0{24}[0-9a-f]{40}$/.test(w))throw Error("Noncanonical address");return address("0x"+w.slice(24));};
 return {hex,uint,addr};
}
// BASIC can make arbitrary calls and approve arbitrary pools. Only inspect the
// narrow ERC20 self-call transfer(recipient,amount) form, where offset 36 is the
// ABI amount word that Basic.sol rewrites. All other nested calls are rejected.
export function inspectBasicFeeAction(input,action,policy={}){
 const intent=normalizeExecutionIntent(input);
 const feeRecipient=address(policy.sellFeeRecipient),maxPpm=cap(policy.maxSellFeePpm);
 const {hex,uint,addr}=decoder(action,BASIC_SELECTOR,292);
 const token=addr(0),ppm=uint(1),pool=addr(2);
 if(token!==intent.sellToken||pool!==token||ppm===0n||ppm>maxPpm||uint(3)!==36n||uint(4)!==160n||uint(5)!==68n)throw Error("Unreviewed BASIC fee envelope");
 const data=hex.slice(6*64,6*64+136),padding=hex.slice(6*64+136);
 if(data.slice(0,8)!=="a9059cbb"||!/^0{24}[0-9a-f]{40}$/.test(data.slice(8,72))||address("0x"+data.slice(32,72))!==feeRecipient||!/^0{64}$/.test(data.slice(72))||!/^0*$/.test(padding))throw Error("Unreviewed nested fee transfer");
 return Object.freeze({action:"BASIC",token,recipient:feeRecipient,ppm:ppm.toString(),requiresBalanceAndFeeSimulation:true,observationOnly:true,executable:false});
}
// Positive slippage is transferred from the Settler balance, not directly from
// the wallet; the actual amount depends on balance and cannot be inferred here.
export function inspectPositiveSlippageAction(input,action,policy={}){
 const intent=normalizeExecutionIntent(input);
 const feeRecipient=address(policy.surplusRecipient),maxSurplusPpm=cap(policy.maxSurplusPpm),maxCapPpm=cap(policy.maxSurplusCapPpm);
 const {uint,addr}=decoder(action,POSITIVE_SLIPPAGE_SELECTOR,164);
 const recipient=addr(0),token=addr(1),expected=uint(2),surplusPpm=uint(3),maxPpm=uint(4);
 const minimum=amount(policy.reviewedMinimumBuyAmount);
 if(minimum<BigInt(intent.minimumBuyAmount)||recipient!==feeRecipient||token!==intent.buyToken||expected<minimum||surplusPpm>maxSurplusPpm||maxPpm>maxCapPpm)throw Error("Unreviewed positive slippage parameters");
 return Object.freeze({action:"POSITIVE_SLIPPAGE",token,recipient,expectedAmount:expected.toString(),surplusPpm:surplusPpm.toString(),maxPpm:maxPpm.toString(),requiresBalanceAndFeeSimulation:true,observationOnly:true,executable:false});
}
