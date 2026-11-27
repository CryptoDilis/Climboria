// Synthetic offline batch only. The ledger is deliberately in-memory;
// durable cross-process replay consumption and independent source review remain open.
import {createHash} from 'node:crypto';
import {normalizeLegacyEvidence} from './legacy-canonical-evidence.mjs';
import {verifySyntheticOwnerProof} from './legacy-owner-proof.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=msg=>{throw Error('NO_GO: '+msg);};
function key(s){
 let n=0n;for(const c of s)n=n*58n+BigInt(alphabet.indexOf(c));
 return n.toString(16).padStart(64,'0');
}
export function verifySyntheticBatch(input,expectedInventoryDigest,proofs,now,{hasNonce,hasSource,checkIssued}){
  const {entries,total}=normalizeLegacyEvidence(input);
  if(!Array.isArray(proofs)||proofs.length!==entries.length)fail('proof count mismatch');
  const bySource=new Map();
  for(const p of proofs){
   if(!p||typeof p.sourceAccount!=='string'||bySource.has(p.sourceAccount))fail('duplicate or invalid proof source');
   bySource.set(p.sourceAccount,p);
  }
  const nonces=new Set(),sources=new Set();
  for(const [account,owner,recipient,sourceAmount,award,evidenceHash] of entries){
   const p=bySource.get(account);
   if(!p)fail('missing source proof');
   const sourceIdentity=JSON.stringify([input.sourceGenesis,input.sourceMint,input.campaign,account]);
   if(hasSource(sourceIdentity)||sources.has(sourceIdentity))fail('source already consumed');
   const nonce=p.nonce;
   if(hasNonce(nonce)||nonces.has(nonce))fail('nonce already consumed');
   // Construct the expected signed message exclusively from the manifest,
   // trusted synthetic inventory digest and issued challenge metadata.
   const challenge={mode:input.mode,sourceGenesis:key(input.sourceGenesis),sourceMint:key(input.sourceMint),
    snapshotSlot:input.snapshotSlot,snapshotHash:input.snapshotHash,inventoryDigest:expectedInventoryDigest,
    policyHash:input.policyHash,cap:input.cap,campaign:input.campaign,sourceAccount:key(account),
    sourceOwner:key(owner),sourceAmount,targetChainId:input.targetChainId,targetToken:input.targetToken,
    targetVault:input.targetVault,recipient,award,nonce,issuedAt:p.issuedAt,expiresAt:p.expiresAt};
   const result=verifySyntheticOwnerProof(challenge,p.signature,now);
   if(checkIssued)checkIssued(nonce,result.challengeDigest);
   const digest=createHash('sha256').update(JSON.stringify(['CLIMB_SYNTHETIC_OWNER_EVIDENCE_V2',result.challengeDigest,p.signature])).digest('hex');
   if(digest!==evidenceHash)fail('manifest evidence hash mismatch');
   nonces.add(nonce);sources.add(sourceIdentity);
  }
  return {nonces:[...nonces],sources:[...sources],count:entries.length,total};
}
export function createSyntheticOwnerLedger(){
 const consumedNonces=new Set(),consumedSources=new Set();
 return {consume(input,expectedInventoryDigest,proofs,now){
  const batch=verifySyntheticBatch(input,expectedInventoryDigest,proofs,now,{
   hasNonce:n=>consumedNonces.has(n),hasSource:s=>consumedSources.has(s)
  });
  for(const nonce of batch.nonces)consumedNonces.add(nonce);
  for(const source of batch.sources)consumedSources.add(source);
  return {status:'SYNTHETIC_BATCH_MATCH',count:batch.count,replayConsumption:'IN_MEMORY_ONLY',
   sourceAuthenticated:false,holderEligibility:'NOT_DETERMINED',authorization:false};
 }};
}
