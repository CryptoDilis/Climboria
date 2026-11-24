import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRawMint,compareRawMints,pubkey} from './mint-raw-evidence.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
let n=0n;for(const x of CLIMB_SOLANA_MINT)n=n*58n+BigInt(alphabet.indexOf(x));
const key=Buffer.from(n.toString(16).padStart(64,'0'),'hex');
const report={program:TOKEN_2022_PROGRAM,mint:CLIMB_SOLANA_MINT,decimals:6,mintAuthority:null,freezeAuthority:null,supplyRaw:'1000000000000000',extensionTypeSummary:'TOKEN_2022_REPORTED_TYPES:["metadataPointer","tokenMetadata"]'};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const str=s=>Buffer.concat([u32(Buffer.byteLength(s)),Buffer.from(s)]);
const tlv=(t,v)=>{const h=Buffer.alloc(4);h.writeUInt16LE(t);h.writeUInt16LE(v.length,2);return Buffer.concat([h,v]);};
function fixture(extra=Buffer.alloc(0),name='CLIMB',pointer=key){
 const b=Buffer.alloc(166);b.writeBigUInt64LE(1000000000000000n,36);b[44]=6;b[45]=1;b[165]=1;
 return Buffer.concat([b,tlv(18,Buffer.concat([Buffer.alloc(32),pointer])),tlv(19,Buffer.concat([Buffer.alloc(32),key,str(name),str('CLIMB'),str('https://not-logged.invalid'),u32(0)])),extra]);
}
const reply=b=>({context:{slot:1000},value:{owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']}});
test('exact raw metadata-only Token-2022 mint yields digest, not raw metadata or bridge GO',()=>{
 assert.equal(pubkey(key),CLIMB_SOLANA_MINT);
 const a=inspectRawMint(reply(fixture()),report,1000);
 const out=compareRawMints(a,a);
 assert.equal(out.rawExtensionLayoutMatched,true);assert.equal(out.bridgeRelease,'NO_GO');
 assert.equal(out.metadataPointer.address,CLIMB_SOLANA_MINT);assert(!JSON.stringify(out).includes('not-logged'));
});
test('unknown, duplicate, truncated, external pointer and hidden nonzero tail fail closed',()=>{
 for(const b of [fixture(tlv(1,Buffer.alloc(2))),fixture(tlv(18,Buffer.alloc(64))),fixture().subarray(0,-1),fixture(Buffer.alloc(0),'CLIMB',Buffer.alloc(32)),fixture(Buffer.from([0,0,0,0,1]))])assert.throws(()=>inspectRawMint(reply(b),report,1000),/NO_GO/);
});
test('raw and parsed supply/authority, slot and byte disagreements fail',()=>{
 const b=fixture();b.writeBigUInt64LE(1n,36);assert.throws(()=>inspectRawMint(reply(b),report,1000),/disagree/);
 assert.throws(()=>inspectRawMint(reply(fixture()),report,2000),/freshness/);
 const a=inspectRawMint(reply(fixture()),report,1000),c=inspectRawMint(reply(fixture(Buffer.alloc(0),'changed')),report,1000);
 assert.throws(()=>compareRawMints(a,c),/bytes disagree/);
});
