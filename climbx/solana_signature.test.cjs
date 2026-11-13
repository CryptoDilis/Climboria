const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, sign } = require('node:crypto');
const { decodeBase58, verifySolanaMessage } = require('./solana_signature');

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function encode58(buf) {
  let n = BigInt('0x'+buf.toString('hex'));
  let out='';
  while(n>0n) { const r=Number(n%58n);out=alphabet[r]+out;n/=58n; }
  for(const b of buf) { if(b!==0)break;out='1'+out; }
  return out;
}
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const wallet=encode58(publicKey.export({format:'der',type:'spki'}).subarray(-32));
const message='CLIMBX wallet ownership verification\nDomain: climboria.fun\nChain: solana:devnet\nUser: alice\nWallet: '+wallet+'\nNonce: 123\nIssued: 100\nExpires: 400';
const signature=encode58(sign(null,Buffer.from(message),privateKey));
const valid=()=>({wallet,message,signature});

test('valid signed challenge',()=>assert.equal(verifySolanaMessage(valid()),true));
test('wrong wallet',()=>assert.equal(verifySolanaMessage({...valid(),wallet:encode58(generateKeyPairSync('ed25519').publicKey.export({format:'der',type:'spki'}).subarray(-32))}),false));
test('tampered nonce',()=>assert.equal(verifySolanaMessage({...valid(),message:message.replace('Nonce: 123','Nonce: 456')}),false));
test('tampered domain',()=>assert.equal(verifySolanaMessage({...valid(),message:message.replace('climboria.fun','evil.example')}),false));
test('tampered chain',()=>assert.equal(verifySolanaMessage({...valid(),message:message.replace('solana:devnet','solana:mainnet')}),false));
test('tampered user',()=>assert.equal(verifySolanaMessage({...valid(),message:message.replace('User: alice','User: bob')}),false));
test('invalid signature alphabet',()=>assert.equal(verifySolanaMessage({...valid(),signature:'0'}),false));
test('invalid signature length',()=>assert.equal(verifySolanaMessage({...valid(),signature:'111'}),false));
test('invalid wallet length',()=>assert.equal(verifySolanaMessage({...valid(),wallet:'111'}),false));
test('empty message',()=>assert.equal(verifySolanaMessage({...valid(),message:''}),false));
test('not CLIMBX challenge',()=>assert.equal(verifySolanaMessage({...valid(),message:'Sign this'}),false));
test('base58 leading zeros',()=>assert.deepEqual(decodeBase58('1112'),Buffer.from([0,0,0,1])));
test('base58 invalid character',()=>assert.throws(()=>decodeBase58('O0Il')));
test('base58 empty',()=>assert.throws(()=>decodeBase58('')));
