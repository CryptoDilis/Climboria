// Strict canonical ABI subset of the official taker-submitted Settler execute.
// No nested action semantics, transaction construction or execution approval.
import {projectActionEvidence} from "./action-evidence-projection.mjs";
export const SETTLER_EXECUTE_SELECTOR="1fff991f";
const MAX_BYTES=32768,MAX_ACTIONS=32;
export function inspectSettlerExecute(data,{observationTaker,inspectAction}={}){
 if(inspectAction!==undefined&&(typeof inspectAction!=="function"||observationTaker!==undefined))throw Error("Invalid action inspection mode");
 if(typeof data!=="string"||data.length>2+MAX_BYTES*2||!/^0x(?:[0-9a-fA-F]{2})+$/.test(data))throw Error("Invalid nested calldata");
 const hex=data.slice(2).toLowerCase(),args=hex.slice(8);
 if(hex.slice(0,8)!==SETTLER_EXECUTE_SELECTOR||args.length<64*6)throw Error("Unsupported Settler execute ABI");
 const wordAt=offset=>{const w=args.slice(offset*2,offset*2+64);if(w.length!==64)throw Error("Truncated ABI word");return w;};
 const uint=offset=>BigInt("0x"+wordAt(offset));
 const address=offset=>{const w=wordAt(offset);if(!/^0{24}[0-9a-f]{40}$/.test(w)||/^0{64}$/.test(w)||/^0{24}e{40}$/.test(w))throw Error("Invalid slippage address");return "0x"+w.slice(24);};
 const recipient=address(0),buyToken=address(32),minAmountOut=uint(64);
 if(minAmountOut===0n||uint(96)!==160n)throw Error("Invalid slippage floor or action array offset");
 const count=uint(160);
 if(count<1n||count>BigInt(MAX_ACTIONS))throw Error("Invalid action count");
 const n=Number(count),arrayHead=192;
 let expected=n*32;
 const actions=[],privateActions=[];
 for(let i=0;i<n;i++){
  if(uint(arrayHead+i*32)!==BigInt(expected))throw Error("Noncanonical action offset");
  const lengthOffset=arrayHead+expected,length=uint(lengthOffset);
  if(length<4n||length>BigInt(MAX_BYTES))throw Error("Invalid action length");
  const bytes=Number(length),start=lengthOffset+32,end=start+bytes,padded=start+Math.ceil(bytes/32)*32;
  if(padded*2>args.length||!/^[0]*$/.test(args.slice(end*2,padded*2)))throw Error("Truncated action or nonzero padding");
  if(inspectAction!==undefined)privateActions.push("0x"+args.slice(start*2,end*2));
  actions.push(observationTaker===undefined?Object.freeze({selector:"0x"+args.slice(start*2,start*2+8),byteLength:bytes}):projectActionEvidence("0x"+args.slice(start*2,end*2),observationTaker));
  expected=padded-arrayHead;
 }
 if((arrayHead+expected)*2!==args.length)throw Error("Unexpected trailing Settler calldata");
 if(inspectAction!==undefined)privateActions.forEach((action,index)=>inspectAction(action,index,n));
 return Object.freeze({recipient,buyToken,minAmountOut:minAmountOut.toString(),actions:Object.freeze(actions)});
}
