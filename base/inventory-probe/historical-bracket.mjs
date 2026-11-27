import {assertDistinctRpcEndpoints} from '../../token/climb-bridge/mint-inspect.mjs';
import {MAINNET_GENESIS as GENESIS} from '../../token/climb-bridge/legacy-raw-inventory-collector.mjs';
export const CANDIDATE_MS=1795765942702;
const LOWER_SLOT=474168385;
const diagnosticCodes=new Set(['CONFIG_INVALID','SOURCE_DISAGREEMENT','UNCLASSIFIED']);
for(const provider of ['A','B']){
 for(const stage of ['GENESIS','HEAD_RANGE','BLOCK_TIME','TIME_RANGE','BLOCK_LIST','EMPTY_WINDOW','TIME_ORDER','ENDPOINTS_MISSING','BLOCK_HEADER','PARENT_LINK','REQUEST_LIMIT'])diagnosticCodes.add(provider+'_'+stage);
 for(const method of ['getGenesisHash','getSlot','getBlockTime','getBlocks','getBlock']){
  for(const reason of ['TRANSPORT','HTTP_429','HTTP_401','HTTP_403','HTTP_OTHER','BODY','ENVELOPE','RPC_HISTORY_UNAVAILABLE','RPC_ERROR_OTHER'])diagnosticCodes.add(provider+'_'+method+'_'+reason);
 }
}
class BracketFailure extends Error{
 constructor(code){super('NO_GO: historical block bracket unavailable or inconsistent');this.code=code;}
}
export function bracketFailureCode(error){return error instanceof BracketFailure&&diagnosticCodes.has(error.code)?error.code:'UNCLASSIFIED';}
const fail=code=>{throw new BracketFailure(code);};
const slotOk=s=>Number.isSafeInteger(s)&&s>0;
async function source(url,fetchFn,provider){
 const reject=stage=>fail(provider+'_'+stage);
 let count=0;
 async function rpc(method,params){
  if(++count>64)reject('REQUEST_LIMIT');
  let reason='TRANSPORT';
  try{
   const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:count,method,params}),signal:AbortSignal.timeout(10000)});
   if(!response.ok){reason=[401,403,429].includes(response.status)?'HTTP_'+response.status:'HTTP_OTHER';throw Error();}
   reason='BODY';
   // These queries have bounded response shapes; cap bytes before parsing.
   if(!response.body)throw Error();
   const reader=response.body.getReader();let size=0;const chunks=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)throw Error();chunks.push(Buffer.from(value));}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const x=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   reason='ENVELOPE';
   if(x?.jsonrpc!=='2.0'||x.id!==count)throw Error();
   if(Object.hasOwn(x,'error')){reason=[-32001,-32004,-32007,-32009,-32011].includes(x.error?.code)?'RPC_HISTORY_UNAVAILABLE':'RPC_ERROR_OTHER';throw Error();}
   if(!Object.hasOwn(x,'result'))throw Error();
   return x.result;
  }catch{reject(method+'_'+reason);}
 }
 if(await rpc('getGenesisHash',[])!==GENESIS)reject('GENESIS');
 let lo=LOWER_SLOT,hi=await rpc('getSlot',[{commitment:'finalized'}]);
 if(!slotOk(hi)||hi<=lo||hi-lo>2000000)reject('HEAD_RANGE');
 const time=async s=>{const t=await rpc('getBlockTime',[s]);if(!Number.isSafeInteger(t)||t<=0)reject('BLOCK_TIME');return t;};
 const target=Math.floor(CANDIDATE_MS/1000);
 let lt=await time(lo),ht=await time(hi);
 if(lt>target||ht<=target)reject('TIME_RANGE');
 const blocks=async(a,b)=>{
  const rows=await rpc('getBlocks',[a,b,{commitment:'finalized'}]);
  if(!Array.isArray(rows)||rows.length>b-a+1||rows.some((s,i)=>!slotOk(s)||s<a||s>b||(i>0&&s<=rows[i-1])))reject('BLOCK_LIST');
  return rows;
 };
 while(hi-lo>64){
  const mid=Math.floor((lo+hi)/2);
  const rows=await blocks(mid,Math.min(mid+15,hi-1));
  if(!rows.length)reject('EMPTY_WINDOW');
  const s=rows[0],t=await time(s);
  if(t<lt||t>ht)reject('TIME_ORDER');
  if(t<=target){lo=s;lt=t;}else{hi=s;ht=t;}
 }
 const rows=await blocks(lo,hi);
 if(rows[0]!==lo||rows.at(-1)!==hi)reject('ENDPOINTS_MISSING');
 let a=0,b=rows.length-1;
 while(b-a>1){
  const m=Math.floor((a+b)/2),t=await time(rows[m]);
  if(t<lt||t>ht)reject('TIME_ORDER');
  if(t<=target){a=m;lt=t;}else{b=m;ht=t;}
 }
 const readBlock=async(s,t)=>{
  const x=await rpc('getBlock',[s,{commitment:'finalized',transactionDetails:'none',rewards:false,maxSupportedTransactionVersion:0}]);
  if(x?.blockTime!==t||typeof x.previousBlockhash!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.previousBlockhash)||typeof x.blockhash!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.blockhash)||!slotOk(x.parentSlot)||x.parentSlot>=s)reject('BLOCK_HEADER');
  return {slot:s,blockTime:t,blockhash:x.blockhash,previousBlockhash:x.previousBlockhash,parentSlot:x.parentSlot};
 };
 const before=await readBlock(rows[a],lt),after=await readBlock(rows[b],ht);
 if(after.parentSlot!==before.slot||after.previousBlockhash!==before.blockhash||before.blockTime>target||after.blockTime<=target)reject('PARENT_LINK');
 return {before,after};
}
export async function observeHistoricalBracket(a,b,{fetchFn=fetch}={}){
 try{
  try{assertDistinctRpcEndpoints(a,b);}catch{fail('CONFIG_INVALID');}
  // Sequential sources avoid concurrent provider pressure; no automatic retry.
  const left=await source(a,fetchFn,'A'),right=await source(b,fetchFn,'B');
  if(JSON.stringify(left)!==JSON.stringify(right))fail('SOURCE_DISAGREEMENT');
  return {candidateUtc:new Date(CANDIDATE_MS).toISOString(),...left,status:'REPORTED_BLOCK_TIME_BRACKET_ONLY',providerIndependence:'NOT_VERIFIED',eligibility:'NOT_CERTIFIED',authorization:false};
 }catch(error){fail(bracketFailureCode(error));}
}
