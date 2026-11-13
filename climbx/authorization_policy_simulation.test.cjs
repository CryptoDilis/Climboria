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

denied('zero issued timestamp with invalid negative clock',x=>{x.grant.issuedAtMs=0;x.grant.expiresAtMs=MAX_GRANT_MS;x.nowMs=-1},'INVALID');
denied('negative issued timestamp with oversized grant lifetime',x=>{x.grant.issuedAtMs=-1;x.grant.expiresAtMs=MAX_GRANT_MS},'INVALID_GRANT');
denied('unsafe expiry timestamp',x=>x.grant.expiresAtMs=Number.MAX_SAFE_INTEGER+1,'INVALID_GRANT');
denied('unsafe current timestamp',x=>x.nowMs=Number.MAX_SAFE_INTEGER+1,'INVALID');
denied('non-array authorized mints',x=>x.grant.allowedMints='SOL','MINT_NOT_AUTHORIZED');
denied('null slot fails closed',x=>x.slots=[null],'INVALID_SLOTS');
denied('empty slot mint',x=>x.slots=[{mint:'',openPosition:false}],'INVALID_SLOTS');
denied('NaN amount',x=>x.entry.amount=NaN,'INVALID_CAP');
denied('unsafe integer amount',x=>x.entry.amount=Number.MAX_SAFE_INTEGER+1,'INVALID_CAP');
denied('negative spent amount',x=>x.grant.spent=-1,'INVALID_CAP');
denied('unsafe spent amount',x=>x.grant.spent=Number.MAX_SAFE_INTEGER+1,'INVALID_CAP');
test('exact per-trade and cumulative cap equality is allowed in simulation',()=>{
 const x=valid();x.grant.maxPerTrade=100;x.grant.maxCumulative=120;x.grant.spent=20;x.entry.amount=100;
 assert.deepEqual(evaluateClimbxEntry(x),{allowed:true,reason:'POLICY_SIMULATION_ONLY'});
});
test('one millisecond before final 30 minute cutoff is allowed in simulation',()=>{
 const x=valid();x.nowMs=x.grant.expiresAtMs-ENTRY_CUTOFF_MS-1;
 assert.deepEqual(evaluateClimbxEntry(x),{allowed:true,reason:'POLICY_SIMULATION_ONLY'});
});

denied('negative clock',x=>x.nowMs=-1,'INVALID');
denied('unsafe clock',x=>x.nowMs=Number.MAX_SAFE_INTEGER+1,'INVALID');
denied('negative grant issuance',x=>x.grant.issuedAtMs=-1,'INVALID_GRANT');
denied('unsafe grant expiry',x=>x.grant.expiresAtMs=Number.MAX_SAFE_INTEGER+1,'INVALID_GRANT');
denied('empty mint allowlist',x=>x.grant.allowedMints=[],'MINT_NOT_AUTHORIZED');
denied('duplicate authorized mint',x=>x.grant.allowedMints=['SOL','SOL'],'MINT_NOT_AUTHORIZED');
denied('malformed authorized mint',x=>x.grant.allowedMints=['SOL',null],'MINT_NOT_AUTHORIZED');
denied('overlong authorized mint allowlist',x=>x.grant.allowedMints=['SOL','A','B','C','D','E'],'MINT_NOT_AUTHORIZED');
denied('already overspent cap',x=>x.grant.spent=301,'INVALID_CAP');
denied('unsafe trade integer',x=>x.entry.amount=Number.MAX_SAFE_INTEGER+1,'INVALID_CAP');
denied('NaN trade amount',x=>x.entry.amount=NaN,'INVALID_CAP');
denied('malformed slot',x=>x.slots[0]=null,'INVALID_SLOTS');
test('exact cumulative cap is allowed by off-chain simulation only',()=>{
 const x=valid();x.grant.spent=250;x.entry.amount=50;
 assert.deepEqual(evaluateClimbxEntry(x),{allowed:true,reason:'POLICY_SIMULATION_ONLY'});
});
test('exact 30-minute boundary denied, one millisecond earlier allowed',()=>{
 const x=valid();x.nowMs=x.grant.expiresAtMs-ENTRY_CUTOFF_MS-1;
 assert.equal(evaluateClimbxEntry(x).allowed,true);
 x.nowMs++;
 assert.deepEqual(evaluateClimbxEntry(x),{allowed:false,reason:'ENTRY_CUTOFF'});
});
