import {collectRawInventoryCandidate} from './legacy-raw-inventory-collector.mjs';
try{
 const result=await collectRawInventoryCandidate(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL,
  {expectedGenesis:process.env.CLIMB_SOLANA_MAINNET_GENESIS_HASH});
 console.log(JSON.stringify(result,null,2));
}catch{
 // Never emit transport errors, URLs, credentials or provider response bodies.
 console.error('NO_GO: raw inventory candidate unavailable or inconsistent');
 process.exitCode=1;
}
