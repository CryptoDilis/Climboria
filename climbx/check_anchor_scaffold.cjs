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
  if(!source.includes('now.checked_add(24 * 60 * 60)')||!source.includes('expires_at <= max_expiry'))return blocked('MISSING_24H_GRANT_CAP');
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
