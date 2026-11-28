// Offline canonical Safe v1.4.1 direct-call envelope decoding and EIP-712 digest.
// Narrow scope: three raw ECDSA signatures (v=27/28) only. No signature recovery,
// historical owner/nonce authentication, finality, payment or release permission.
import {execFileSync} from 'node:child_process';
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const ZERO='0x'+'0'.repeat(40);
const WORDZERO='0'.repeat(64);
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&x!==ZERO;
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const q=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'QUANTITY');return BigInt(x);};
const word=x=>x.toString(16).padStart(64,'0');
const keccak=x=>{
 need(typeof x==='string'&&/^0x(?:[0-9a-f]{2})*$/.test(x),'HASH_INPUT');
 const out=execFileSync('cast',['keccak',x],{encoding:'utf8',timeout:5000,maxBuffer:1024,stdio:['ignore','pipe','ignore']}).trim();
 need(hash(out),'HASH_OUTPUT');return out.slice(2);
};
export function decodeDirectSafeEnvelope(input){
 // Exactly 10 head words, then one 260/324-byte inner payload and 195 signature bytes.
 // Require canonical offsets, zero padding, and exact total length, not loose ABI decoding.
 need(typeof input==='string'&&input.length<=2000&&/^0x6a761202[0-9a-f]+$/.test(input),'OUTER_SELECTOR');
 const body=input.slice(10);
 need(body.length>=640&&body.length%64===0,'OUTER_LENGTH');
 const at=i=>body.slice(i*64,(i+1)*64),n=i=>BigInt('0x'+at(i));
 need(/^0{24}[0-9a-f]{40}$/.test(at(0)),'TARGET_WORD');
 const to='0x'+at(0).slice(24);
 need(addr(to)&&[1,3,4,5,6,7,8].every(i=>at(i)===WORDZERO),'SAFE_CALL_BOUNDARY');
 need(n(2)===320n,'DATA_OFFSET');
 const len=n(10);need(len===260n||len===324n,'INNER_LENGTH');
 const padded=Number((len+31n)/32n*32n),offset=352+padded;
 need(n(9)===BigInt(offset),'SIGNATURE_OFFSET');
 const dataStart=352*2,dataEnd=dataStart+Number(len)*2,sigHead=offset*2;
 need(body.slice(dataEnd,sigHead)==='0'.repeat(sigHead-dataEnd),'DATA_PADDING');
 need(body.length===(offset+32+224)*2,'EXACT_LENGTH');
 need(BigInt('0x'+body.slice(sigHead,sigHead+64))===195n,'SIGNATURE_LENGTH');
 const sigs=body.slice(sigHead+64,sigHead+64+390);
 need(body.slice(sigHead+64+390)==='0'.repeat(58),'SIGNATURE_PADDING');
 for(let i=0;i<3;i++){
  const s=sigs.slice(i*130,(i+1)*130);
  need(s.slice(0,64)!==WORDZERO&&s.slice(64,128)!==WORDZERO&&['1b','1c'].includes(s.slice(128)),'RAW_ECDSA_ONLY');
 }
 const data='0x'+body.slice(dataStart,dataEnd);
 need((len===260n&&data.startsWith('0xae7b6095'))||(len===324n&&data.startsWith('0xbe61343e')),'INNER_SELECTOR');
 return {to,operation:0,value:'0x0',safeTxGas:'0x0',baseGas:'0x0',gasPrice:'0x0',gasToken:ZERO,refundReceiver:ZERO,data};
}
export function deriveDirectSafeDigest(input,chainId,safe,nonce){
 need(chainId===84532&&addr(safe),'DOMAIN');
 const counter=q(nonce),t=decodeDirectSafeEnvelope(input);
 const domain=keccak('0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218'+word(84532n)+word(BigInt(safe)));
 const struct=keccak('0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8'+word(BigInt(t.to))+WORDZERO+keccak(t.data)+WORDZERO.repeat(6)+word(counter));
 return {intent:t,safeTxHash:'0x'+keccak('0x1901'+domain+struct)};
}
