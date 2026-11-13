const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {verifyAndConsume}=require('./verify_challenge.cjs');
const chars='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes){let n=BigInt('0x'+bytes.toString('hex')),s='';while(n>0n){s=chars[Number(n%58n)]+s;n/=58n;}for(const b of bytes){if(b!==0)break;s='1'+s;}return s;}
function fixture(){
  const kp=generateKeyPairSync('ed25519');
  const wallet=b58(kp.publicKey.export({format:'der',type:'spki'}).subarray(-32));
  const row={userId:'alice',wallet,domain:'climboria.fun',chain:'solana:devnet',issuedAt:100,expiresAt:400,consumed:false};
  row.message='CLIMBX wallet ownership verification\nDomain: '+row.domain+'\nChain: '+row.chain+'\nUser: '+row.userId+'\nWallet: '+wallet+'\nNonce: n1\nIssued: 100\nExpires: 400';
  const signature=b58(sign(null,Buffer.from(row.message),kp.privateKey));
  const store={get:n=>n==='n1'?row:null,consume:(n,expected)=>{if(n!=='n1'||row!==expected||row.consumed)return false;row.consumed=true;return true;}};
  return {store,nonce:'n1',userId:'alice',wallet,domain:'climboria.fun',chain:'solana:devnet',now:110,signature};
}
test('verified challenge consumed',()=>assert.equal(verifyAndConsume(fixture()),'VERIFIED'));
test('replay fails',()=>{const f=fixture();verifyAndConsume(f);assert.equal(verifyAndConsume(f),'REPLAY');});
test('wrong user',()=>assert.equal(verifyAndConsume({...fixture(),userId:'bob'}),'MISMATCH'));
test('wrong wallet',()=>assert.equal(verifyAndConsume({...fixture(),wallet:'wrong'}),'MISMATCH'));
test('wrong domain',()=>assert.equal(verifyAndConsume({...fixture(),domain:'evil.example'}),'MISMATCH'));
test('wrong chain',()=>assert.equal(verifyAndConsume({...fixture(),chain:'solana:mainnet'}),'MISMATCH'));
test('expired',()=>assert.equal(verifyAndConsume({...fixture(),now:400}),'EXPIRED'));
test('not yet issued',()=>assert.equal(verifyAndConsume({...fixture(),now:99}),'EXPIRED'));
test('unknown nonce',()=>assert.equal(verifyAndConsume({...fixture(),nonce:'other'}),'UNKNOWN'));
test('tampered signature',()=>assert.equal(verifyAndConsume({...fixture(),signature:'111'}),'BAD_SIGNATURE'));
test('missing signature',()=>assert.equal(verifyAndConsume({...fixture(),signature:''}),'INVALID'));
test('invalid time',()=>assert.equal(verifyAndConsume({...fixture(),now:NaN}),'INVALID'));
test('missing store',()=>assert.throws(()=>verifyAndConsume({...fixture(),store:null})));
test('store atomic race rejected',()=>{const f=fixture();f.store.consume=()=>false;assert.equal(verifyAndConsume(f),'REPLAY');});
test('stored message tampering rejected',()=>{const f=fixture();f.store.get('n1').message+='x';assert.equal(verifyAndConsume(f),'BAD_SIGNATURE');});
