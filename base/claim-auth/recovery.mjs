// Offline recovery decision model, not an RPC verifier, wallet, relayer or payout service.
// Observations must be independently authenticated by a future evidence collector.
// This module never produces a transaction, mutates a claim or authorizes payment.
const fail=code=>{throw new Error(code);};
const hex=(v,n)=>typeof v==='string'&&v.length===n*2&&/^[0-9a-f]+$/.test(v)&&!/^[0]+$/.test(v);
const uint=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(v)&&BigInt(v)<(1n<<256n);
function shape(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('INVALID_SHAPE');}
const result=(state)=>Object.freeze({status:'SYNTHETIC_RECOVERY_NO_GO',state,automaticResubmit:false,productionAuthorized:false});
// Direct claimant transaction only. Any observed success must bind to the single approved instance.
// A finalized unclaimed state is NOT sufficient to rule out an outstanding pending transaction.
export function assessRecovery(expected,observation){
 shape(expected,['chainId','contract','token','manifest','entitlement','recipient','amountRaw','deadline']);
 if(expected.chainId!==84532||!hex(expected.contract,20)||!hex(expected.token,20)||expected.contract===expected.token||!hex(expected.manifest,32)||!hex(expected.entitlement,32)||!hex(expected.recipient,20)||!uint(expected.amountRaw)||expected.amountRaw==='0'||!Number.isSafeInteger(expected.deadline)||expected.deadline<=0)fail('INVALID_EXPECTED');
 if(observation===null)return result('EVIDENCE_UNAVAILABLE');
 shape(observation,['chainId','contract','token','manifest','entitlement','recipient','amountRaw','finalized','blockHash','blockTime','claimed','closed','transaction']);
 for(const k of ['chainId','contract','token','manifest','entitlement','recipient','amountRaw'])if(expected[k]!==observation[k])return result('CONTEXT_MISMATCH');
 if(observation.finalized!==true||!hex(observation.blockHash,32)||!Number.isSafeInteger(observation.blockTime)||observation.blockTime<=0)return result('FINALITY_PENDING');
 if(typeof observation.claimed!=='boolean'||typeof observation.closed!=='boolean')return result('EVIDENCE_INVALID');
 const tx=observation.transaction;
 if(tx!==null){
  shape(tx,['hash','status','finalized','exactClaimAndTransfer','sameCanonicalHistory']);
  if(!hex(tx.hash,32)||!['success','reverted','pending','unknown'].includes(tx.status)||typeof tx.finalized!=='boolean'||typeof tx.exactClaimAndTransfer!=='boolean'||typeof tx.sameCanonicalHistory!=='boolean')return result('EVIDENCE_INVALID');
  if(!tx.finalized||tx.status==='pending'||tx.status==='unknown')return result('TRANSACTION_UNRESOLVED');
  if(!tx.sameCanonicalHistory)return result('EVIDENCE_CONFLICT');
  if(tx.status==='success'&&(!tx.exactClaimAndTransfer||!observation.claimed))return result('EVIDENCE_CONFLICT');
  if(tx.status==='reverted'&&tx.exactClaimAndTransfer)return result('EVIDENCE_CONFLICT');
 }
 if(observation.claimed)return result(tx?.status==='success'?'PAYOUT_OBSERVED':'CLAIMED_RECONCILIATION_REQUIRED');
 if(observation.closed||observation.blockTime>=expected.deadline)return result('WINDOW_CLOSED_REVIEW');
 if(tx?.status==='reverted')return result('FINALIZED_REVERT_MANUAL_REVIEW');
 return result('UNCLAIMED_PENDING_TRANSACTION_CHECK');
}
