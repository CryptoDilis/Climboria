import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeLegacyAccount} from './legacy-account-raw-evidence.mjs';
import {reconcileInventories} from './migration-inventory.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {pubkey} from './mint-raw-evidence.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bytes(s){let n=0n;for(const c of s)n=n*58n+BigInt(alphabet.indexOf(c));return Buffer.from(n.toString(16).padStart(64,'0'),'hex');}
const key=n=>pubkey(Buffer.alloc(32,n));
function fixture({id=2,owner=3,amount=1000n,state=1,extension=true}={}){
 const b=Buffer.alloc(extension?170:165);
 bytes(CLIMB_SOLANA_MINT).copy(b,0);
 Buffer.alloc(32,owner).copy(b,32);b.writeBigUInt64LE(amount,64);b[108]=state;
 if(extension){b[165]=2;b.writeUInt16LE(7,166);}
 return {pubkey:key(id),account:{owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']}};
}
function mutate(row,fn){const b=Buffer.from(row.account.data[0],'base64');fn(b);row.account.data[0]=b.toString('base64');return row;}
test('raw account produces exact amount, owner, state, digest and conservative eligibility',()=>{
 const r=decodeLegacyAccount(fixture({amount:18446744073709551615n,state:2}));
 assert.equal(r.row.amountRaw,'18446744073709551615');assert.equal(r.row.owner,key(3));assert.equal(r.row.state,'frozen');
 assert.deepEqual(r.evidence.extensions,['immutableOwner']);assert.match(r.evidence.rawSha256,/^[0-9a-f]{64}$/);
 assert.equal(r.evidence.sourceAuthenticated,false);assert.equal(r.evidence.holderEligibility,'NOT_DETERMINED');
 assert.equal(decodeLegacyAccount(fixture({extension:false})).evidence.byteLength,165);
});
test('reject wrong mint, owner program, executable, invalid base64 and unsupported states',()=>{
 for(const fn of [r=>{r.account.owner=key(8)},r=>{r.account.executable=true},r=>{r.account.data[0]+=' '},r=>{r.pubkey='bad'}]){
  const r=fixture();fn(r);assert.throws(()=>decodeLegacyAccount(r),/NO_GO/);
 }
 for(const fn of [b=>b.fill(0,0,32),b=>b.fill(0,32,64),b=>{b[108]=0},b=>b.writeUInt32LE(1,109),b=>b.writeUInt32LE(2,72)])assert.throws(()=>decodeLegacyAccount(mutate(fixture(),fn)),/NO_GO/);
});
test('reject unreviewed extensions, wrong account type, bad extension lengths and duplicate extension',()=>{
 for(const fn of [b=>{b[165]=1},b=>b.writeUInt16LE(2,166),b=>b.writeUInt16LE(1,168)])assert.throws(()=>decodeLegacyAccount(mutate(fixture(),fn)),/NO_GO/);
 const r=fixture(),b=Buffer.concat([Buffer.from(r.account.data[0],'base64'),Buffer.from([7,0,0,0])]);r.account.data[0]=b.toString('base64');
 assert.throws(()=>decodeLegacyAccount(r),/duplicate/);
});
test('decode delegate and close authority independently, reject inconsistent delegation',()=>{
 const r=decodeLegacyAccount(mutate(fixture(),b=>{b.writeUInt32LE(1,72);Buffer.alloc(32,4).copy(b,76);b.writeBigUInt64LE(50n,121);b.writeUInt32LE(1,129);Buffer.alloc(32,5).copy(b,133);}));
 assert.equal(r.evidence.delegate,key(4));assert.equal(r.evidence.delegatedRaw,'50');assert.equal(r.evidence.closeAuthority,key(5));
 assert.throws(()=>decodeLegacyAccount(mutate(fixture(),b=>b.writeBigUInt64LE(1n,121))),/delegation inconsistent/);
});
test('normalized raw rows reconcile with exact supply, but cannot authorize claims',()=>{
 const accounts=[decodeLegacyAccount(fixture({id:2,amount:400n})).row,decodeLegacyAccount(fixture({id:4,amount:600n,state:2})).row];
 const snapshot={mint:CLIMB_SOLANA_MINT,program:TOKEN_2022_PROGRAM,decimals:6,commitment:'finalized',slot:123,genesis:key(1),blockhash:key(9),complete:true,supplyRaw:'1000',accounts};
 const result=reconcileInventories(snapshot,{...snapshot,accounts:[...accounts].reverse()},{expectedGenesis:key(1)});
 assert.equal(result.frozenRaw,'600');assert.equal(result.positiveTokenAccounts,2);assert.equal(result.bridgeRelease,'NO_GO');assert.equal(result.sourceAuthenticity,'NOT_VERIFIED');
 assert.throws(()=>reconcileInventories(snapshot,{...snapshot,supplyRaw:'999'},{expectedGenesis:key(1)}),/account sum/);
});
