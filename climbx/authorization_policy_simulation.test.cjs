const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluateClimbxEntry,MAX_GRANT_MS,ENTRY_CUTOFF_MS}=require('./authorization_policy_simulation.cjs');
const t=1700000000000;
function valid(){return {grant:{owner:'wallet1',revoked:false,issuedAtMs:t,expiresAtMs:t+MAX_GRANT_MS,allowedMints:['SOL','USDC'],maxPerTrade:100,maxCumulative:300,spent:20},slots:[{mint:'SOL',openPosition:false},{mint:'USDC',openPosition:false}],entry:{owner:'wallet1',mint:'SOL',amount:50,venue:'CLIMBORIA_SIGNATURE_DEX'},nowMs:t+1000};}
function check(change){const x=valid();change(x);return evaluateClimbxEntry(x);}
function denied(name,change,reason){test(name,()=>assert.deepEqual(check(change),{allowed:false,reason}));}
test('valid policy simulation does not imply on-chain authority',()=>assert.deepEqual(evaluateClimbxEntry(valid()),{allowed:true,reason:'POLICY_SIMULATION_ONLY'}));
denied('wrong owner',x=>x.entry.owner='attacker','OWNER_MISMATCH');
denied('unknown revocation status fails closed',x=>delete x.grant.revoked,'REVOKED_OR_UNKNOWN');
denied('revoked grant',x=>x.grant.revoked=true,'REVOKED_OR_UNKNOWN');
denied('grant longer than 24 hours',x=>x.grant.expiresAtMs+=1,'INVALID_GRANT');
denied('expired grant',x=>x.nowMs=x.grant.expiresAtMs,'OUTSIDE_GRANT');
denied('future grant',x=>x.nowMs=t-1,'OUTSIDE_GRANT');
denied('last 30 minutes rejects new entry',x=>x.nowMs=x.grant.expiresAtMs-ENTRY_CUTOFF_MS,'ENTRY_CUTOFF');
denied('sixth slot',x=>x.slots.push(...['A','B','C','D'].map(mint=>({mint,openPosition:false}))),'TOO_MANY_SLOTS');
denied('duplicate mint',x=>x.slots.push({mint:'SOL',openPosition:false}),'INVALID_SLOTS');
denied('slot already occupied',x=>x.slots[0].openPosition=true,'SLOT_OCCUPIED');
denied('mint not in slots',x=>x.entry.mint='BTC','MINT_NOT_ALLOWED');
denied('mint not owner-authorized',x=>x.grant.allowedMints=['USDC'],'MINT_NOT_AUTHORIZED');
denied('zero trade amount',x=>x.entry.amount=0,'INVALID_CAP');
denied('fractional amount',x=>x.entry.amount=0.5,'INVALID_CAP');
denied('per trade cap',x=>x.entry.amount=101,'CAP_EXCEEDED');
denied('cumulative cap',x=>{x.grant.spent=290;x.entry.amount=20},'CAP_EXCEEDED');
denied('unreviewed venue',x=>x.entry.venue='EXTERNAL_DEX','VENUE_NOT_ALLOWED');
denied('missing openPosition state fails closed',x=>delete x.slots[0].openPosition,'SLOT_OCCUPIED');
denied('invalid spent counter',x=>x.grant.spent=-1,'INVALID_CAP');
