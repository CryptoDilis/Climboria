const test=require('node:test');
const assert=require('node:assert/strict');
const {createAuthenticatedWalletService}=require('./authenticated_wallet_service.cjs');
const {generateKeyPairSync,sign}=require('node:crypto');
const {decodeBase58}=require('./solana_signature.cjs');
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes){let n=BigInt('0x'+bytes.toString('hex')),s='';while(n>0n){s=alphabet[Number(n%58n)]+s;n/=58n;}for(const b of bytes){if(b!==0)break;s='1'+s;}return s;}
const pair=generateKeyPairSync('ed25519'),wallet=b58(pair.publicKey.export({format:'der',type:'spki'}).subarray(-32)),userId='00000000-0000-4000-8000-000000000001';
function make(auth){const calls=[];const pool={query:async(...args)=>{calls.push(args);return {rows:[]};},connect:async()=>({query:async()=>({rows:[]}),release(){}})};return {calls,pool,service:createAuthenticatedWalletService({verifyAccessToken:auth,pool,now:()=>new Date(100000)})};}
test('unauthenticated issue never writes',async()=>{const f=make(async()=>({status:'UNAUTHORIZED'}));assert.deepEqual(await f.service.issue({accessToken:'bad',wallet}),{status:'UNAUTHORIZED'});assert.equal(f.calls.length,0);});
test('unavailable auth never writes',async()=>{const f=make(async()=>({status:'AUTH_UNAVAILABLE'}));assert.equal((await f.service.issue({accessToken:'bad',wallet})).status,'UNAUTHORIZED');assert.equal(f.calls.length,0);});
test('auth verifier throwing fails closed',async()=>{const f=make(async()=>{throw Error('offline');});assert.equal((await f.service.issue({accessToken:'bad',wallet})).status,'UNAUTHORIZED');assert.equal(f.calls.length,0);});
test('verified user ID comes from auth, not caller',async()=>{const f=make(async()=>({status:'VERIFIED',userId}));const r=await f.service.issue({accessToken:'ok',wallet,userId:'attacker'});assert.equal(r.status,'ISSUED');assert.equal(f.calls[0][1][1],userId);});
test('issue rejects bad wallet',async()=>{const f=make(async()=>({status:'VERIFIED',userId}));assert.equal((await f.service.issue({accessToken:'ok',wallet:'bad'})).status,'INVALID');assert.equal(f.calls.length,0);});
test('issue never accepts user-supplied nonce',async()=>{const f=make(async()=>({status:'VERIFIED',userId}));const r=await f.service.issue({accessToken:'ok',wallet,nonce:'attacker'});assert.equal(r.status,'ISSUED');assert.notEqual(r.nonce,'attacker');});
test('unauthenticated binding never connects to DB',async()=>{let connections=0;const f=make(async()=>({status:'UNAUTHORIZED'}));f.pool.connect=async()=>{connections++;throw Error('should not connect');};assert.equal((await f.service.bind({accessToken:'bad',nonce:'x',wallet,signature:'x'})).status,'UNAUTHORIZED');assert.equal(connections,0);});
test('auth throwing denies binding',async()=>{const f=make(async()=>{throw Error('offline');});assert.equal((await f.service.bind({accessToken:'bad',nonce:'x',wallet,signature:'x'})).status,'UNAUTHORIZED');});
test('verified binding uses backend user ID',async()=>{const f=make(async()=>({status:'VERIFIED',userId}));const r=await f.service.bind({accessToken:'ok',nonce:'x',wallet,signature:'x',userId:'attacker'});assert.equal(r.status,'UNKNOWN');});
test('service rejects missing auth verifier',()=>assert.throws(()=>createAuthenticatedWalletService({pool:make(async()=>({})).pool})));
test('service rejects missing pool',()=>assert.throws(()=>createAuthenticatedWalletService({verifyAccessToken:async()=>({})})));
test('service rejects missing now callback',()=>assert.throws(()=>createAuthenticatedWalletService({verifyAccessToken:async()=>({}),pool:make(async()=>({})).pool,now:null})));
