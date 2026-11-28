// SPDX-License-Identifier: Apache-2.0
// Read-only dependency evidence. Not an approval, adapter, or source verification.
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const WETH="0x4200000000000000000000000000000000000006";
export const CANDIDATES=Object.freeze({
  "8453:v2": Object.freeze({factory:"0x8909dc15e40173ff4699343b6eb8132c65e18ec6",entry:"0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",weth:WETH,wethSelector:"0xad5c4648"}),
  "8453:v3": Object.freeze({factory:"0x33128a8fc17869897dce68ed026d694621f6fdfd",entry:"0x03a520b32c04bf3beef7beb72e919cf822ed34f1",weth:WETH,wethSelector:"0x4aa4a4fc"}),
  "84532:v3": Object.freeze({factory:"0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",entry:"0x27f971cb582bf9e50f397e4d29a5c7a34f11faa2",weth:WETH,wethSelector:"0x4aa4a4fc"}),
});
const fail=(message)=>{throw new Error(message)};
const require=(condition,message)=>{if(!condition)fail(message)};
const quantity=(v)=>{require(typeof v==="string"&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(v),"INVALID_QUANTITY");return BigInt(v)};
const hex32=(v)=>typeof v==="string"&&/^0x[0-9a-f]{64}$/.test(v)&&!/^0x0+$/.test(v);
const addressWord=(a)=>"0x"+"0".repeat(24)+a.slice(2);
const blockInfo=(b)=>{
  require(b&&typeof b==="object"&&hex32(b.hash),"INVALID_BLOCK");
  const number=quantity(b.number),timestamp=quantity(b.timestamp);
  require(number>0n&&timestamp>0n,"INVALID_BLOCK");
  return {number,hash:b.hash,timestamp};
};
const codeBytes=(v)=>{
  require(typeof v==="string"&&/^0x(?:[0-9a-f]{2})+$/.test(v)&&v.length<=2+24576*2,"INVALID_RUNTIME");
  return Buffer.from(v.slice(2),"hex");
};
export async function observe({chain,protocol,rpcA,rpcB}){
  const candidate=CANDIDATES[chain+":"+protocol];
  require(candidate!==undefined,"UNSUPPORTED_CHAIN_PROTOCOL");
  const expected=BigInt(chain), providers=[rpcA,rpcB];
  // Read-only RPCs, no fallback to latest and no retry.
  const chains=await Promise.all(providers.map(r=>r("eth_chainId",[])));
  require(chains.every(x=>quantity(x)===expected),"CHAIN_MISMATCH");
  const tips=(await Promise.all(providers.map(r=>r("eth_getBlockByNumber",["finalized",false])))).map(blockInfo);
  const n=tips[0].number<tips[1].number?tips[0].number:tips[1].number;
  const tag="0x"+n.toString(16);
  const blocks=(await Promise.all(providers.map(r=>r("eth_getBlockByNumber",[tag,false])))).map(blockInfo);
  require(blocks.every(x=>x.number===n)&&blocks[0].hash===blocks[1].hash&&blocks[0].timestamp===blocks[1].timestamp,"BLOCK_MISMATCH");
  for(let i=0;i<2;i++)if(tips[i].number===n)require(tips[i].hash===blocks[i].hash,"FINALIZED_TIP_MISMATCH");
  const at={blockHash:blocks[0].hash,requireCanonical:true};
  const contracts={};
  for(const role of ["factory","entry","weth"]){
    const address=candidate[role];
    const raw=await Promise.all(providers.map(r=>r("eth_getCode",[address,at])));
    const bytes=raw.map(codeBytes);
    require(bytes[0].equals(bytes[1]),"RUNTIME_MISMATCH_"+role.toUpperCase());
    contracts[role]={address,byteLength:bytes[0].length,runtimeSha256:createHash("sha256").update(bytes[0]).digest("hex")};
  }
  for(const [name,selector,address] of [["factory","0xc45a0155",candidate.factory],["wrappedNative",candidate.wethSelector,candidate.weth]]){
    const values=await Promise.all(providers.map(r=>r("eth_call",[{to:candidate.entry,data:selector},at])));
    require(values.every(v=>v===addressWord(address)),"GETTER_MISMATCH_"+name.toUpperCase());
  }
  return {status:"DUAL_RPC_DEPENDENCY_OBSERVATION_NO_GO",chainId:Number(expected),protocol,
    documentedSource:"Uniswap/docs@54f3200b76e2e01646c41c9b484600d1fd355c6b",
    blockNumber:n.toString(),blockHash:at.blockHash,blockTimestamp:blocks[0].timestamp.toString(),
    contracts,getters:{factory:candidate.factory,wrappedNative:candidate.weth},
    providerIndependence:"NOT_VERIFIED",sourceRuntimeMatch:"NOT_VERIFIED",testnet:"NO_GO",mainnet:"NO_GO",
    limitations:"Two configured RPC endpoints reported identical bytes at a common finalized-reported block hash. SHA-256 hashes are not EVM codehashes. No independent chain finality, provider independence, code provenance, proxy/admin, quote asset, pair, funding or approval verified."};
}
export function makeRpc(url,label){
  let u;
  try{u=new URL(url)}catch{fail(label+"_INVALID_ENDPOINT")}
  require(u.protocol==="https:"&&!u.username&&!u.password&&!u.hash,label+"_INVALID_ENDPOINT");
  const allowed=new Set(["eth_chainId","eth_getBlockByNumber","eth_getCode","eth_call"]);
  let id=0;
  return async(method,params)=>{
    require(allowed.has(method),label+"_FORBIDDEN_METHOD");
    const current=++id;
    let response;
    try{
      response=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:current,method,params}),redirect:"error",signal:AbortSignal.timeout(15000)});
    }catch{fail(label+"_"+method+"_TRANSPORT")}
    require(response.ok,label+"_"+method+"_HTTP_"+response.status);
    let obj;
    try{obj=await response.json()}catch{fail(label+"_"+method+"_INVALID_JSON")}
    require(obj&&obj.jsonrpc==="2.0"&&obj.id===current,label+"_"+method+"_INVALID_RESPONSE");
    if(obj.error){const c=obj.error.code;fail(label+"_"+method+"_RPC_"+(Number.isInteger(c)&&c>=-32768&&c<=-32000?c:"ERROR"))}
    require(Object.hasOwn(obj,"result"),label+"_"+method+"_MISSING_RESULT");
    return obj.result;
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [chain,protocol]=process.argv.slice(2);
    const a=process.env.CLIMB_BASE_RPC_URL,b=process.env.CLIMB_BASE_RPC_URL_SECONDARY;
    require(a&&b&&a!==b,"TWO_DISTINCT_ENDPOINTS_REQUIRED");
    const result=await observe({chain,protocol,rpcA:makeRpc(a,"A"),rpcB:makeRpc(b,"B")});
    console.log(JSON.stringify(result,null,2));
  }catch(e){
    // Only internally generated allowlisted diagnostic strings; never URLs or raw provider errors.
    const message=typeof e?.message==="string"&&/^[A-Z][A-Z0-9_a-z-]{0,120}$/.test(e.message)?e.message:"OBSERVATION_FAILED";
    console.error("NO_GO: "+message);process.exitCode=1;
  }
}
