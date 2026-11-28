// V4 read-only monitoring boundary. No production manifest is approved.
export const PRODUCTION_MANIFEST = null;
export const CHAIN_ID = 8453n;
export const DECIMALS = 6;
export const GENESIS_RAW = 888888888000000n;
export const ALLOCATIONS = Object.freeze([30n,20n,18n,12n,10n,7n,2n,1n].map(p=>GENESIS_RAW*p/100n));
export const COMMUNITY = Object.freeze([12n,8n,6n,4n].map(p=>GENESIS_RAW*p/100n));
export const MARKETING_TGE = ALLOCATIONS[5]/20n;
export const MARKETING_RESERVE = ALLOCATIONS[5]-MARKETING_TGE;
const ADDRESS=/^0x[0-9a-f]{40}$/i, HASH=/^0x[0-9a-f]{64}$/i, WORD=/^0x[0-9a-f]{64}$/i, QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const RUNTIME=/^0x(?:[0-9a-f]{2})+$/i;
const TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const quantity=n=>"0x"+n.toString(16);
function requireValue(ok,message){if(!ok)throw Error(message);}
function parseQuantity(v){requireValue(typeof v==="string"&&QUANTITY.test(v),"invalid RPC quantity");return BigInt(v);}
function parseWord(v){requireValue(typeof v==="string"&&WORD.test(v),"invalid ABI word");return BigInt(v);}
function addr(v){requireValue(typeof v==="string"&&ADDRESS.test(v)&&!/^0x0{40}$/i.test(v),"invalid address");return v.toLowerCase();}
export function formatRaw(n){requireValue(typeof n==="bigint"&&n>=0n,"invalid token units");return (n/1000000n).toString()+"."+String(n%1000000n).padStart(6,"0");}
function manifestCheck(m){requireValue(m&&m.chainId===8453&&m.decimals===6&&m.reviewed===true,"manifest unavailable");requireValue(typeof m.runtimeCode==="string"&&RUNTIME.test(m.runtimeCode),"runtime pin absent");const token=addr(m.token);requireValue(Array.isArray(m.wallets)&&m.wallets.length>0&&m.wallets.length<=64,"bounded custody registry required");const wallets=m.wallets.map(addr);requireValue(new Set(wallets).size===wallets.length&&!wallets.includes(token),"duplicate custody address");return {token,wallets,runtime:m.runtimeCode.toLowerCase()};}
function block(b){requireValue(b&&HASH.test(b.hash),"missing finalized block");return {number:parseQuantity(b.number),hash:b.hash.toLowerCase(),timestamp:parseQuantity(b.timestamp)};}
function sameBlock(a,b){requireValue(a.number===b.number&&a.hash===b.hash&&a.timestamp===b.timestamp,"block changed");}
const topicAddress=t=>"0x"+t.slice(-40).toLowerCase();
function parseLog(l,token,from,to){
 requireValue(l&&l.removed===false&&addr(l.address)===token&&Array.isArray(l.topics)&&l.topics.length===3&&l.topics[0].toLowerCase()===TRANSFER&&l.topics.slice(1).every(t=>/^0x0{24}[0-9a-f]{40}$/i.test(t)),"invalid transfer log");
 requireValue(HASH.test(l.transactionHash)&&HASH.test(l.blockHash),"invalid log identity");
 const number=parseQuantity(l.blockNumber),index=parseQuantity(l.logIndex);
 requireValue(number>=from&&number<=to,"log outside requested range");
 return {from:topicAddress(l.topics[1]),to:topicAddress(l.topics[2]),amountRaw:parseWord(l.data).toString(),blockNumber:number.toString(),blockHash:l.blockHash.toLowerCase(),transactionHash:l.transactionHash.toLowerCase(),logIndex:index.toString()};
}
// The transport must be a reviewed read-only RPC adapter, never a wallet provider.
// Production wrapper below cannot be activated by browser/query parameters.
export function createMonitor({manifest=null,rpc,now=()=>Date.now(),ttlMs=30000,maxBlocks=500n}={}){
 let cache=null,inFlight=null,transferBusy=false;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const limits=Number.isFinite(ttlMs)&&ttlMs>=0&&ttlMs<=300000&&typeof maxBlocks==="bigint"&&maxBlocks>0n&&maxBlocks<=500n;
 const configured=manifest&&typeof rpc==="function"&&limits;
 const unavailable=()=>({status:"unavailable",reason:"verified manifest or provider unavailable",data:null});
 async function snapshot(){
  if(!configured)return unavailable();
  if(cache&&now()-cache.observedAt<ttlMs&&now()>=cache.observedAt)return clone({...cache,status:"fresh"});
  if(inFlight)return clone(await inFlight);
  inFlight=(async()=>{
   try{
    const m=manifestCheck(manifest);
    requireValue(parseQuantity(await rpc("eth_chainId",[]))===CHAIN_ID,"wrong chain");
    const b=block(await rpc("eth_getBlockByNumber",["finalized",false])),tag=quantity(b.number);
    requireValue((await rpc("eth_getCode",[m.token,tag])).toLowerCase()===m.runtime,"runtime mismatch");
    const call=data=>rpc("eth_call",[{to:m.token,data},tag]);
    requireValue(parseWord(await call("0x313ce567"))===BigInt(DECIMALS),"wrong decimals");
    const total=parseWord(await call("0x18160ddd"));requireValue(total<=GENESIS_RAW,"supply exceeds genesis");
    const balances={};for(const w of m.wallets)balances[w]=parseWord(await call("0x70a08231"+w.slice(2).padStart(64,"0"))).toString();
    requireValue(Object.values(balances).reduce((n,v)=>n+BigInt(v),0n)<=total,"custody balances exceed supply");
    sameBlock(b,block(await rpc("eth_getBlockByNumber",[tag,false])));
    requireValue(parseQuantity(await rpc("eth_chainId",[]))===CHAIN_ID,"chain changed");
    cache={status:"fresh",observedAt:now(),data:{chainId:8453,finality:"finalized-provider-observed",blockNumber:b.number.toString(),blockHash:b.hash,blockTimestamp:b.timestamp.toString(),totalRaw:total.toString(),balances}};
    return cache;
   }catch{ return cache?{...cache,status:"stale",reason:"provider or verification failed"}:unavailable(); }
  })();
  try{return clone(await inFlight);}finally{inFlight=null;}
 }
 async function transfers({fromBlock,toBlock}={}){
  if(!configured||transferBusy)return unavailable();
  transferBusy=true;
  try{
   const m=manifestCheck(manifest);
   requireValue(typeof fromBlock==="bigint"&&typeof toBlock==="bigint"&&fromBlock>=0n&&toBlock>=fromBlock&&toBlock-fromBlock+1n<=maxBlocks,"invalid page range");
   requireValue(parseQuantity(await rpc("eth_chainId",[]))===CHAIN_ID,"wrong chain");
   const finalized=block(await rpc("eth_getBlockByNumber",["finalized",false]));
   requireValue(toBlock<=finalized.number,"unfinalized range");
   const start=block(await rpc("eth_getBlockByNumber",[quantity(fromBlock),false])),end=block(await rpc("eth_getBlockByNumber",[quantity(toBlock),false]));
   requireValue(start.number===fromBlock&&end.number===toBlock,"incorrect page anchors");
   requireValue((await rpc("eth_getCode",[m.token,quantity(toBlock)])).toLowerCase()===m.runtime,"runtime mismatch");
   const logs=await rpc("eth_getLogs",[{address:m.token,topics:[TRANSFER],fromBlock:quantity(fromBlock),toBlock:quantity(toBlock)}]);
   requireValue(Array.isArray(logs)&&logs.length<=10000,"invalid or oversized log page");
   const seen=new Map(),blocks=new Map();
   for(const log of logs){
    const row=parseLog(log,m.token,fromBlock,toBlock),key=row.transactionHash+":"+row.logIndex;
    if(!blocks.has(row.blockNumber)){const actual=block(await rpc("eth_getBlockByNumber",[quantity(BigInt(row.blockNumber)),false]));requireValue(actual.number===BigInt(row.blockNumber),"incorrect log block");blocks.set(row.blockNumber,actual);}
    const actual=blocks.get(row.blockNumber);requireValue(actual.hash===row.blockHash,"log block mismatch");row.timestamp=actual.timestamp.toString();
    if(seen.has(key))requireValue(JSON.stringify(seen.get(key))===JSON.stringify(row),"conflicting duplicate");else seen.set(key,row);
   }
   sameBlock(start,block(await rpc("eth_getBlockByNumber",[quantity(fromBlock),false])));
   sameBlock(end,block(await rpc("eth_getBlockByNumber",[quantity(toBlock),false])));
   requireValue(parseQuantity(await rpc("eth_chainId",[]))===CHAIN_ID,"chain changed");
   const wallets=new Set(m.wallets),rows=[...seen.values()].filter(r=>wallets.has(r.from)||wallets.has(r.to)).sort((a,b)=>BigInt(a.blockNumber)<BigInt(b.blockNumber)?-1:BigInt(a.blockNumber)>BigInt(b.blockNumber)?1:BigInt(a.logIndex)<BigInt(b.logIndex)?-1:BigInt(a.logIndex)>BigInt(b.logIndex)?1:0);
   return {status:"fresh",data:{finality:"finalized-provider-observed",fromBlock:fromBlock.toString(),toBlock:toBlock.toString(),nextFromBlock:toBlock<finalized.number?(toBlock+1n).toString():null,rows,observedAt:now(),coverage:"provider-returned logs for requested range; not proof of complete lifetime transfers"}};
  }catch{return unavailable();}finally{transferBusy=false;}
 }
 return Object.freeze({snapshot,transfers});
}

// Read-only HTTPS transport. Caller supplies a reviewed endpoint; production remains null.
// Bounded requests, no credentials, no redirects, no wallet methods, no automatic retries.
const READ_METHODS=new Set(["eth_chainId","eth_getBlockByNumber","eth_getCode","eth_call","eth_getLogs"]);
export function createReadOnlyRpc({endpoint,fetchImpl=globalThis.fetch,now=()=>Date.now(),timeoutMs=8000,cooldownMs=30000,maxBytes=2000000}={}){
 const url=new URL(endpoint);
 requireValue(url.protocol==="https:"&&!url.username&&!url.password&&!url.search&&!url.hash,"public HTTPS endpoint required");
 requireValue(typeof fetchImpl==="function"&&Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=15000&&Number.isInteger(cooldownMs)&&cooldownMs>=1000&&cooldownMs<=300000&&Number.isInteger(maxBytes)&&maxBytes>=1024&&maxBytes<=4000000,"invalid transport limits");
 let nextId=0,blockedUntil=0;
 return async function rpc(method,params){
  requireValue(READ_METHODS.has(method)&&Array.isArray(params),"non-read-only RPC method");
  requireValue(now()>=blockedUntil,"RPC cooling down");
  const id=++nextId,controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url.href,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),credentials:"omit",redirect:"error",cache:"no-store",signal:controller.signal});
   if(response.status===429||response.status===503){blockedUntil=now()+cooldownMs;throw Error("RPC rate limited");}
   requireValue(response.ok&&response.body&&typeof response.body.getReader==="function","RPC HTTP failure");
   const declared=response.headers.get("content-length");requireValue(declared===null||Number(declared)<=maxBytes,"RPC response too large");
   const reader=response.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let length=0,body="";
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;requireValue(length<=maxBytes,"RPC response too large");body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}catch(error){await reader.cancel().catch(()=>{});throw error;}
   const result=JSON.parse(body);
   requireValue(result&&result.jsonrpc==="2.0"&&result.id===id&&!Object.hasOwn(result,"error")&&Object.hasOwn(result,"result"),"RPC response mismatch");
   return result.result;
  }finally{clearTimeout(timer);}
 };
}

export const productionMonitor=createMonitor({manifest:PRODUCTION_MANIFEST});
