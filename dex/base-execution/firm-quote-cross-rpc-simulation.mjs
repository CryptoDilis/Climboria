/**
 * Two-host read-only Base firm quote simulation agreement.
 * A comparison of successful eth_call results is not execution permission,
 * L1 finality, ERC20 semantics, route approval or wallet consent.
 */
import {observeBaseFirmQuoteSimulation} from "./firm-quote-simulation.mjs";
import {validatePublicBaseRpcUrl} from "./allowance-observation.mjs";
const FIELDS=Object.freeze([
 "chainId","provider","simulationObserved","block","blockHash",
 "candidateOnly","observationOnly","executable","executionReady","readOnly",
 "nestedActionArgumentsVerified","independentRpcVerified","walletAuthorizationVerified",
 "receiptFinalityVerified","simulationGasCap","requestedSellAmount","providerMinBuyAmount",
 "simulationResultSha256"
]);
export async function corroborateBaseFirmQuoteSimulation(intent,quote,policy,{
 authorized=false,referenceBlock,simulationGasLimit="1200000",
 primaryRpcUrl="https://mainnet.base.org",secondaryRpcUrl,fetchImpl,signal,
 simulationImpl=observeBaseFirmQuoteSimulation
}={}){
 if(authorized!==true)throw Error("Two-RPC Base preflight requires explicit read-only authorization");
 // Validate both endpoints before any traffic or candidate RPC.
 const primary=validatePublicBaseRpcUrl(primaryRpcUrl);
 const secondary=validatePublicBaseRpcUrl(secondaryRpcUrl);
 if(new URL(primary).hostname===new URL(secondary).hostname)throw Error("Distinct public RPC hosts required");
 signal?.throwIfAborted?.();
 const opts={authorized:true,referenceBlock,simulationGasLimit,fetchImpl,signal};
 const first=await simulationImpl(intent,quote,policy,{...opts,publicRpcUrl:primary});
 if(!first||first.chainId!==8453||first.executable!==false||first.executionReady!==false||
    first.observationOnly!==true||first.simulationObserved!==true||
    first.readOnly!==true||first.nestedActionArgumentsVerified!==false||
    typeof first.simulationResultSha256!=="string"||!/^[a-f0-9]{64}$/.test(first.simulationResultSha256))
  throw Error("Untrusted primary simulation evidence");
 signal?.throwIfAborted?.();
 const second=await simulationImpl(intent,quote,policy,{...opts,publicRpcUrl:secondary});
 if(!second||second.chainId!==8453||second.executable!==false||second.executionReady!==false||
    second.observationOnly!==true||second.simulationObserved!==true||
    second.readOnly!==true||second.nestedActionArgumentsVerified!==false||
    typeof second.simulationResultSha256!=="string"||!/^[a-f0-9]{64}$/.test(second.simulationResultSha256))
  throw Error("Untrusted secondary simulation evidence");
 for(const field of FIELDS)if(first[field]!==second[field])
  throw Error("Base read-only simulation RPCs disagree: "+field);
 return Object.freeze({
  chainId:8453,block:first.block,blockHash:first.blockHash,
  twoHostsAgreed:true,providerIndependenceVerified:false,
  simulationResultSha256:first.simulationResultSha256,
  requestedSellAmount:first.requestedSellAmount,
  providerMinBuyAmount:first.providerMinBuyAmount,
  readOnly:true,observationOnly:true,executable:false,executionReady:false,
  routeActionArgumentsVerified:false,walletAuthorizationVerified:false,
  receiptFinalityVerified:false
 });
}
