'use strict';
// CLIMBX Phase97: static audit for accidental simulation-as-execution consumers.
// Run: node climbx/audit_execution_boundary.cjs
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const EXEMPT=new Set(['audit_execution_boundary.cjs','audit_execution_boundary.test.cjs']);
function scanSource(files,readFile){
 const findings=[];
 for(const file of files){
  const source=readFile(file);
  if(typeof source!=='string')throw new TypeError('source must be string');
  if(/\b(?:evaluateClimbxEntry|evaluateOrder|authorizeBotExecution)\s*\(/.test(source)&&!/(?:authorization_policy_simulation|devnet_grant_state_simulation|execution_authorization_boundary)(?:\.test)?\.cjs$/.test(file)){
   findings.push({file,reason:'REVIEW_CALL_SITE'});
  }
  if(/\bmayExecute\s*[:=]\s*true\b/.test(source)&&!file.endsWith('.test.cjs'))findings.push({file,reason:'EXECUTABLE_FLAG'});
 }
 return findings;
}
function listSourceFiles(dir,base=dir){
 const files=[];
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.isSymbolicLink())continue; // Never traverse external trees.
  const full=path.join(dir,entry.name);
  if(entry.isDirectory()){files.push(...listSourceFiles(full,base));continue;}
  if(!entry.isFile()||(!entry.name.endsWith('.cjs')&&!entry.name.endsWith('.py')))continue;
  const relative=path.relative(base,full).split(path.sep).join('/');
  if(EXEMPT.has(relative))continue;
  files.push(relative);
 }
 return files.sort();
}
function auditDirectory(dir=root){
 const files=listSourceFiles(dir);
 return scanSource(files,name=>fs.readFileSync(path.join(dir,name),'utf8'));
}
if(require.main===module){
 const findings=auditDirectory();
 process.stdout.write(JSON.stringify({status:findings.length?'REVIEW_REQUIRED':'NO_MATCHING_CALL_SITES_IN_CLIMBX_CJS_PY',files:findings},null,2)+'\n');
 if(findings.length)process.exitCode=1;
}
module.exports={scanSource,auditDirectory,listSourceFiles};
