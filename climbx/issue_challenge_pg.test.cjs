const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync}=require('node:crypto');
const {issueWalletChallenge}=require('./issue_challenge_pg.cjs');
const {canonicalChallenge}=require('./canonical_challenge.cjs');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes){let n=BigInt('0x'+bytes.toString('hex')),s='';while(n>0n){s=alphabet[Number(n%58n)]+s;n/=58n;}for(const b of bytes){if(b!==0)break;s='1'+s;}return s;}
const wallet=b58(generateKeyPairSync('ed25519').publicKey.export({format:'der',type:'spki'}).subarray(-32));
const userId='00000000-0000-4000-8000-000000000001';
const nonce='A'.repeat(43);
function fixture(){const calls=[];return {calls,pool:{query:async(...args)=>{calls.push(args);return {rows:[]};}},userId,wallet,now:new Date(100000),nonceFactory:()=>nonce};}
test('inserts canonical message and returns signable bytes',async()=>{const f=fixture();const r=await issueWalletChallenge(f);assert.equal(r.status,'ISSUED');assert.equal(r.message,canonicalChallenge({userId,wallet,nonce,issuedAt:100,expiresAt:400}));assert.equal(f.calls.length,1);});
test('timestamp and expiry passed as database parameters',async()=>{const f=fixture();await issueWalletChallenge(f);assert.equal(f.calls[0][1][6].getTime(),100000);assert.equal(f.calls[0][1][7].getTime(),400000);});
test('uses fixed domain and devnet',async()=>{const r=await issueWalletChallenge(fixture());assert.equal(r.domain,'climboria.fun');assert.equal(r.chain,'solana:devnet');});
test('rejects untrusted user ID shape',async()=>assert.equal((await issueWalletChallenge({...fixture(),userId:'attacker'})).status,'INVALID'));
test('rejects malformed wallet',async()=>assert.equal((await issueWalletChallenge({...fixture(),wallet:'bad'})).status,'INVALID'));
test('rejects short nonce',async()=>assert.equal((await issueWalletChallenge({...fixture(),nonceFactory:()=> 'short'})).status,'INVALID'));
test('rejects invalid timestamp',async()=>assert.equal((await issueWalletChallenge({...fixture(),now:new Date(NaN)})).status,'INVALID'));
test('rejects fractional-second timestamp',async()=>assert.equal((await issueWalletChallenge({...fixture(),now:new Date(100001)})).status,'INVALID'));
test('rejects negative timestamp',async()=>assert.equal((await issueWalletChallenge({...fixture(),now:new Date(-1000)})).status,'INVALID'));
test('no pool throws',async()=>await assert.rejects(()=>issueWalletChallenge({...fixture(),pool:null})));
test('duplicate nonce fails closed',async()=>{const f=fixture();f.pool.query=async()=>{const e=new Error('duplicate');e.code='23505';throw e;};assert.equal((await issueWalletChallenge(f)).status,'NONCE_CONFLICT');});
test('database error propagates',async()=>{const f=fixture();f.pool.query=async()=>{throw Error('db unavailable');};await assert.rejects(()=>issueWalletChallenge(f),/db unavailable/);});
test('no database insert on invalid user',async()=>{const f=fixture();f.userId='bad';await issueWalletChallenge(f);assert.equal(f.calls.length,0);});
test('no database insert on invalid nonce',async()=>{const f=fixture();f.nonceFactory=()=> 'x';await issueWalletChallenge(f);assert.equal(f.calls.length,0);});
