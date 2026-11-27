import {observeHistoricalBracket,bracketFailureCode} from './historical-bracket.mjs';
try{
 console.log(JSON.stringify(await observeHistoricalBracket(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL),null,2));
}catch(error){
 console.error('NO_GO: historical block bracket unavailable or inconsistent ['+bracketFailureCode(error)+']');
 process.exitCode=1;
}
