// Compile pinned official Solidity source; never run its deployment scripts.
import assert from "node:assert/strict";
import {readFileSync,realpathSync} from "node:fs";
import {resolve,relative,isAbsolute} from "node:path";
import {createHash} from "node:crypto";
import solc from "solc";
import {keccak256} from "ethers";
const sourceRevision="f7340e6237146b2dfd40a40b3efeea527e4eb689";
const expectedInit="0x7510de5fbf18124b7fab39b9a5a30164534a44b1ef51b34bb91636e51c74089f";
const previousRuntime="19f7b3f5410204f7deb3ff7c19bd8cb97a84fecf8c4afeb412fefd84f6867877";
const holder="0x0000000000001ff3684f28c67538d4d072c22734";
const root=realpathSync("official-zeroex-settler");
const entry="src/allowanceholder/AllowanceHolder.sol";
function readSource(path){
 const actual=realpathSync(resolve(root,path)),rel=relative(root,actual);
 assert.ok(rel&&!rel.startsWith("..")&&!isAbsolute(rel)&&rel.endsWith(".sol"),"Import must remain inside pinned Solidity source tree");
 return readFileSync(actual,"utf8");
}
assert.match(solc.version(),/^0\.8\.25\+commit\.b61c2a91/);
const remappings=readFileSync(resolve(root,"remappings.txt"),"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(mapping=>{
 // Foundry normalizes directory remapping targets; standard JSON solc
 // concatenates the target literally. Preserve paths with the required slash.
 const eq=mapping.indexOf("="),prefix=mapping.slice(0,eq),target=mapping.slice(eq+1);
 return prefix.endsWith("/")&&!target.endsWith("/")?prefix+"="+target+"/":mapping;
});
const input={language:"Solidity",sources:{[entry]:{content:readSource(entry)}},settings:{remappings,optimizer:{enabled:true,runs:1000000,details:{constantOptimizer:true,yul:true}},viaIR:true,evmVersion:"cancun",metadata:{bytecodeHash:"none",appendCBOR:false},outputSelection:{[entry]:{"AllowanceHolder":["evm.bytecode.object","evm.deployedBytecode.object","evm.deployedBytecode.immutableReferences"]}}}};
const output=JSON.parse(solc.compile(JSON.stringify(input),{import:path=>{try{return {contents:readSource(path)}}catch{return {error:"Pinned Solidity import unavailable"}}}}));
const errors=(output.errors||[]).filter(e=>e.severity==="error");
assert.equal(errors.length,0,errors.map(e=>e.formattedMessage).join("\n"));
const artifact=output.contracts[entry].AllowanceHolder.evm;
assert.match(artifact.bytecode.object,/^(?:[0-9a-f]{2})+$/);
assert.match(artifact.deployedBytecode.object,/^(?:[0-9a-f]{2})+$/);
assert.deepEqual(artifact.deployedBytecode.immutableReferences||{},{});
const initHash=keccak256("0x"+artifact.bytecode.object);
const compiled=artifact.deployedBytecode.object.toLowerCase();
const sha=hex=>createHash("sha256").update(Buffer.from(hex,"hex")).digest("hex");
console.log(JSON.stringify({sourceRevision,compiler:solc.version(),initHash,expectedInit,compiledRuntimeBytes:compiled.length/2,compiledRuntimeSha256:sha(compiled)}));
assert.equal(initHash,expectedInit,"Compiled creation bytecode must match official deployment-script commitment");
assert.equal(sha(compiled),previousRuntime,"Compiled runtime must match prior Base observation");
let id=0;
async function rpc(method,params){
 const requestId=++id;
 assert.ok(["eth_chainId","eth_blockNumber","eth_getCode"].includes(method));
 const r=await fetch("https://mainnet.base.org",{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200);
 const reader=r.body?.getReader();assert.ok(reader);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();throw Error("RPC response too large");}chunks.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,requestId);assert.ok(!Object.hasOwn(j,"error"));return j.result;
}
assert.equal(await rpc("eth_chainId",[]),"0x2105");
const block=await rpc("eth_blockNumber",[]);
assert.match(block,/^0x[1-9a-f][0-9a-f]*$/);
const observed=await rpc("eth_getCode",[holder,block]);
assert.match(observed,/^0x(?:[0-9a-fA-F]{2})+$/);
assert.equal(observed.toLowerCase(),"0x"+compiled,"Exact compiled runtime must match observed Base runtime");
console.log(JSON.stringify({chainId:8453,holder,block,runtimeBytes:compiled.length/2,runtimeSha256:sha(compiled),sourceRevision,creationCommitmentMatched:true,exactRuntimeMatched:true,executionApproved:false}));
console.log("PASS: pinned official AllowanceHolder source, creation commitment and exact observed Base runtime match. No execution approval.");
