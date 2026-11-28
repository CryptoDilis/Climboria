'use strict';
// Phase120: structural fail-closed checks only. NOT a Rust compiler, security audit, or validator test.
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'programs/climbx-authorization');
function checkScaffold({read=fs.readFileSync}={}){
 const blocked=reason=>({safeForDeployment:false,compiled:false,mayExecute:false,reason});
 try{
  const source=read(path.join(root,'src/lib.rs'),'utf8');
  const manifest=read(path.join(root,'Cargo.toml'),'utf8');
  if(typeof source!=='string'||typeof manifest!=='string')return blocked('INVALID_SCAFFOLD');
  if(!manifest.includes('anchor-lang = "0.30.1"'))return blocked('UNPINNED_ANCHOR_VERSION');
  if(!source.includes('declare_id!("11111111111111111111111111111111")'))return blocked('UNREVIEWED_PROGRAM_ID');
  if(!/pub fn create_grant\s*\(/.test(source)||!/pub fn revoke_grant\s*\(/.test(source))return blocked('MISSING_GRANT_LIFECYCLE');
  // Structural guard only: not a substitute for Anchor account validation or signed validator tests.
  const createAccounts=source.match(/pub struct CreateGrant<'info>\s*\{([\s\S]*?)\n\}/)?.[1];
  const revokeAccounts=source.match(/pub struct RevokeGrant<'info>\s*\{([\s\S]*?)\n\}/)?.[1];
  if(!createAccounts||!/pub owner:\s*Signer<'info>/.test(createAccounts))return blocked('MISSING_CREATE_OWNER_SIGNATURE');
  if(!revokeAccounts||!/pub owner:\s*Signer<'info>/.test(revokeAccounts))return blocked('MISSING_REVOKE_OWNER_SIGNATURE');
  if(!source.includes('has_one = owner'))return blocked('MISSING_REVOKE_OWNER_BINDING');
  if(!source.includes('seeds = [b"grant", owner.key().as_ref(), &grant_id.to_le_bytes()]'))return blocked('MISSING_CREATE_GRANT_PDA');
  if(!source.includes('seeds = [b"grant", owner.key().as_ref(), &grant.grant_id.to_le_bytes()]'))return blocked('MISSING_REVOKE_GRANT_PDA');
  if(!source.includes('now.checked_add(24 * 60 * 60)')||!source.includes('expires_at <= max_expiry'))return blocked('MISSING_24H_GRANT_CAP');
  // The tightening instruction must remain owner-bound and never bypass the policy.
  const tighten=source.match(/pub fn tighten_grant\s*\(([\s\S]*?)\n    \}/)?.[1];
  if(!tighten || !/ctx:\s*Context<RevokeGrant>/.test(tighten) ||
     !/validate_tightening\s*\(/.test(tighten))return blocked('UNSAFE_GRANT_TIGHTENING');
  const policy=source.match(/fn validate_tightening\s*\(([\s\S]*?)\n\}/)?.[1];
  if(!policy || !policy.includes('!grant.revoked') ||
     !policy.includes('per_order <= grant.per_order_cap') ||
     !policy.includes('cumulative >= grant.spent') ||
     !policy.includes('cumulative <= grant.cumulative_cap') ||
     !policy.includes('expiry <= grant.expires_at'))return blocked('UNSAFE_GRANT_TIGHTENING');
  if(/pub fn (?:execute|swap|trade|withdraw|transfer)\w*\s*\(/.test(source))return blocked('UNREVIEWED_EXECUTION_INSTRUCTION');
  return blocked('UNCOMPILED_GRANT_ONLY_SCAFFOLD');
 }catch{return blocked('INVALID_SCAFFOLD')}
}
if(require.main===module){
 const result=checkScaffold();
 process.stdout.write(JSON.stringify(result)+'\n');
 process.exitCode=result.reason==='UNCOMPILED_GRANT_ONLY_SCAFFOLD'?0:1;
}
module.exports={checkScaffold};
