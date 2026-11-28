// Offline raw ECDSA quorum evidence for the canonical review-only envelope.
// Requires authenticated historical owners, nonce and threshold from the caller.
// Foundry v1.5.0 cast wallet verify --no-hash recovers from the exact prehash;
// it exits nonzero for a different recovered address. No signing or RPC here.
import {spawnSync} from 'node:child_process';
import {deriveDirectSafeDigest} from './canonical-safe-envelope.mjs';
const need=(ok,why)=>{if(!ok)throw Error(why);};
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&BigInt(x)>1n;
export function decodeFiveOwnerRoster(raw){
 need(typeof raw==='string'&&/^0x[0-9a-f]{448}$/.test(raw),'OWNER_ABI_LENGTH');
 const w=raw.slice(2).match(/.{64}/g);
 need(BigInt('0x'+w[0])===32n&&BigInt('0x'+w[1])===5n,'OWNER_ABI_HEADER');
 const owners=w.slice(2).map(s=>{need(/^0{24}[0-9a-f]{40}$/.test(s),'OWNER_ABI_WORD');return '0x'+s.slice(24);});
 need(owners.every(addr)&&new Set(owners).size===5,'OWNER_ROSTER');
 return owners;
}
export function verifyRawSafeQuorum({input,chainId,safe,nonce,owners,threshold}){
 need(threshold===3&&Array.isArray(owners)&&owners.length===5&&owners.every(addr)&&new Set(owners).size===5,'OWNER_ROSTER');
 const {intent,safeTxHash}=deriveDirectSafeDigest(input,chainId,safe,nonce);
 const body=input.slice(10),offset=Number(BigInt('0x'+body.slice(9*64,10*64)))*2;
 // The canonical decoder already checked the exact offsets, padding and v modes.
 const signatures=body.slice(offset+64,offset+64+390).match(/.{130}/g);
 need(signatures?.length===3,'SIGNATURE_COUNT');
 const recovered=[];
 for(const s of signatures){
  let matches=[];
  for(const owner of owners){
   const result=spawnSync('cast',['wallet','verify','--no-hash','--address',owner,safeTxHash,'0x'+s],{encoding:'utf8',timeout:5000,maxBuffer:4096,stdio:['ignore','pipe','pipe']});
   need(!result.error&&!result.signal&&Number.isInteger(result.status),'VERIFIER_UNAVAILABLE');
   if(result.status===0){
    need(result.stdout.includes('Validation succeeded.'),'VERIFIER_UNEXPECTED_OUTPUT');
    matches.push(owner);
   }else need(result.stderr.includes('Validation failed.')||result.stdout.includes('Validation failed.'),'VERIFIER_REJECTED_SIGNATURE');
  }
  need(matches.length===1,'SIGNER_NOT_IN_ROSTER');
  const found=matches[0];
  need(recovered.length===0||BigInt(found)>BigInt(recovered.at(-1)),'SIGNERS_NOT_STRICTLY_SORTED');
  recovered.push(found);
 }
 return {status:'RAW_QUORUM_MATCH_ONLY_NO_GO',intent,safeTxHash,verifiedSigners:recovered,verifiedCount:3};
}
