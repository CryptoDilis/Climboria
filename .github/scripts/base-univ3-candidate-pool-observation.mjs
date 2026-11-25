// Read-only candidate evidence; never a quote route allowlist or execution approval.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";
import {BASE_UNIV3_FACTORY as factory,BASE_UNIV3_INIT_HASH as initHash} from "../../dex/base-execution/univ3-action-policy.mjs";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
// Candidate only: the observed quote disclosed no actual pool fee or address.
const token0="0x4200000000000000000000000000000000000006";
const token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const fee=500n;
const word=v=>(typeof v==="bigint"?v.toString(16):v.slice(2)).padStart(64,"0");
const hashPattern=/^0x[0-9a-f]{64}$/;
const addressPattern=/^0x[0-9a-f]{40}$/;
const cast=(...args)=>execFileSync("cast",args,{encoding:"utf8",timeout:10000}).trim().toLowerCase();
const keccak=hex=>{const h=cast("keccak",hex);assert.match(h,hashPattern);return h;};
const selector=sig=>{const s=cast("sig",sig);assert.match(s,/^0x[0-9a-f]{8}$/);return s;};
assert.ok(token0<token1);assert.match(factory,addressPattern);assert.match(initHash,hashPattern);
const salt=keccak("0x"+word(token0)+word(token1)+word(fee));
const pool="0x"+keccak("0xff"+factory.slice(2)+salt.slice(2)+initHash.slice(2)).slice(-40);
const expectedGetPool=selector("getPool(address,address,uint24)")+word(token0)+word(token1)+word(fee);
const selectors=Object.fromEntries(["factory()","token0()","token1()","fee()","liquidity()","slot0()"].map(s=>[s,selector(s)]));
const deadline=AbortSignal.timeout(180000);
let id=0;
async function rpc(host,method,params){
 assert.ok(hosts.includes(host));assert.ok(["eth_chainId","eth_getBlockByNumber","eth_getCode","eth_call"].includes(method));
 await sleep(350,undefined,{signal:deadline});
 const requestId=++id;
 const r=await fetch(host,{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.any([deadline,AbortSignal.timeout(12000)])});
 assert.equal(r.status,200,"Read-only RPC HTTP failure");
 const reader=r.body?.getReader();assert.ok(reader);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,requestId);assert.ok(!Object.hasOwn(j,"error"),"RPC rejected observation");assert.ok(Object.hasOwn(j,"result"));return j.result;
}
function blockIdentity(b){
 assert.match(b?.number,/^0x[1-9a-f][0-9a-f]{0,15}$/);assert.match(b?.hash,hashPattern);return {number:b.number,hash:b.hash};
}
function readAddress(v){assert.match(v,/^0x0{24}[0-9a-f]{40}$/);return "0x"+v.slice(-40);}
function readUint(v,max){assert.match(v,hashPattern);const n=BigInt(v);assert.ok(n<=max);return n;}
const pinned=blockIdentity(await rpc(hosts[0],"eth_getBlockByNumber",["finalized",false]));
async function observe(host){
 assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");
 assert.deepEqual(blockIdentity(await rpc(host,"eth_getBlockByNumber",[pinned.number,false])),pinned);
 const tag={blockHash:pinned.hash,requireCanonical:true};
 const call=(to,data)=>rpc(host,"eth_call",[{to,data},tag]);
 const codeHash=async to=>{
  const code=await rpc(host,"eth_getCode",[to,tag]);assert.match(code,/^0x(?:[0-9a-f]{2}){1,24576}$/);
  return createHash("sha256").update(Buffer.from(code.slice(2),"hex")).digest("hex");
 };
 assert.equal(readAddress(await call(factory,expectedGetPool)),pool,"Factory and CREATE2 disagree");
 assert.equal(readAddress(await call(pool,selectors["factory()"])),factory);
 assert.equal(readAddress(await call(pool,selectors["token0()"])),token0);
 assert.equal(readAddress(await call(pool,selectors["token1()"])),token1);
 assert.equal(readUint(await call(pool,selectors["fee()"]),(1n<<24n)-1n),fee);
 const liquidity=readUint(await call(pool,selectors["liquidity()"]),(1n<<128n)-1n);
 assert.ok(liquidity>0n,"Candidate has no active liquidity");
 const slot0=await call(pool,selectors["slot0()"]);assert.match(slot0,/^0x[0-9a-f]{448}$/);
 const price=BigInt("0x"+slot0.slice(2,66));
 assert.ok(price>4295128739n&&price<1461446703485210103287273052203988822378723970342n,"Uninitialized or out-of-range price");
 const factoryRuntimeSha256=await codeHash(factory),poolRuntimeSha256=await codeHash(pool);
 assert.deepEqual(blockIdentity(await rpc(host,"eth_getBlockByNumber",[pinned.number,false])),pinned);
 assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");
 return {factoryRuntimeSha256,poolRuntimeSha256,liquidity:liquidity.toString(),slot0};
}
const first=await observe(hosts[0]),second=await observe(hosts[1]);
assert.deepEqual(first,second,"RPC observations disagree");
console.log(JSON.stringify({chainId:8453,block:pinned,factory,pool,token0,token1,fee:fee.toString(),salt,...first,observationOnly:true,providerIndependenceVerified:false,actualQuotePoolVerified:false,runtimeSourceMatchVerified:false,executionApproved:false}));
