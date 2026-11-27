// Synthetic offline proof-of-key-control fixture; not a public wallet prompt,
// production eligibility decision, signature service or claim authorization.
import {createPublicKey,verify,createHash} from 'node:crypto';
const DOMAIN='CLIMB_BASE_LEGACY_SYNTHETIC_KEY_CONTROL_V1';
const U64=(1n<<64n)-1n;
const MAX_AWARD=8888888880000n;
const fail=msg=>{throw Error('NO_GO: '+msg);};
const fields=['mode','sourceGenesis','sourceMint','snapshotSlot','snapshotHash','inventoryDigest','campaign','sourceAccount','sourceOwner','sourceAmount','targetChainId','targetToken','targetVault','recipient','award','nonce','issuedAt','expiresAt'];
const hex=(s,n)=>typeof s==='string'&&s.length===n*2&&/^[0-9a-f]+$/.test(s)&&!/^[0]+$/.test(s);
const addr=s=>typeof s==='string'&&s.startsWith('0x')&&hex(s.slice(2),20);
function positive(s,max){return typeof s==='string'&&/^[1-9][0-9]{0,19}$/.test(s)&&BigInt(s)<=max;}
export function syntheticOwnerMessage(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||Reflect.ownKeys(c).length!==fields.length||
    !fields.every(k=>{const d=Object.getOwnPropertyDescriptor(c,k);return d?.enumerable===true&&Object.hasOwn(d,'value');}))fail('invalid challenge fields');
 if(c.mode!=='SYNTHETIC_ONLY'||c.targetChainId!==84532)fail('test-only chain and mode required');
 for(const k of ['sourceGenesis','sourceMint','snapshotHash','inventoryDigest','campaign','sourceAccount','sourceOwner','nonce'])
  if(!hex(c[k],32))fail('invalid challenge key or digest');
 if(!positive(c.snapshotSlot,U64)||!positive(c.sourceAmount,U64)||!positive(c.award,MAX_AWARD))fail('invalid challenge quantity');
 if(![c.targetToken,c.targetVault,c.recipient].every(addr)||new Set([c.targetToken,c.targetVault,c.recipient]).size!==3)fail('invalid destination binding');
 if(!Number.isSafeInteger(c.issuedAt)||!Number.isSafeInteger(c.expiresAt)||c.issuedAt<=0||
    c.expiresAt<=c.issuedAt||c.expiresAt-c.issuedAt>900)fail('invalid challenge validity');
 return Buffer.from(JSON.stringify([DOMAIN,...fields.map(k=>c[k])]),'utf8');
}
export function verifySyntheticOwnerProof(expectedChallenge,signatureHex,now){
 const message=syntheticOwnerMessage(expectedChallenge);
 if(!Number.isSafeInteger(now)||now<expectedChallenge.issuedAt||now>=expectedChallenge.expiresAt)fail('challenge not current');
 if(!hex(signatureHex,64))fail('invalid signature encoding');
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(expectedChallenge.sourceOwner,'hex')]),format:'der',type:'spki'});
 if(!verify(null,message,publicKey,Buffer.from(signatureHex,'hex')))fail('key-control signature rejected');
 // Caller must supply the expected challenge and trusted time, not a claim
 // supplied by the signer. No persistent challenge consumption in this fixture.
 return {status:'SYNTHETIC_SIGNATURE_MATCH',challengeDigest:createHash('sha256').update(message).digest('hex'),
  sourceAuthenticated:false,holderEligibility:'NOT_DETERMINED',replayConsumption:'NOT_IMPLEMENTED',authorization:false};
}
