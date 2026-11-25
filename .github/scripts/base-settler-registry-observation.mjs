// Official registry observation for taker-submitted Settler (feature 2).
// No hardcoded Settler destination, no authorization, no transaction.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const registry="0x00000000000004533fe15556b1e086bb1a72ceae";
const revision="f7340e6237146b2dfd40a40b3efeea527e4eb689";
// Official ERC1967UUPSProxy.sol runtime: runtime0 || implementation slot || runtime1.
const implementationSlot="0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const expectedProxy="0x365f5f375f5f365f7f"+implementationSlot.slice(2)+"545af43d5f5f3e6036573d5ffd5b3d5ff3";
const blockPattern=/^0x[1-9a-f][0-9a-f]{0,15}$/;
const hashPattern=/^0x[0-9a-fA-F]{64}$/;
let id=0;
async function rpc(method,params){
 assert.ok(["eth_chainId","eth_blockNumber","eth_getBlockByNumber","eth_getCode","eth_getStorageAt","eth_call"].includes(method));
 const requestId=++id;
 const r=await fetch("https://mainnet.base.org",{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200);
 const reader=r.body?.getReader();assert.ok(reader);
 let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4194304){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,requestId);assert.ok(!Object.hasOwn(j,"error"));return j.result;
}
assert.equal(await rpc("eth_chainId",[]),"0x2105");
const block=await rpc("eth_blockNumber",[]);assert.match(block,blockPattern);
async function blockHash(){
 const b=await rpc("eth_getBlockByNumber",[block,false]);assert.equal(b?.number,block);assert.match(b?.hash,hashPattern);return b.hash.toLowerCase();
}
const before=await blockHash();
async function codeObservation(address,expected){
 const hex=await rpc("eth_getCode",[address,block]);
 if(expected)assert.equal(hex.toLowerCase(),expected,"Registry proxy runtime differs from official source");assert.match(hex,/^0x(?:[0-9a-fA-F]{2}){1,24576}$/);
 const bytes=Buffer.from(hex.slice(2),"hex");
 return {address,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
}
const registryCode=await codeObservation(registry,expectedProxy);
function decodeAddress(value){
 assert.match(value,/^0x0{24}[0-9a-fA-F]{40}$/);
 const address="0x"+value.slice(-40).toLowerCase();
 assert.notEqual(address,"0x"+"0".repeat(40));return address;
}
const implementation=decodeAddress(await rpc("eth_getStorageAt",[registry,implementationSlot,block]));
assert.notEqual(implementation,registry);
const returnedImplementation=decodeAddress(await rpc("eth_call",[{to:registry,data:"0x5c60da1b"},block]));
assert.equal(implementation,returnedImplementation,"Registry implementation() differs from EIP-1967 storage");
const implementationCode=await codeObservation(implementation);
// ownerOf(uint256), feature 2. Any revert/zero/invalid result blocks observation.
const response=await rpc("eth_call",[{to:registry,data:"0x6352211e"+"2".padStart(64,"0")},block]);
const target=decodeAddress(response);
assert.notEqual(target,registry);assert.notEqual(target,implementation);
const current=await codeObservation(target);
assert.equal(await blockHash(),before,"Observed block changed");
assert.equal(await rpc("eth_chainId",[]),"0x2105");
console.log(JSON.stringify({chainId:8453,feature:2,block,blockHash:before,registry:registryCode,proxyRuntimeSourceMatched:true,implementationSlot,implementation:implementationCode,implementationGetterMatched:true,current,sourceRevision:revision,observationOnly:true,executionApproved:false}));
console.log("PASS: official registry proxy runtime matched; implementation slot/getter agree; current Settler observed. Implementation and Settler source matches and execution authorization remain pending.");
