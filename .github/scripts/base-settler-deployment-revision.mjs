// Read-only deployment provenance evidence. No transaction construction or authorization.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";
const REGISTRY="0x00000000000004533fe15556b1e086bb1a72ceae";
const GIT_COMMIT="0x16fbd3a71aa6d159973eb9ff1e1199f9fe242767e6f30ac662a492f92ac70411";
const DEPLOYED="0xaa94c583a45742b26ac5274d230aea34ab334ed5722264aa5673010e612bc0b2";
const quantity=n=>"0x"+n.toString(16),word=n=>n.toString(16).padStart(64,"0");
const hash=/^0x[0-9a-fA-F]{64}$/;
const fingerprint=code=>createHash("sha256").update(Buffer.from(code.slice(2),"hex")).digest("hex");
let id=0,lastRequest=0,rateLimitRetryUsed=false;
const deadline=AbortSignal.timeout(180000);
async function rpc(method,params){
 assert.ok(["eth_chainId","eth_blockNumber","eth_getCode","eth_call","eth_getBlockReceipts","eth_getBlockByNumber"].includes(method));
 // Public RPC is rate limited; serialize and space requests. At most one
 // bounded HTTP 429 retry for the entire run, respecting Retry-After.
 let r,requestId;
 for(;;){
  const delay=Math.max(0,1500-(Date.now()-lastRequest));
  if(delay)await sleep(delay,undefined,{signal:deadline});
  deadline.throwIfAborted();lastRequest=Date.now();requestId=++id;
  r=await fetch("https://mainnet.base.org",{method:"POST",redirect:"error",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestId,method,params}),signal:AbortSignal.any([deadline,AbortSignal.timeout(12000)])});
  if(r.status!==429||rateLimitRetryUsed)break;
  rateLimitRetryUsed=true;
  const header=r.headers.get("retry-after");
  const wait=header===null?5000:/^[0-9]+$/.test(header)?Number(header)*1000:Date.parse(header)-Date.now();
  await r.body?.cancel();
  assert.ok(Number.isFinite(wait)&&wait<=15000,"RPC requested longer backoff; stop");
  console.log("Public RPC throttled "+method+"; one bounded retry");
  await sleep(Math.max(5000,wait),undefined,{signal:deadline});
 }
 if(r.status!==200){await r.body?.cancel();throw Error("RPC HTTP "+r.status+" at "+method+" request "+requestId);}
 const reader=r.body?.getReader();assert.ok(reader);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4194304){await reader.cancel();throw Error("Oversized RPC response");}chunks.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,requestId);assert.ok(!Object.hasOwn(j,"error"),"Historical RPC unavailable or query rejected");assert.ok(Object.hasOwn(j,"result"));return j.result;
}
assert.equal(await rpc("eth_chainId",[]),"0x2105");
const observed=await rpc("eth_blockNumber",[]);assert.match(observed,/^0x[1-9a-f][0-9a-f]{0,15}$/);
const observedNumber=BigInt(observed);
async function blockHash(block){const b=await rpc("eth_getBlockByNumber",[block,false]);assert.equal(b?.number,block);assert.match(b?.hash,hash);return b.hash.toLowerCase();}
const observedHash=await blockHash(observed);
const owner=await rpc("eth_call",[{to:REGISTRY,data:"0x6352211e"+word(2n)},observed]);assert.match(owner,/^0x0{24}[0-9a-fA-F]{40}$/);
const target="0x"+owner.slice(-40).toLowerCase();assert.notEqual(target,"0x"+"0".repeat(40));assert.notEqual(target,REGISTRY);
const info=await rpc("eth_call",[{to:REGISTRY,data:"0x72ba306f"+target.slice(2).padStart(64,"0")},observed]);
assert.match(info,/^0x[0-9a-fA-F]{128}$/);
assert.equal(BigInt("0x"+info.slice(2,66)),2n);
const nonce=BigInt("0x"+info.slice(66));assert.ok(nonce>0n&&nonce<=0xffffffffn);
async function codeAt(block){
 const code=await rpc("eth_getCode",[target,quantity(block)]);
 assert.match(code,/^0x(?:[0-9a-fA-F]{2}){0,24576}$/);
 return code.toLowerCase();
}
const current=await codeAt(observedNumber);assert.notEqual(current,"0x");
const runtimeSha256=fingerprint(current);
async function present(block){
 const code=await codeAt(block);
 if(code==="0x")return false;
 assert.equal(fingerprint(code),runtimeSha256,"Different historical runtime");
 return true;
}
// Bounded exponential search, then bisection. Actual creation evidence is
// required below; never treat a guessed first-code block as deployment proof.
let upper=observedNumber,lower=null,step=1024n;
for(let i=0;i<18;i++){
 const probe=observedNumber>step?observedNumber-step:0n;
 if(!await present(probe)){lower=probe;break;}
 upper=probe;if(probe===0n)break;step*=2n;
}
assert.notEqual(lower,null,"Could not bound deployment; archive RPC may be required");
for(let i=0;upper-lower>1n&&i<28;i++){
 const mid=(lower+upper)/2n;
 if(await present(mid))upper=mid;else lower=mid;
}
assert.equal(upper-lower,1n);
const deploymentBlock=quantity(upper),deploymentHash=await blockHash(deploymentBlock);
assert.equal(await codeAt(lower),"0x");assert.equal(await codeAt(upper),current);
// Query receipts for exactly the located deployment block instead of eth_getLogs.
// Do not fall back to another endpoint or method on throttling.
console.log(JSON.stringify({checkpoint:"historical-code-boundary",target,deploymentBlock,deploymentHash,runtimeSha256}));
const receipts=await rpc("eth_getBlockReceipts",[deploymentBlock]);
assert.ok(Array.isArray(receipts)&&receipts.length>0&&receipts.length<=10000,"Invalid block receipts");
const matching=[];
for(const receipt of receipts){
 assert.equal(receipt.blockNumber,deploymentBlock);
 assert.equal(receipt.blockHash.toLowerCase(),deploymentHash);
 assert.match(receipt.transactionHash,hash);
 assert.ok(Array.isArray(receipt.logs));
 for(const log of receipt.logs){
  if(typeof log.address!=="string"||!Array.isArray(log.topics))throw Error("Invalid receipt log");
  const address=log.address.toLowerCase(),topic=log.topics[0]?.toLowerCase();
  if((address===REGISTRY&&topic===DEPLOYED)||(address===target&&topic===GIT_COMMIT)){
   assert.equal(receipt.status,"0x1");
   assert.equal(log.transactionHash.toLowerCase(),receipt.transactionHash.toLowerCase());
   matching.push(log);
  }
 }
}
async function oneLog(address,topics){
 const logs=matching.filter(log=>log.address.toLowerCase()===address&&topics.every((topic,i)=>log.topics[i]?.toLowerCase()===topic));
 assert.equal(logs.length,1,"Expected exactly one matching deployment event");
 const log=logs[0];assert.equal(log.blockNumber,deploymentBlock);assert.equal(log.blockHash.toLowerCase(),deploymentHash);assert.notEqual(log.removed,true);assert.equal(log.data,"0x");assert.match(log.transactionHash,hash);
 return log;
}
const deployedTopics=[DEPLOYED,"0x"+word(2n),"0x"+word(nonce),"0x"+target.slice(2).padStart(64,"0")];
const deployed=await oneLog(REGISTRY,deployedTopics);assert.deepEqual(deployed.topics.map(x=>x.toLowerCase()),deployedTopics);
const commitLog=await oneLog(target,[GIT_COMMIT]);
assert.equal(commitLog.topics.length,2);assert.equal(commitLog.topics[0].toLowerCase(),GIT_COMMIT);
assert.match(commitLog.topics[1],/^0x[0-9a-fA-F]{40}0{24}$/);
const sourceRevision=commitLog.topics[1].slice(2,42).toLowerCase();assert.notEqual(sourceRevision,"0".repeat(40));
assert.equal(commitLog.transactionHash.toLowerCase(),deployed.transactionHash.toLowerCase());
assert.equal(await blockHash(deploymentBlock),deploymentHash);assert.equal(await blockHash(observed),observedHash);assert.equal(await rpc("eth_chainId",[]),"0x2105");
console.log(JSON.stringify({chainId:8453,feature:2,nonce:nonce.toString(),target,observedBlock:observed,observedHash,deploymentBlock,deploymentHash,deploymentTx:deployed.transactionHash,sourceRevision,runtimeBytes:(current.length-2)/2,runtimeSha256,observationOnly:true,executionApproved:false}));
console.log("PASS: registry deployment event and Settler GitCommit event matched in the same historical transaction. Source correspondence still requires reproducible build.");
