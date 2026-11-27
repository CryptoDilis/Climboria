// Local SQLite synthetic fixture, not production storage or authorization.
// Requires trusted local file path, filesystem, clock and operator.
// Database deletion, backup rollback and independent replicas are NOT prevented.
import {createHash} from 'node:crypto';
import {syntheticOwnerMessage} from './legacy-owner-proof.mjs';
import {DatabaseSync} from 'node:sqlite';
import {openSync,closeSync,lstatSync} from 'node:fs';
import {verifySyntheticBatch} from './legacy-owner-ledger.mjs';
const SCHEMA='CLIMB_SYNTHETIC_REPLAY_V2';
const fail=msg=>{throw Error('NO_GO: '+msg);};
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
  db.exec("BEGIN IMMEDIATE; CREATE TABLE metadata (version TEXT PRIMARY KEY) STRICT; CREATE TABLE nonces (id TEXT PRIMARY KEY NOT NULL) STRICT; CREATE TABLE sources (id TEXT PRIMARY KEY NOT NULL) STRICT; CREATE TABLE issued (nonce TEXT PRIMARY KEY NOT NULL, digest TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN (0,1))) STRICT;");
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
  return {close(){db.close();},registerChallenge(challenge,now){
   // Trusted fixture operator supplies the expected challenge, never an
   // untrusted signer. Store exact signed bytes' digest before proof receipt.
   const message=syntheticOwnerMessage(challenge);
   if(!Number.isSafeInteger(now)||now!==challenge.issuedAt)fail('challenge registration time mismatch');
   const digest=createHash('sha256').update(message).digest('hex');
   db.exec('BEGIN IMMEDIATE');
   try{
    if(hasNonce.get(challenge.nonce)||getIssued.get(challenge.nonce))fail('challenge nonce already registered or consumed');
    insertIssued.run(challenge.nonce,digest);
    db.exec('COMMIT');
    return {status:'SYNTHETIC_CHALLENGE_REGISTERED',challengeDigest:digest,authorization:false};
   }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
  },consume(input,inventory,proofs,now){
   // Hold the write reservation across check and commit; unique keys are
   // an additional fence. Failures roll back the entire transaction.
   db.exec('BEGIN IMMEDIATE');
   try{
    const batch=verifySyntheticBatch(input,inventory,proofs,now,{
     hasNonce:n=>!!hasNonce.get(n),hasSource:s=>!!hasSource.get(s),
     checkIssued:(nonce,digest)=>{
      const record=getIssued.get(nonce);
      if(!record||record.consumed!==0||record.digest!==digest)fail('unregistered or mismatched challenge');
     }
    });
    for(const n of batch.nonces){
     if(consumeIssued.run(n).changes!==1)fail('challenge consumption failed');
     insertNonce.run(n);
    }
    for(const s of batch.sources)insertSource.run(s);
    db.exec('COMMIT');
    return {status:'SYNTHETIC_BATCH_MATCH',count:batch.count,replayConsumption:'LOCAL_SQLITE_TRANSACTION',
     sourceAuthenticated:false,holderEligibility:'NOT_DETERMINED',authorization:false};
   }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
  }};
 }catch(error){db.close();throw error;}
}
