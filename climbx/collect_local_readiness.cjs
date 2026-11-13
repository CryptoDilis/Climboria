'use strict';
// Phase114: independently run local tool version commands and localhost RPC getHealth.
// This does NOT start a validator, prove its identity, deploy a program, or authorize trading.
const {probeAll}=require('./probe_solana_toolchain.cjs');
const {probeLocalValidator}=require('./local_validator_rpc_probe.cjs');
async function collectLocalReadiness({run,probeRpc=probeLocalValidator}={}){
 const toolchain=probeAll(run);
 const toolchainReady=toolchain.every(item=>item.available);
 let rpc={healthy:false,mayExecute:false,reason:'TOOLCHAIN_INCOMPLETE'};
 if(toolchainReady){
  try{rpc=await probeRpc()}catch{rpc={healthy:false,mayExecute:false,reason:'RPC_PROBE_ERROR'}}
 }
 const readyForLocalDevelopment=toolchainReady&&rpc?.healthy===true&&rpc?.mayExecute===false;
 return {readyForLocalDevelopment,mayExecute:false,toolchain,rpc};
}
if(require.main===module){
 collectLocalReadiness().then(result=>{
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.readyForLocalDevelopment)process.exitCode=1;
 }).catch(()=>{process.stderr.write('Local readiness probe failed closed\n');process.exitCode=1});
}
module.exports={collectLocalReadiness};
