// Read-only Base token proxy risk evidence, not token source parity or approval.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";
import {EIP1967_SLOTS,decodeEip1967AddressWord} from "../../dex/base-execution/eip1967-proxy-observation.mjs";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
// Circle stablecoin-evm fc85788bc7c23cefe3df1a757133048bfddadeaa,
// contracts/upgradeability/{UpgradeabilityProxy,AdminUpgradeabilityProxy}.sol.
const LEGACY={implementation:"0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",admin:"0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b"};
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",WETH="0x4200000000000000000000000000000000000006";
const expected={
 [USDC]:"98d785fcb1bf847f287adc2310759fd94cc13e754b974bc72131382e8266f607",
 [WETH]:"667c900c2c6da80d452501a9c6332e046384a0c438c3334ce6f71c86dd7b8735"
};
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
const deadline=AbortSignal.timeout(180000);
let seq=0;
async function rpc(host,method,params){
 assert.ok(hosts.includes(host));
 assert.ok(["eth_chainId","eth_getBlockByNumber","eth_getStorageAt","eth_getCode","eth_call"].includes(method));
 await sleep(400,undefined,{signal:deadline});
 const id=++seq;
 const r=await fetch(host,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),signal:AbortSignal.any([deadline,AbortSignal.timeout(12000)])});
 if(!r.ok){await r.body?.cancel();throw Error("RPC unavailable");}
 const reader=r.body?.getReader();assert.ok(reader);
 let n=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>262144){await reader.cancel();throw Error("Oversized response");}parts.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(parts).toString("utf8"));
 assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,id);assert.ok(!Object.hasOwn(j,"error"));assert.ok(Object.hasOwn(j,"result"));return j.result;
}
function identity(b){assert.match(b?.number,/^0x[1-9a-f][0-9a-f]{0,15}$/);assert.match(b?.hash,/^0x[0-9a-f]{64}$/);assert.notEqual(b.hash,"0x"+"0".repeat(64));return {number:b.number,hash:b.hash};}
const anchor=identity(await rpc(hosts[0],"eth_getBlockByNumber",["finalized",false]));
const tag={blockHash:anchor.hash,requireCanonical:true};
async function observe(host){
 assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");
 assert.deepEqual(identity(await rpc(host,"eth_getBlockByNumber",[anchor.number,false])),anchor);
 const codeHash=async(address,allowEmpty=false)=>{
  const code=await rpc(host,"eth_getCode",[address,tag]);
  assert.match(code,/^0x(?:[0-9a-fA-F]{2}){0,24576}$/);
  if(code==="0x"){assert.ok(allowEmpty,"Missing runtime");return null;}
  return createHash("sha256").update(Buffer.from(code.slice(2),"hex")).digest("hex");
 };
 const result=[];
 for(const token of [USDC,WETH]){
  const tokenRuntimeSha256=await codeHash(token);
  assert.equal(tokenRuntimeSha256,expected[token],"Token runtime differs from prior observation");
  const legacy={},eip1967={};
  for(const [name,slot] of Object.entries(LEGACY))legacy[name]=decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[token,slot,tag]));
  for(const [name,slot] of Object.entries(EIP1967_SLOTS))eip1967[name]=decodeEip1967AddressWord(await rpc(host,"eth_getStorageAt",[token,slot,tag]));
  let implementationRuntimeSha256=null,adminRuntimeSha256=null;
  if(token===USDC){
   assert.ok(legacy.implementation&&legacy.admin,"Legacy USDC slots not populated");
   assert.notEqual(legacy.implementation,token);assert.notEqual(legacy.admin,token);assert.notEqual(legacy.admin,legacy.implementation);
   for(const [name,data] of [["implementation","0x5c60da1b"],["admin","0xf851a440"]]){
    assert.equal(decodeEip1967AddressWord(await rpc(host,"eth_call",[{to:token,data},tag])),legacy[name],"Legacy getter and storage disagree");
   }
   implementationRuntimeSha256=await codeHash(legacy.implementation);
   adminRuntimeSha256=await codeHash(legacy.admin,true);
  }else{
   assert.equal(legacy.implementation,null);assert.equal(legacy.admin,null);
  }
  assert.ok(Object.values(eip1967).every(v=>v===null),"Unexpected EIP-1967 control slots");
  result.push({token,tokenRuntimeSha256,legacy,eip1967,implementationRuntimeSha256,adminRuntimeSha256});
 }
 assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");
 assert.deepEqual(identity(await rpc(host,"eth_getBlockByNumber",[anchor.number,false])),anchor);
 return result;
}
const first=await observe(hosts[0]),second=await observe(hosts[1]);
assert.deepEqual(first,second,"Token state differs across RPC hosts");
console.log(JSON.stringify({chainId:8453,block:anchor,tokens:first,twoHostsAgreed:true,providerIndependenceVerified:false,sourceBinaryParityVerified:false,transferSemanticsVerified:false,controllerAuthorityVerified:false,executionApproved:false}));
