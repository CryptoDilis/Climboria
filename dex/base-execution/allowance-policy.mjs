// Offline approval decision only. No calldata construction, wallet calls or execution.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
// Source and observed runtime matched in CI 45572918731 at Base block 0x3b24e40.
// This does not imply approval of a particular swap route.
export const BASE_ALLOWANCE_HOLDER="0x0000000000001ff3684f28c67538d4d072c22734";
const MAX=(1n<<256n)-1n;
function raw(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>MAX)throw Error("Invalid raw amount");return BigInt(v);}
function address(v){if(typeof v!=="string"||!/^0x[0-9a-fA-F]{40}$/.test(v))throw Error("Invalid address");return v.toLowerCase();}
export function inspectAllowanceState(input,observation){
 const intent=normalizeExecutionIntent(input);
 if(!observation||observation.chainId!==8453||address(observation.owner)!==intent.taker||address(observation.token)!==intent.sellToken||address(observation.spender)!==BASE_ALLOWANCE_HOLDER)throw Error("Allowance observation does not match Base intent");
 if(typeof observation.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,63}$/.test(observation.block))throw Error("Observed block required");
 const requested=raw(intent.sellAmount),balance=raw(observation.balance),allowance=raw(observation.allowance);
 // Deliberately reject unlimited grants, including a requested uint256 maximum.
 if(requested===MAX)throw Error("Unlimited approval forbidden");
 let next,proposedApprovalAmount=null;
 if(balance<requested)next="insufficient-balance";
 else if(allowance===requested)next="exact-allowance-observed";
 else if(allowance===0n){next="exact-approval-review-required";proposedApprovalAmount=requested.toString();}
 else{next="existing-allowance-reset-review-required";proposedApprovalAmount="0";}
 return Object.freeze({chainId:8453,observationOnly:true,executable:false,observedBlock:observation.block,sellToken:intent.sellToken,spender:BASE_ALLOWANCE_HOLDER,requestedSellAmount:intent.sellAmount,observedAllowance:allowance.toString(),observedBalance:balance.toString(),next,proposedApprovalAmount});
}
