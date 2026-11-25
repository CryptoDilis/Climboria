// Exact deployed Base Settler runtime comparison, read-only; never deploy.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const sourceRevision="2f4f0e570f8cff38dfe2e8a41bb9459e7abb99db";
const target="0x7130a552999c7e2cae6b38f9336e90c457abd47d";
const deploymentBlock="0x3afe140";
const deploymentHash="0x285395de05d65985254823bbebbb9b8f2d1529d27710c250209eccf99077cf23";
const expected="765c7a94d553158d358321724e0e466a9fe2a23418514efd911375275389bbee";
const artifact=JSON.parse(readFileSync("official-zeroex-settler/out/BaseTakerSubmittedFlat.sol/BaseSettler.json","utf8"));
const template=artifact.deployedBytecode?.object;
assert.match(template,/^0x[0-9a-fA-F]{48156}$/);
assert.equal(Object.keys(artifact.deployedBytecode.linkReferences??{}).length,0,"Unresolved libraries");
const entries=Object.entries(artifact.deployedBytecode.immutableReferences??{});
assert.equal(entries.length,1,"Unexpected immutable count");
const [astId,slots]=entries[0];
assert.ok(artifact.ast,"Compiler AST required");
const declarations=[];
function visit(node){
 if(!node||typeof node!=="object")return;
 if(node.nodeType==="VariableDeclaration"&&String(node.id)===astId)declarations.push(node);
 for(const child of Object.values(node))visit(child);
}
visit(artifact.ast);
assert.equal(declarations.length,1,"Immutable AST identity unavailable");
const declaration=declarations[0];
assert.equal(declaration.name,"_DOMAIN_SEPARATOR");
assert.equal(declaration.mutability,"immutable");
assert.equal(declaration.typeDescriptions?.typeString,"bytes32");
// Independently derive the constructor value from the pinned Attest.sol:
// keccak256(abi.encode(keccak256(domain type),keccak256("0xSettler"),8453,target)).
// Never copy bytes from observed chain runtime or ignore immutable positions.
const cast=(...args)=>execFileSync("cast",args,{encoding:"utf8",timeout:10000}).trim();
const typeHash=cast("keccak","EIP712Domain(string name,uint256 chainId,address verifyingContract)");
const nameHash=cast("keccak","0x"+Buffer.from("0xSettler","utf8").toString("hex"));
const encoded=cast("abi-encode","f(bytes32,bytes32,uint256,address)",typeHash,nameHash,"8453",target);
assert.match(encoded,/^0x[0-9a-fA-F]{256}$/);
const domain=cast("keccak",encoded);
assert.match(domain,/^0x[0-9a-fA-F]{64}$/);
assert.ok(Array.isArray(slots)&&slots.length>0&&slots.length<=100);
const bytes=Buffer.from(template.slice(2),"hex"),value=Buffer.from(domain.slice(2),"hex");
const occupied=new Set();
for(const {start,length} of slots){
 assert.ok(Number.isSafeInteger(start)&&start>=0&&length===32&&start+length<=bytes.length);
 for(let i=start;i<start+length;i++){assert.ok(!occupied.has(i));occupied.add(i);assert.equal(bytes[i],0,"Unexpected nonzero immutable placeholder");}
 value.copy(bytes,start);
}
const compiled="0x"+bytes.toString("hex");
console.log(JSON.stringify({immutable:declaration.name,immutableAstId:astId,slots:slots.length,derivedDomainSeparator:domain}));
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
