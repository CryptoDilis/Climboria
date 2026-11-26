import {observeRaw} from './raw-observe.mjs';
try{const r=await observeRaw(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL,process.env.CLIMB_SOLANA_MAINNET_GENESIS_HASH);console.log(JSON.stringify(r,null,2));}
catch(e){const m=e instanceof Error?e.message:'';console.error(/^NO_GO: RAW_[A-Z_]+$/.test(m)?m:'NO_GO: raw candidate observation rejected; inspect inputs privately');process.exitCode=1;}
