// Synthetic-only off-chain authorization model. Not an eligibility oracle or production claim service.
import {createPublicKey,verify,createHash} from 'node:crypto';
const DOMAIN=Buffer.from('CLIMB_SYNTHETIC_CLAIM_AUTH_V1\0','ascii');
const SPKI=Buffer.from('302a300506032b6570032100','hex');
const fields=['genesis','mint','snapshotBlockhash','snapshotSlot','campaign','manifestHash','entitlementId','sourceKey','destination','claimContract','awardRaw','nonce','issuedAt','expiresAt','chainId'];
const fail=code=>{throw new Error(code);};
function shape(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fields.length||fields.some(k=>!Object.hasOwn(v,k)))fail('INVALID_SHAPE');}
function hex(v,n){if(typeof v!=='string'||v.length!==2*n||!/^[0-9a-f]+$/.test(v))fail('INVALID_HEX');const b=Buffer.from(v,'hex');if(b.every(x=>x===0))fail('ZERO_FIELD');return b;}
function uint(v,n){if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,77})$/.test(v))fail('INVALID_UINT');let x=BigInt(v);if(x<=0n||x>=(1n<<BigInt(n*8)))fail('INVALID_UINT');const b=Buffer.alloc(n);for(let i=n-1;i>=0;i--){b[i]=Number(x&255n);x>>=8n;}return b;}
export function authorizationBytes(v){
 shape(v);
 if(v.chainId!=='84532')fail('WRONG_CHAIN');
 if(v.destination===v.claimContract)fail('INVALID_DESTINATION');
 const out=[DOMAIN,uint(v.chainId,8),hex(v.genesis,32),hex(v.mint,32),hex(v.snapshotBlockhash,32),uint(v.snapshotSlot,8),hex(v.campaign,32),hex(v.manifestHash,32),hex(v.entitlementId,32),hex(v.sourceKey,32),hex(v.destination,20),hex(v.claimContract,20),uint(v.awardRaw,32),hex(v.nonce,32),uint(v.issuedAt,8),uint(v.expiresAt,8)];
 if(BigInt(v.expiresAt)<=BigInt(v.issuedAt)||BigInt(v.expiresAt)-BigInt(v.issuedAt)>600n)fail('INVALID_WINDOW');
 return Buffer.concat(out);
}
// Expected object must come from a separately validated manifest and server-issued challenge.
// A caller-supplied "expected" object is NOT trustworthy in a real service.
export function verifyAuthorization(expected,presented,signatureHex,now){
 const wanted=authorizationBytes(expected),got=authorizationBytes(presented);
 if(!wanted.equals(got))fail('CONTEXT_MISMATCH');
 if(!Number.isSafeInteger(now)||now<=0||BigInt(now)<BigInt(expected.issuedAt)||BigInt(now)>=BigInt(expected.expiresAt))fail('EXPIRED_OR_EARLY');
 const sig=hex(signatureHex,64);
 const key=createPublicKey({key:Buffer.concat([SPKI,hex(expected.sourceKey,32)]),format:'der',type:'spki'});
 if(!verify(null,got,key,sig))fail('INVALID_SIGNATURE');
 return Object.freeze({status:'SYNTHETIC_AUTH_ONLY_NO_GO',digest:createHash('sha256').update(got).digest('hex')});
}
// In-memory demonstration ONLY. No durability, concurrency across processes, or on-chain execution.
export function createSyntheticChallengeLedger(){
 const consumed=new Set(),usedNonce=new Set();
 return Object.freeze({consume(expected,presented,signatureHex,now){
  const result=verifyAuthorization(expected,presented,signatureHex,now);
  const entitlement=expected.campaign+expected.entitlementId;
  const nonce=expected.campaign+expected.nonce;
  if(consumed.has(entitlement)||usedNonce.has(nonce))fail('REPLAY');
  consumed.add(entitlement);usedNonce.add(nonce);
  return result;
 }});
}
