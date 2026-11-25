// Fixed-field diagnostic projection only. Never returns raw calldata or signature bytes.
// Describes candidate action parameters; does not validate fee recipients or authorize execution.
const validAddr=v=>typeof v==="string"&&/^0x[0-9a-f]{40}$/.test(v)&&!/^0x(?:0{40}|e{40})$/.test(v);
export function projectActionEvidence(action,taker){
 if(typeof taker!=="string"||!validAddr(taker.toLowerCase()))throw Error("Invalid observation taker");
 taker=taker.toLowerCase();
 if(typeof action!=="string"||!/^0x(?:[0-9a-f]{2}){4,32768}$/.test(action))throw Error("Invalid observation action");
 const selector=action.slice(0,10),byteLength=(action.length-2)/2,base={selector,byteLength};
 const hex=action.slice(10);
 const word=i=>{const w=hex.slice(i*64,(i+1)*64);if(w.length!==64)throw Error("Truncated word");return w;};
 const u=i=>BigInt("0x"+word(i));
 const addressHex=w=>{if(!/^0{24}[0-9a-f]{40}$/.test(w))throw Error("Invalid address word");const a="0x"+w.slice(24);if(!validAddr(a))throw Error("Invalid address");return a===taker?"taker":a;};
 const addr=i=>addressHex(word(i));
 try{
  let parameters;
  if(selector==="0xc1fb425e"&&byteLength===228){
   if(u(5)!==192n||u(6)!==0n)throw Error("Nonempty or noncanonical signature");
   parameters={type:"TRANSFER_FROM",recipient:addr(0),token:addr(1),amount:u(2).toString(),nonce:u(3).toString(),deadline:u(4).toString(),emptySignature:true};
  }else if(selector==="0x38c9c147"&&byteLength===292){
   if(u(4)!==160n||u(5)!==68n||!/^0*$/.test(hex.slice(6*64+136)))throw Error("Noncanonical BASIC payload");
   const data=hex.slice(6*64,6*64+136);
   if(data.slice(0,8)!=="a9059cbb")throw Error("Unsupported BASIC nested selector");
   parameters={type:"BASIC_TRANSFER",token:addr(0),ppm:u(1).toString(),pool:addr(2),amountOffset:u(3).toString(),transferRecipient:addressHex(data.slice(8,72)),transferAmountWord:BigInt("0x"+data.slice(72)).toString()};
  }else if(selector==="0x8d68a156"&&byteLength===228){
   if(u(2)!==128n||u(4)!==64n)throw Error("Noncanonical single-hop path");
   const path=hex.slice(320);if(path.length!==128)throw Error("Unexpected path length");
   parameters={type:"UNISWAPV3_SINGLE_HOP",recipient:addr(0),ppm:u(1).toString(),minimumBuyAmount:u(3).toString(),sellToken:addressHex(path.slice(0,40).padStart(64,"0")),forkId:parseInt(path.slice(40,42),16),poolId:parseInt(path.slice(42,48),16),sqrtPriceLimitX96:BigInt("0x"+path.slice(48,88)).toString(),buyToken:addressHex(path.slice(88,128).padStart(64,"0"))};
  }else if(selector==="0x5f80abae"&&byteLength===164){
   parameters={type:"POSITIVE_SLIPPAGE",recipient:addr(0),token:addr(1),expectedAmount:u(2).toString(),surplusPpm:u(3).toString(),maxPpm:u(4).toString()};
  }else return Object.freeze({...base,parameterEvidence:null});
  return Object.freeze({...base,parameterEvidence:Object.freeze(parameters)});
 }catch{return Object.freeze({...base,parameterEvidence:null});}
}
