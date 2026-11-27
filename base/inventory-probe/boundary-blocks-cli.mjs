import {observeBoundaryBlocks,boundaryFailureCode} from './boundary-blocks.mjs';
try{console.log(JSON.stringify(await observeBoundaryBlocks(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL),null,2));}
catch(e){console.error('NO_GO: boundary block evidence unavailable or inconsistent ['+boundaryFailureCode(e)+']');process.exitCode=1;}
