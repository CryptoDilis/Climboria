import {probe} from './probe.mjs';
try{
  const result=await probe(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL,process.env.CLIMB_SOLANA_MAINNET_GENESIS_HASH);
  console.log(JSON.stringify(result,null,2));
}catch{
  // Never print URLs, raw provider response, stack or secrets.
  console.error('NO_GO: read-only candidate probe unavailable or rejected; inspect provider support and configured inputs privately.');
  process.exitCode=1;
}
