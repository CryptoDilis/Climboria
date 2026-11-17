'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {checkScaffold}=require('./check_anchor_scaffold.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'programs/climbx-authorization/src/lib.rs'),'utf8');
const manifest=fs.readFileSync(require('node:path').join(__dirname,'programs/climbx-authorization/Cargo.toml'),'utf8');
function mockRead(src=source,toml=manifest){return p=>p.endsWith('lib.rs')?src:toml}
test('grant-only source is explicitly uncompiled and never executable',()=>{
 const result=checkScaffold();
 assert.deepEqual(result,{safeForDeployment:false,compiled:false,mayExecute:false,reason:'UNCOMPILED_GRANT_ONLY_SCAFFOLD'});
});
test('rejects unexpected execute instruction',()=>{
 const result=checkScaffold({read:mockRead(source+'\npub fn execute_swap() {}')});
 assert.equal(result.reason,'UNREVIEWED_EXECUTION_INSTRUCTION');
});
test('rejects unreviewed program id changes',()=>{
 const result=checkScaffold({read:mockRead(source.replace('11111111111111111111111111111111','22222222222222222222222222222222'))});
 assert.equal(result.reason,'UNREVIEWED_PROGRAM_ID');
});
test('rejects missing owner grant lifecycle',()=>{
 const result=checkScaffold({read:mockRead(source.replace('pub fn revoke_grant','pub fn renamed_grant'))});
 assert.equal(result.reason,'MISSING_GRANT_LIFECYCLE');
});
test('rejects unpinned Anchor dependency',()=>{
 const result=checkScaffold({read:mockRead(source,manifest.replace('0.30.1','*'))});
 assert.equal(result.reason,'UNPINNED_ANCHOR_VERSION');
});
test('unreadable scaffold fails closed',()=>{
 const result=checkScaffold({read:()=>{throw Error('missing')}});
 assert.equal(result.reason,'INVALID_SCAFFOLD');
});


test('rejects scaffold without 24-hour maximum grant expiry',()=>{
 const result=checkScaffold({read:mockRead(source.replace('expires_at <= max_expiry','expires_at > max_expiry'))});
 assert.equal(result.reason,'MISSING_24H_GRANT_CAP');
});
test('rejects scaffold without overflow-checked expiry bound',()=>{
 const result=checkScaffold({read:mockRead(source.replace('now.checked_add(24 * 60 * 60)','now + 24 * 60 * 60'))});
 assert.equal(result.reason,'MISSING_24H_GRANT_CAP');
});


test('rejects missing owner signer on grant creation',()=>{
 const result=checkScaffold({read:mockRead(source.replaceAll("pub owner: Signer<'info>","pub owner: UncheckedAccount<'info>"))});
 assert.equal(result.reason,'MISSING_CREATE_OWNER_SIGNATURE');
});
test('rejects removed revoke owner binding',()=>{
 const result=checkScaffold({read:mockRead(source.replace('has_one = owner','constraint = true'))});
 assert.equal(result.reason,'MISSING_REVOKE_OWNER_BINDING');
});
test('rejects changed grant creation PDA seeds',()=>{
 const result=checkScaffold({read:mockRead(source.replace('seeds = [b"grant", owner.key().as_ref(), &grant_id.to_le_bytes()]','seeds = [b"grant", &grant_id.to_le_bytes()]'))});
 assert.equal(result.reason,'MISSING_CREATE_GRANT_PDA');
});
test('rejects changed revoke PDA seeds',()=>{
 const result=checkScaffold({read:mockRead(source.replace('seeds = [b"grant", owner.key().as_ref(), &grant.grant_id.to_le_bytes()]','seeds = [b"grant", &grant.grant_id.to_le_bytes()]'))});
 assert.equal(result.reason,'MISSING_REVOKE_GRANT_PDA');
});

test('rejects missing owner signer on grant revocation even when create signer remains',()=>{
 const modified=source.replace(/(pub struct RevokeGrant<'info>\s*\{[\s\S]*?)pub owner: Signer<'info>/, "$1pub owner: UncheckedAccount<'info>");
 const result=checkScaffold({read:mockRead(modified)});
 assert.equal(result.reason,'MISSING_REVOKE_OWNER_SIGNATURE');
});

test('rejects tightening that bypasses owner-bound grant context',()=>{
 const modified=source.replace('ctx: Context<RevokeGrant>,\n        new_per_order_cap','ctx: Context<CreateGrant>,\n        new_per_order_cap');
 assert.equal(checkScaffold({read:mockRead(modified)}).reason,'UNSAFE_GRANT_TIGHTENING');
});
test('rejects tightening that skips policy validation',()=>{
 const modified=source.replace('validate_tightening(\n            grant,','unverified_tightening(\n            grant,');
 assert.equal(checkScaffold({read:mockRead(modified)}).reason,'UNSAFE_GRANT_TIGHTENING');
});
test('rejects tightening that allows cap expansion',()=>{
 const modified=source.replace('per_order <= grant.per_order_cap','per_order >= grant.per_order_cap');
 assert.equal(checkScaffold({read:mockRead(modified)}).reason,'UNSAFE_GRANT_TIGHTENING');
});
test('rejects tightening that ignores spent balance',()=>{
 const modified=source.replace('cumulative >= grant.spent','cumulative >= 0');
 assert.equal(checkScaffold({read:mockRead(modified)}).reason,'UNSAFE_GRANT_TIGHTENING');
});
test('rejects tightening that extends authorization expiry',()=>{
 const modified=source.replace('expiry <= grant.expires_at','expiry >= grant.expires_at');
 assert.equal(checkScaffold({read:mockRead(modified)}).reason,'UNSAFE_GRANT_TIGHTENING');
});
