import test from 'node:test';
import assert from 'node:assert/strict';
import {pubkey} from './mint-raw-evidence.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {SPEC,mintPlan} from './testnet-solana/mint-plan.mjs';
import {verifyTestMintPair,deriveTestAta,inspectCreatedTestMint} from './testnet-solana/verify-created-mint.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
const m=Buffer.alloc(32,3),h=Buffer.alloc(32,4),mint=pubkey(m),holder=pubkey(h);
function fixture(phase){
 const b=Buffer.alloc(mintPlan().finalMintBytes),a=Buffer.alloc(170),issued=phase==='issued';
 if(issued){b.writeUInt32LE(1);h.copy(b,4);}
 b.writeBigUInt64LE(BigInt(SPEC.rawSupply),36);b[44]=6;b[45]=1;b[165]=1;
 b.writeUInt16LE(18,166);b.writeUInt16LE(64,168);if(issued)h.copy(b,170);m.copy(b,202);
 b.writeUInt16LE(19,234);b.writeUInt16LE(b.length-238,236);
 if(issued)h.copy(b,238);m.copy(b,270);let p=302;
 for(const s of [SPEC.name,SPEC.symbol,SPEC.uri]){const v=Buffer.from(s);b.writeUInt32LE(v.length,p);p+=4;v.copy(b,p);p+=v.length;}
 m.copy(a);h.copy(a,32);a.writeBigUInt64LE(BigInt(SPEC.rawSupply),64);a[108]=1;a[165]=2;a.writeUInt16LE(7,166);
 const wrap=v=>({owner:TOKEN_2022_PROGRAM,executable:false,data:[v.toString('base64'),'base64']});
 return {b,a,accounts:()=>[wrap(b),wrap(a)]};
}
test('issued and revoked test mint with full holder balance',()=>{
 for(const phase of ['issued','revoked']){const f=fixture(phase),r=verifyTestMintPair(f.accounts(),mint,holder,phase);assert.equal(r.mintAuthority,phase==='issued'?holder:null);assert.equal(r.bridgeRelease,'NO_GO');}
});
test('reject bad phase, original mint, wrong supply, metadata, and delegated/frozen account',()=>{
 assert.throws(()=>verifyTestMintPair(fixture('issued').accounts(),mint,holder,'revoked'),/NO_GO/);
 assert.throws(()=>verifyTestMintPair(fixture('revoked').accounts(),CLIMB_SOLANA_MINT,holder,'revoked'),/NO_GO/);
 for(const edit of [f=>f.b.writeBigUInt64LE(1n,36),f=>f.b[302]=0,f=>f.a.writeUInt32LE(1,72),f=>f.a[108]=2,f=>f.b[170]=1]){const f=fixture('revoked');edit(f);assert.throws(()=>verifyTestMintPair(f.accounts(),mint,holder,'revoked'),/NO_GO/);}
});
test('single finalized pair uses derived ATA and Devnet only',async()=>{
 const calls=[],f=fixture('revoked'),fetchFn=async(url,o)=>{assert.equal(url,TESTNET.solana.rpc);const {method,params}=JSON.parse(o.body);calls.push({method,params});return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:({getGenesisHash:TESTNET.solana.genesis,getSlot:100,getMultipleAccounts:{context:{slot:101},value:f.accounts()}})[method]})};};
 const r=await inspectCreatedTestMint(mint,holder,'revoked',fetchFn);
 assert.equal(r.ata,deriveTestAta(mint,holder));assert.equal(r.finalizedSlot,101);assert.deepEqual(calls[2].params[0],[mint,r.ata]);
});
