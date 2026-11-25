// Offline, strict canonical ABI inspection of 0x AllowanceHolder.exec.
// Source: 0xProject/0x-settler f7340e6237146b2dfd40a40b3efeea527e4eb689,
// src/allowanceholder/IAllowanceHolder.sol and AllowanceHolderBase.sol.
// This does not validate the semantics of nested Settler actions.
export const EXEC_SELECTOR="2213bc0b"; // keccak256("exec(address,address,uint256,address,bytes)")[:4]
const MAX_BYTES=32768;
import {inspectSettlerExecute} from "./settler-calldata.mjs";
export function inspectAllowanceHolderExec(calldata){
 if(typeof calldata!=="string"||calldata.length>2+MAX_BYTES*2||!/^0x(?:[0-9a-fA-F]{2})+$/.test(calldata))throw Error("Invalid calldata");
 const hex=calldata.slice(2).toLowerCase();
 if(hex.slice(0,8)!==EXEC_SELECTOR||hex.length<8+64*6)throw Error("Unsupported AllowanceHolder selector or truncated ABI");
 const word=i=>hex.slice(8+i*64,8+(i+1)*64);
 const address=i=>{
  const w=word(i);if(!/^0{24}[0-9a-f]{40}$/.test(w)||/^0{64}$/.test(w)||/^0{24}e{40}$/.test(w))throw Error("Noncanonical ABI address");
  return "0x"+w.slice(24);
 };
 const uint=i=>BigInt("0x"+word(i));
 const operator=address(0),token=address(1),amount=uint(2),target=address(3);
 if(amount===0n||uint(4)!==160n)throw Error("Noncanonical ABI amount or dynamic offset");
 const length=uint(5);
 if(length<4n||length>BigInt(MAX_BYTES-196))throw Error("Invalid nested calldata length");
 const n=Number(length),start=8+64*6,end=start+n*2,padded=start+Math.ceil(n/32)*64;
 if(hex.length!==padded||!/^[0]*$/.test(hex.slice(end)))throw Error("Noncanonical ABI padding or trailing bytes");
 return Object.freeze({operator,token,amount:amount.toString(),target,nestedSelector:"0x"+hex.slice(start,start+8),nestedByteLength:n,settler:inspectSettlerExecute("0x"+hex.slice(start,end))});
}
