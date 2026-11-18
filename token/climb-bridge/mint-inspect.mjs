// Read-only, dual-provider finalized Solana mint/authority inspection for official CLIMB.
// Does NOT submit transactions and does NOT approve a bridge or prove independent RPC ownership.
import {rawAmount} from './supply-audit.mjs';

export const CLIMB_SOLANA_MINT = '9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
export const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_SLOT_SKEW = 4096;

function validAuthority(value, label) {
  if (value === null) return null;
  if (typeof value !== 'string' || !SOLANA_ADDRESS.test(value)) throw new Error('NO_GO: invalid ' + label);
  return value;
}

export function inspectMintReply(reply) {
  if (!Number.isSafeInteger(reply?.context?.slot) || reply.context.slot <= 0) {
    throw new Error('NO_GO: missing finalized RPC context slot');
  }
  const value = reply?.value;
  if (value?.owner !== SPL_TOKEN_PROGRAM || value?.data?.parsed?.type !== 'mint' || value?.data?.program !== 'spl-token') {
    throw new Error('NO_GO: not an SPL Token Program mint account');
  }
  const info = value.data.parsed.info;
  if (info?.isInitialized !== true || info?.decimals !== 6) {
    throw new Error('NO_GO: unexpected mint state/decimals');
  }
  if (!Object.hasOwn(info,'mintAuthority') || !Object.hasOwn(info,'freezeAuthority')) {
    throw new Error('NO_GO: mint/freeze authority fields unavailable');
  }
  const supplyRaw = rawAmount(info.supply).toString();
  return {
    slot: reply.context.slot,
    mint: CLIMB_SOLANA_MINT,
    program: SPL_TOKEN_PROGRAM,
    decimals: 6,
    supplyRaw,
    mintAuthority: validAuthority(info.mintAuthority, 'mintAuthority'),
    freezeAuthority: validAuthority(info.freezeAuthority, 'freezeAuthority')
  };
}

export function compareFinalizedMintReplies(first, second) {
  const a = inspectMintReply(first);
  const b = inspectMintReply(second);
  if (Math.abs(a.slot - b.slot) > MAX_SLOT_SKEW) throw new Error('NO_GO: RPCs disagree on finalized slot freshness');
  for (const key of ['program','decimals','supplyRaw','mintAuthority','freezeAuthority']) {
    if (a[key] !== b[key]) throw new Error('NO_GO: independent RPCs disagree on ' + key);
  }
  return {
    assessment: 'DUAL_RPC_FIELDS_MATCH_READ_ONLY',
    bridgeRelease: 'NO_GO',
    mint: CLIMB_SOLANA_MINT,
    decimals: a.decimals,
    supplyRaw: a.supplyRaw,
    supplyUi: (BigInt(a.supplyRaw) / 1000000n).toString() + '.' + (BigInt(a.supplyRaw) % 1000000n).toString().padStart(6,'0'),
    mintAuthority: a.mintAuthority,
    freezeAuthority: a.freezeAuthority,
    bothReportMintAuthorityRevoked: a.mintAuthority === null,
    bothReportFreezeAuthorityRevoked: a.freezeAuthority === null,
    finalizedSlots: [a.slot, b.slot],
    caveat: 'Two read-only finalized observations, not proof providers are independent or chain state immutable; no bridge compatibility or transfer verified.'
  };
}

export function assertDistinctRpcEndpoints(urlA, urlB) {
  let a, b;
  try { a = new URL(urlA); b = new URL(urlB); } catch { throw new Error('NO_GO: invalid RPC URLs'); }
  if (a.protocol !== 'https:' || b.protocol !== 'https:' || a.username || a.password || b.username || b.password) {
    throw new Error('NO_GO: RPC endpoints must use HTTPS without embedded user credentials');
  }
  if (a.hostname.toLowerCase() === b.hostname.toLowerCase()) {
    throw new Error('NO_GO: use two different RPC hostname providers');
  }
  // Distinct hostnames alone do not prove actual operational independence.
  return true;
}

export async function fetchFinalizedMint(rpcUrl, fetchFn = fetch) {
  const body = {jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[CLIMB_SOLANA_MINT,{encoding:'jsonParsed',commitment:'finalized'}]};
  const response = await fetchFn(rpcUrl, {
    method:'POST',redirect:'error',headers:{'content-type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('NO_GO: Solana RPC HTTP error');
  const result = await response.json();
  if (result?.error || !result?.result) throw new Error('NO_GO: Solana RPC response unavailable');
  return result.result;
}

export async function inspectIndependentMints(rpcA, rpcB, fetchFn = fetch) {
  assertDistinctRpcEndpoints(rpcA, rpcB);
  const [a,b] = await Promise.all([fetchFinalizedMint(rpcA,fetchFn),fetchFinalizedMint(rpcB,fetchFn)]);
  return compareFinalizedMintReplies(a,b);
}
