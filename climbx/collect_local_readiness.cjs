'use strict';
// Phase116: fail-closed, read-only local development readiness collection.
// Local command output and loopback RPC health do NOT authorize any trade.
const {probeAll}=require('./probe_solana_toolchain.cjs');
const {probeLocalValidator}=require('./local_validator_rpc_probe.cjs');
const invalid=()=>({readyForLocalDevelopment:false,mayExecute:false,toolchain:[],rpc:{healthy:false,mayExecute:false,reason:'INVALID_READINESS_INPUT'}});
async function collectLocalReadiness(options={}){
 try{
  if(options===null||typeof options!=='object'||Array.isArray(options))return invalid();
  const {run,probeRpc=probeLocalValidator}=options;
  if((run!==undefined&&typeof run!=='function')||typeof probeRpc!=='function')return invalid();
  const toolchain=probeAll(run);
  const toolchainReady=toolchain.every(item=>item.available===true);
  let rpc={healthy:false,mayExecute:false,reason:'TOOLCHAIN_INCOMPLETE'};
  if(toolchainReady){
   try{rpc=await probeRpc()}catch{rpc={healthy:false,mayExecute:false,reason:'RPC_PROBE_ERROR'}}
  }
  const readyForLocalDevelopment=toolchainReady&&rpc!==null&&typeof rpc==='object'&&rpc.healthy===true&&rpc.mayExecute===false;
  return {readyForLocalDevelopment,mayExecute:false,toolchain,rpc};
 }catch{return invalid()}
}
if(require.main===module){
 collectLocalReadiness().then(result=>{
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.readyForLocalDevelopment)process.exitCode=1;
 }).catch(()=>{process.stderr.write('Local readiness probe failed closed\n');process.exitCode=1});
}
module.exports={collectLocalReadiness};
