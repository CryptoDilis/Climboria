// Read-only dual-provider Solana mint freshness/cross-check, no wallet or bridge permissions.
// An identical response from two URLs does not prove that the operators are independent.
import {inspectMintReply, compareFinalizedMintReplies, assertDistinctRpcEndpoints, CLIMB_SOLANA_MINT} from './mint-inspect.mjs';

const MAX_HEAD_GAP = 256;
const MAX_SAMPLE_LAG = 128;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function jsonRpc(url, method, params, fetchFn) {
  const response = await fetchFn(url,{
    method:'POST',redirect:'error',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
    signal:AbortSignal.timeout(12000)
  });
  if(!response?.ok) throw new Error('NO_GO: unavailable finalized RPC response');
  const data=await response.json();
  if(data?.error || data?.result==null) throw new Error('NO_GO: invalid finalized RPC result');
  return data.result;
}

export function validateMintFreshness(head, mintResponse) {
  if(!Number.isSafeInteger(head) || head<=0) throw new Error('NO_GO: invalid finalized RPC head');
  const mint=inspectMintReply(mintResponse);
  if(mint.slot < head-MAX_SAMPLE_LAG) throw new Error('NO_GO: stale mint context relative to finalized RPC head');
  if(mint.slot > head+MAX_SAMPLE_LAG) throw new Error('NO_GO: inconsistent finalized RPC head/context');
  return mint;
}

export async function sampleFinalizedMint(url, fetchFn=fetch) {
  const head=await jsonRpc(url,'getSlot',[{commitment:'finalized'}],fetchFn);
  if(!Number.isSafeInteger(head) || head<=0) throw new Error('NO_GO: invalid finalized slot head');
  const genesis=await jsonRpc(url,'getGenesisHash',[],fetchFn);
  if(typeof genesis!=='string' || !BASE58.test(genesis)) throw new Error('NO_GO: invalid chain genesis identity');
  // The provider must meet a minimum context slot; no older account data accepted.
  const contextFloor=Math.max(1,head-MAX_SAMPLE_LAG);
  const reply=await jsonRpc(url,'getAccountInfo',[
    CLIMB_SOLANA_MINT,
    {encoding:'jsonParsed',commitment:'finalized',minContextSlot:contextFloor}
  ],fetchFn);
  const mint=validateMintFreshness(head,reply);
  return {head,genesis,reply,mint};
}

export function compareFreshSamples(first,second,observedAt) {
  if(Math.abs(first.head-second.head)>MAX_HEAD_GAP) throw new Error('NO_GO: independent RPC finalized heads diverge');
  if(first.genesis!==second.genesis) throw new Error('NO_GO: RPC providers report different chain genesis identities');
  validateMintFreshness(first.head,first.reply);
  validateMintFreshness(second.head,second.reply);
  const matched=compareFinalizedMintReplies(first.reply,second.reply);
  if(!(typeof observedAt==='string' && Number.isFinite(Date.parse(observedAt)))) {
    throw new Error('NO_GO: observation timestamp required');
  }
  return {
    ...matched,
    checkedAtUtc:observedAt,
    finalizedHeads:[first.head,second.head],
    finalizedContextSlots:matched.finalizedSlots,
    observedChainGenesisHash:first.genesis,
    supportedFreshnessMaxLagSlots:MAX_SAMPLE_LAG,
    providerIdentity:'UNVERIFIED_OPERATOR_INDEPENDENCE',
    bridgeRelease:'NO_GO',
    caveat:'Provider-reported finality/freshness and matching genesis do not establish operator independence, cross-chain custody or approved bridge support. Operator must independently verify two actual RPC companies and the canonical Solana mainnet genesis.'
  };
}

export async function inspectFreshIndependentMints(urlA,urlB,fetchFn=fetch,now=()=>new Date().toISOString()) {
  assertDistinctRpcEndpoints(urlA,urlB);
  const [a,b]=await Promise.all([
    sampleFinalizedMint(urlA,fetchFn),
    sampleFinalizedMint(urlB,fetchFn)
  ]);
  return compareFreshSamples(a,b,now());
}

/**
 * Compare a public mainnet genesis reference sourced separately from these RPCs.
 * This does NOT validate the provenance of the operator-supplied reference.
 * Never treat agreement between the same two RPCs as canonical network proof.
 */
export function verifyExpectedGenesis(reference, reported) {
  if (typeof reference !== 'string' || !BASE58.test(reference)) {
    throw new Error('NO_GO: trusted mainnet genesis reference must be configured');
  }
  if (typeof reported !== 'string' || !BASE58.test(reported) || reference !== reported) {
    throw new Error('NO_GO: reported genesis does not match configured mainnet reference');
  }
  return {
    referenceMatched: true,
    referenceProvenance: 'OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED',
    release: 'NO_GO'
  };
}
