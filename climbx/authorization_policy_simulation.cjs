'use strict';
// CLIMBX Phase84 OFF-CHAIN POLICY SIMULATION ONLY.
// This is NOT a Solana authorization program, wallet delegation, or permission to trade.
const MAX_SLOTS=5, MAX_GRANT_MS=24*60*60*1000, ENTRY_CUTOFF_MS=30*60*1000;
function nonnegativeInt(n){return Number.isSafeInteger(n)&&n>=0;}
function positiveInt(n){return Number.isSafeInteger(n)&&n>0;}
function evaluateClimbxEntry({grant,slots,entry,nowMs}={}){
 const deny=reason=>({allowed:false,reason});
 if(!grant||typeof grant!=='object'||!Array.isArray(slots)||!entry||typeof entry!=='object'||!Number.isSafeInteger(nowMs)||nowMs<0)return deny('INVALID');
 if(typeof grant.owner!=='string'||!grant.owner||typeof entry.owner!=='string'||!entry.owner||grant.owner!==entry.owner)return deny('OWNER_MISMATCH');
 if(grant.revoked!==false)return deny('REVOKED_OR_UNKNOWN');
 if(!nonnegativeInt(grant.issuedAtMs)||!positiveInt(grant.expiresAtMs)||grant.expiresAtMs<=grant.issuedAtMs||grant.expiresAtMs-grant.issuedAtMs>MAX_GRANT_MS)return deny('INVALID_GRANT');
 if(nowMs<grant.issuedAtMs||nowMs>=grant.expiresAtMs)return deny('OUTSIDE_GRANT');
 if(grant.expiresAtMs-nowMs<=ENTRY_CUTOFF_MS)return deny('ENTRY_CUTOFF');
 if(slots.length>MAX_SLOTS)return deny('TOO_MANY_SLOTS');
 const mints=new Set();
 for(const slot of slots){
  if(!slot||typeof slot.mint!=='string'||!slot.mint||mints.has(slot.mint))return deny('INVALID_SLOTS');
  mints.add(slot.mint);
 }
 if(typeof entry.mint!=='string'||!mints.has(entry.mint))return deny('MINT_NOT_ALLOWED');
 if(!Array.isArray(grant.allowedMints)||grant.allowedMints.length===0||grant.allowedMints.length>MAX_SLOTS||grant.allowedMints.some(m=>typeof m!=='string'||!m)||new Set(grant.allowedMints).size!==grant.allowedMints.length||!grant.allowedMints.includes(entry.mint))return deny('MINT_NOT_AUTHORIZED');
 const slot=slots.find(s=>s.mint===entry.mint);
 if(slot.openPosition!==false)return deny('SLOT_OCCUPIED');
 if(!positiveInt(entry.amount)||!positiveInt(grant.maxPerTrade)||!positiveInt(grant.maxCumulative)||!nonnegativeInt(grant.spent)||grant.spent>grant.maxCumulative)return deny('INVALID_CAP');
 if(entry.amount>grant.maxPerTrade||entry.amount>grant.maxCumulative-grant.spent)return deny('CAP_EXCEEDED');
 if(entry.venue!=='CLIMBORIA_SIGNATURE_DEX')return deny('VENUE_NOT_ALLOWED');
 return {allowed:true,reason:'POLICY_SIMULATION_ONLY'};
}
module.exports={evaluateClimbxEntry,MAX_SLOTS,MAX_GRANT_MS,ENTRY_CUTOFF_MS};
