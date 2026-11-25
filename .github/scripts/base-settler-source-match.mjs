// Exact deployed Base Settler runtime comparison, read-only; never deploy.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const sourceRevision="2f4f0e570f8cff38dfe2e8a41bb9459e7abb99db";
const target="0x7130a552999c7e2cae6b38f9336e90c457abd47d";
const deploymentBlock="0x3afe140";
const deploymentHash="0x285395de05d65985254823bbebbb9b8f2d1529d27710c250209eccf99077cf23";
const expected="765c7a94d553158d358321724e0e466a9fe2a23418514efd911375275389bbee";
const artifact=JSON.parse(readFileSync("official-zeroex-settler/out/BaseTakerSubmittedFlat.sol/BaseSettler.json","utf8"));
const compiled=artifact.deployedBytecode?.object;
assert.match(compiled,/^0x[0-9a-fA-F]{48156}$/);
assert.equal(Object.keys(artifact.deployedBytecode.immutableReferences??{}).length,0,"Unresolved immutable references require separate review");
assert.equal(Object.keys(artifact.deployedBytecode.linkReferences??{}).length,0,"Unresolved libraries");
const digest=hex=>createHash("sha256").update(Buffer.from(hex.slice(2),"hex")).digest("hex");
const compiledHash=digest(compiled);
console.log(JSON.stringify({sourceRevision,compiledBytes:(compiled.length-2)/2,compiledHash,expected}));
assert.equal(compiledHash,expected,"Compiled runtime does not match historical fingerprint");
let id=0;
async function rpc(method,params){
 const requestId=++id;
 const r=await fetch("https://mainnet.base.org",{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200);
 const reader=r.body?.getReader();assert.ok(reader);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4194304){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 assert.equal(j.id,requestId);assert.equal(j.jsonrpc,"2.0");assert.ok(!Object.hasOwn(j,"error"));return j.result;
}
assert.equal(await rpc("eth_chainId",[]),"0x2105");
const block=await rpc("eth_getBlockByNumber",[deploymentBlock,false]);assert.equal(block?.hash?.toLowerCase(),deploymentHash);
const historical=await rpc("eth_getCode",[target,deploymentBlock]);
assert.equal(historical.toLowerCase(),compiled.toLowerCase());
console.log(JSON.stringify({chainId:8453,target,deploymentBlock,deploymentHash,sourceRevision,runtimeBytes:(compiled.length-2)/2,runtimeSha256:compiledHash,exactRuntimeMatched:true,executionApproved:false}));
console.log("PASS: exact reproducible Base Settler runtime match at historical deployment block. No execution approval.");
