import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBinaryLegacyTree} from './legacy-binary-proof.mjs';
import {buildLegacyEvidence,RESERVE} from './legacy-canonical-evidence.mjs';
const alpha='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function key(i){let n=(1n<<248n)+BigInt(i),s='';while(n){s=alpha[Number(n%58n)]+s;n/=58n;}return s;}
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
const hash=i=>i.toString(16).padStart(64,'0');
function fixture(n=2){return {mode:'SYNTHETIC_ONLY',sourceGenesis:key(1000),sourceMint:key(1001),snapshotSlot:'123',snapshotHash:hash(1),policyHash:hash(2),targetChainId:84532,targetToken:addr(201),targetVault:addr(202),campaign:hash(3),cap:'1000',entries:Array.from({length:n},(_,i)=>({sourceAccount:key(i+11),sourceOwner:key(i+21),recipient:addr(101+i),sourceAmount:String(100*(i+1)),award:String(7+2*i),evidenceHash:hash(i+31)}))};}
test('matches independent Python vector also consumed by Solidity regression',()=>{
 const x=fixture();x.cap='20';const t=buildBinaryLegacyTree(x);
 assert.equal(t.commitment.contextHash,'0x09ced17b8f096101418527fcff7a87e27c417f7ebff09ff9cc0f2b4522371406');
 assert.equal(t.commitment.manifestDigest,'0xda25814f85c83754bee9858baa74f8f431f772f2ff1567e609919599640532ee');
 assert.equal(t.commitment.root,'0x5d5cb73c8bacde515bccff52fcc9efc3604d39be51de7d95dbf2c52bb8d70284');
 assert.deepEqual(t.proof(0).siblings,[{hash:'0x7cd40b1190294231661d449f7f60100bb708a01b10e502c547c6810360b57e5c',sum:'9'}]);
 assert.equal(t.commitment.allocated,'16');
 assert.equal(t.commitment.manifestDigest,'0x'+buildLegacyEvidence(x).digest);
});
test('65 rows produce canonical positional proofs with padding',()=>{
 const x=fixture(65);x.cap='10000';const t=buildBinaryLegacyTree(x);
 assert.equal(t.commitment.count,65);assert.equal(t.proof(64).siblings.length,7);
 assert.equal(t.proof(64).siblings[0].sum,'0');
 x.entries.reverse();const b=buildBinaryLegacyTree(x);assert.deepEqual(t.commitment,b.commitment);
 assert.deepEqual(t.proof(64),b.proof(64));assert.throws(()=>t.proof(65));
 assert.equal(t.sourceAuthenticated,false);assert.equal(t.authorization,false);
});
test('duplicate accounts, over-allocation and wrong chain fail',()=>{
 const x=fixture();x.entries[1].sourceAccount=x.entries[0].sourceAccount;assert.throws(()=>buildBinaryLegacyTree(x),/duplicate/);
 const y=fixture(1);y.cap=RESERVE.toString();y.entries[0].award=(RESERVE+1n).toString();assert.throws(()=>buildBinaryLegacyTree(y));
 const z=fixture();z.targetChainId=8453;assert.throws(()=>buildBinaryLegacyTree(z));
});
