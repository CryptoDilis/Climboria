import test from 'node:test';
import assert from 'node:assert/strict';
import {BridgeTransferSimulator,TEST_ONLY_ATTESTATION as MOCK} from './transfer-simulator.mjs';

const S='1000000000000000';
function fresh(){return new BridgeTransferSimulator(S);}
test('empty simulator does not invent Base supply or transfer',()=>{
 const t=fresh(),s=t.snapshot();
 assert.equal(s.status,'OFFLINE_SIMULATION_ONLY_NO_LIVE_FUNDS');
 assert.equal(s.escrowLockedRaw,'0');
 assert.equal(s.wrappedBaseRaw,'0');
 assert.equal(s.economicallyClaimableRaw,S);
});
test('lock 100 CLIMB then simulated mint 100 CLIMB leaves one economic supply',()=>{
 const t=fresh();
 const pending=t.lock('solana:deposit:01','100000000');
 assert.equal(pending.pendingDepositRaw,'100000000');
 assert.equal(pending.wrappedBaseRaw,'0');
 const done=t.mint('solana:deposit:01',MOCK);
 assert.equal(done.escrowLockedRaw,done.wrappedBaseRaw);
 assert.equal(done.pendingDepositRaw,'0');
 assert.equal(done.economicallyClaimableRaw,S);
});
test('reverse burn and release returns original CLIMB without supply inflation',()=>{
 const t=fresh();
 t.lock('deposit01','100000000');
 t.mint('deposit01',MOCK);
 const pending=t.burn('withdraw01','25000000');
 assert.equal(pending.pendingWithdrawalRaw,'25000000');
 assert.equal(pending.wrappedBaseRaw,'75000000');
 const done=t.release('withdraw01',MOCK);
 assert.equal(done.escrowLockedRaw,'75000000');
 assert.equal(done.wrappedBaseRaw,'75000000');
 assert.equal(done.economicallyClaimableRaw,S);
});
test('pending lock and pending burn each reduce immediately claimable total but not original supply',()=>{
 const t=fresh();
 const first=t.lock('deposit01','300000000');
 assert.equal(first.economicallyClaimableRaw,'999999700000000');
 t.mint('deposit01',MOCK);
 assert.equal(t.snapshot().economicallyClaimableRaw,S);
 const later=t.burn('withdraw01','150000000');
 assert.equal(later.economicallyClaimableRaw,'999999850000000');
 assert.equal(later.originalSupplyRaw,S);
});
test('duplicate lock ID, cross-direction ID and replayed mint reject',()=>{
 const t=fresh();
 t.lock('a','100');
 assert.throws(()=>t.lock('a','100'),/duplicate|replayed/);
 t.mint('a',MOCK);
 assert.throws(()=>t.mint('a',MOCK),/unknown|already/);
 assert.throws(()=>t.burn('a','10'),/duplicate|replayed/);
 assert.equal(t.snapshot().wrappedBaseRaw,'100');
});
test('burn and release replay reject, without unlocking twice',()=>{
 const t=fresh();
 t.lock('d','100');
 t.mint('d',MOCK);
 t.burn('w','70');
 t.release('w',MOCK);
 assert.throws(()=>t.release('w',MOCK),/unknown|already/);
 assert.equal(t.snapshot().escrowLockedRaw,'30');
});
test('unknown messages cannot mint or release',()=>{
 const t=fresh();
 assert.throws(()=>t.mint('faked',MOCK),/unknown|already/);
 assert.throws(()=>t.release('faked',MOCK),/unknown|already/);
 assert.equal(t.snapshot().wrappedBaseRaw,'0');
});
test('no transaction happens when simulated proof missing',()=>{
 const t=fresh();
 t.lock('d','100');
 assert.throws(()=>t.mint('d','forged'),/attestation/);
 assert.throws(()=>t.mint('d'),/attestation/);
 assert.equal(t.snapshot().pendingDepositRaw,'100');
 t.mint('d',MOCK);t.burn('w','50');
 assert.throws(()=>t.release('w','forged'),/attestation/);
 assert.equal(t.snapshot().pendingWithdrawalRaw,'50');
});
test('cannot release without corresponding burn',()=>{
 const t=fresh();
 t.lock('d','100');t.mint('d',MOCK);
 assert.throws(()=>t.release('unburned',MOCK),/unknown|already/);
 assert.equal(t.snapshot().escrowLockedRaw,'100');
});
test('cannot burn more than wrapped token supply',()=>{
 const t=fresh();t.lock('d','100');
 assert.throws(()=>t.burn('w','1'),/burn exceeds/);
 t.mint('d',MOCK);
 assert.throws(()=>t.burn('w','101'),/burn exceeds/);
 assert.equal(t.snapshot().wrappedBaseRaw,'100');
});
test('cannot lock more than original supply',()=>{
 const t=fresh();
 assert.throws(()=>t.lock('overspend','1000000000000001'),/exceeds original/);
 assert.equal(t.snapshot().escrowLockedRaw,'0');
});
test('reject zero, negative, noninteger or out-of-range amounts',()=>{
 const t=fresh();
 for(const value of ['0','-1','1.1','1e4','01',3, null,'18446744073709551616']){
  assert.throws(()=>t.lock('bad',value));
 }
 assert.equal(t.snapshot().uniqueMessageCount,0);
});
test('reject invalid message identifiers without mutation',()=>{
 const t=fresh();
 for(const id of ['','has spaces','a/b','a'.repeat(121),null]){
  assert.throws(()=>t.lock(id,'100'),/message identifier/);
 }
 assert.equal(t.snapshot().uniqueMessageCount,0);
});
test('out-of-order distinct deposits reconcile after simulated attested mint',()=>{
 const t=fresh();
 t.lock('first','900');
 t.lock('second','100');
 t.mint('second',MOCK);
 let s=t.snapshot();
 assert.equal(s.escrowLockedRaw,'1000');
 assert.equal(s.wrappedBaseRaw,'100');
 assert.equal(s.pendingDepositRaw,'900');
 t.mint('first',MOCK);
 s=t.snapshot();
 assert.equal(s.wrappedBaseRaw,'1000');
 assert.equal(s.pendingDepositRaw,'0');
 assert.equal(s.economicallyClaimableRaw,S);
});
test('out-of-order distinct withdrawals reconcile after simulated attested unlock',()=>{
 const t=fresh();
 t.lock('deposit','1000');t.mint('deposit',MOCK);
 t.burn('withdraw1','200');t.burn('withdraw2','300');
 t.release('withdraw2',MOCK);
 let s=t.snapshot();
 assert.equal(s.pendingWithdrawalRaw,'200');
 assert.equal(s.escrowLockedRaw,'700');
 assert.equal(s.wrappedBaseRaw,'500');
 t.release('withdraw1',MOCK);
 s=t.snapshot();
 assert.equal(s.escrowLockedRaw,'500');
 assert.equal(s.wrappedBaseRaw,'500');
 assert.equal(s.pendingWithdrawalRaw,'0');
});
test('mixed pending lock and pending withdrawal maintain exact in-flight accounting',()=>{
 const t=fresh();
 t.lock('d1','1000');t.mint('d1',MOCK);
 t.burn('w1','400');
 t.lock('d2','200');
 const s=t.snapshot();
 assert.equal(BigInt(s.escrowLockedRaw)-BigInt(s.wrappedBaseRaw),BigInt(s.pendingDepositRaw)+BigInt(s.pendingWithdrawalRaw));
 assert.equal(s.pendingDepositRaw,'200');
 assert.equal(s.pendingWithdrawalRaw,'400');
});
test('zero supply source is refused',()=>{
 assert.throws(()=>new BridgeTransferSimulator('0'),/supply cannot be zero/);
});
