'use strict';
// Phase108: read-only toolchain availability probe. No install, network, keys or validator startup.
const {spawnSync}=require('node:child_process');
const TOOLS=['rustc','cargo','solana','solana-test-validator','anchor'];
function probeTool(name,run=spawnSync){
 try{
  const result=run(name,['--version'],{encoding:'utf8',timeout:10000,windowsHide:true});
  const output=String(result.stdout||result.stderr||'').trim().split(/\r?\n/)[0];
  return {name,available:!result.error&&result.status===0,version:result.status===0?output:null};
 }catch{return {name,available:false,version:null};}
}
function probeAll(run=spawnSync){return TOOLS.map(name=>probeTool(name,run));}
if(require.main===module){
 const tools=probeAll();
 const ready=tools.every(tool=>tool.available);
 process.stdout.write(JSON.stringify({readyForLocalValidatorDevelopment:ready,toolchain:tools,simulationOnly:true,mayExecute:false},null,2)+'\n');
 if(!ready)process.exitCode=1;
}
module.exports={TOOLS,probeTool,probeAll};
