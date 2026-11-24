// Read-only conservative Token-2022 mint evidence for the exact CLIMB mint.
 // Layout sources: solana-program/token-2022 @ e8ca680ca8aeb12f9598524b003c776c6a4168f2,
 // interface/src/state.rs and extension/{mod.rs,metadata_pointer/mod.rs};
 // solana-program/token-metadata @ 4b4226514a0360ce933a66c9e638e909ecd66068 interface/src/state.rs.
import {createHash} from 'node:crypto';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const zero=b=>b.every(x=>x===0);
const fail=()=>{throw new Error('NO_GO: raw Token-2022 mint layout or metadata invalid');};
export function pubkey(bytes){
  let n=0n;for(const x of bytes)n=(n<<8n)|BigInt(x);
  let s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}
  for(const x of bytes){if(x!==0)break;s='1'+s;}
  return s;
}
function authority(b,offset){
  const tag=b.readUInt32LE(offset);
  if(tag===0)return null;
  if(tag!==1)fail();
  return pubkey(b.subarray(offset+4,offset+36));
}
function nullable(b){return zero(b)?null:pubkey(b);}
function parseMetadata(b){
  if(b.length<80)fail();
  const updateAuthority=nullable(b.subarray(0,32));
  if(pubkey(b.subarray(32,64))!==CLIMB_SOLANA_MINT)fail();
  let p=64;
  function u32(){if(p+4>b.length)fail();const n=b.readUInt32LE(p);p+=4;return n;}
  function str(){const n=u32();if(n>b.length-p)fail();let s;try{s=new TextDecoder('utf-8',{fatal:true}).decode(b.subarray(p,p+n));}catch{fail();}p+=n;return s;}
  str();str();str(); // name/symbol/URI deliberately never logged
  const count=u32();if(count>1024)fail();
  const keys=new Set();for(let i=0;i<count;i++){const k=str();str();if(keys.has(k))fail();keys.add(k);}
  if(p!==b.length)fail();
  return {updateAuthority,additionalMetadataCount:count};
}
export function inspectRawMint(reply,parsed,head){
  const v=reply?.value, slot=reply?.context?.slot;
  if(!Number.isSafeInteger(slot)||slot<=0||!Number.isSafeInteger(head)||Math.abs(slot-head)>128)throw new Error('NO_GO: raw mint context outside finalized freshness bound');
  if(v?.owner!==TOKEN_2022_PROGRAM||v.executable!==false||!Array.isArray(v.data)||v.data.length!==2||v.data[1]!=='base64')fail();
  const encoded=v.data[0];if(typeof encoded!=='string'||encoded.length>90000)fail();
  const b=Buffer.from(encoded,'base64');if(b.toString('base64')!==encoded||b.length<166||b.length>65536||b.length===355||b[165]!==1||!zero(b.subarray(82,165)))fail();
  if(b[44]!==6||b[45]!==1)fail();
  const mintAuthority=authority(b,0),freezeAuthority=authority(b,46),supplyRaw=b.readBigUInt64LE(36).toString();
  if(parsed.program!==TOKEN_2022_PROGRAM||parsed.mint!==CLIMB_SOLANA_MINT||parsed.decimals!==6||mintAuthority!==parsed.mintAuthority||freezeAuthority!==parsed.freezeAuthority||supplyRaw!==parsed.supplyRaw)throw new Error('NO_GO: raw and parsed mint fields disagree');
  let p=166, pointer,metadata;const seen=new Set();
  while(p<b.length){
    if(zero(b.subarray(p)))break;
    if(p+4>b.length)fail();
    const type=b.readUInt16LE(p),len=b.readUInt16LE(p+2);p+=4;
    if(type!==18&&type!==19)throw new Error('NO_GO: unsupported raw Token-2022 mint extension');
    if(seen.has(type)||p+len>b.length)fail();seen.add(type);
    const bytes=b.subarray(p,p+len);p+=len;
    if(type===18){if(len!==64)fail();pointer={authority:nullable(bytes.subarray(0,32)),address:nullable(bytes.subarray(32))};if(pointer.address!==CLIMB_SOLANA_MINT)fail();}
    else metadata=parseMetadata(bytes);
  }
  if(!pointer||!metadata||parsed.extensionTypeSummary!=='TOKEN_2022_REPORTED_TYPES:["metadataPointer","tokenMetadata"]')fail();
  return {slot,digest:createHash('sha256').update(b).digest('hex'),byteLength:b.length,metadataPointer: pointer,tokenMetadata:metadata,extensionTypes:['metadataPointer','tokenMetadata']};
}
export function compareRawMints(a,b){
  if(a.digest!==b.digest)throw new Error('NO_GO: raw Token-2022 mint bytes disagree');
  return {rawMintSha256:a.digest,rawMintByteLength:a.byteLength,rawFinalizedSlots:[a.slot,b.slot],metadataPointer:a.metadataPointer,tokenMetadata:a.tokenMetadata,rawExtensionTypes:a.extensionTypes,rawExtensionLayoutMatched:true,bridgeRelease:'NO_GO'};
}
