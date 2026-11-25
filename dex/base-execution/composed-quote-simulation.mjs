// Explicitly authorized read-only simulation of the narrow four-action candidate.
// Caller-supplied state and review are not authenticated by this wrapper.
import {inspectFourActionQuote} from "./four-action-composition-policy.mjs";
import {corroborateBaseFirmQuoteSimulation} from "./firm-quote-cross-rpc-simulation.mjs";
import {BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
export async function observeComposedBaseQuoteSimulation(input,quote,contractPolicy,review,state,{
 authorized=false,referenceBlock,primaryRpcUrl,secondaryRpcUrl,simulationGasLimit,fetchImpl,signal
}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true)throw Error("Explicit read-only simulation authorization required");
 signal?.throwIfAborted?.();
 // Pin private copies before asynchronous transport; never return or log quote calldata.
 const snapshot=structuredClone({input,quote,contractPolicy,review,state,referenceBlock});
 const a=snapshot.referenceBlock;
 if(!a||typeof a.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,10}$/.test(a.block)||typeof a.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(a.hash)||a.block!==snapshot.review?.reviewedBlockNumber||a.hash!==snapshot.review?.reviewedBlockHash||a.block!==snapshot.state?.blockNumber||a.hash!==snapshot.state?.blockHash)throw Error("Simulation and reviewed state block mismatch");
 const q=snapshot.quote;
 if(typeof q?.blockNumber!=="string"||!/^[1-9][0-9]{0,19}$/.test(q.blockNumber)||BigInt(q.blockNumber)!==BigInt(a.block))throw Error("Provider reported block mismatch");
 if(q.issues?.allowance!==null||q.issues?.balance!==null)throw Error("Unfunded or unapproved simulation candidate");
 const composition=inspectFourActionQuote(snapshot.input,q,snapshot.contractPolicy,snapshot.review,snapshot.state);
 if(composition.executable!==false||composition.blockHash!==a.hash)throw Error("Unreviewed composition");
 const evidence=await corroborateBaseFirmQuoteSimulation(snapshot.input,q,snapshot.contractPolicy,{
  authorized:true,referenceBlock:a,primaryRpcUrl,secondaryRpcUrl,simulationGasLimit,fetchImpl,signal
 });
 if(evidence.block!==a.block||evidence.blockHash!==a.hash||evidence.executable!==false||evidence.twoHostsAgreed!==true)throw Error("Simulation evidence mismatch");
 return Object.freeze({...evidence,offlineCompositionPassed:true,nominalSellFeeUpperBound:composition.nominalSellFeeUpperBound,stateAuthenticated:false,actualQuoteVerified:false,feeTransfersVerified:false,balanceDeltasVerified:false,executionReady:false,executable:false});
}
