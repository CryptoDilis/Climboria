// Read-only funded simulation preflight. No approval, signing or execution.
import {normalizeExecutionIntent,BASE_EXECUTION_ENABLED} from "./intent-policy.mjs";
import {BASE_ALLOWANCE_HOLDER} from "./allowance-policy.mjs";
import {corroborateBaseAllowanceObservation} from "./dual-rpc-observation.mjs";
import {inspectFourActionQuote} from "./four-action-composition-policy.mjs";
import {observeComposedBaseQuoteSimulation} from "./composed-quote-simulation.mjs";
const primary="https://mainnet.base.org",secondary="https://base-rpc.publicnode.com";
const hash=v=>typeof v==="string"&&/^[0-9a-f]{64}$/.test(v)&&!/^0{64}$/.test(v);
function raw(v){if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,77})$/.test(v)||BigInt(v)>=(1n<<256n))throw Error("Invalid observed amount");return BigInt(v);}
export function inspectFundedSimulationEvidence(input,review,anchor,evidence){
 const intent=normalizeExecutionIntent(input);
 if(!anchor||typeof anchor.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,10}$/.test(anchor.block)||typeof anchor.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(anchor.hash)||/^0x0{64}$/.test(anchor.hash))throw Error("Invalid funded simulation anchor");
 if(!hash(review?.reviewedSellTokenCodeSha256)||evidence?.observedSellTokenCodeSha256!==review.reviewedSellTokenCodeSha256)throw Error("Reviewed sell token runtime required");
 if(evidence.chainId!==8453||evidence.executable!==false||evidence.observationOnly!==true||evidence.readOnly!==true||evidence.matchedAcrossDistinctRpcHosts!==true||evidence.providerIndependenceVerified!==false||evidence.observedBlock!==anchor.block||evidence.observedBlockHash!==anchor.hash||evidence.sellToken!==intent.sellToken||evidence.spender!==BASE_ALLOWANCE_HOLDER||evidence.requestedSellAmount!==intent.sellAmount)throw Error("Funded simulation evidence identity mismatch");
 const requested=raw(intent.sellAmount);
 if(raw(evidence.observedBalance)<requested||raw(evidence.observedAllowance)!==requested||evidence.next!=="exact-allowance-observed"||evidence.proposedApprovalAmount!==null)throw Error("Exact funded allowance observation required");
 return Object.freeze({observedBlock:anchor.block,observedBlockHash:anchor.hash,observedBalance:evidence.observedBalance,observedAllowance:evidence.observedAllowance,readOnly:true,observationOnly:true,executable:false,stateAuthenticated:false});
}
export async function observeFundedComposedSimulation(input,quote,contractPolicy,review,state,{authorized=false,referenceBlock,simulationGasLimit,fetchImpl,signal}={}){
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true)throw Error("Explicit read-only funded simulation authorization required");
 signal?.throwIfAborted?.();
 const s=structuredClone({input,quote,contractPolicy,review,state,referenceBlock}),a=s.referenceBlock;
 if(!a||typeof a.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,10}$/.test(a.block)||typeof a.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(a.hash)||/^0x0{64}$/.test(a.hash)||a.block!==s.review?.reviewedBlockNumber||a.hash!==s.review?.reviewedBlockHash||a.block!==s.state?.blockNumber||a.hash!==s.state?.blockHash||!hash(s.review?.reviewedSellTokenCodeSha256))throw Error("Independent funded simulation review required");
 if(typeof s.quote?.blockNumber!=="string"||!/^[1-9][0-9]{0,19}$/.test(s.quote.blockNumber)||BigInt(s.quote.blockNumber)!==BigInt(a.block)||s.quote.issues?.allowance!==null||s.quote.issues?.balance!==null)throw Error("Unfunded or mismatched quote candidate");
 inspectFourActionQuote(s.input,s.quote,s.contractPolicy,s.review,s.state);
 const evidence=await corroborateBaseAllowanceObservation(s.input,{primaryRpcUrl:primary,secondaryRpcUrl:secondary,referenceBlock:{number:a.block,hash:a.hash},fetchImpl,signal});
 inspectFundedSimulationEvidence(s.input,s.review,a,evidence);
 const sim=await observeComposedBaseQuoteSimulation(s.input,s.quote,s.contractPolicy,s.review,s.state,{authorized:true,referenceBlock:a,primaryRpcUrl:primary,secondaryRpcUrl:secondary,simulationGasLimit,fetchImpl,signal});
 return Object.freeze({...sim,exactAllowanceAndBalanceObserved:true,sellTokenRuntimeFingerprintMatched:true,providerIndependenceVerified:false,stateAuthenticated:false,tokenTransferSemanticsVerified:false,balanceDeltasVerified:false,executionReady:false,executable:false});
}
