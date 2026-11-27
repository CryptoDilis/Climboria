import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileRawInventories} from './legacy-raw-inventory.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {pubkey} from './mint-raw-evidence.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
let n=0n;for(const c of CLIMB_SOLANA_MINT)n=n*58n+BigInt(alphabet.indexOf(c));
const mintKey=Buffer.from(n.toString(16).padStart(64,'0'),'hex');
const key=n=>pubkey(Buffer.alloc(32,n));
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const str=s=>Buffer.concat([u32(Buffer.byteLength(s)),Buffer.from(s)]);
const tlv=(t,v)=>{const h=Buffer.alloc(4);h.writeUInt16LE(t);h.writeUInt16LE(v.length,2);return Buffer.concat([h,v]);};
const envelope=b=>({owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']});
function account(id,owner,amount){
 const b=Buffer.alloc(170);mintKey.copy(b);Buffer.alloc(32,owner).copy(b,32);
 b.writeBigUInt64LE(amount,64);b[108]=1;b[165]=2;b.writeUInt16LE(7,166);
 return {pubkey:key(id),account:envelope(b)};
}
function bundle(){
 const b=Buffer.alloc(166);b.writeBigUInt64LE(1000n,36);b[44]=6;b[45]=1;b[165]=1;
 const mint=Buffer.concat([b,tlv(18,Buffer.concat([Buffer.alloc(32),mintKey])),
  tlv(19,Buffer.concat([Buffer.alloc(32),mintKey,str('CLIMB'),str('CLIMB'),str('https://fixture.invalid'),u32(0)]))]);
 return {genesis:key(1),block:{slot:123,blockhash:key(2)},commitment:'finalized',complete:true,
  parsedMint:{context:{slot:123},value:{owner:TOKEN_2022_PROGRAM,executable:false,data:{program:'spl-token-2022',parsed:{type:'mint',info:{isInitialized:true,decimals:6,supply:'1000',mintAuthority:null,freezeAuthority:null,extensions:[{extension:'metadataPointer'},{extension:'tokenMetadata'}]}}}}},
  rawMint:{context:{slot:123},value:envelope(mint)},accounts:{context:{slot:123},value:[account(3,8,400n),account(4,9,600n),account(5,9,0n)]}};
}
const run=(a,b)=>reconcileRawInventories(a,b,{expectedGenesis:key(1)});
function edit(envelope,fn){const b=Buffer.from(envelope.data[0],'base64');fn(b);envelope.data[0]=b.toString('base64');}
test('same reported slot and exact raw bytes reconcile independent of row order, never authorize',()=>{
 const a=bundle(),b=bundle();b.accounts.value.reverse();
 const r=run(a,b);assert.equal(r.supplyRaw,'1000');assert.equal(r.positiveTokenAccounts,2);
 assert.match(r.rawInventoryDigest,/^[0-9a-f]{64}$/);assert.equal(r.authorization,false);
 assert.equal(r.sourceAuthenticity,'NOT_VERIFIED');assert.equal(r.finalityProof,'NOT_VERIFIED');assert.equal(r.bridgeRelease,'NO_GO');
});
test('reject every mismatched reported context and wrong genesis or block',()=>{
 for(const mutate of [x=>x.parsedMint.context.slot++,x=>x.rawMint.context.slot++,x=>x.accounts.context.slot++,x=>x.block.blockhash=key(9),x=>x.genesis=key(9),x=>x.complete=false,x=>x.commitment='confirmed']){
  const b=bundle();mutate(b);assert.throws(()=>run(bundle(),b),/NO_GO/);
 }
});
test('reject raw account differences even when normalized balances and owners match',()=>{
 const b=bundle();edit(b.accounts.value[0].account,bytes=>{bytes.writeUInt32LE(1,129);Buffer.alloc(32,12).copy(bytes,133);});
 assert.throws(()=>run(bundle(),b),/raw account inventory bytes disagree/);
 const c=bundle();c.accounts.value.pop();
 assert.throws(()=>run(bundle(),c),/raw account inventory bytes disagree/);
});
test('reject raw mint divergence, mismatched supply and duplicate account',()=>{
 const a=bundle();edit(a.rawMint.value,b=>b.writeBigUInt64LE(999n,36));assert.throws(()=>run(a,bundle()),/disagree/);
 const b=bundle();b.accounts.value[0]=account(3,8,399n);assert.throws(()=>run(b,bundle()),/account sum/);
 const c=bundle();c.accounts.value.push(c.accounts.value[0]);assert.throws(()=>run(c,bundle()),/duplicate raw account/);
 const d=bundle();edit(d.rawMint.value,bytes=>{const i=bytes.indexOf(Buffer.from('CLIMB'));bytes[i]=88;});
 assert.throws(()=>run(d,bundle()),/raw Token-2022 mint bytes disagree/);
});
