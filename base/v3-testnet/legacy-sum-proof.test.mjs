import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLegacyProofTree,verifyLegacyProof} from './legacy-sum-proof.mjs';
import {buildLegacyEvidence,RESERVE} from './legacy-canonical-evidence.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function key(i){let n=(1n<<248n)+BigInt(i),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n;}return s;}
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
const hash=i=>i.toString(16).padStart(64,'0');
function fixture(n=65){return {mode:'SYNTHETIC_ONLY',sourceGenesis:key(1000),sourceMint:key(1001),snapshotSlot:'123',snapshotHash:hash(1),policyHash:hash(2),targetChainId:84532,targetToken:addr(1),targetVault:addr(2),campaign:hash(3),cap:'1000',entries:Array.from({length:n},(_,i)=>({sourceAccount:key(i+1),sourceOwner:key(i+2000),recipient:addr(3+i),sourceAmount:'100',award:'1',evidenceHash:hash(i+4)}))};}
test('all 65 indexed proofs verify with seven siblings and exact allocation sum',()=>{
 const input=fixture(),tree=buildLegacyProofTree(input);
 assert.equal(tree.expected.manifestDigest,buildLegacyEvidence(input).digest);
 assert.equal(tree.expected.allocated,'65');
 for(let i=0;i<65;i++){const p=tree.proof(i);assert.equal(p.siblings.length,7);assert.equal(verifyLegacyProof(tree.expected,p),true);}
 assert.throws(()=>tree.proof(65),/index/);
 assert.equal(tree.expected.sourceAuthenticated,false);assert.equal(tree.expected.authorization,false);
});
test('canonical root independent of input order',()=>{
 const input=fixture(),a=buildLegacyProofTree(input);input.entries.reverse();const b=buildLegacyProofTree(input);
 assert.deepEqual(a.expected,b.expected);assert.deepEqual(a.proof(64),b.proof(64));
});
test('mutated row, position, direction, sibling hash or sum fails',()=>{
 const tree=buildLegacyProofTree(fixture());
 const original=tree.proof(0);
 for(const [field,value] of [[0,key(999)],[1,key(999)],[2,addr(999)],[3,'101'],[4,'2'],[5,hash(99)]]){
  const p=structuredClone(original);p.row[field]=value;assert.equal(verifyLegacyProof(tree.expected,p),false);
 }
 for(const mutation of [p=>p.index=1,p=>p.siblings.reverse(),p=>p.siblings[0].hash=hash(99),p=>p.siblings[0].sum='2',p=>p.siblings.pop(),p=>p.siblings.push(p.siblings[0])]){
  const p=structuredClone(original);mutation(p);assert.equal(verifyLegacyProof(tree.expected,p),false);
 }
});
test('root is bound to snapshot, target, campaign, manifest, count, cap and total',()=>{
 const tree=buildLegacyProofTree(fixture()),p=tree.proof(0);
 for(const [field,value] of [['contextHash',hash(99)],['manifestDigest',hash(99)],['entryCount',66],['cap','999'],['allocated','64'],['root',hash(99)],['authorization',true]]){
  assert.equal(verifyLegacyProof({...tree.expected,[field]:value},p),false,field);
 }
 for(const [field,value] of [['snapshotSlot','124'],['targetVault',addr(999)],['campaign',hash(99)]]){
  const x=fixture();x[field]=value;assert.equal(verifyLegacyProof(buildLegacyProofTree(x).expected,p),false,field);
 }
});
test('single entry and exact reserve allocation',()=>{
 const x=fixture(1);x.cap=RESERVE.toString();x.entries[0].award=x.cap;
 const tree=buildLegacyProofTree(x);assert.equal(tree.expected.allocated,x.cap);assert.deepEqual(tree.proof(0).siblings,[]);
 assert.equal(verifyLegacyProof(tree.expected,tree.proof(0)),true);
 x.entries[0].award=(RESERVE+1n).toString();assert.throws(()=>buildLegacyProofTree(x));
});
test('duplicate accounts and malformed or out-of-range proof rejected',()=>{
 const x=fixture(2);x.entries[1].sourceAccount=x.entries[0].sourceAccount;assert.throws(()=>buildLegacyProofTree(x),/duplicate/);
 const t=buildLegacyProofTree(fixture(3)),p=t.proof(2);
 assert.equal(verifyLegacyProof(t.expected,{...p,index:3}),false);
 assert.equal(verifyLegacyProof(t.expected,null),false);
 p.siblings[0].sum='-1';assert.equal(verifyLegacyProof(t.expected,p),false);
});
