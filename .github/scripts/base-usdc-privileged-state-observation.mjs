// Public, bounded read-only observations; no approvals, signing or broadcasts.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";
import {id} from "ethers";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
import {decodeEip1967AddressWord,EIP1967_SLOTS} from "../../dex/base-execution/eip1967-proxy-observation.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const implementation="0x2ce6311ddae708829bc0784c967b7d77d19fd779",admin="0x4fc7850364958d97b4d3f5a08f79db2493f8ca44",library="0x2d943e25e1859ed786afe4afb2b42e14efac691e";
const fingerprints={
 [USDC]:"98d785fcb1bf847f287adc2310759fd94cc13e754b974bc72131382e8266f607",
 [implementation]:"dcb3b7ca28662970d0a7cdad420e529fb837d7bf8a246b1a680c20e153db79e8",
 [library]:"c2f89c8f2f4b2d9f3f1a9c27222107ea797b765fc3cc083b1543967cf4e0998c"
};
const participants={
 allowanceHolder:"0x0000000000001ff3684f28c67538d4d072c22734",
 historicalSettler:"0x103502909141f7025a94b7b99a276dcd128e21a8",
 candidatePool:"0xd0b53d9277642d899df5c87a3966a349a798f224"
};
const slots={implementation:"0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",admin:"0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b"};
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"],deadline=AbortSignal.timeout(180000);
const selector=s=>id(s).slice(0,10);
const word=a=>a.slice(2).padStart(64,"0");
function bool(value){assert.match(value,/^0x0{63}[01]$/,"Noncanonical bool");return value.endsWith("1");}
let seq=0;
async function rpc(host,method,params){
 assert.ok(hosts.includes(host));
 assert.ok(["eth_chainId","eth_getBlockByNumber","eth_getCode","eth_getStorageAt","eth_call"].includes(method));
 await sleep(400,undefined,{signal:deadline});const requestId=++seq;
 const response=await fetch(host,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.any([deadline,AbortSignal.timeout(12000)])});
 if(!response.ok){await response.body?.cancel();throw Error("RPC unavailable");}
 const reader=response.body.getReader();const chunks=[];let n=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>262144){await reader.cancel();throw Error("RPC response too large");}chunks.push(value);}}finally{reader.releaseLock();}
 const body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));
 assert.equal(body.jsonrpc,"2.0");assert.equal(body.id,requestId);assert.ok(!Object.hasOwn(body,"error"));assert.ok(Object.hasOwn(body,"result"));return body.result;
}
function blockIdentity(b){
 assert.match(b?.number,/^0x[1-9a-f][0-9a-f]{0,15}$/);assert.match(b?.hash,/^0x[0-9a-f]{64}$/);assert.notEqual(b.hash,"0x"+"0".repeat(64));assert.match(b.timestamp,/^0x[1-9a-f][0-9a-f]{0,15}$/);
 return {number:b.number,hash:b.hash,timestamp:b.timestamp};
}
const anchor=blockIdentity(await rpc(hosts[0],"eth_getBlockByNumber",["finalized",false]));
const tag={blockHash:anchor.hash,requireCanonical:true};
async function observe(host){
 const fence=async()=>{assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");assert.deepEqual(blockIdentity(await rpc(host,"eth_getBlockByNumber",[anchor.number,false])),anchor);};
 await fence();
 const hashCode=async(a,allowEmpty=false)=>{
  const code=await rpc(host,"eth_getCode",[a,tag]);assert.match(code,/^0x(?:[0-9a-f]{2}){0,24576}$/);
  if(code==="0x"){assert.ok(allowEmpty);return null;}return createHash("sha256").update(Buffer.from(code.slice(2),"hex")).digest("hex");
 };
 for(const [address,expected] of Object.entries(fingerprints))assert.equal(await hashCode(address),expected,"Previously reproduced USDC runtime changed");
 const call=(signature,args="")=>rpc(host,"eth_call",[{to:USDC,data:selector(signature)+args},tag]);
 for(const [key,expected] of Object.entries({implementation,admin})){
  assert.equal(decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[USDC,slots[key],tag])),expected,"USDC legacy proxy state changed");
  assert.equal(decodeEip1967AddressWord(await call(key+"()")),expected);
 }
 for(const slot of Object.values(EIP1967_SLOTS))assert.equal(decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[USDC,slot,tag])),null);
 const paused=bool(await call("paused()"));
 const roles={};
 for(const role of ["owner","pauser","blacklister","masterMinter"]){
  const address=decodeEip1967AddressWord(await call(role+"()"));assert.ok(address,"Missing role");
  roles[role]={address,runtimeSha256:await hashCode(address,true)};
 }
 const blacklist={};
 for(const [label,address] of Object.entries(participants))blacklist[label]={address,blacklisted:bool(await call("isBlacklisted(address)",word(address)))};
 const adminRuntimeSha256=await hashCode(admin,true);
 await fence();
 return {paused,roles,blacklist,adminRuntimeSha256};
}
const first=await observe(hosts[0]),second=await observe(hosts[1]);
assert.deepEqual(first,second,"USDC privilege observations disagree");
console.log(JSON.stringify({chainId:8453,block:anchor,implementation,admin,library,previouslyReproducedRuntimeFingerprintsMatched:true,...first,twoHostsAgreed:true,providerIndependenceVerified:false,controllerAuthorityVerified:false,actualQuoteParticipantsVerified:false,transferSemanticsVerified:false,executionApproved:false}));
assert.equal(first.paused,false,"USDC paused");
assert.ok(Object.values(first.blacklist).every(v=>v.blacklisted===false),"Historical candidate participant restricted");
