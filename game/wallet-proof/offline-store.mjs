// Offline-only ownership proof prototype. Not an HTTP service or production link store.
// Caller identity is a TRUSTED synthetic fixture, not a client-supplied credential.
// EOA key recovery does not prove current on-chain account/controller semantics.
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {getAddress,verifyMessage,Signature} from 'ethers';
import {SiweMessage} from 'siwe';

const DOMAIN='climboria.fun',URI='https://climboria.fun/game/wallet/';
const PURPOSE='Climboria game wallet ownership linking (offline test only). No transaction or payment.';
const CHAIN=8453,TTL=300000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX=/^0x[0-9a-fA-F]{40}$/;
const ID=/^[0-9a-f]{32}$/;
function fail(){throw Error('wallet-proof-rejected');}
function identity(user){if(!user||user.mode!=='synthetic-test'||user.registered!==true||!UUID.test(user.id))fail();return user.id;}
function address(value){if(typeof value!=='string'||!HEX.test(value)||/^0x0{40}$/i.test(value))fail();try{return getAddress(value);}catch{fail();}}
function time(value){if(!Number.isSafeInteger(value)||value<0||value>8640000000000000-TTL)fail();return value;}
function hash(message){return createHash('sha256').update(message,'utf8').digest('hex');}
export class OfflineWalletProofStore{
 #db;
 constructor(path){
  if(typeof path!=='string'||!path||path===':memory:')fail();
  this.#db=new DatabaseSync(path);
  this.#db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS fixture_challenge(id TEXT PRIMARY KEY,uid TEXT NOT NULL,address TEXT NOT NULL,nonce TEXT NOT NULL UNIQUE,message TEXT NOT NULL,issued INTEGER NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0 CHECK(used IN (0,1)));
  CREATE TABLE IF NOT EXISTS fixture_association(chain INTEGER NOT NULL CHECK(chain=8453),address TEXT NOT NULL,uid TEXT NOT NULL,evidence TEXT NOT NULL UNIQUE,verified INTEGER NOT NULL,message_hash TEXT NOT NULL,PRIMARY KEY(chain,address));`);
 }
 close(){this.#db.close();}
 #atomic(fn){this.#db.exec('BEGIN IMMEDIATE');try{const v=fn();this.#db.exec('COMMIT');return v;}catch(e){this.#db.exec('ROLLBACK');throw e;}}
 issue(user,wallet,chain,now){
  const uid=identity(user),canonical=address(wallet);time(now);if(chain!==CHAIN)fail();
  return this.#atomic(()=>{
   // Reject concurrent pending issuance for this account/address; no silent replacement.
   if(this.#db.prepare('SELECT id FROM fixture_challenge WHERE uid=? AND address=? AND used=0 AND expires>?').get(uid,canonical,now))fail();
   const id=randomBytes(16).toString('hex'),nonce=randomBytes(16).toString('hex');
   const message=new SiweMessage({domain:DOMAIN,address:canonical,statement:PURPOSE,uri:URI,version:'1',chainId:CHAIN,nonce,issuedAt:new Date(now).toISOString(),expirationTime:new Date(now+TTL).toISOString(),requestId:id}).prepareMessage();
   this.#db.prepare('INSERT INTO fixture_challenge(id,uid,address,nonce,message,issued,expires) VALUES(?,?,?,?,?,?,?)').run(id,uid,canonical,nonce,message,now,now+TTL);
   return {mode:'synthetic-test',id,message,expires:now+TTL,authorization:false};
  });
 }
 verify(user,id,signature,now){
  const uid=identity(user);time(now);
  if(typeof id!=='string'||!ID.test(id)||typeof signature!=='string'||!/^0x[0-9a-fA-F]{130}$/.test(signature))fail();
  return this.#atomic(()=>{
   const row=this.#db.prepare('SELECT * FROM fixture_challenge WHERE id=?').get(id);
   if(!row||row.uid!==uid||row.used||now<row.issued||now>=row.expires)fail();
   try{
    const parsed=new SiweMessage(row.message);
    if(parsed.domain!==DOMAIN||parsed.uri!==URI||parsed.statement!==PURPOSE||parsed.version!=='1'||parsed.chainId!==CHAIN||parsed.requestId!==id||parsed.nonce!==row.nonce||parsed.address!==row.address||Date.parse(parsed.issuedAt)!==row.issued||Date.parse(parsed.expirationTime)!==row.expires||parsed.prepareMessage()!==row.message)fail();
    const sig=Signature.from(signature); // ethers enforces canonical s when recovering.
    if(sig.serialized.toLowerCase()!==signature.toLowerCase()||verifyMessage(row.message,sig)!==row.address)fail();
   }catch{fail();}
   const existing=this.#db.prepare('SELECT uid,evidence FROM fixture_association WHERE chain=? AND address=?').get(CHAIN,row.address);
   if(existing&&existing.uid!==uid)fail();
   const evidence=existing?.evidence??id;
   if(!existing)this.#db.prepare('INSERT INTO fixture_association(chain,address,uid,evidence,verified,message_hash) VALUES(?,?,?,?,?,?)').run(CHAIN,row.address,uid,evidence,now,hash(row.message));
   const consumed=this.#db.prepare('UPDATE fixture_challenge SET used=1 WHERE id=? AND used=0').run(id);
   if(consumed.changes!==1)fail();
   return {mode:'synthetic-test',evidence,chain:CHAIN,address:row.address,keyProof:true,authorization:false,productionLink:false};
  });
 }
}
