import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {normalizeChallenge,roleMessage,verifyRoster} from './role-control-evidence.mjs';
// Disposable keys generated in-memory only. Never used with public RPC or real assets.
const cast=(...args)=>execFileSync('cast',args,{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim();
const keys=Array.from({length:5},()=> '0x'+randomBytes(32).toString('hex'));
const roles=['founder','blockchain','game','security','operations'];
const now=1795820000;
const c={chainId:84532,testOnly:true,sourceSha:'a'.repeat(40),nonce:'b'.repeat(64),issuedAt:now-1,expiresAt:now+3600,owners:roles.map((role,i)=>({role,address:cast('wallet','address','--private-key',keys[i])}))};
const proof=roles.map((role,i)=>({role,signature:cast('wallet','sign','--private-key',keys[i],roleMessage(c,role))}));
test('five real local ECDSA signatures establish key control only',()=>{const result=verifyRoster(c,proof,now);assert.equal(result.status,'KEY_CONTROL_ONLY_NO_GO');assert.deepEqual(result.verifiedRoles,roles);assert.equal(result.remaining.length,5);});
test('reject missing and duplicated proofs',()=>{assert.throws(()=>verifyRoster(c,proof.slice(1),now));assert.throws(()=>verifyRoster(c,[proof[0],proof[0],...proof.slice(2)],now));});
test('reject changed nonce, candidate or roster',()=>{for(const x of [{...c,nonce:'c'.repeat(64)},{...c,sourceSha:'d'.repeat(40)},{...c,owners:c.owners.map((o,i)=>({...o,address:c.owners[(i+1)%5].address}))}])assert.throws(()=>verifyRoster(x,proof,now),/signature verification failed/);});
test('reject wrong signature and role swap',()=>{assert.throws(()=>verifyRoster(c,[{...proof[0],signature:proof[1].signature},...proof.slice(1)],now));assert.throws(()=>verifyRoster(c,[{...proof[0],role:proof[1].role},{...proof[1],role:proof[0].role},...proof.slice(2)],now));});
test('reject wrong chain, mainnet mode and expired/early evidence',()=>{for(const x of [{...c,chainId:8453},{...c,testOnly:false}])assert.throws(()=>verifyRoster(x,proof,now));for(const t of [c.issuedAt-1,c.expiresAt])assert.throws(()=>verifyRoster(c,proof,t));});
test('reject duplicate and known disposable addresses',()=>{for(const a of [c.owners[1].address,'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266','0x'+'0'.repeat(40)])assert.throws(()=>normalizeChallenge({...c,owners:c.owners.map((o,i)=>i===0?{...o,address:a}:o)}));});
test('reject unexpected fields, invalid window and unordered roles',()=>{for(const x of [{...c,extra:true},{...c,expiresAt:c.issuedAt+86401},{...c,owners:[c.owners[1],c.owners[0],...c.owners.slice(2)]}])assert.throws(()=>normalizeChallenge(x));});

import {verifyCustodyPlan} from './role-plan-correlation.mjs';
const addr=n=>'0x'+n.toString(16).padStart(40,'0');
const plan={schema:1,status:'REVIEW_ONLY_NO_GO',chain_id:84532,source_commit:c.sourceSha,safe:addr(100001),successor:addr(100002),owners:c.owners.map(o=>o.address.toLowerCase()),threshold:3,payload_sha256:'e'.repeat(64),expected_epoch:1,
 fields:{epoch:1,valid_after:now-10,deadline:now+1000,founder:addr(100003),distributor:addr(100004),guard:addr(100005),start:now+2000,gaming_wallet_monthly_cap:1000,quote:addr(100006),builder:addr(100007),lp_custody:addr(100008),tranche_cap:1000}};
const hashRaw=raw=>createHash('sha256').update(raw).digest('hex');
const input=(p=plan,ch=c,pr=proof)=>{
 const planRaw=Buffer.from(JSON.stringify(p)),challengeRaw=Buffer.from(JSON.stringify(ch)),proofsRaw=Buffer.from(JSON.stringify(pr));
 return {planRaw,planPin:hashRaw(planRaw),challengeRaw,challengePin:hashRaw(challengeRaw),proofsRaw,proofsPin:hashRaw(proofsRaw),now};
};
test('correlates existing actual local ECDSA proofs to exact issuance owner set without approval',()=>{
 const r=verifyCustodyPlan(input());
 assert.equal(r.status,'CUSTODY_KEY_CONTROL_PLAN_CORRELATION_NO_GO');
 assert.equal(r.testnet,'NO_GO');assert.equal(r.mainnet,'NO_GO');
 assert.deepEqual(r.verifiedRoles,roles);
 const reordered=verifyCustodyPlan(input({...plan,owners:[...plan.owners].reverse()}));
 assert.equal(reordered.rosterSha256,r.rosterSha256);
 assert.notEqual(reordered.planSha256,r.planSha256);
});
test('reject plan chain, source, threshold, status and roster substitution even with recalculated pins',()=>{
 for(const p of [{...plan,chain_id:8453},{...plan,source_commit:'f'.repeat(40)},{...plan,threshold:2},{...plan,status:'APPROVED'},{...plan,owners:[...plan.owners.slice(1),addr(100009)]},{...plan,owners:[...plan.owners.slice(1),plan.owners[1]]}])assert.throws(()=>verifyCustodyPlan(input(p)));
});
test('reject independently pinned file changes',()=>{
 for(const k of ['planPin','challengePin','proofsPin'])assert.throws(()=>verifyCustodyPlan({...input(),[k]:'d'.repeat(64)}),/pin mismatch/);
});
test('reject plan role overlap, stale window and malformed digest',()=>{
 for(const p of [{...plan,safe:plan.owners[0]},{...plan,fields:{...plan.fields,founder:plan.owners[0]}},{...plan,fields:{...plan.fields,deadline:now}},{...plan,payload_sha256:'0'.repeat(64)}])assert.throws(()=>verifyCustodyPlan(input(p)));
});
test('reject duplicate JSON names, unsafe numbers and alternate encoding despite matching raw pin',()=>{
 const base=input();
 for(const raw of [Buffer.from(base.planRaw.toString().replace('"threshold":3','"threshold":2,"threshold":3')),Buffer.from(JSON.stringify({...plan,expected_epoch:9007199254740992})),Buffer.concat([base.planRaw,Buffer.from('\n')])]){
  assert.throws(()=>verifyCustodyPlan({...base,planRaw:raw,planPin:hashRaw(raw)}),/noncanonical JSON|unsafe number/);
 }
});
test('reject substituted signatures or expired challenge even with recomputed proof pins',()=>{
 assert.throws(()=>verifyCustodyPlan(input(plan,c,[{...proof[0],signature:proof[1].signature},...proof.slice(1)])),/signature verification failed/);
 assert.throws(()=>verifyCustodyPlan({...input(),now:c.expiresAt}),/expired/);
});
