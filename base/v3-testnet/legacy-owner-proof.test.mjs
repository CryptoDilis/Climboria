import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {syntheticOwnerMessage,verifySyntheticOwnerProof} from './legacy-owner-proof.mjs';
const pair=generateKeyPairSync('ed25519');
const owner=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
const h=i=>i.toString(16).padStart(64,'0');
const a=i=>'0x'+i.toString(16).padStart(40,'0');
const fixture=()=>({mode:'SYNTHETIC_ONLY',sourceGenesis:h(1),sourceMint:h(2),snapshotSlot:'123',snapshotHash:h(3),inventoryDigest:h(4),policyHash:h(9),cap:'1000',campaign:h(5),sourceAccount:h(6),sourceOwner:owner,sourceAmount:'1000',targetChainId:84532,targetToken:a(1),targetVault:a(2),recipient:a(3),award:'100',nonce:h(7),issuedAt:1000,expiresAt:1900});
const signed=c=>sign(null,syntheticOwnerMessage(c),pair.privateKey).toString('hex');
test('synthetic exact signature matches without authorizing eligibility or claims',()=>{
 const c=fixture(),r=verifySyntheticOwnerProof(c,signed(c),1000);
 assert.equal(r.status,'SYNTHETIC_SIGNATURE_MATCH');assert.equal(r.authorization,false);
 assert.equal(r.sourceAuthenticated,false);assert.equal(r.replayConsumption,'NOT_IMPLEMENTED');
 assert.equal(r.holderEligibility,'NOT_DETERMINED');
 assert.deepEqual(syntheticOwnerMessage(Object.fromEntries(Object.entries(c).reverse())),syntheticOwnerMessage(c));
});
test('every valid changed context, recipient, quantity and nonce rejects old signature',()=>{
 const c=fixture(),sig=signed(c);
 for(const [k,v] of [['sourceGenesis',h(8)],['sourceMint',h(8)],['snapshotSlot','124'],['snapshotHash',h(8)],['inventoryDigest',h(8)],['policyHash',h(8)],['cap','1001'],['campaign',h(8)],['sourceAccount',h(8)],['sourceAmount','1001'],['targetToken',a(8)],['targetVault',a(8)],['recipient',a(8)],['award','101'],['nonce',h(8)],['issuedAt',1001],['expiresAt',1899]]){
  assert.throws(()=>verifySyntheticOwnerProof({...c,[k]:v},sig,1002),/signature rejected/,k);
 }
});
test('wrong signing key, malformed signature and time boundaries fail closed',()=>{
 const c=fixture(),sig=signed(c),wrong=generateKeyPairSync('ed25519');
 assert.throws(()=>verifySyntheticOwnerProof(c,sign(null,syntheticOwnerMessage(c),wrong.privateKey).toString('hex'),1001),/signature rejected/);
 for(const time of [999,1900,1901,1000.5])assert.throws(()=>verifySyntheticOwnerProof(c,sig,time),/not current/);
 for(const value of ['00','0'.repeat(128),sig.toUpperCase()])assert.throws(()=>verifySyntheticOwnerProof(c,value,1001),/encoding/);
});
test('no mainnet, extra fields, role collision, invalid quantities or overlong challenge',()=>{
 for(const change of [{mode:'PRODUCTION'},{targetChainId:8453},{extra:true},{recipient:a(2)},{award:'8888888880001'},{sourceAmount:'01'},{expiresAt:1901},{sourceOwner:'0'.repeat(64)}]){
  assert.throws(()=>syntheticOwnerMessage({...fixture(),...change}),/NO_GO/);
 }
});
