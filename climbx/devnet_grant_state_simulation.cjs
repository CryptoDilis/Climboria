'use strict';
// Phase92 CLIMBX devnet grant-state simulation ONLY; NOT on-chain enforcement.
const MAX_SLOTS=5, MAX_LIFETIME_SECONDS=86400, ENTRY_CUTOFF_SECONDS=1800;
const deny=reason=>({ok:false,reason});
const uint=n=>Number.isSafeInteger(n)&&n>=0;
function createGrant({owner,executor,nonce,issuedAt,expiresAt,allowedMints,maxPerTrade,maxCumulative}={}){
 if(typeof owner!=='string'||!owner||typeof executor!=='string'||!executor||typeof nonce!=='string'||!nonce)return deny('INVALID_IDENTITY');
 if(!uint(issuedAt)||!uint(expiresAt)||expiresAt<=issuedAt||expiresAt-issuedAt>MAX_LIFETIME_SECONDS)return deny('INVALID_EXPIRY');
 if(!Array.isArray(allowedMints)||allowedMints.length<1||allowedMints.length>MAX_SLOTS||allowedMints.some(m=>typeof m!=='string'||!m)||new Set(allowedMints).size!==allowedMints.length)return deny('INVALID_MINTS');
 if(!uint(maxPerTrade)||maxPerTrade===0||!uint(maxCumulative)||maxCumulative===0)return deny('INVALID_CAPS');
 return {ok:true,grant:{owner,executor,nonce,issuedAt,expiresAt,allowedMints:[...allowedMints],maxPerTrade,maxCumulative,spent:0,revoked:false,lastSequence:0}};
}
function revokeGrant(grant,{owner}={}){
 if(!grant||typeof grant!=='object'||Array.isArray(grant)||grant.revoked!==false||typeof grant.owner!=='string'||!grant.owner||owner!==grant.owner)return deny('UNAUTHORIZED_REVOKE');
 return {ok:true,grant:{...grant,revoked:true}};
}
function evaluateOrder(grant,{executor,mint,amount,sequence,now,positionOpen}={}){
 if(!grant||typeof grant!=='object'||Array.isArray(grant)||grant.revoked!==false)return deny('REVOKED_OR_UNKNOWN');
 if(typeof grant.owner!=='string'||!grant.owner||typeof grant.executor!=='string'||!grant.executor||typeof grant.nonce!=='string'||!grant.nonce)return deny('INVALID_GRANT');
 if(!uint(grant.issuedAt)||!uint(grant.expiresAt)||grant.expiresAt<=grant.issuedAt||grant.expiresAt-grant.issuedAt>MAX_LIFETIME_SECONDS)return deny('INVALID_GRANT');
 if(!Array.isArray(grant.allowedMints)||grant.allowedMints.length<1||grant.allowedMints.length>MAX_SLOTS||grant.allowedMints.some(m=>typeof m!=='string'||!m)||new Set(grant.allowedMints).size!==grant.allowedMints.length)return deny('INVALID_GRANT');
 if(!uint(grant.lastSequence))return deny('INVALID_GRANT');
 if(typeof executor!=='string'||executor!==grant.executor)return deny('EXECUTOR_MISMATCH');
 if(!uint(now)||now<grant.issuedAt||now>=grant.expiresAt)return deny('OUTSIDE_GRANT');
 if(grant.expiresAt-now<=ENTRY_CUTOFF_SECONDS)return deny('ENTRY_CUTOFF');
 if(!Array.isArray(grant.allowedMints)||!grant.allowedMints.includes(mint))return deny('MINT_NOT_ALLOWED');
 if(positionOpen!==false)return deny('SLOT_OCCUPIED_OR_UNKNOWN');
 if(!uint(sequence)||sequence!==grant.lastSequence+1)return deny('REPLAY_OR_SEQUENCE');
 if(!uint(amount)||amount===0||!uint(grant.maxPerTrade)||!uint(grant.maxCumulative)||!uint(grant.spent)||grant.spent>grant.maxCumulative)return deny('INVALID_CAP');
 if(amount>grant.maxPerTrade||amount>grant.maxCumulative-grant.spent)return deny('CAP_EXCEEDED');
 // No settlement mutation here. Atomic on-chain cap accounting is NOT implemented.
 return {ok:true,reason:'SIMULATION_ONLY_NO_EXECUTION'};
}
module.exports={createGrant,revokeGrant,evaluateOrder};
