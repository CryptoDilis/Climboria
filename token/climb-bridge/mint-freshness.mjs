// Read-only dual-provider Solana mint freshness/cross-check, no wallet or bridge permissions.
// An identical response from two URLs does not prove that the operators are independent.
import {inspectMintReply, compareFinalizedMintReplies, assertDistinctRpcEndpoints, CLIMB_SOLANA_MINT} from './mint-inspect.mjs';

const MAX_HEAD_GAP = 256;
const MAX_SAMPLE_LAG = 128;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Only locally generated, bounded labels may appear in public CI error output.
const RPC_METHODS = new Set(['getSlot','getGenesisHash','getAccountInfo']);
const RPC_PROVIDERS = new Set(['A','B','sample']);
const RPC_FAILURES = new Set(['transport failure','HTTP authentication denied','HTTP rate limited','HTTP unavailable','invalid JSON response','JSON-RPC error or missing result']);
class MintRpcError extends Error {
  constructor(provider,method,reason) {
    super('NO_GO: unavailable finalized RPC response');
    this.diagnostic = RPC_PROVIDERS.has(provider) && RPC_METHODS.has(method) && RPC_FAILURES.has(reason)
      ? 'NO_GO: RPC '+provider+' '+method+' — '+reason
      : 'NO_GO: finalized mint verification failed (RPC details redacted)';
  }
}
async function jsonRpc(url, method, params, fetchFn, provider) {
  let response;
  try {
    response = await fetchFn(url,{
      method:'POST',redirect:'error',headers:{'content-type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
      signal:AbortSignal.timeout(12000)
    });
  } catch {
    throw new MintRpcError(provider,method,'transport failure');
  }
  if(!response?.ok) {
    const status=response?.status;
    const reason=status===401||status===403?'HTTP authentication denied':
      status===429?'HTTP rate limited':'HTTP unavailable';
    throw new MintRpcError(provider,method,reason);
  }
  let data;
  try { data=await response.json(); }
  catch { throw new MintRpcError(provider,method,'invalid JSON response'); }
  if(data?.error || data?.result==null) throw new MintRpcError(provider,method,'JSON-RPC error or missing result');
  return data.result;
}

// Never print raw provider exceptions, response text, URLs, or unbounded labels.
export function safeMintEvidenceError(error) {
  if(error instanceof MintRpcError) return error.diagnostic;
  const allowed = new Set([
    'NO_GO: two independently operated RPC endpoints must be configured privately',
    'NO_GO: trusted mainnet genesis reference must be configured',
    'NO_GO: reported genesis does not match configured mainnet reference',
    'NO_GO: use two different RPC hostname providers',
    'NO_GO: RPC endpoints must use HTTPS without embedded user credentials',
    'NO_GO: invalid RPC URLs',
    'NO_GO: independent RPC finalized heads diverge',
    'NO_GO: RPC providers report different chain genesis identities',
    'NO_GO: stale mint context relative to finalized RPC head',
    'NO_GO: inconsistent finalized RPC head/context',
    'NO_GO: invalid finalized slot head',
    'NO_GO: invalid finalized RPC head',
    'NO_GO: invalid chain genesis identity',
    'NO_GO: missing finalized RPC context slot',
    'NO_GO: not an SPL Token Program mint account',
    'NO_GO: not a recognized SPL Token or Token-2022 mint account',
    'NO_GO: unexpected mint extension metadata',
    'NO_GO: unexpected mint state/decimals',
    'NO_GO: mint/freeze authority fields unavailable',
    'NO_GO: invalid mintAuthority',
    'NO_GO: invalid freezeAuthority',
    'NO_GO: RPCs disagree on finalized slot freshness',
    'NO_GO: observation timestamp required',
    'Invalid unsigned decimal amount',
    'Amount out of range',
    ...['program','extensionTypeSummary','decimals','supplyRaw','mintAuthority','freezeAuthority'].map(key=>'NO_GO: independent RPCs disagree on '+key)
  ]);
  return allowed.has(error?.message) ? error.message : 'NO_GO: finalized mint verification failed (RPC details redacted)';
}

export function validateMintFreshness(head, mintResponse) {
  if(!Number.isSafeInteger(head) || head<=0) throw new Error('NO_GO: invalid finalized RPC head');
  const mint=inspectMintReply(mintResponse);
  if(mint.slot < head-MAX_SAMPLE_LAG) throw new Error('NO_GO: stale mint context relative to finalized RPC head');
  if(mint.slot > head+MAX_SAMPLE_LAG) throw new Error('NO_GO: inconsistent finalized RPC head/context');
  return mint;
}

export async function sampleFinalizedMint(url, fetchFn=fetch, provider='sample') {
  const head=await jsonRpc(url,'getSlot',[{commitment:'finalized'}],fetchFn,provider);
  if(!Number.isSafeInteger(head) || head<=0) throw new Error('NO_GO: invalid finalized slot head');
  const genesis=await jsonRpc(url,'getGenesisHash',[],fetchFn,provider);
  if(typeof genesis!=='string' || !BASE58.test(genesis)) throw new Error('NO_GO: invalid chain genesis identity');
  // The provider must meet a minimum context slot; no older account data accepted.
  const contextFloor=Math.max(1,head-MAX_SAMPLE_LAG);
  const reply=await jsonRpc(url,'getAccountInfo',[
    CLIMB_SOLANA_MINT,
    {encoding:'jsonParsed',commitment:'finalized',minContextSlot:contextFloor}
  ],fetchFn,provider);
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
    sampleFinalizedMint(urlA,fetchFn,'A'),
    sampleFinalizedMint(urlB,fetchFn,'B')
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
