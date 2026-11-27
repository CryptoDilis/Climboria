import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
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
