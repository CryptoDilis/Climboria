// Read-only candidate collector. Ordinary RPC cannot request an exact historical
// account slot: fail closed on context mismatch; never treat minContextSlot as equality.
// No transaction methods, signing, eligibility determination or release authorization.
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM,assertDistinctRpcEndpoints} from './mint-inspect.mjs';
import {reconcileRawInventories} from './legacy-raw-inventory.mjs';
const fail=msg=>{throw Error('NO_GO: '+msg);};
const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const MAX_BYTES=32*1024*1024;
async function rpc(url,id,method,params,fetchFn){
 try{
  const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},
   body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(20000)});
  if(!response.ok||!response.body)fail('RPC response unavailable');
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>MAX_BYTES)fail('RPC body limit exceeded');chunks.push(Buffer.from(value));}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const r=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(r?.jsonrpc!=='2.0'||r.id!==id||Object.hasOwn(r,'error')||!Object.hasOwn(r,'result'))fail('invalid RPC envelope');
  return r.result;
 }catch{fail('read-only '+method+' request failed');}
}
async function collect(url,fetchFn){
 const call=(id,method,params)=>rpc(url,id,method,params,fetchFn);
 const genesis=await call(1,'getGenesisHash',[]);
 if(genesis!==MAINNET_GENESIS)fail('wrong source genesis');
 const head=await call(2,'getSlot',[{commitment:'finalized'}]);
 if(!Number.isSafeInteger(head)||head<=0)fail('invalid finalized head');
 const options={commitment:'finalized',minContextSlot:head};
 const [parsedMint,rawMint,accounts]=await Promise.all([
  call(3,'getAccountInfo',[CLIMB_SOLANA_MINT,{...options,encoding:'jsonParsed'}]),
  call(4,'getAccountInfo',[CLIMB_SOLANA_MINT,{...options,encoding:'base64'}]),
  call(5,'getProgramAccounts',[TOKEN_2022_PROGRAM,{...options,encoding:'base64',withContext:true,
   filters:[{memcmp:{offset:0,bytes:CLIMB_SOLANA_MINT}}]}])
 ]);
 const slot=accounts?.context?.slot;
 if(!Number.isSafeInteger(slot)||slot<head||parsedMint?.context?.slot!==slot||rawMint?.context?.slot!==slot)
  fail('exact same-slot RPC candidate unavailable');
 const block=await call(6,'getBlock',[slot,{commitment:'finalized',transactionDetails:'none',rewards:false,maxSupportedTransactionVersion:0}]);
 const after=await call(7,'getSlot',[{commitment:'finalized'}]);
 if(!Number.isSafeInteger(after)||after<slot||after-slot>128||typeof block?.blockhash!=='string')
  fail('invalid finalized block or freshness');
 // complete marks the unpaginated response shape for arithmetic only; RPC
 // omission/truncation and source independence are NOT proven.
 return {genesis,block:{slot,blockhash:block.blockhash},commitment:'finalized',complete:true,parsedMint,rawMint,accounts};
}
export async function collectRawInventoryCandidate(urlA,urlB,{expectedGenesis,fetchFn=fetch}={}){
 assertDistinctRpcEndpoints(urlA,urlB);
 if(expectedGenesis!==MAINNET_GENESIS)fail('configured genesis must match pinned mainnet reference');
 const [a,b]=await Promise.all([collect(urlA,fetchFn),collect(urlB,fetchFn)]);
 const result=reconcileRawInventories(a,b,{expectedGenesis});
 return {...result,collectionStatus:'READ_ONLY_RPC_CANDIDATE',providerIndependence:'NOT_VERIFIED',
  observedAt:new Date().toISOString(),authorization:false};
}
