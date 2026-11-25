/**
 * Base DEX read-only cross-endpoint state corroboration.
 *
 * Two distinct HTTPS hostnames are necessary but NOT sufficient to demonstrate
 * independent node operators. This tool never calls a wallet, approves tokens,
 * prepares transaction calldata, or authorizes production execution.
 */
import {
 BASE_OBSERVATION_PRIMARY_RPC,readAllowanceObservation,validatePublicBaseRpcUrl
} from "./allowance-observation.mjs";

const COMPARE_FIELDS=Object.freeze([
 "chainId","observedBlock","observedBlockHash","observedSellTokenCodeSha256",
 "sellToken","spender","requestedSellAmount","observedAllowance","observedBalance",
 "next","proposedApprovalAmount"
]);
export async function corroborateBaseAllowanceObservation(input,{
 primaryRpcUrl=BASE_OBSERVATION_PRIMARY_RPC,secondaryRpcUrl,
 fetchImpl=(url,init)=>globalThis.fetch(url,init),signal
}={}){
 // All validation must finish BEFORE the first fetch; otherwise a malformed
 // alternate endpoint might leave a misleading single-RPC result.
 const primary=validatePublicBaseRpcUrl(primaryRpcUrl);
 const secondary=validatePublicBaseRpcUrl(secondaryRpcUrl);
 if(new URL(primary).hostname===new URL(secondary).hostname)
  throw Error("Independent Base RPC hostname must differ");
 signal?.throwIfAborted?.();
 const first=await readAllowanceObservation(input,{rpcUrl:primary,fetchImpl,signal});
 if(first.executable!==false||first.observationOnly!==true)throw Error("Unexpected executable Base observation");
 const second=await readAllowanceObservation(input,{
  rpcUrl:secondary,fetchImpl,signal,
  referenceBlock:{number:first.observedBlock,hash:first.observedBlockHash}
 });
 if(second.executable!==false||second.observationOnly!==true)throw Error("Unexpected executable independent Base observation");
 for(const key of COMPARE_FIELDS){
  if(first[key]!==second[key])throw Error("Base RPC observations disagree on "+key);
 }
 return Object.freeze({
  chainId:8453,readOnly:true,observationOnly:true,executable:false,
  matchedAcrossDistinctRpcHosts:true,providerIndependenceVerified:false,
  observedBlock:first.observedBlock,observedBlockHash:first.observedBlockHash,
  sellToken:first.sellToken,spender:first.spender,
  observedSellTokenCodeSha256:first.observedSellTokenCodeSha256,
  requestedSellAmount:first.requestedSellAmount,
  observedBalance:first.observedBalance,observedAllowance:first.observedAllowance,
  next:first.next,proposedApprovalAmount:first.proposedApprovalAmount
 });
}
