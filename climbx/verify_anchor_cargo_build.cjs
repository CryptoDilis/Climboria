'use strict';
// Phase121: optional, local-only Cargo compilation verification.
// No install, deploy, key generation, signing, validator startup or trading.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const manifest=path.join(__dirname,'programs/climbx-authorization/Cargo.toml');
function verifyCargoBuild(run=spawnSync){
 const deny=(reason)=>({compiled:false,mayExecute:false,safeForDeployment:false,reason});
 try{
  if(typeof run!=='function')return deny('INVALID_RUNNER');
  const result=run('cargo',['check','--locked','--offline','--manifest-path',manifest],{
   cwd:__dirname,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,windowsHide:true,
   env:{...process.env,CARGO_NET_OFFLINE:'true'}
  });
  if(result?.error||result?.signal)return deny('CARGO_CHECK_UNAVAILABLE');
  if(result?.status!==0)return deny('CARGO_CHECK_FAILED');
  return {compiled:true,mayExecute:false,safeForDeployment:false,reason:'LOCAL_CARGO_CHECK_ONLY'};
 }catch{return deny('CARGO_CHECK_UNAVAILABLE')}
}
if(require.main===module){
 const result=verifyCargoBuild();
 process.stdout.write(JSON.stringify(result)+'\n');
 if(!result.compiled)process.exitCode=1;
}
module.exports={verifyCargoBuild};
