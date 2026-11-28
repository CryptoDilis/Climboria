import {observeBoundaryBlocks,observeBoundarySignatures,boundaryFailureCode,boundaryVersionHint} from './boundary-blocks.mjs';
const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--signatures-only')){
 console.error('NO_GO: unsupported diagnostic mode');process.exitCode=1;
}else{
 try{
  const observe=args.length===1?observeBoundarySignatures:observeBoundaryBlocks;
  console.log(JSON.stringify(await observe(process.env.CLIMB_SOLANA_RPC_A_URL,process.env.CLIMB_SOLANA_RPC_B_URL),null,2));
 }catch(e){const hint=boundaryVersionHint(e);console.error('NO_GO: boundary block evidence unavailable or inconsistent ['+boundaryFailureCode(e)+']'+(hint===null?'':' [reported version hint '+hint+']'));process.exitCode=1;}
}
