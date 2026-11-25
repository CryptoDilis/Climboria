// Official registry observation for taker-submitted Settler (feature 2).
// No hardcoded Settler destination, no authorization, no transaction.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const registry="0x00000000000004533fe15556b1e086bb1a72ceae";
const revision="f7340e6237146b2dfd40a40b3efeea527e4eb689";
const blockPattern=/^0x[1-9a-f][0-9a-f]{0,15}$/;
const hashPattern=/^0x[0-9a-fA-F]{64}$/;
let id=0;
async function rpc(method,params){
 assert.ok(["eth_chainId","eth_blockNumber","eth_getBlockByNumber","eth_getCode","eth_call"].includes(method));
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
async function codeObservation(address){
 const hex=await rpc("eth_getCode",[address,block]);assert.match(hex,/^0x(?:[0-9a-fA-F]{2}){1,24576}$/);
 const bytes=Buffer.from(hex.slice(2),"hex");
 return {address,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
}
const registryCode=await codeObservation(registry);
// ownerOf(uint256), feature 2. Any revert/zero/invalid result blocks observation.
const response=await rpc("eth_call",[{to:registry,data:"0x6352211e"+"2".padStart(64,"0")},block]);
assert.match(response,/^0x0{24}[0-9a-fA-F]{40}$/);
const target="0x"+response.slice(-40).toLowerCase();
assert.notEqual(target,"0x"+"0".repeat(40));assert.notEqual(target,registry);
const current=await codeObservation(target);
assert.equal(await blockHash(),before,"Observed block changed");
assert.equal(await rpc("eth_chainId",[]),"0x2105");
console.log(JSON.stringify({chainId:8453,feature:2,block,blockHash:before,registry:registryCode,current,sourceRevision:revision,observationOnly:true,executionApproved:false}));
console.log("PASS: current taker-submitted Settler observed through official registry. Not a source match, route review or authorization.");
