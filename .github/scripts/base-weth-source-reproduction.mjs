// Read-only exact source/runtime replay of the Base WETH predeploy.
// No wallet, signing, approval, broadcast or execution permission.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {keccak256,toUtf8Bytes} from "ethers";
import solc from "solc";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const address="0x4200000000000000000000000000000000000006";
const expected="667c900c2c6da80d452501a9c6332e046384a0c438c3334ce6f71c86dd7b8735";
const block={number:"0x3b57ffe",hash:"0x7d3452bfd771332b5457603dd86211815de35dd1f3e0bf73938adfae62396a74"};
const tag={blockHash:block.hash,requireCanonical:true};
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
const deadline=AbortSignal.timeout(120000);
async function json(url,opts,max){
 const response=await fetch(url,{...opts,redirect:"error",credentials:"omit",cache:"no-store",signal:AbortSignal.any([deadline,AbortSignal.timeout(20000)])});
 if(!response.ok){await response.body?.cancel();throw Error("Read-only endpoint unavailable: HTTP "+response.status);}
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error("Oversized read-only response");}chunks.push(value);}}finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));
}
let seq=0;
async function rpc(host,method,params){
 assert.ok(hosts.includes(host));assert.ok(["eth_chainId","eth_getBlockByNumber","eth_getCode"].includes(method));
 const id=++seq;const body=await json(host,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params})},262144);
 assert.equal(body.jsonrpc,"2.0");assert.equal(body.id,id);assert.ok(!Object.hasOwn(body,"error"));assert.ok(Object.hasOwn(body,"result"));return body.result;
}
const sha=hex=>createHash("sha256").update(Buffer.from(hex,"hex")).digest("hex");
async function observe(host){
 const fence=async()=>{assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");const b=await rpc(host,"eth_getBlockByNumber",[block.number,false]);assert.equal(b?.number,block.number);assert.equal(b?.hash,block.hash);};
 await fence();const code=await rpc(host,"eth_getCode",[address,tag]);assert.match(code,/^0x(?:[0-9a-f]{2}){1,24576}$/);assert.equal(sha(code.slice(2)),expected);await fence();return code.slice(2);
}
const first=await observe(hosts[0]),second=await observe(hosts[1]);assert.equal(first,second);
const url=new URL("https://sourcify.dev/server/v2/contract/8453/"+address);url.searchParams.set("fields","metadata,sources");
const record=await json(url,{headers:{accept:"application/json"}},4*1024*1024);
if(record.address!==undefined)assert.equal(record.address.toLowerCase(),address);
if(record.chainId!==undefined)assert.equal(String(record.chainId),"8453");
const metadata=typeof record.metadata==="string"?JSON.parse(record.metadata):record.metadata;
const target=Object.entries(metadata?.settings?.compilationTarget??{});
console.log(JSON.stringify({address,block,observedRuntimeSha256:expected,observedBytes:first.length/2,recordCompiler:metadata?.compiler?.version,compilationTarget:target}));
assert.equal(metadata.language,"Solidity");assert.equal(metadata.compiler.version,"0.8.15+commit.e14f2714","Unexpected compiler: pin actual record version before replay");assert.match(solc.version(),/^0\.8\.15\+commit\.e14f2714\./);
assert.equal(target.length,1);assert.equal(target[0][1],"WETH9");
const names=Object.keys(metadata.sources);assert.ok(names.length>0&&names.length<=256);assert.ok(names.includes(target[0][0]));
let total=0;
const sources=Object.fromEntries(names.map(name=>{
 assert.ok(name.length<=512&&!/[\x00-\x1f]/.test(name)&&name.endsWith(".sol")&&!["__proto__","prototype","constructor"].includes(name));
 const content=record.sources?.[name]?.content;assert.equal(typeof content,"string");total+=Buffer.byteLength(content);assert.ok(total<=4*1024*1024);
 assert.match(metadata.sources[name]?.keccak256,/^0x[0-9a-f]{64}$/);assert.equal(keccak256(toUtf8Bytes(content)),metadata.sources[name].keccak256);
 return [name,{content}];
}));
const {compilationTarget,...settings}=structuredClone(metadata.settings);
for(const key of Object.keys(settings))assert.ok(["optimizer","evmVersion","remappings","metadata","debug","libraries","viaIR"].includes(key),"Unsupported compiler setting");
assert.ok(Number.isInteger(settings.optimizer?.runs)&&settings.optimizer.runs>=0&&settings.optimizer.runs<=10000000);
assert.deepEqual(settings.libraries??{},{});settings.outputSelection={[target[0][0]]:{WETH9:["evm.deployedBytecode"]}};
const output=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources,settings})));
assert.deepEqual((output.errors??[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const runtime=output.contracts?.[target[0][0]]?.WETH9?.evm?.deployedBytecode;assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
const exactMatch=runtime.object===first;
console.log(JSON.stringify({address,block,compiler:solc.version(),sourceCount:names.length,optimizerRuns:settings.optimizer.runs,compiledSha256:sha(runtime.object),observedSha256:expected,sourceBinaryParityVerified:exactMatch,providerIndependenceVerified:false,transferSemanticsVerified:false,executionApproved:false}));
assert.ok(exactMatch,"Full WETH runtime reproduction failed");
