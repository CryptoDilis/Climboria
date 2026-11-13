'use strict';
// CLIMBX devnet readiness gate. Informational only; never authorizes trading.
// Run locally: node climbx/devnet_toolchain_check.cjs
const {spawnSync}=require('node:child_process');
const REQUIRED=['rustc','cargo','solana','solana-test-validator','anchor'];
function evaluateToolchain(probe){
 const missing=REQUIRED.filter(name=>!probe[name]||probe[name].ok!==true);
 return {status:missing.length?'BLOCKED':'TOOLCHAIN_PRESENT_NOT_CHAIN_VERIFIED',missing,tools:probe,realFundsAllowed:false};
}
function checkToolchain(run=spawnSync){
 const probe={};
 for(const command of REQUIRED){
  try{
   const result=run(command,['--version'],{encoding:'utf8',timeout:3000,shell:false});
   probe[command]={ok:result.status===0&&!result.error,version:result.status===0?String(result.stdout||result.stderr||'').trim().slice(0,160):null};
  }catch{probe[command]={ok:false,version:null};}
 }
 return evaluateToolchain(probe);
}
if(require.main===module){
 const result=checkToolchain();
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(result.status==='BLOCKED')process.exitCode=1;
}
module.exports={REQUIRED,evaluateToolchain,checkToolchain};
