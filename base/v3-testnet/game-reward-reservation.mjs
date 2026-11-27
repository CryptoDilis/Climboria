// Local test-only reservation ledger. Trusted operator and local filesystem/clock only.
// No client API, event adjudication, signatures, chain access or payouts.
import {DatabaseSync} from 'node:sqlite';
import {openSync,closeSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ALLOCATION,MONTH,period} from './unlock-schedule.mjs';
const SCHEMA='CLIMB_GAME_RESERVATION_TEST_V1', MAX=ALLOCATION.gaming;
const fail=m=>{throw Error('NO_GO: '+m);};
function shape(v,fields){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fields.length||fields.some(k=>!Object.hasOwn(v,k)))fail('invalid shape');}
function amount(v){if(typeof v!=='string'||!/^[1-9][0-9]{0,14}$/.test(v)||BigInt(v)>MAX)fail('invalid amount');return BigInt(v);}
function key(v){if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v)||/^0+$/.test(v))fail('invalid evidence identity');return v;}
function address(v){if(typeof v!=='string'||!/^0x[0-9a-f]{40}$/.test(v)||BigInt(v)<=65535n)fail('invalid recipient');return v;}
function config(c){shape(c,['mode','chainId','start','programCapRaw','accountMonthlyCapRaw','walletMonthlyCapRaw']);if(c.mode!=='LOCAL_TEST_ONLY'||c.chainId!==84532||!Number.isSafeInteger(c.start)||c.start<=0||c.start>Number.MAX_SAFE_INTEGER-60*Number(MONTH))fail('test-only config required');const cap=amount(c.programCapRaw),account=amount(c.accountMonthlyCapRaw),wallet=amount(c.walletMonthlyCapRaw);if(account>cap||wallet>cap)fail('invalid cap relationship');return {mode:c.mode,chainId:c.chainId,start:c.start,programCapRaw:String(cap),accountMonthlyCapRaw:String(account),walletMonthlyCapRaw:String(wallet)};}
function event(r){shape(r,['sourceEventId','accountId','recipient','amountRaw','adjudicationSha256']);return {sourceEventId:key(r.sourceEventId),accountId:key(r.accountId),recipient:address(r.recipient),amountRaw:String(amount(r.amountRaw)),adjudicationSha256:key(r.adjudicationSha256)};}
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function configure(db){db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;');}
export function initializeRewardReservation(path,c){
 const policy=JSON.stringify(config(c));if(typeof path!=='string'||!path||path===':memory:')fail('invalid file path');
 closeSync(openSync(path,'wx',0o600));
 const db=new DatabaseSync(path);try{configure(db);db.exec("BEGIN IMMEDIATE; CREATE TABLE metadata(id INTEGER PRIMARY KEY CHECK(id=1),version TEXT NOT NULL,policy TEXT NOT NULL) STRICT; CREATE TABLE reservations(event_id TEXT PRIMARY KEY NOT NULL,digest TEXT NOT NULL,month INTEGER NOT NULL CHECK(month>=0 AND month<60),account_id TEXT NOT NULL,recipient TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0)) STRICT; CREATE INDEX account_month ON reservations(month,account_id); CREATE INDEX wallet_month ON reservations(month,recipient);");db.prepare('INSERT INTO metadata VALUES(1,?,?)').run(SCHEMA,policy);db.exec('COMMIT');}finally{db.close();}
}
export function openRewardReservation(path,c){
 const policy=config(c);if(typeof path!=='string'||!path||path===':memory:'||!lstatSync(path).isFile())fail('existing database required');
 const db=new DatabaseSync(path);
 try{
 configure(db);const meta=db.prepare('SELECT version,policy FROM metadata WHERE id=1').get();if(meta?.version!==SCHEMA||meta.policy!==JSON.stringify(policy))fail('policy or schema mismatch');
 const find=db.prepare('SELECT digest,month FROM reservations WHERE event_id=?'),insert=db.prepare('INSERT INTO reservations VALUES(?,?,?,?,?,?)');
 const total=db.prepare('SELECT CAST(COALESCE(SUM(amount),0) AS TEXT) AS used FROM reservations'),monthly=db.prepare('SELECT CAST(COALESCE(SUM(amount),0) AS TEXT) AS used FROM reservations WHERE month=?');
 const account=db.prepare('SELECT CAST(COALESCE(SUM(amount),0) AS TEXT) AS used FROM reservations WHERE month=? AND account_id=?'),wallet=db.prepare('SELECT CAST(COALESCE(SUM(amount),0) AS TEXT) AS used FROM reservations WHERE month=? AND recipient=?');
 const used=(s,...args)=>BigInt(s.get(...args).used);
 return {close(){db.close();},reserve(input,now){
 const row=event(input);if(!Number.isSafeInteger(now)||now<policy.start||now>=policy.start+60*Number(MONTH))fail('outside reward schedule');
 const month=Math.floor((now-policy.start)/Number(MONTH)),n=BigInt(row.amountRaw);
 // ID is derived from a trusted canonical server event identity, not client-supplied randomness.
 // Fixed across accounts, wallets, months, and workers in this database.
 const id=digest(['CLIMB_GAME_EVENT_TEST_V1',row.sourceEventId]),bound=digest(row);
 db.exec('BEGIN IMMEDIATE');try{
 const old=find.get(id);if(old){if(old.digest!==bound)fail('event identity conflict');db.exec('COMMIT');return {status:'EXISTING_RESERVATION_NO_GO',eventId:id,month:old.month,authorization:false};}
 if(used(total)+n>BigInt(policy.programCapRaw)||used(monthly,month)+n>period(month).gaming||used(account,month,row.accountId)+n>BigInt(policy.accountMonthlyCapRaw)||used(wallet,month,row.recipient)+n>BigInt(policy.walletMonthlyCapRaw))fail('reservation cap exceeded');
 insert.run(id,bound,month,row.accountId,row.recipient,Number(n));
 db.exec('COMMIT');return {status:'LOCAL_RESERVATION_ONLY_NO_GO',eventId:id,month,authorization:false};
 }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}
 }};
 }catch(e){db.close();throw e;}
}
