import test from 'node:test';
import assert from 'node:assert/strict';
import {pubkey} from './mint-raw-evidence.mjs';
import {decodeKey} from './programdata-pda.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {deriveTestCustody,screenTestCustody} from './testnet-solana/custody-screen.mjs';
const mint=pubkey(Buffer.alloc(32,3)),program=pubkey(Buffer.alloc(32,7));
function fixture(){
 const {authority,ata}=deriveTestCustody(mint,program);
 const b=Buffer.alloc(170);decodeKey(mint).copy(b);decodeKey(authority).copy(b,32);
 b.writeBigUInt64LE(1050n,64);b[108]=1;b[165]=2;b.writeUInt16LE(7,166);
 return {b,input:()=>({mint,program,ata,account:{owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']},wrappedSupplyRaw:'1050'})};
}
test('exact custody, six decimals and equal wrapped test amount',()=>{
 const r=screenTestCustody(fixture().input());
 assert.equal(r.economicallyClaimableRaw,'1000000000');
 assert.equal(r.backingSurplusRaw,'0');assert.equal(r.bridgeRelease,'NO_GO');
});
test('reject mainnet CLIMB and wrong account address or owner',()=>{
 const f=fixture().input();
 assert.throws(()=>deriveTestCustody(CLIMB_SOLANA_MINT,program),/NO_GO/);
 assert.throws(()=>screenTestCustody({...f,ata:mint}),/NO_GO/);
 assert.throws(()=>screenTestCustody({...f,account:{...f.account,owner:program}}),/NO_GO/);
});
test('reject wrong mint, authority, frozen, delegated or native account, close authority and unexpected extension',()=>{
 for(const edit of [b=>b[0]^=1,b=>b[32]^=1,b=>b[108]=2,b=>b.writeUInt32LE(1,72),b=>b.writeUInt32LE(1,109),b=>b.writeBigUInt64LE(1n,121),b=>b.writeUInt32LE(1,129),b=>b.writeUInt16LE(8,166)]){
  const f=fixture();edit(f.b);assert.throws(()=>screenTestCustody(f.input()),/NO_GO/);
 }
});
test('reject unbacked or impossible supply; surplus is not a transfer proof',()=>{
 const f=fixture();
 assert.throws(()=>screenTestCustody({...f.input(),wrappedSupplyRaw:'1051'}),/NO_GO/);
 assert.equal(screenTestCustody({...f.input(),wrappedSupplyRaw:'0'}).backingSurplusRaw,'1050');
 f.b.writeBigUInt64LE(1000000001n,64);
 assert.throws(()=>screenTestCustody(f.input()),/NO_GO/);
});
