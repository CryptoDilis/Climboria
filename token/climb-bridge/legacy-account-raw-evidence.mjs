// Conservative offline decoder for original CLIMB Token-2022 accounts.
// Layout: token-2022 interface/src/state.rs and extension/mod.rs at
// e8ca680ca8aeb12f9598524b003c776c6a4168f2 (same reference as mint-raw-evidence).
// A provider-reported finalized context is NOT proof of source authenticity.
import {createHash} from 'node:crypto';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {pubkey} from './mint-raw-evidence.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=message=>{throw Error('NO_GO: '+message);};
const zero=b=>b.every(v=>v===0);
function address(s){
 if(typeof s!=='string'||s.length<32||s.length>44)fail('invalid account address');
 let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)fail('invalid account address');n=n*58n+BigInt(i);}
 if(n>=(1n<<256n))fail('invalid account address');
 const b=Buffer.from(n.toString(16).padStart(64,'0'),'hex');
 if(pubkey(b)!==s||zero(b))fail('invalid account address');
 return s;
}
function authority(b,offset){
 const tag=b.readUInt32LE(offset);
 if(tag===0)return null;
 if(tag!==1)fail('invalid authority option');
 const key=b.subarray(offset+4,offset+36);
 if(zero(key))fail('invalid authority key');
 return pubkey(key);
}
export function decodeLegacyAccount(row){
 const id=address(row?.pubkey),a=row?.account;
 if(a?.owner!==TOKEN_2022_PROGRAM||a.executable!==false||!Array.isArray(a.data)||a.data.length!==2||a.data[1]!=='base64')fail('invalid token account envelope');
 const encoded=a.data[0];
 if(typeof encoded!=='string'||encoded.length>90000)fail('invalid account encoding');
 const b=Buffer.from(encoded,'base64');
 if(b.toString('base64')!==encoded||b.length<165||b.length>65536||b.length===355)fail('invalid raw account length or encoding');
 if(pubkey(b.subarray(0,32))!==CLIMB_SOLANA_MINT)fail('wrong token mint');
 const owner=b.subarray(32,64);if(zero(owner))fail('invalid token authority');
 const state=b[108]===1?'initialized':b[108]===2?'frozen':null;
 if(!state)fail('unsupported token account state');
 const delegate=authority(b,72),closeAuthority=authority(b,129);
 if(b.readUInt32LE(109)!==0)fail('native token account unsupported');
 const delegatedRaw=b.readBigUInt64LE(121);
 if(!delegate&&delegatedRaw!==0n)fail('delegation inconsistent');
 const extensions=[];
 if(b.length>165){
  if(b[165]!==2)fail('wrong Token-2022 account type');
  let p=166;
  while(p<b.length){
   if(zero(b.subarray(p)))break;
   if(p+4>b.length)fail('truncated account extension');
   const type=b.readUInt16LE(p),len=b.readUInt16LE(p+2);p+=4;
   // Only zero-length ImmutableOwner is accepted; reject transfer-fee,
   // confidential balances and every other unreviewed extension.
   if(type!==7||len!==0||extensions.length!==0)fail('unsupported or duplicate account extension');
   extensions.push('immutableOwner');
  }
 }
 return {row:{address:id,owner:pubkey(owner),mint:CLIMB_SOLANA_MINT,program:TOKEN_2022_PROGRAM,state,amountRaw:b.readBigUInt64LE(64).toString()},
  evidence:{rawSha256:createHash('sha256').update(b).digest('hex'),byteLength:b.length,delegate,delegatedRaw:delegatedRaw.toString(),closeAuthority,extensions,sourceAuthenticated:false,holderEligibility:'NOT_DETERMINED'}};
}
