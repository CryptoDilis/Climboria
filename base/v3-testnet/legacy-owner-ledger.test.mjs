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
function fixture({cap='1000',award='50',offset=0,nonceOffset=offset,campaign=h(6),policyHash=h(5)}={}){
 const inventory=h(4),sourceGenesis=fixed(1),sourceMint=fixed(2);
 const input={mode:'SYNTHETIC_ONLY',sourceGenesis:b58(sourceGenesis),sourceMint:b58(sourceMint),snapshotSlot:'123',snapshotHash:h(3),policyHash,targetChainId:84532,targetToken:addr(1),targetVault:addr(2),campaign,cap,entries:[]};
 const proofs=[],pairs=[],challenges=[];
 for(let i=0;i<2;i++){
  const pair=generateKeyPairSync('ed25519');pairs.push(pair);
  const sourceOwner=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex'),sourceAccount=fixed(10+i+offset);
  const row={sourceAccount:b58(sourceAccount),sourceOwner:b58(sourceOwner),recipient:addr(3+i),sourceAmount:'100',award};
  const p={sourceAccount:row.sourceAccount,nonce:h(20+i+nonceOffset),issuedAt:1000,expiresAt:1900};
  const c={mode:input.mode,sourceGenesis,sourceMint,snapshotSlot:input.snapshotSlot,snapshotHash:input.snapshotHash,inventoryDigest:inventory,policyHash:input.policyHash,cap:input.cap,campaign:input.campaign,sourceAccount,sourceOwner,sourceAmount:row.sourceAmount,targetChainId:input.targetChainId,targetToken:input.targetToken,targetVault:input.targetVault,recipient:row.recipient,award:row.award,nonce:p.nonce,issuedAt:p.issuedAt,expiresAt:p.expiresAt};
  challenges.push(c);
  const msg=syntheticOwnerMessage(c);p.signature=sign(null,msg,pair.privateKey).toString('hex');
  row.evidenceHash=hash(JSON.stringify(['CLIMB_SYNTHETIC_OWNER_EVIDENCE_V2',hash(msg),p.signature]));
  input.entries.push(row);proofs.push(p);
 }
 return {input,inventory,proofs,pairs,challenges};
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

import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {initializeSyntheticReplayFile,openSyntheticReplayLedger} from './legacy-owner-durable-ledger.mjs';
function withDatabase(t){
 const dir=mkdtempSync(join(tmpdir(),'climb-synthetic-replay-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const path=join(dir,'replay.sqlite');
 initializeSyntheticReplayFile(path);
 return {dir,path};
}
function approveAll(db,challenges){for(const c of challenges){db.approveCampaign(c);db.approveEligibility(c);}}
function registerAll(db,challenges){approveAll(db,challenges);for(const c of challenges)db.registerChallenge(c,c.issuedAt);}
test('local replay state persists after close and reopen; initialization cannot reset it',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 let db=openSyntheticReplayLedger(path);
 try{registerAll(db,challenges);assert.equal(db.consume(input,inventory,proofs,1001).replayConsumption,'LOCAL_SQLITE_TRANSACTION');}finally{db.close();}
 assert.throws(()=>initializeSyntheticReplayFile(path),/EEXIST/);
 db=openSyntheticReplayLedger(path);
 try{assert.throws(()=>db.consume(input,inventory,proofs,1001),/source already consumed/);}finally{db.close();}
});
test('local transaction rolls back failed batch, including after restart',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture(),bad=structuredClone(input);
 bad.entries[1].evidenceHash=h(99);
 let db=openSyntheticReplayLedger(path);
 try{registerAll(db,challenges);assert.throws(()=>db.consume(bad,inventory,proofs,1001),/manifest evidence hash mismatch/);}finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{assert.equal(db.consume(input,inventory,proofs,1001).count,2);}finally{db.close();}
});
test('missing and malformed database do not silently initialize',t=>{
 const {dir}=withDatabase(t);
 assert.throws(()=>openSyntheticReplayLedger(join(dir,'missing.sqlite')));
 const bad=join(dir,'bad.sqlite');writeFileSync(bad,'not a database');
 assert.throws(()=>openSyntheticReplayLedger(bad));
});
test('two independent processes racing the same batch yield one commit',async t=>{
 const {dir,path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 const registry=openSyntheticReplayLedger(path);try{registerAll(registry,challenges);}finally{registry.close();}
 const payload=join(dir,'batch.json');writeFileSync(payload,JSON.stringify({input,inventory,proofs}));
 const moduleUrl=new URL('./legacy-owner-durable-ledger.mjs',import.meta.url).href;
 const code=`import {readFileSync} from 'node:fs'; import {openSyntheticReplayLedger} from ${JSON.stringify(moduleUrl)};
 const {input,inventory,proofs}=JSON.parse(readFileSync(process.argv[2],'utf8'));
 const db=openSyntheticReplayLedger(process.argv[1]);
 try{db.consume(input,inventory,proofs,1001);console.log('COMMITTED');}
 catch(e){if(!/source already consumed/.test(e.message))throw e;console.log('REPLAY');}
 finally{db.close();}`;
 const worker=()=>new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,['--input-type=module','-e',code,path,payload]);let out='',err='';
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
  p.on('error',reject);p.on('close',c=>c===0?resolve(out.trim()):reject(Error(err)));
 });
 assert.deepEqual((await Promise.all([worker(),worker()])).sort(),['COMMITTED','REPLAY']);
});

test('valid proof cannot consume an unregistered challenge; registration survives restart',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 let db=openSyntheticReplayLedger(path);
 try{
  assert.throws(()=>db.consume(input,inventory,proofs,1001),/unregistered/);
  approveAll(db,challenges);
  db.registerChallenge(challenges[0],1000);
  assert.throws(()=>db.consume(input,inventory,proofs,1001),/unregistered/);
  db.registerChallenge(challenges[1],1000);
 }finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{assert.equal(db.consume(input,inventory,proofs,1001).count,2);}finally{db.close();}
});
test('issued digest cannot be substituted by another correctly signed challenge',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 const db=openSyntheticReplayLedger(path);
 try{
  registerAll(db,[challenges[0],{...challenges[1],recipient:addr(99)}]);
  assert.throws(()=>db.consume(input,inventory,proofs,1001),/mismatched challenge/);
  // First row must not have been consumed on partial batch failure.
  const first={...input,entries:[input.entries[0]]};
  assert.equal(db.consume(first,inventory,[proofs[0]],1001).count,1);
 }finally{db.close();}
});
test('registration rejects wrong issue time and duplicate nonce before and after consumption',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 const db=openSyntheticReplayLedger(path);
 try{
  assert.throws(()=>db.registerChallenge(challenges[0],1001),/time mismatch/);
  registerAll(db,challenges);
  assert.throws(()=>db.registerChallenge(challenges[0],1000),/already registered/);
  assert.equal(db.consume(input,inventory,proofs,1001).count,2);
  assert.throws(()=>db.registerChallenge(challenges[0],1000),/already registered or consumed/);
 }finally{db.close();}
});

test('campaign cap persists across separate batches and restart; exact exhaustion accepted',t=>{
 const {path}=withDatabase(t),a=fixture({cap:'200'}),b=fixture({cap:'200',offset:100}),c=fixture({cap:'200',offset:200});
 let db=openSyntheticReplayLedger(path);
 try{
  registerAll(db,a.challenges);registerAll(db,b.challenges);registerAll(db,c.challenges);
  const first=db.consume(a.input,a.inventory,a.proofs,1001);
  assert.equal(first.campaignUsed,'100');assert.equal(first.campaignRemaining,'100');
 }finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{
  const second=db.consume(b.input,b.inventory,b.proofs,1001);
  assert.equal(second.campaignUsed,'200');assert.equal(second.campaignRemaining,'0');
  assert.throws(()=>db.consume(c.input,c.inventory,c.proofs,1001),/cumulative campaign cap exceeded/);
 }finally{db.close();}
});
test('campaign context cannot change cap or policy even for independently signed rows',t=>{
 const {path}=withDatabase(t),a=fixture(),b=fixture({cap:'1001',offset:100}),c=fixture({policyHash:h(99),offset:200});
 const db=openSyntheticReplayLedger(path);
 try{
  registerAll(db,a.challenges);
  assert.throws(()=>db.registerChallenge(b.challenges[0],1000),/campaign context mismatch/);
  assert.throws(()=>db.registerChallenge(c.challenges[0],1000),/campaign context mismatch/);
  assert.equal(db.consume(a.input,a.inventory,a.proofs,1001).campaignUsed,'100');
 }finally{db.close();}
});
test('over-cap batch does not consume challenges or advance cumulative counter',t=>{
 const {path}=withDatabase(t),a=fixture({cap:'150'}),b=fixture({cap:'150',offset:100});
 const db=openSyntheticReplayLedger(path);
 try{
  registerAll(db,a.challenges);registerAll(db,b.challenges);
  assert.equal(db.consume(a.input,a.inventory,a.proofs,1001).campaignUsed,'100');
  assert.throws(()=>db.consume(b.input,b.inventory,b.proofs,1001),/cumulative campaign cap exceeded/);
  const first={...b.input,entries:[b.input.entries[0]]};
  assert.equal(db.consume(first,b.inventory,[b.proofs[0]],1001).campaignRemaining,'0');
 }finally{db.close();}
});

test('distinct batches racing remaining campaign budget commit at most one',async t=>{
 const {dir,path}=withDatabase(t),a=fixture({cap:'100'}),b=fixture({cap:'100',offset:100});
 const registry=openSyntheticReplayLedger(path);
 try{registerAll(registry,a.challenges);registerAll(registry,b.challenges);}finally{registry.close();}
 const moduleUrl=new URL('./legacy-owner-durable-ledger.mjs',import.meta.url).href;
 const code=`import {readFileSync} from 'node:fs'; import {openSyntheticReplayLedger} from ${JSON.stringify(moduleUrl)};
 const {input,inventory,proofs}=JSON.parse(readFileSync(process.argv[2],'utf8'));
 const db=openSyntheticReplayLedger(process.argv[1]);
 try{const r=db.consume(input,inventory,proofs,1001);console.log('COMMITTED:'+r.campaignUsed);}
 catch(e){if(!/cumulative campaign cap exceeded/.test(e.message))throw e;console.log('CAP');}
 finally{db.close();}`;
 const worker=(batch,i)=>new Promise((resolve,reject)=>{
  const payload=join(dir,'cap-'+i+'.json');
  writeFileSync(payload,JSON.stringify({input:batch.input,inventory:batch.inventory,proofs:batch.proofs}));
  const p=spawn(process.execPath,['--input-type=module','-e',code,path,payload]);let out='',err='';
  p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);
  p.on('error',reject);p.on('close',c=>c===0?resolve(out.trim()):reject(Error(err)));
 });
 assert.deepEqual((await Promise.all([worker(a,0),worker(b,1)])).sort(),['CAP','COMMITTED:100']);
});

test('explicit campaign and eligibility approvals must precede challenge registration',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 let db=openSyntheticReplayLedger(path);
 try{
  assert.throws(()=>db.registerChallenge(challenges[0],1000),/unapproved campaign/);
  assert.throws(()=>db.approveEligibility(challenges[0]),/unapproved campaign/);
  assert.equal(db.approveCampaign(challenges[0]).authorization,false);
  assert.throws(()=>db.registerChallenge(challenges[0],1000),/unapproved or mismatched eligibility/);
  assert.equal(db.approveEligibility(challenges[0]).authorization,false);
 }finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{
  db.registerChallenge(challenges[0],1000);
  assert.throws(()=>db.registerChallenge(challenges[1],1000),/unapproved or mismatched eligibility/);
  db.approveEligibility(challenges[1]);db.registerChallenge(challenges[1],1000);
  assert.equal(db.consume(input,inventory,proofs,1001).count,2);
 }finally{db.close();}
});
test('approved row fixes owner, destination, source balance and award independent of nonce',t=>{
 const {path}=withDatabase(t),{input,inventory,proofs,challenges}=fixture();
 const db=openSyntheticReplayLedger(path);
 try{
  const c=challenges[0];approveAll(db,challenges);
  for(const delta of [{sourceOwner:h(99)},{recipient:addr(99)},{sourceAmount:'101'},{award:'51'}]){
   const changed={...c,...delta,nonce:h(99)};
   assert.throws(()=>db.approveEligibility(changed),/eligibility context mismatch/);
   assert.throws(()=>db.registerChallenge(changed,1000),/unapproved or mismatched eligibility/);
  }
  db.registerChallenge({...c,nonce:h(99)},1000);
  for(const row of challenges)db.registerChallenge(row,1000);
  assert.equal(db.consume(input,inventory,proofs,1001).count,2);
 }finally{db.close();}
});
test('new campaign cannot inherit previous campaign approval or eligibility',t=>{
 const {path}=withDatabase(t),{challenges}=fixture();
 const db=openSyntheticReplayLedger(path);
 try{
  approveAll(db,challenges);
  const other={...challenges[0],campaign:h(77),nonce:h(77)};
  assert.throws(()=>db.registerChallenge(other,1000),/unapproved campaign/);
  assert.throws(()=>db.approveEligibility(other),/unapproved campaign/);
  db.approveCampaign(other);
  assert.throws(()=>db.registerChallenge(other,1000),/unapproved or mismatched eligibility/);
 }finally{db.close();}
});

test('shared synthetic reserve limits total approved campaign caps across reopen',t=>{
 const {path}=withDatabase(t),a=fixture({cap:'8888888880000'}),b=fixture({campaign:h(77),offset:100});
 let db=openSyntheticReplayLedger(path);
 try{
  db.approveCampaign(a.challenges[0]);
  db.approveCampaign(a.challenges[1]); // idempotent approval must not reserve twice
 }finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{
  assert.throws(()=>db.approveCampaign(b.challenges[0]),/shared synthetic reserve exceeded/);
  assert.throws(()=>db.approveEligibility(b.challenges[0]),/unapproved campaign/);
  registerAll(db,a.challenges);
  assert.equal(db.consume(a.input,a.inventory,a.proofs,1001).campaignUsed,'100');
 }finally{db.close();}
});
test('same source cannot receive twice through different approved campaigns and fresh nonces',t=>{
 const {path}=withDatabase(t),a=fixture(),b=fixture({campaign:h(77),nonceOffset:100});
 let db=openSyntheticReplayLedger(path);
 try{registerAll(db,a.challenges);registerAll(db,b.challenges);db.consume(a.input,a.inventory,a.proofs,1001);}
 finally{db.close();}
 db=openSyntheticReplayLedger(path);
 try{assert.throws(()=>db.consume(b.input,b.inventory,b.proofs,1001),/source already consumed/);}
 finally{db.close();}
});
test('distinct source accounts can use separate approved campaigns within shared reserve',t=>{
 const {path}=withDatabase(t),a=fixture({cap:'8888888879000'}),b=fixture({cap:'1000',campaign:h(77),offset:100}),c=fixture({campaign:h(88),offset:200});
 const db=openSyntheticReplayLedger(path);
 try{
  registerAll(db,a.challenges);registerAll(db,b.challenges);
  assert.throws(()=>db.approveCampaign(c.challenges[0]),/shared synthetic reserve exceeded/);
  assert.equal(db.consume(a.input,a.inventory,a.proofs,1001).campaignUsed,'100');
  assert.equal(db.consume(b.input,b.inventory,b.proofs,1001).campaignUsed,'100');
 }finally{db.close();}
});
