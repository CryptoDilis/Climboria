import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {authorizationBytes,verifyAuthorization,createSyntheticChallengeLedger} from './authorization.mjs';
const h=(n,len=32)=>n.toString(16).padStart(2,'0').repeat(len);
function fixture(){
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const v={genesis:h(1),mint:h(2),snapshotBlockhash:h(3),snapshotSlot:'100',campaign:h(4),manifestHash:h(5),entitlementId:h(6),sourceKey:publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex'),destination:h(7,20),claimContract:h(8,20),awardRaw:'60000000',nonce:h(9),issuedAt:'1000',expiresAt:'1300',chainId:'84532'};
 const sig=(v)=>sign(null,authorizationBytes(v),privateKey).toString('hex');
 return {v,sig};
}
test('valid synthetic source signature and immutable challenge',()=>{const {v,sig}=fixture();assert.equal(verifyAuthorization(v,{...v},sig(v),1001).status,'SYNTHETIC_AUTH_ONLY_NO_GO');});
test('all domain and entitlement fields are bound',()=>{const {v,sig}=fixture();for(const [k,x] of Object.entries({genesis:h(10),mint:h(10),snapshotBlockhash:h(10),snapshotSlot:'101',campaign:h(10),manifestHash:h(10),entitlementId:h(10),sourceKey:h(10),destination:h(10,20),claimContract:h(10,20),awardRaw:'1',nonce:h(10),issuedAt:'1001',expiresAt:'1301'})){assert.throws(()=>verifyAuthorization(v,{...v,[k]:x},sig(v),1001),/CONTEXT_MISMATCH/);}});
test('wrong key and tampered signatures fail',()=>{const {v,sig}=fixture(),other=fixture();assert.throws(()=>verifyAuthorization(v,v,other.sig(v),1001),/INVALID_SIGNATURE/);const s=Buffer.from(sig(v),'hex');s[0]^=1;assert.throws(()=>verifyAuthorization(v,v,s.toString('hex'),1001),/INVALID_SIGNATURE/);});
test('even a valid signature cannot change independently expected destination',()=>{const {v,sig}=fixture(),changed={...v,destination:h(11,20)};assert.throws(()=>verifyAuthorization(v,changed,sig(changed),1001),/CONTEXT_MISMATCH/);});
test('time boundaries and maximum lifetime',()=>{const {v,sig}=fixture();for(const now of [999,1300,1301,NaN])assert.throws(()=>verifyAuthorization(v,v,sig(v),now),/EXPIRED_OR_EARLY/);assert.doesNotThrow(()=>verifyAuthorization(v,v,sig(v),1000));assert.throws(()=>authorizationBytes({...v,expiresAt:'1601'}),/INVALID_WINDOW/);});
test('mainnet, invalid integers, shape and zero fields rejected',()=>{const {v}=fixture();for(const change of [{chainId:'8453'},{awardRaw:'0'},{awardRaw:'01'},{snapshotSlot:'18446744073709551616'},{destination:h(0,20)},{destination:v.claimContract},{mint:'a'},{extra:true}])assert.throws(()=>authorizationBytes({...v,...change}));});
test('canonical fixed bytes are independent of JSON field order',()=>{const {v}=fixture();assert.deepEqual(authorizationBytes(v),authorizationBytes(Object.fromEntries(Object.entries(v).reverse())));});
test('one entitlement cannot consume fresh nonce or another contract in same campaign',()=>{const {v,sig}=fixture(),l=createSyntheticChallengeLedger();l.consume(v,v,sig(v),1001);for(const changed of [v,{...v,nonce:h(11)},{...v,nonce:h(12),claimContract:h(12,20)}])assert.throws(()=>l.consume(changed,changed,sig(changed),1001),/REPLAY/);});
test('nonce reuse across entitlements rejected',()=>{const {v,sig}=fixture(),l=createSyntheticChallengeLedger();l.consume(v,v,sig(v),1001);const changed={...v,entitlementId:h(11)};assert.throws(()=>l.consume(changed,changed,sig(changed),1001),/REPLAY/);});
test('invalid proof does not consume challenge',()=>{const {v,sig}=fixture(),l=createSyntheticChallengeLedger();assert.throws(()=>l.consume(v,v,h(1,64),1001),/INVALID_SIGNATURE/);assert.doesNotThrow(()=>l.consume(v,v,sig(v),1001));});
