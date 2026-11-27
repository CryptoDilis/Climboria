import {assertDistinctRpcEndpoints} from '../../token/climb-bridge/mint-inspect.mjs';
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKZKvdpKuc147dw2N9d';
export const CANDIDATE_MS=1795765942702;
const LOWER_SLOT=474168385;
const fail=()=>{throw Error('NO_GO: historical block bracket unavailable or inconsistent');};
const slotOk=s=>Number.isSafeInteger(s)&&s>0;
async function source(url,fetchFn){
 let count=0;
 async function rpc(method,params){
  if(++count>64)fail();
  try{
   const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:count,method,params}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)fail();
   // These queries have bounded response shapes; cap bytes before parsing.
   if(!response.body)fail();
   const reader=response.body.getReader();let size=0;const chunks=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)fail();chunks.push(Buffer.from(value));}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const x=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(x?.jsonrpc!=='2.0'||x.id!==count||Object.hasOwn(x,'error')||!Object.hasOwn(x,'result'))fail();
   return x.result;
  }catch{fail();}
 }
 if(await rpc('getGenesisHash',[])!==GENESIS)fail();
 let lo=LOWER_SLOT,hi=await rpc('getSlot',[{commitment:'finalized'}]);
 if(!slotOk(hi)||hi<=lo||hi-lo>2000000)fail();
 const time=async s=>{const t=await rpc('getBlockTime',[s]);if(!Number.isSafeInteger(t)||t<=0)fail();return t;};
 const target=Math.floor(CANDIDATE_MS/1000);
 let lt=await time(lo),ht=await time(hi);
 if(lt>target||ht<=target)fail();
 const blocks=async(a,b)=>{
  const rows=await rpc('getBlocks',[a,b,{commitment:'finalized'}]);
  if(!Array.isArray(rows)||rows.length>b-a+1||rows.some((s,i)=>!slotOk(s)||s<a||s>b||(i>0&&s<=rows[i-1])))fail();
  return rows;
 };
 while(hi-lo>64){
  const mid=Math.floor((lo+hi)/2);
  const rows=await blocks(mid,Math.min(mid+15,hi-1));
  if(!rows.length)fail();
  const s=rows[0],t=await time(s);
  if(t<lt||t>ht)fail();
  if(t<=target){lo=s;lt=t;}else{hi=s;ht=t;}
 }
 const rows=await blocks(lo,hi);
 if(rows[0]!==lo||rows.at(-1)!==hi)fail();
 let a=0,b=rows.length-1;
 while(b-a>1){
  const m=Math.floor((a+b)/2),t=await time(rows[m]);
  if(t<lt||t>ht)fail();
  if(t<=target){a=m;lt=t;}else{b=m;ht=t;}
 }
 const readBlock=async(s,t)=>{
  const x=await rpc('getBlock',[s,{commitment:'finalized',transactionDetails:'none',rewards:false,maxSupportedTransactionVersion:0}]);
  if(x?.blockTime!==t||typeof x.previousBlockhash!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.previousBlockhash)||typeof x.blockhash!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x.blockhash)||!slotOk(x.parentSlot)||x.parentSlot>=s)fail();
  return {slot:s,blockTime:t,blockhash:x.blockhash,previousBlockhash:x.previousBlockhash,parentSlot:x.parentSlot};
 };
 const before=await readBlock(rows[a],lt),after=await readBlock(rows[b],ht);
 if(after.parentSlot!==before.slot||after.previousBlockhash!==before.blockhash||before.blockTime>target||after.blockTime<=target)fail();
 return {before,after};
}
export async function observeHistoricalBracket(a,b,{fetchFn=fetch}={}){
 try{
  assertDistinctRpcEndpoints(a,b);
  // Sequential sources avoid concurrent provider pressure; no automatic retry.
  const left=await source(a,fetchFn),right=await source(b,fetchFn);
  if(JSON.stringify(left)!==JSON.stringify(right))fail();
  return {candidateUtc:new Date(CANDIDATE_MS).toISOString(),...left,status:'REPORTED_BLOCK_TIME_BRACKET_ONLY',providerIndependence:'NOT_VERIFIED',eligibility:'NOT_CERTIFIED',authorization:false};
 }catch{fail();}
}
