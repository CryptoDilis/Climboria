// Local SQLite synthetic fixture, not production storage or authorization.
// Requires trusted local file path, filesystem, clock and operator.
// Database deletion, backup rollback and independent replicas are NOT prevented.
import {createHash} from 'node:crypto';
import {syntheticOwnerMessage} from './legacy-owner-proof.mjs';
import {DatabaseSync} from 'node:sqlite';
import {openSync,closeSync,lstatSync} from 'node:fs';
import {RESERVE} from './legacy-canonical-evidence.mjs';
import {verifySyntheticBatch} from './legacy-owner-ledger.mjs';
const SCHEMA='CLIMB_SYNTHETIC_REPLAY_V5';
const fail=msg=>{throw Error('NO_GO: '+msg);};
// Trusted fixture operator explicitly approves campaign and eligible rows.
// Reserve a shared synthetic budget across all campaigns in this database.
// Production authorization and economic policy remain out of scope.
function campaignDigest(c){
 return createHash('sha256').update(JSON.stringify(['CLIMB_SYNTHETIC_CAMPAIGN_V1',
 c.mode,c.sourceGenesis,c.sourceMint,c.snapshotSlot,c.snapshotHash,c.inventoryDigest,
 c.policyHash,c.cap,c.campaign,c.targetChainId,c.targetToken,c.targetVault])).digest('hex');
}
function eligibilityDigest(c){
 return createHash('sha256').update(JSON.stringify(['CLIMB_SYNTHETIC_ELIGIBILITY_V1',
 campaignDigest(c),c.sourceAccount,c.sourceOwner,c.recipient,c.sourceAmount,c.award])).digest('hex');
}
function configure(db){
 db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;');
}
export function initializeSyntheticReplayFile(path){
 // Explicit creation only; never silently replace an existing database.
 if(typeof path!=='string'||!path||path===':memory:')fail('invalid database path');
 const fd=openSync(path,'wx',0o600);closeSync(fd);
 const db=new DatabaseSync(path);
 try{
  configure(db);
  db.exec("BEGIN IMMEDIATE; CREATE TABLE metadata (version TEXT PRIMARY KEY) STRICT; CREATE TABLE nonces (id TEXT PRIMARY KEY NOT NULL) STRICT; CREATE TABLE sources (id TEXT PRIMARY KEY NOT NULL) STRICT; CREATE TABLE issued (nonce TEXT PRIMARY KEY NOT NULL, digest TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN (0,1))) STRICT; CREATE TABLE campaigns (id TEXT PRIMARY KEY NOT NULL, digest TEXT NOT NULL, cap TEXT NOT NULL, used TEXT NOT NULL) STRICT; CREATE TABLE eligible (campaign TEXT NOT NULL, account TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(campaign,account)) STRICT; CREATE TABLE budget (id INTEGER PRIMARY KEY CHECK(id=1), reserved TEXT NOT NULL) STRICT; INSERT INTO budget(id,reserved) VALUES (1,'0');");
  db.prepare('INSERT INTO metadata(version) VALUES (?)').run(SCHEMA);
  db.exec('COMMIT');
 }finally{db.close();}
}
export function openSyntheticReplayLedger(path){
 if(typeof path!=='string'||!path||path===':memory:'||!lstatSync(path).isFile())fail('existing database required');
 const db=new DatabaseSync(path);
 try{
  configure(db);
  const meta=db.prepare('SELECT version FROM metadata').all();
  if(meta.length!==1||meta[0].version!==SCHEMA)fail('unexpected database schema');
  const hasNonce=db.prepare('SELECT 1 FROM nonces WHERE id=?');
  const hasSource=db.prepare('SELECT 1 FROM sources WHERE id=?');
  const insertNonce=db.prepare('INSERT INTO nonces(id) VALUES (?)');
  const insertSource=db.prepare('INSERT INTO sources(id) VALUES (?)');
  const getIssued=db.prepare('SELECT digest,consumed FROM issued WHERE nonce=?');
  const insertIssued=db.prepare('INSERT INTO issued(nonce,digest) VALUES (?,?)');
  const consumeIssued=db.prepare('UPDATE issued SET consumed=1 WHERE nonce=? AND consumed=0');
  const getCampaign=db.prepare('SELECT digest,cap,used FROM campaigns WHERE id=?');
  const insertCampaign=db.prepare('INSERT INTO campaigns(id,digest,cap,used) VALUES (?,?,?,?)');
  const updateCampaign=db.prepare('UPDATE campaigns SET used=? WHERE id=? AND used=?');
  const getEligible=db.prepare('SELECT digest FROM eligible WHERE campaign=? AND account=?');
  const insertEligible=db.prepare('INSERT INTO eligible(campaign,account,digest) VALUES (?,?,?)');
  const getBudget=db.prepare('SELECT reserved FROM budget WHERE id=1');
  const updateBudget=db.prepare('UPDATE budget SET reserved=? WHERE id=1 AND reserved=?');
  function reserveCampaign(cap){
   const budget=getBudget.get();
   if(!budget||!/^(0|[1-9][0-9]{0,19})$/.test(budget.reserved))fail('invalid shared budget');
   const reserved=BigInt(budget.reserved),next=reserved+BigInt(cap);
   if(reserved>RESERVE||next>RESERVE)fail('shared synthetic reserve exceeded');
   if(updateBudget.run(next.toString(),budget.reserved).changes!==1)fail('shared budget update failed');
  }
  function transaction(fn){
   db.exec('BEGIN IMMEDIATE');
   try{const result=fn();db.exec('COMMIT');return result;}
   catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
  }
  function requireCampaign(c){
   const record=getCampaign.get(c.campaign);
   if(!record)fail('unapproved campaign');
   if(record.digest!==campaignDigest(c)||record.cap!==c.cap)fail('campaign context mismatch');
   return record;
  }
  return {close(){db.close();},approveCampaign(challenge){
   syntheticOwnerMessage(challenge);
   return transaction(()=>{
    const record=getCampaign.get(challenge.campaign),digest=campaignDigest(challenge);
    if(record&&(record.digest!==digest||record.cap!==challenge.cap))fail('campaign context mismatch');
    if(!record){
     reserveCampaign(challenge.cap);
     insertCampaign.run(challenge.campaign,digest,challenge.cap,'0');
    }
    return {status:'SYNTHETIC_CAMPAIGN_APPROVED',authorization:false};
   });
  },approveEligibility(challenge){
   syntheticOwnerMessage(challenge);
   return transaction(()=>{
    requireCampaign(challenge);
    const digest=eligibilityDigest(challenge),record=getEligible.get(challenge.campaign,challenge.sourceAccount);
    if(record&&record.digest!==digest)fail('eligibility context mismatch');
    if(!record)insertEligible.run(challenge.campaign,challenge.sourceAccount,digest);
    return {status:'SYNTHETIC_ELIGIBILITY_APPROVED',authorization:false};
   });
  },registerChallenge(challenge,now){
   // Trusted fixture operator supplies the expected challenge, never an
   // untrusted signer. Store exact signed bytes' digest before proof receipt.
   const message=syntheticOwnerMessage(challenge);
   if(!Number.isSafeInteger(now)||now!==challenge.issuedAt)fail('challenge registration time mismatch');
   const digest=createHash('sha256').update(message).digest('hex');
   db.exec('BEGIN IMMEDIATE');
   try{
    if(hasNonce.get(challenge.nonce)||getIssued.get(challenge.nonce))fail('challenge nonce already registered or consumed');
    requireCampaign(challenge);
    const eligible=getEligible.get(challenge.campaign,challenge.sourceAccount);
    if(!eligible||eligible.digest!==eligibilityDigest(challenge))fail('unapproved or mismatched eligibility');
    insertIssued.run(challenge.nonce,digest);
    db.exec('COMMIT');
    return {status:'SYNTHETIC_CHALLENGE_REGISTERED',challengeDigest:digest,authorization:false};
   }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
  },consume(input,inventory,proofs,now){
   // Hold the write reservation across check and commit; unique keys are
   // an additional fence. Failures roll back the entire transaction.
   db.exec('BEGIN IMMEDIATE');
   try{
    const record=getCampaign.get(input.campaign);
    if(!record)fail('unregistered campaign');
    const batch=verifySyntheticBatch(input,inventory,proofs,now,{
     hasNonce:n=>!!hasNonce.get(n),hasSource:s=>!!hasSource.get(s),globalSource:true,
     checkIssued:(nonce,digest)=>{
      const record=getIssued.get(nonce);
      if(!record||record.consumed!==0||record.digest!==digest)fail('unregistered or mismatched challenge');
     }
    });
    // Each challenge already matches its registered digest and campaign.
    // Use exact BigInt arithmetic; no floating point or SQLite integer coercion.
    if(record.cap!==input.cap||!/^(0|[1-9][0-9]*)$/.test(record.used))fail('invalid campaign accounting');
    const used=BigInt(record.used),cap=BigInt(record.cap),next=used+batch.total;
    if(used>cap||next>cap)fail('cumulative campaign cap exceeded');
    if(updateCampaign.run(next.toString(),input.campaign,record.used).changes!==1)fail('campaign accounting update failed');
    for(const n of batch.nonces){
     if(consumeIssued.run(n).changes!==1)fail('challenge consumption failed');
     insertNonce.run(n);
    }
    for(const s of batch.sources)insertSource.run(s);
    db.exec('COMMIT');
    return {status:'SYNTHETIC_BATCH_MATCH',count:batch.count,campaignUsed:next.toString(),campaignRemaining:(cap-next).toString(),replayConsumption:'LOCAL_SQLITE_TRANSACTION',
     sourceAuthenticated:false,holderEligibility:'NOT_DETERMINED',authorization:false};
   }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
  }};
 }catch(error){db.close();throw error;}
}
