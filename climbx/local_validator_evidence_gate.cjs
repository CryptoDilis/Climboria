'use strict';
// Phase110: evidence validation only. Never starts a validator or enables execution.
const REQUIRED=['rustc','cargo','solana','solana-test-validator','anchor'];
// Caller-provided evidence can only be a checklist signal, never independently verified proof.
function checkLocalValidatorEvidence(input){
 const deny=reason=>({ready:false,mayExecute:false,reason});
 if(!input||typeof input!=='object'||Array.isArray(input))return deny('INVALID_EVIDENCE');
 try{
  if(input.simulationOnly!==false)return deny('SIMULATION_EVIDENCE');
  if(!Array.isArray(input.toolchain)||input.toolchain.length!==REQUIRED.length)return deny('INCOMPLETE_TOOLCHAIN');
  const seen=new Set();
  for(const tool of input.toolchain){
   if(!tool||typeof tool!=='object'||Array.isArray(tool)||!REQUIRED.includes(tool.name)||seen.has(tool.name)||tool.available!==true||typeof tool.version!=='string'||!tool.version.trim())return deny('INVALID_TOOLCHAIN');
   seen.add(tool.name);
  }
  if(seen.size!==REQUIRED.length)return deny('INCOMPLETE_TOOLCHAIN');
  if(input.validator?.started!==true||input.validator?.rpcHealthy!==true||input.validator?.disposableKeysOnly!==true)return deny('VALIDATOR_NOT_VERIFIED');
  if(input.validator?.source!=='LOCAL_PROBE')return deny('UNVERIFIED_VALIDATOR_SOURCE');
  // Toolchain and validator evidence is NOT program authorization or trade permission.
  return {ready:true,mayExecute:false,reason:'LOCAL_VALIDATOR_EVIDENCE_ONLY'};
 }catch{return deny('INVALID_EVIDENCE');}
}
module.exports={REQUIRED,checkLocalValidatorEvidence};
