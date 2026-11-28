// Read-only observation of two pinned reported-time boundary blocks, not a snapshot.
import {MAINNET_GENESIS} from '../../token/climb-bridge/legacy-raw-inventory-collector.mjs';
import {CLIMB_SOLANA_MINT,assertDistinctRpcEndpoints} from '../../token/climb-bridge/mint-inspect.mjs';
import {createHash} from 'node:crypto';
const pins=[
 {slot:474473089,blockTime:1795765942,parentSlot:474473088,blockhash:'Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip',previousBlockhash:'8vzSTRse9S6ghJorV9aKXmCF3mFm8EcBbB4bLdFWUADB'},
 {slot:474473090,blockTime:1795765943,parentSlot:474473089,blockhash:'HPh9zhR5mvsZv7nkoFEhjGM3i2U8jrcJ6KX7ifknxxqQ',previousBlockhash:'Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip'}
];
const methods=['getGenesisHash','getBlock'];
const reasons=['TRANSPORT','HTTP_429','HTTP_OTHER','BODY','ENVELOPE','RPC_ERROR','RPC_HISTORY_UNAVAILABLE','RPC_UNSUPPORTED_VERSION','RPC_INVALID_PARAMS','RPC_METHOD_UNAVAILABLE','RPC_NODE_UNHEALTHY','RPC_RATE_LIMIT','GENESIS','HEADER','TRANSACTION_SHAPE','SOURCE_DISAGREEMENT'];
const allowed=new Set(['CONFIG_INVALID','SOURCE_DISAGREEMENT','UNCLASSIFIED']);
for(const p of ['A','B'])for(const m of methods)for(const reason of reasons)allowed.add(p+'_'+m+'_'+reason);
class BoundaryFailure extends Error{constructor(code,versionHint=null){super('NO_GO: boundary block evidence unavailable or inconsistent');this.code=code;this.versionHint=versionHint;}}
const fail=(code,versionHint=null)=>{throw new BoundaryFailure(code,versionHint);};
export const boundaryFailureCode=e=>e instanceof BoundaryFailure&&allowed.has(e.code)?e.code:'UNCLASSIFIED';
// Only the exact upstream error template can contribute a numeric hint.
// This hint is untrusted diagnostic metadata, never permission to widen support.
export function boundaryVersionHint(e){
 return e instanceof BoundaryFailure&&boundaryFailureCode(e).endsWith('_RPC_UNSUPPORTED_VERSION')&&
  Number.isInteger(e.versionHint)&&e.versionHint>=0&&e.versionHint<=255?e.versionHint:null;
}
function extractVersionHint(message){
 if(typeof message!=='string'||message.length>240)return null;
 const m=message.match(/^Transaction version \((\d{1,3})\) is not supported by the requesting client\. Please try the request again with the following configuration parameter: "maxSupportedTransactionVersion": (\d{1,3})$/);
 if(!m||m[0]!==message||m[1]!==m[2]||Number(m[1])>255)return null;
 return Number(m[1]);
}
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
const MAX_BYTES=32*1024*1024;
async function rpc(url,id,method,params,p,fetchFn){
 let why='TRANSPORT',versionHint=null;
 try{
  const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(30000)});
  if(!response.ok){why=response.status===429?'HTTP_429':'HTTP_OTHER';throw Error();}
  why='BODY';
  if(!response.body)throw Error();
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error();chunks.push(Buffer.from(value));}}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const x=JSON.parse(Buffer.concat(chunks).toString('utf8'));why='ENVELOPE';
  if(x?.jsonrpc!=='2.0'||x.id!==id)throw Error();
  if(Object.hasOwn(x,'error')){
   const code=x.error?.code;
   why=[-32001,-32004,-32007,-32009,-32011].includes(code)?'RPC_HISTORY_UNAVAILABLE':
    code===-32015?'RPC_UNSUPPORTED_VERSION':code===-32602?'RPC_INVALID_PARAMS':
    code===-32601?'RPC_METHOD_UNAVAILABLE':code===-32005?'RPC_NODE_UNHEALTHY':
    code===429?'RPC_RATE_LIMIT':'RPC_ERROR';
   if(code===-32015)versionHint=extractVersionHint(x.error?.message);
   throw Error();
  }
  if(!Object.hasOwn(x,'result'))throw Error();
  return x.result;
 }catch{fail(p+'_'+method+'_'+why,versionHint);}
}
function summarize(block,pin,p){
 const reject=reason=>fail(p+'_getBlock_'+reason);
 if(!block||Object.keys(pin).some(k=>k!=='slot'&&block[k]!==pin[k]))reject('HEADER');
 if(!Array.isArray(block.transactions)||block.transactions.length>100000)reject('TRANSACTION_SHAPE');
 const signatures=new Set(),hits=[];let missingMeta=0,failed=0,missingTokenBalanceFields=0;
 for(const [index,row] of block.transactions.entries()){
  const tx=row?.transaction,meta=row?.meta;
  if(!Array.isArray(tx?.signatures)||!tx.signatures.length||tx.signatures.some(s=>typeof s!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(s))||!Array.isArray(tx?.message?.accountKeys)||tx.message.accountKeys.some(k=>typeof k!=='string'))reject('TRANSACTION_SHAPE');
  const sig=tx.signatures[0];if(signatures.has(sig))reject('TRANSACTION_SHAPE');signatures.add(sig);
  // Upstream emits explicit legacy or numeric version when complete metadata
  // is present and maxSupportedTransactionVersion is supplied. Historical
  // missing-metadata legacy records may omit version; remain uncertified.
  if(row.version!=='legacy'&&row.version!==0&&
     !(row.version===undefined&&meta==null))reject('TRANSACTION_SHAPE');
  if(meta===null||meta===undefined)missingMeta++;
  else if(typeof meta!=='object'||!Object.hasOwn(meta,'err'))reject('TRANSACTION_SHAPE');
  if(meta?.err!==null&&meta?.err!==undefined)failed++;
  const pre=meta?.preTokenBalances,post=meta?.postTokenBalances;
  if(!Array.isArray(pre)||!Array.isArray(post))missingTokenBalanceFields++;
  const all=[...(Array.isArray(pre)?pre:[]),...(Array.isArray(post)?post:[])];
  if(all.some(x=>!x||typeof x.mint!=='string'))reject('TRANSACTION_SHAPE');
  const loaded=meta?.loadedAddresses;
  if(loaded!==undefined&&loaded!==null&&(!Array.isArray(loaded.writable)||!Array.isArray(loaded.readonly)||[...loaded.writable,...loaded.readonly].some(k=>typeof k!=='string')))reject('TRANSACTION_SHAPE');
  const explicitMint=[...tx.message.accountKeys,...(loaded?.writable??[]),...(loaded?.readonly??[])].includes(CLIMB_SOLANA_MINT);
  const mintBalance=all.some(x=>x.mint===CLIMB_SOLANA_MINT);
  if(explicitMint||mintBalance)hits.push({index,explicitMint,mintBalance,outcome:meta==null?'UNKNOWN':meta.err===null?'SUCCESS':'FAILED'});
 }
 // Canonical parsed JS JSON hash, not raw bytes or consensus proof.
 // JSON number parsing can lose precision; do not use for exact u64 accounting.
 return {slot:pin.slot,blockhash:pin.blockhash,transactionCount:block.transactions.length,failed,missingMeta,missingTokenBalanceFields,transactionsSha256:digest(block.transactions),mintMentionCandidates:hits};
}
// Diagnostic only: ordered transaction identifiers, without transaction decoding.
function summarizeSignatures(block,pin,p){
 const reject=reason=>fail(p+'_getBlock_'+reason);
 if(!block||Object.keys(pin).some(k=>k!=='slot'&&block[k]!==pin[k]))reject('HEADER');
 if(!Array.isArray(block.signatures)||block.signatures.length>100000||
    Object.hasOwn(block,'transactions'))reject('TRANSACTION_SHAPE');
 const seen=new Set();
 for(const signature of block.signatures){
  if(!validSignature(signature)||seen.has(signature))reject('TRANSACTION_SHAPE');
  seen.add(signature);
 }
 return {slot:pin.slot,blockhash:pin.blockhash,transactionCount:block.signatures.length,
    orderedSignaturesSha256:digest(block.signatures),orderedSignatures:block.signatures};
}
function validSignature(s){
 if(typeof s!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(s))return false;
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;
 for(const c of s)n=n*58n+BigInt(alphabet.indexOf(c));
 const leading=s.match(/^1*/)[0].length;
 const bytes=n===0n?0:Math.ceil(n.toString(2).length/8);
 return leading+bytes===64;
}
async function source(url,p,fetchFn,signaturesOnly=false){
 if(await rpc(url,1,'getGenesisHash',[],p,fetchFn)!==MAINNET_GENESIS)fail(p+'_getGenesisHash_GENESIS');
 const out=[];
 for(const [i,pin] of pins.entries()){
  const config=signaturesOnly?
   {commitment:'finalized',encoding:'json',transactionDetails:'signatures',rewards:false}:
   {commitment:'finalized',encoding:'json',transactionDetails:'full',rewards:false,maxSupportedTransactionVersion:0};
  const b=await rpc(url,i+2,'getBlock',[pin.slot,config],p,fetchFn);
  out.push(signaturesOnly?summarizeSignatures(b,pin,p):summarize(b,pin,p));
 }
 return out;
}
export async function observeBoundaryBlocks(a,b,{fetchFn=fetch}={}){
 try{
  try{assertDistinctRpcEndpoints(a,b);}catch{fail('CONFIG_INVALID');}
  const first=await source(a,'A',fetchFn),second=await source(b,'B',fetchFn);
  if(canonical(first)!==canonical(second))fail('SOURCE_DISAGREEMENT');
  return {status:'REPORTED_BOUNDARY_BLOCKS_ONLY',observedMint:CLIMB_SOLANA_MINT,candidateUtc:'2026-11-27T07:52:22.702Z',blocks:first,providerIndependence:'NOT_VERIFIED',digestScope:'CANONICAL_PARSED_JS_JSON_NOT_RAW_BYTES',mintMentionCoverage:'NOT_CERTIFIED',eligibility:'NOT_CERTIFIED',authorization:false};
 }catch(e){fail(boundaryFailureCode(e),boundaryVersionHint(e));}
}

export async function observeBoundarySignatures(a,b,{fetchFn=fetch}={}){
 try{
  try{assertDistinctRpcEndpoints(a,b);}catch{fail('CONFIG_INVALID');}
  const first=await source(a,'A',fetchFn,true),second=await source(b,'B',fetchFn,true);
  if(canonical(first)!==canonical(second))fail('SOURCE_DISAGREEMENT');
  return {status:'REPORTED_BOUNDARY_SIGNATURES_ONLY_NO_GO',observedMint:CLIMB_SOLANA_MINT,
   candidateUtc:'2026-11-27T07:52:22.702Z',blocks:first,
   providerIndependence:'NOT_VERIFIED',transactionContents:'NOT_FETCHED',transactionVersions:'NOT_FETCHED',
   executionOutcomes:'NOT_FETCHED',mintMentionCoverage:'NOT_CERTIFIED',eligibility:'NOT_CERTIFIED',authorization:false};
 }catch(e){fail(boundaryFailureCode(e),boundaryVersionHint(e));}
}
