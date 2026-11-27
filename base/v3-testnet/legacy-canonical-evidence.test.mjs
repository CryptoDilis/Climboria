import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLegacyEvidence,RESERVE} from './legacy-canonical-evidence.mjs';
import {buildLegacyProofTree} from './legacy-sum-proof.mjs';
import {buildBinaryLegacyTree} from './legacy-binary-proof.mjs';
// Deterministic synthetic keys, not accounts selected from the live chain.
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function key(i){let n=(1n<<248n)+BigInt(i),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}return s;}
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
const hash=i=>i.toString(16).padStart(64,'0');
function fixture(count=64){return {mode:'SYNTHETIC_ONLY',sourceGenesis:key(1000),sourceMint:key(1001),snapshotSlot:'123',snapshotHash:hash(1),policyHash:hash(2),targetChainId:84532,targetToken:addr(1),targetVault:addr(2),campaign:hash(3),cap:'1000',entries:Array.from({length:count},(_,i)=>({sourceAccount:key(i+1),sourceOwner:key(i+2000),recipient:addr(3+i),sourceAmount:'100',award:'1',evidenceHash:hash(i+4)}))};}
test('canonical evidence scales beyond 32 rows and order does not change digest',()=>{
 const x=fixture(),a=buildLegacyEvidence(x);x.entries.reverse();
 assert.deepEqual(buildLegacyEvidence(x),a);assert.equal(a.entryCount,64);assert.equal(a.allocated,'64');assert.equal(a.unallocated,'936');
 assert.equal(a.sourceAuthenticated,false);assert.equal(a.authorization,false);
});
test('duplicates are rejected even when destination or award differs',()=>{
 const x=fixture();x.entries[1].sourceAccount=x.entries[0].sourceAccount;x.entries[1].award='2';
 assert.throws(()=>buildLegacyEvidence(x),/duplicate source account/);
});
test('every contextual and row evidence field is committed',()=>{
 const x=fixture(2),original=buildLegacyEvidence(x).digest;
 for(const [field,value] of [['sourceGenesis',key(900)],['sourceMint',key(901)],['snapshotSlot','124'],['snapshotHash',hash(99)],['policyHash',hash(99)],['targetToken',addr(99)],['targetVault',addr(99)],['campaign',hash(99)],['cap','999']]){
  const y=structuredClone(x);y[field]=value;assert.notEqual(buildLegacyEvidence(y).digest,original,field);
 }
 for(const [field,value] of [['sourceAccount',key(999)],['sourceOwner',key(999)],['recipient',addr(99)],['sourceAmount','101'],['award','2'],['evidenceHash',hash(99)]]){
  const y=structuredClone(x);y.entries[0][field]=value;assert.notEqual(buildLegacyEvidence(y).digest,original,field);
 }
});
test('cap is exact in raw units and no over-allocation is accepted',()=>{
 const x=fixture(2);x.cap=RESERVE.toString();x.entries[0].award=(RESERVE-1n).toString();
 assert.equal(buildLegacyEvidence(x).unallocated,'0');
 x.entries[1].award='2';assert.throws(()=>buildLegacyEvidence(x),/reserve cap/);
 x.cap=(RESERVE+1n).toString();assert.throws(()=>buildLegacyEvidence(x),/bound/);
});
test('invalid network, source encoding and noncanonical numeric inputs fail closed',()=>{
 for(const [field,value] of [['targetChainId',8453],['mode','PRODUCTION'],['sourceMint','0OIl'],['snapshotSlot','01'],['snapshotSlot','18446744073709551616'],['cap',1000],['snapshotHash','0'.repeat(64)]]){
  const x=fixture(1);x[field]=value;assert.throws(()=>buildLegacyEvidence(x),undefined,field);
 }
 for(const [field,value] of [['sourceAccount','1'.repeat(32)],['sourceAmount','-1'],['award','1.0'],['recipient','0x'+'A'.repeat(40)]]){
  const x=fixture(1);x.entries[0][field]=value;assert.throws(()=>buildLegacyEvidence(x),undefined,field);
 }
});
test('unknown fields, empty manifests and reserved destination roles are rejected',()=>{
 const x=fixture(1);x.approved=true;assert.throws(()=>buildLegacyEvidence(x),/field/);
 delete x.approved;x.entries[0].recipient=x.targetVault;assert.throws(()=>buildLegacyEvidence(x),/reserved destination/);
 x.entries=[];assert.throws(()=>buildLegacyEvidence(x),/entry count/);
});
test('multiple accounts may share owner or recipient; this does not authenticate ownership',()=>{
 const x=fixture(2);x.entries[1].sourceOwner=x.entries[0].sourceOwner;x.entries[1].recipient=x.entries[0].recipient;
 const a=buildLegacyEvidence(x);assert.equal(a.allocated,'2');assert.equal(a.sourceAuthenticated,false);
});

test('exact field identity rejects comma-joined key ambiguity, inherited fields and accessors',()=>{
 const x=fixture(1),row=x.entries[0];
 const {award,evidenceHash,...rest}=row;
 x.entries[0]=Object.assign(Object.create({award,evidenceHash}),rest,{'award,evidenceHash':true});
 for(const build of [buildLegacyEvidence,buildLegacyProofTree,buildBinaryLegacyTree])assert.throws(()=>build(x),/field/);
 x.entries[0]=row;Object.defineProperty(row,'award',{enumerable:true,get(){throw Error('accessor executed');}});
 assert.throws(()=>buildLegacyEvidence(x),/field/);
});
test('all three commitments reject sparse, decorated and accessor-backed row lists',()=>{
 for(const build of [buildLegacyEvidence,buildLegacyProofTree,buildBinaryLegacyTree]){
  const sparse=fixture(2);delete sparse.entries[0];
  assert.throws(()=>build(sparse),/dense entry list/);
  const decorated=fixture(1);decorated.entries.extra=true;
  assert.throws(()=>build(decorated),/dense entry list/);
  const accessor=fixture(1);Object.defineProperty(accessor.entries,'0',{enumerable:true,get(){throw Error('accessor executed');}});
  assert.throws(()=>build(accessor),/dense entry list/);
 }
});
