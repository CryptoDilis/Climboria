// Offline review of a single canonical AllowanceHolder-forwarded funding action.
// Not wired to signing or quote execution; later actions remain unreviewed.
import {normalizeExecutionIntent} from "./intent-policy.mjs";
export const TRANSFER_FROM_SELECTOR="0xc1fb425e";
const MAX=(1n<<256n)-1n,BASIS=1000000n;
const addr=v=>typeof v==="string"&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x(?:0{40}|e{40})$/i.test(v);
export function inspectForwardedFundingAction(input,action,{reviewedSettler,observedTimestamp}={}){
 const intent=normalizeExecutionIntent(input);
 if(!addr(reviewedSettler)||!Number.isSafeInteger(observedTimestamp)||observedTimestamp<=0)throw Error("Independent target and block timestamp required");
 const target=reviewedSettler.toLowerCase();
 if(typeof action!=="string"||!/^0x[0-9a-fA-F]{456}$/.test(action)||action.slice(0,10).toLowerCase()!==TRANSFER_FROM_SELECTOR)throw Error("Unsupported canonical funding action");
 const hex=action.slice(10).toLowerCase();
 const word=i=>hex.slice(i*64,i*64+64);
 const uint=i=>BigInt("0x"+word(i));
 const address=i=>{const w=word(i);if(!/^0{24}[0-9a-f]{40}$/.test(w)||!addr("0x"+w.slice(24)))throw Error("Invalid action address");return "0x"+w.slice(24);};
 const recipient=address(0),token=address(1),amount=uint(2),nonce=uint(3),deadline=uint(4);
 if(recipient!==target||token!==intent.sellToken||amount!==BigInt(intent.sellAmount)||MAX-amount<BASIS)throw Error("Funding intent mismatch or proportional sentinel");
 if(nonce!==0n||uint(5)!==192n||uint(6)!==0n)throw Error("Noncanonical forwarded funding nonce or signature");
 const timestamp=BigInt(observedTimestamp);
 // Conservative local review window; provider quote compatibility is not yet verified.
 if(deadline<=timestamp||deadline>timestamp+300n)throw Error("Funding deadline outside review window");
 return Object.freeze({action:"TRANSFER_FROM",selector:TRANSFER_FROM_SELECTOR,recipient,token,amount:amount.toString(),deadline:deadline.toString(),observationOnly:true,executable:false});
}
