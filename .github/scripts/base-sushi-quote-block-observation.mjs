// Historical SushiSwap V3 candidate evidence only; no execution allowlist or quote requests.
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
import {assertBaseBlockIdentity} from "../../dex/base-execution/allowance-observation.mjs";
import {decodeCandidateSlot0} from "../../dex/base-execution/quote-block-pool-observation.mjs";
import assert from "node:assert/strict";
// 0x Settler edd3dd4cdd4018d8461c6e5c8f3a9d271cba3806, SushiswapV3.sol forkId 2.
const factory="0xc35dadb65012ec5796536bd9864ed8773abc74c4";
const reportedBlockNumber="62504677";
const token0="0x4200000000000000000000000000000000000006",token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const word=v=>v.padStart(64,"0");
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
function uint(v,max){if(typeof v!=="string"||!/^0x[0-9a-f]{64}$/.test(v)||BigInt(v)>max)throw Error("Invalid pool uint");return BigInt(v);}
function address(v){if(typeof v!=="string"||!/^0x0{24}[0-9a-f]{40}$/.test(v)||/^0x0{64}$/.test(v))throw Error("Invalid or missing pool address");return "0x"+v.slice(-40);}
function anchorOf(a){
 if(!a||typeof a.block!=="string"||!/^0x[1-9a-f][0-9a-f]{0,10}$/.test(a.block)||typeof a.hash!=="string"||!/^0x[0-9a-f]{64}$/.test(a.hash)||/^0x0{64}$/.test(a.hash))throw Error("Invalid pool observation anchor");
 return Object.freeze({block:a.block,hash:a.hash});
}
async function observeHistoricalSushiPool({authorized=false,fetchImpl=(url,opts)=>globalThis.fetch(url,opts),signal}={}){
 const referenceBlock=undefined;
 if(BASE_EXECUTION_ENABLED!==false||authorized!==true)throw Error("Explicit read-only pool authorization required");
 if((referenceBlock===undefined)===(reportedBlockNumber===undefined))throw Error("Exactly one pool block input required");
 let a;
 if(referenceBlock!==undefined)a=anchorOf(referenceBlock);
 else if(typeof reportedBlockNumber!=="string"||!/^[1-9][0-9]{0,13}$/.test(reportedBlockNumber)||BigInt(reportedBlockNumber)>0xfffffffffffn)throw Error("Invalid reported quote block");
 const deadline=AbortSignal.timeout(90000),combined=signal?AbortSignal.any([deadline,signal]):deadline;
 let seq=0;
 async function rpc(host,method,params){
  combined.throwIfAborted();const id=++seq;
  const r=await fetchImpl(host,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),signal:AbortSignal.any([combined,AbortSignal.timeout(12000)])});
  if(!r.ok){await r.body?.cancel();throw Error("Pool RPC unavailable");}
  const reader=r.body?.getReader();if(!reader)throw Error("Missing pool RPC stream");
  let n=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>131072){await reader.cancel();throw Error("Oversized pool RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(n);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
  const j=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));combined.throwIfAborted();
  if(!j||j.jsonrpc!=="2.0"||j.id!==id||Object.hasOwn(j,"error")||!Object.hasOwn(j,"result"))throw Error("Invalid pool RPC result");
  return j.result;
 }
 // Provider reports a height, not a hash. Resolve it independently on both
 // fixed hosts before any state reads; later fences still require that hash.
 if(a===undefined){
  const block="0x"+BigInt(reportedBlockNumber).toString(16);
  let hash;
  for(const host of hosts){
   if(await rpc(host,"eth_chainId",[])!=="0x2105")throw Error("Wrong Base chain");
   const b=await rpc(host,"eth_getBlockByNumber",[block,false]);
   const candidate=assertBaseBlockIdentity(b,block,hash??null);
   hash=candidate;
  }
  a=anchorOf({block,hash});
 }
 const tag={blockHash:a.hash,requireCanonical:true};
 async function observe(host){
  async function fence(){
   if(await rpc(host,"eth_chainId",[])!=="0x2105")throw Error("Wrong Base chain");
   const b=await rpc(host,"eth_getBlockByNumber",[a.block,false]);assertBaseBlockIdentity(b,a.block,a.hash);
   if(typeof b.timestamp!=="string"||!/^0x[1-9a-f][0-9a-f]{0,12}$/.test(b.timestamp))throw Error("Invalid block timestamp");
   return Number(BigInt(b.timestamp));
  }
  const timestamp=await fence();
  const call=(to,data)=>rpc(host,"eth_call",[{to,data},tag]);
  const pool=address(await call(factory,"0x1698ee82"+word(token0.slice(2))+word(token1.slice(2))+word("1f4")));
  if(pool===factory||pool===token0||pool===token1)throw Error("Invalid candidate pool identity");
  async function fingerprint(addr){
   const code=await rpc(host,"eth_getCode",[addr,tag]);
   if(typeof code!=="string"||!/^0x(?:[0-9a-f]{2}){1,24576}$/.test(code))throw Error("Invalid pool runtime");
   const bytes=Uint8Array.from(code.slice(2).match(/../g),x=>parseInt(x,16));
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
   return {sha256:digest,bytes:bytes.length};
  }
  const factoryCode=await fingerprint(factory),poolCode=await fingerprint(pool);
  if(address(await call(pool,"0xc45a0155"))!==factory||
   address(await call(pool,"0x0dfe1681"))!==token0||
   address(await call(pool,"0xd21220a7"))!==token1||
   uint(await call(pool,"0xddca3f43"),(1n<<24n)-1n)!==500n)throw Error("Pool identity mismatch");
  const liquidity=uint(await call(pool,"0x1a686502"),(1n<<128n)-1n);
  if(liquidity===0n)throw Error("No active pool liquidity");
  const slot0=decodeCandidateSlot0(await call(pool,"0x3850c7bd"));
  if(await fence()!==timestamp)throw Error("Block timestamp changed");
  return {chainId:8453,pool:pool,factory:factory,token0,token1,fee:"500",poolRuntimeSha256:poolCode.sha256,factoryRuntimeSha256:factoryCode.sha256,poolRuntimeBytes:poolCode.bytes,factoryRuntimeBytes:factoryCode.bytes,blockHash:a.hash,blockNumber:a.block,timestamp,liquidity:liquidity.toString(),...slot0};
 }
 const first=await observe(hosts[0]),second=await observe(hosts[1]);
 if(JSON.stringify(first)!==JSON.stringify(second))throw Error("Pool observations disagree");
 return Object.freeze({...first,sourceBinaryParityVerified:false,create2AddressVerified:false,twoHostsAgreed:true,providerIndependenceVerified:false,stateAuthenticated:false,actualQuotePoolVerified:false,observationOnly:true,executable:false});
}

assert.equal(BASE_EXECUTION_ENABLED,false);
console.log(JSON.stringify(await observeHistoricalSushiPool({authorized:true})));
