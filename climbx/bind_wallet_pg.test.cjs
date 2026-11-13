const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {bindVerifiedWallet}=require('./bind_wallet_pg.cjs');
const {canonicalChallenge}=require('./canonical_challenge.cjs');
const alpha='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes){let n=BigInt('0x'+bytes.toString('hex')),s='';while(n>0n){s=alpha[Number(n%58n)]+s;n/=58n;}for(const b of bytes){if(b!==0)break;s='1'+s;}return s;}
function fixture(options={}){
 const kp=generateKeyPairSync('ed25519'),wallet=b58(kp.publicKey.export({format:'der',type:'spki'}).subarray(-32));
 const userId='00000000-0000-4000-8000-000000000001',nonce='A'.repeat(43);
 const message=canonicalChallenge({userId,wallet,nonce,issuedAt:100,expiresAt:400});
 const row={user_id:userId,wallet_address:wallet,domain:'climboria.fun',chain:'solana:devnet',canonical_message:message,issued_at:new Date(100000),expires_at:new Date(400000),consumed_at:null,...options.row};
 const calls=[];
 const client={query:async(sql,params)=>{calls.push([sql,params]);if(sql.startsWith('SELECT user_id'))return {rows:options.unknown?[]:[row]};if(sql.startsWith('SELECT id'))return {rows:options.owner?[{user_id:options.owner}]:[]};if(sql.startsWith('UPDATE'))return {rows:options.consumedRace?[]:[{nonce}]};if(sql.startsWith('INSERT')&&options.uniqueRace){const e=new Error('unique');e.code='23505';throw e;}return {rows:[]};},release:()=>calls.push(['RELEASE'])};
 const pool={connect:async()=>client};
 return {args:{pool,userId,nonce,wallet,domain:'climboria.fun',chain:'solana:devnet',now:new Date(110000),signature:b58(sign(null,Buffer.from(message),kp.privateKey))},calls};
}
test('valid binds and commits',async()=>{const f=fixture();assert.equal(await bindVerifiedWallet(f.args),'BOUND');assert.ok(f.calls.some(x=>x[0]==='COMMIT'));});
test('unknown nonce rollback',async()=>{const f=fixture({unknown:true});assert.equal(await bindVerifiedWallet(f.args),'UNKNOWN');assert.ok(f.calls.some(x=>x[0]==='ROLLBACK'));});
test('wrong owner',async()=>{const f=fixture();f.args.userId='attacker';assert.equal(await bindVerifiedWallet(f.args),'MISMATCH');});
test('wrong wallet',async()=>{const f=fixture();f.args.wallet='attacker';assert.equal(await bindVerifiedWallet(f.args),'MISMATCH');});
test('wrong domain',async()=>{const f=fixture();f.args.domain='evil';assert.equal(await bindVerifiedWallet(f.args),'MISMATCH');});
test('wrong chain',async()=>{const f=fixture();f.args.chain='solana:mainnet';assert.equal(await bindVerifiedWallet(f.args),'MISMATCH');});
test('replay',async()=>{const f=fixture({row:{consumed_at:new Date(110000)}});assert.equal(await bindVerifiedWallet(f.args),'REPLAY');});
test('expired',async()=>{const f=fixture();f.args.now=new Date(400000);assert.equal(await bindVerifiedWallet(f.args),'EXPIRED');});
test('bad signature',async()=>{const f=fixture();f.args.signature='111';assert.equal(await bindVerifiedWallet(f.args),'BAD_SIGNATURE');});
test('other user owns wallet',async()=>{const f=fixture({owner:'different'});assert.equal(await bindVerifiedWallet(f.args),'OWNED_BY_OTHER_USER');});
test('concurrent nonce consume denied',async()=>{const f=fixture({consumedRace:true});assert.equal(await bindVerifiedWallet(f.args),'REPLAY');});
test('unique constraint conflict',async()=>{const f=fixture({uniqueRace:true});assert.equal(await bindVerifiedWallet(f.args),'OWNERSHIP_CONFLICT');assert.ok(f.calls.some(x=>x[0]==='ROLLBACK'));});
test('no pool',async()=>await assert.rejects(()=>bindVerifiedWallet({...fixture().args,pool:null})));
test('no signature',async()=>assert.equal(await bindVerifiedWallet({...fixture().args,signature:''}),'INVALID'));
test('invalid time',async()=>assert.equal(await bindVerifiedWallet({...fixture().args,now:new Date(NaN)}),'INVALID'));
test('release connection',async()=>{const f=fixture();await bindVerifiedWallet(f.args);assert.equal(f.calls.at(-1)[0],'RELEASE');});

test('tampered stored canonical message rejected',async()=>{const f=fixture({row:{canonical_message:'CLIMBX wallet ownership verification\\nTampered'}});assert.equal(await bindVerifiedWallet(f.args),'INVALID_CHALLENGE');assert.ok(f.calls.some(x=>x[0]==='ROLLBACK'));});
test('non-second-aligned timestamps rejected',async()=>{const f=fixture({row:{issued_at:new Date(100001)}});assert.equal(await bindVerifiedWallet(f.args),'INVALID_CHALLENGE');});
