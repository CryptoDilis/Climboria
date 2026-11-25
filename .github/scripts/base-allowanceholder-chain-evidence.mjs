// Read-only public Base RPC observation. This is evidence, not an approved
// execution policy. Never construct approvals or transactions here.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
export const ALLOWANCE_HOLDER="0x0000000000001ff3684f28c67538d4d072c22734";
export const RPC_URL="https://mainnet.base.org";
export const SOURCE_REVISION="f7340e6237146b2dfd40a40b3efeea527e4eb689";
let id=0;
async function rpc(method,params){
 assert.ok(["eth_chainId","eth_blockNumber","eth_getCode"].includes(method));
 const requestId=++id;
 const r=await fetch(RPC_URL,{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.timeout(15000)});
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
const code=await rpc("eth_getCode",[ALLOWANCE_HOLDER,block]);
assert.match(code,/^0x(?:[0-9a-fA-F]{2}){1,24576}$/);
const bytes=Buffer.from(code.slice(2),"hex");
assert.ok(bytes.length>32,"Expected nontrivial contract runtime");
console.log(JSON.stringify({chainId:8453,contract:ALLOWANCE_HOLDER,block,byteLength:bytes.length,sha256Runtime:createHash("sha256").update(bytes).digest("hex"),sourceRevision:SOURCE_REVISION,observationOnly:true,executionApproved:false}));
console.log("PASS: official-source candidate address contains nonempty runtime bytecode on Base at observed block. Not a source-to-bytecode match or execution approval.");
