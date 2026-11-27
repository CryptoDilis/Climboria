import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {syntheticOwnerMessage} from './legacy-owner-proof.mjs';
import {createSyntheticOwnerLedger} from './legacy-owner-ledger.mjs';
const h=i=>i.toString(16).padStart(64,'0');
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s){let n=BigInt('0x'+s),out='';while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}return '1'.repeat(s.match(/^(00)*/)[0].length/2)+out;}
const fixed=i=>((1n<<248n)+BigInt(i)).toString(16).padStart(64,'0');
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const inventory=h(4),sourceGenesis=fixed(1),sourceMint=fixed(2);
 const input={mode:'SYNTHETIC_ONLY',sourceGenesis:b58(sourceGenesis),sourceMint:b58(sourceMint),snapshotSlot:'123',snapshotHash:h(3),policyHash:h(5),targetChainId:84532,targetToken:addr(1),targetVault:addr(2),campaign:h(6),cap:'1000',entries:[]};
 const proofs=[],pairs=[];
 for(let i=0;i<2;i++){
  const pair=generateKeyPairSync('ed25519');pairs.push(pair);
  const sourceOwner=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex'),sourceAccount=fixed(10+i);
  const row={sourceAccount:b58(sourceAccount),sourceOwner:b58(sourceOwner),recipient:addr(3+i),sourceAmount:'100',award:'50'};
  const p={sourceAccount:row.sourceAccount,nonce:h(20+i),issuedAt:1000,expiresAt:1900};
  const c={mode:input.mode,sourceGenesis,sourceMint,snapshotSlot:input.snapshotSlot,snapshotHash:input.snapshotHash,inventoryDigest:inventory,policyHash:input.policyHash,cap:input.cap,campaign:input.campaign,sourceAccount,sourceOwner,sourceAmount:row.sourceAmount,targetChainId:input.targetChainId,targetToken:input.targetToken,targetVault:input.targetVault,recipient:row.recipient,award:row.award,nonce:p.nonce,issuedAt:p.issuedAt,expiresAt:p.expiresAt};
  const msg=syntheticOwnerMessage(c);p.signature=sign(null,msg,pair.privateKey).toString('hex');
  row.evidenceHash=hash(JSON.stringify(['CLIMB_SYNTHETIC_OWNER_EVIDENCE_V2',hash(msg),p.signature]));
  input.entries.push(row);proofs.push(p);
 }
 return {input,inventory,proofs,pairs};
}
test('canonical rows match signatures independent of order; repeat batch rejected',()=>{
 const {input,inventory,proofs}=fixture(),ledger=createSyntheticOwnerLedger();
 const result=ledger.consume(input,inventory,[...proofs].reverse(),1001);
 assert.equal(result.count,2);assert.equal(result.authorization,false);assert.equal(result.replayConsumption,'IN_MEMORY_ONLY');
 assert.throws(()=>ledger.consume(input,inventory,proofs,1001),/source already consumed/);
});
test('duplicate nonce or source and missing proofs reject atomically',()=>{
 const {input,inventory,proofs}=fixture(),ledger=createSyntheticOwnerLedger();
 assert.throws(()=>ledger.consume(input,inventory,[proofs[0],{...proofs[1],nonce:proofs[0].nonce}],1001),/nonce already consumed/);
 assert.throws(()=>ledger.consume(input,inventory,[proofs[0],proofs[0]],1001),/duplicate/);
 assert.throws(()=>ledger.consume(input,inventory,[proofs[0]],1001),/proof count/);
 assert.equal(ledger.consume(input,inventory,proofs,1001).count,2);
});
test('bad evidence, recipient, policy, inventory or expiry cannot consume good rows',()=>{
 const {input,inventory,proofs}=fixture(),ledger=createSyntheticOwnerLedger();
 for(const mutate of [x=>x.entries[1].evidenceHash=h(99),x=>x.entries[1].recipient=addr(99),x=>x.policyHash=h(99),x=>x.cap='1001']){
  const bad=structuredClone(input);mutate(bad);
  assert.throws(()=>ledger.consume(bad,inventory,proofs,1001),/NO_GO/);
 }
 assert.throws(()=>ledger.consume(input,h(99),proofs,1001),/signature rejected/);
 assert.throws(()=>ledger.consume(input,inventory,proofs,1900),/not current/);
 assert.equal(ledger.consume(input,inventory,proofs,1001).count,2);
});
test('new source identity cannot reuse a previously consumed nonce in same ledger',()=>{
 const a=fixture(),b=fixture(),ledger=createSyntheticOwnerLedger();
 ledger.consume(a.input,a.inventory,a.proofs,1001);
 // Change campaign to create a different source identity; rejection must precede signature verification.
 b.input.campaign=h(99);
 assert.throws(()=>ledger.consume(b.input,b.inventory,b.proofs,1001),/nonce already consumed/);
});
