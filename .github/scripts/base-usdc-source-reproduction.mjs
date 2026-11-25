// Reproducibility candidate only; fixed public read-only RPC evidence, no deployment.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,relative,isAbsolute} from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import solc from "solc";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const root=resolve("official-circle-stablecoin"),revision="fc85788bc7c23cefe3df1a757133048bfddadeaa";
const deps=resolve(".github/scripts/node_modules");
assert.equal(execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim(),revision);
assert.match(solc.version(),/^0\.6\.12\+commit\.27d51765\./);
assert.equal(JSON.parse(readFileSync(resolve(deps,"@openzeppelin/contracts/package.json"),"utf8")).version,"3.4.2");
const expected=[
 {path:"contracts/v1/FiatTokenProxy.sol",name:"FiatTokenProxy",address:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",sha256:"98d785fcb1bf847f287adc2310759fd94cc13e754b974bc72131382e8266f607"},
 {path:"contracts/v2/FiatTokenV2_2.sol",name:"FiatTokenV2_2",address:"0x2ce6311ddae708829bc0784c967b7d77d19fd779",sha256:"dcb3b7ca28662970d0a7cdad420e529fb837d7bf8a246b1a680c20e153db79e8"}
];
function source(p){
 const base=p.startsWith("@openzeppelin/contracts/")?deps:root;
 if(!(p.startsWith("contracts/")||p.startsWith("@openzeppelin/contracts/"))||!p.endsWith(".sol"))throw Error("Unsupported import");
 const target=resolve(base,p),rel=relative(base,target);
 if(rel.startsWith("..")||isAbsolute(rel))throw Error("Import escapes source directory");
 return readFileSync(target,"utf8");
}
const libraryPath="contracts/util/SignatureChecker.sol";
const sources=Object.fromEntries([...expected.map(e=>e.path),libraryPath].map(p=>[p,{content:source(p)}]));
const input={language:"Solidity",sources,settings:{optimizer:{enabled:true,runs:10000000},outputSelection:{"*":{"*":["evm.deployedBytecode"]}}}};
function compile(settings=input.settings){
 const out=JSON.parse(solc.compile(JSON.stringify({...input,settings}),{import:p=>{try{return {contents:source(p)};}catch{return {error:"Unresolved reviewed source import: "+p};}}}));
 assert.deepEqual((out.errors??[]).filter(e=>e.severity==="error").map(e=>e.formattedMessage),[]);
 return out;
}
const out=compile();
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const anchor={number:"0x3b57ffe",hash:"0x7d3452bfd771332b5457603dd86211815de35dd1f3e0bf73938adfae62396a74"};
const tag={blockHash:anchor.hash,requireCanonical:true};
const hosts=["https://mainnet.base.org","https://base-rpc.publicnode.com"];
let seq=0;
async function rpc(host,method,params){
 assert.ok(hosts.includes(host));assert.ok(["eth_chainId","eth_getBlockByNumber","eth_getCode"].includes(method));
 const id=++seq;
 const r=await fetch(host,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),signal:AbortSignal.timeout(12000)});
 assert.ok(r.ok,"RPC unavailable");const reader=r.body.getReader();let size=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw Error("Oversized RPC response");}parts.push(value);}}finally{reader.releaseLock();}
 const j=JSON.parse(Buffer.concat(parts).toString("utf8"));assert.equal(j.jsonrpc,"2.0");assert.equal(j.id,id);assert.ok(!Object.hasOwn(j,"error"));assert.ok(Object.hasOwn(j,"result"));return j.result;
}
async function fence(host){
 assert.equal(await rpc(host,"eth_chainId",[]),"0x2105");
 const b=await rpc(host,"eth_getBlockByNumber",[anchor.number,false]);assert.equal(b?.number,anchor.number);assert.equal(b?.hash,anchor.hash);
}
async function code(host,address){
 const v=await rpc(host,"eth_getCode",[address,tag]);assert.match(v,/^0x(?:[0-9a-f]{2}){1,24576}$/);return v.slice(2);
}
function metadata(hex){
 const size=parseInt(hex.slice(-4),16),length=size*2+4;
 if(!Number.isInteger(size)||size<1||size>256||length>=hex.length)return null;
 const cbor=hex.slice(-length,-4);
 // This is a bounded raw trailer diagnostic, not authenticated metadata.
 if(!/^a[1-9a-f]/.test(cbor))return null;
 return {length:size,hex:cbor,bodySha256:sha(Buffer.from(hex.slice(0,-length),"hex"))};
}
const chain=[];
for(const host of hosts){
 await fence(host);const observed=[];
 for(const e of expected){const hex=await code(host,e.address);assert.equal(sha(Buffer.from(hex,"hex")),e.sha256,"Historical runtime fingerprint changed");observed.push(hex);}
 await fence(host);chain.push(observed);
}
assert.deepEqual(chain[0],chain[1],"RPC runtimes disagree");
for(let i=0;i<expected.length;i++)console.log(JSON.stringify({contract:expected[i].name,onchainBytes:chain[0][i].length/2,metadata:metadata(chain[0][i]),fullHash:expected[i].sha256}));
const cached=readFileSync(resolve(root,"cached_artifacts/opMainnetFiatTokenProxyRuntimeBytecode.bin"),"utf8").trim();
assert.match(cached,/^(?:[0-9a-f]{2})+$/);
console.log(JSON.stringify({candidate:"Circle cached OPMainnet proxy",exactArtifactMatch:cached===chain[0][0],sha256:sha(Buffer.from(cached,"hex")),metadata:metadata(cached),sourceBinaryParityVerified:false}));
const impl=out.contracts[expected[1].path][expected[1].name].evm.deployedBytecode;
const refs=impl.linkReferences?.[libraryPath]?.SignatureChecker;
assert.deepEqual(Object.keys(impl.linkReferences??{}),[libraryPath]);assert.deepEqual(Object.keys(impl.linkReferences[libraryPath]),["SignatureChecker"]);assert.ok(refs?.length>0);
const candidateAddresses=refs.map(({start,length})=>{
 assert.equal(length,20);assert.ok(Number.isInteger(start)&&start>0&&start*2+40<=chain[0][1].length);
 // Candidate offsets are not trusted deployment metadata; require PUSH20
 // in both compiled template and deployed code before reading address.
 assert.equal(impl.object.slice(start*2-2,start*2),"73");
 const raw=chain[0][1];assert.equal(raw.slice(start*2-2,start*2),"73","Candidate library offset differs from deployment");
 const a="0x"+raw.slice(start*2,start*2+40);assert.match(a,/^0x[0-9a-f]{40}$/);assert.notEqual(a,"0x"+"0".repeat(40));return a;
});
assert.ok(candidateAddresses.every(a=>a===candidateAddresses[0]),"Candidate linked addresses disagree");
const libraryAddress=candidateAddresses[0];assert.ok(!expected.some(e=>e.address===libraryAddress));
const libCodes=[];
for(const host of hosts){await fence(host);libCodes.push(await code(host,libraryAddress));await fence(host);}
assert.equal(libCodes[0],libCodes[1],"Library runtime differs between RPCs");
console.log(JSON.stringify({candidateLibraryAddress:libraryAddress,offsets:refs.map(r=>r.start),runtimeSha256:sha(Buffer.from(libCodes[0],"hex")),metadata:metadata(libCodes[0]),candidateOffsetsOnly:true}));
const linked=compile({...input.settings,libraries:{[libraryPath]:{SignatureChecker:libraryAddress}}});
const results=[];
for(let i=0;i<expected.length;i++){
 const e=expected[i],runtime=linked.contracts[e.path][e.name].evm.deployedBytecode;
 assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
 const actual=sha(Buffer.from(runtime.object,"hex"));
 const result={contract:e.name,address:e.address,bytes:runtime.object.length/2,actualSha256:actual,expectedSha256:e.sha256,exactMatch:actual===e.sha256,metadata:metadata(runtime.object)};
 results.push(result);console.log(JSON.stringify(result));
}
const lib=linked.contracts[libraryPath].SignatureChecker.evm.deployedBytecode;
assert.deepEqual(lib.linkReferences??{},{});assert.deepEqual(lib.immutableReferences??{},{});assert.match(lib.object,/^73(?:00){20}[0-9a-f]+$/);
const reconstructed="73"+libraryAddress.slice(2)+lib.object.slice(42);
const libMatch=reconstructed===libCodes[0];
console.log(JSON.stringify({contract:"SignatureChecker",exactMatch:libMatch,compiledSha256:sha(Buffer.from(reconstructed,"hex")),observedSha256:sha(Buffer.from(libCodes[0],"hex")),metadata:metadata(reconstructed)}));
const allMatch=libMatch&&results.every(r=>r.exactMatch);
console.log(JSON.stringify({revision,compiler:solc.version(),optimizerRuns:10000000,observedBlockHash:anchor.hash,sourceBinaryParityVerified:allMatch,transferSemanticsVerified:false,executionApproved:false}));
// A historical tagged release and its Truffle compiler source namespace are
// independently plausible candidates. Search only this finite, logged matrix.
// No metadata replacement: compare every byte of every contract.
const historicalRoot=resolve("official-circle-stablecoin-v220"),historicalRevision="405efc100c016ed1a437063b6274b4e24ea7b8b1";
assert.equal(execFileSync("git",["-C",historicalRoot,"rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim(),historicalRevision);
const candidates=[
 {name:expected[0].name,path:expected[0].path,observed:chain[0][0]},
 {name:expected[1].name,path:expected[1].path,observed:chain[0][1]},
 {name:"SignatureChecker",path:libraryPath,observed:libCodes[0]}
];
const matches=new Map();
if(results[0].exactMatch)matches.set(expected[0].name,{revision,optimizerRuns:10000000});
if(results[1].exactMatch)matches.set(expected[1].name,{revision,optimizerRuns:10000000});
if(libMatch)matches.set("SignatureChecker",{revision,optimizerRuns:10000000});
for(const candidate of candidates){
 if(matches.has(candidate.name))continue;
 for(const prefix of ["","project:/"]){
  for(const runs of candidate.name==="FiatTokenProxy"?[10000000,200]:[10000000]){
   if(matches.has(candidate.name))break;
   const key=prefix+candidate.path,libKey=prefix+libraryPath;
   function historicalSource(p){
    const normalized=p.startsWith("project:/")?p.slice(9):p;
    const base=normalized.startsWith("@openzeppelin/contracts/")?deps:historicalRoot;
    if(!(normalized.startsWith("contracts/")||normalized.startsWith("@openzeppelin/contracts/"))||!normalized.endsWith(".sol"))throw Error("Unsupported import");
    const target=resolve(base,normalized),rel=relative(base,target);
    if(rel.startsWith("..")||isAbsolute(rel))throw Error("Import escape");
    return readFileSync(target,"utf8");
   }
   const settings={optimizer:{enabled:true,runs},outputSelection:{[key]:{[candidate.name]:["evm.deployedBytecode"]}}};
   if(candidate.name==="FiatTokenV2_2")settings.libraries={[libKey]:{SignatureChecker:libraryAddress}};
   const build=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{[key]:{content:historicalSource(key)}},settings}),{import:p=>{try{return {contents:historicalSource(p)};}catch{return {error:"Unresolved historical import: "+p};}}}));
   const errors=(build.errors??[]).filter(e=>e.severity==="error");
   if(errors.length){console.log(JSON.stringify({contract:candidate.name,revision:historicalRevision,prefix,runs,compileErrors:errors.map(e=>e.formattedMessage)}));continue;}
   const runtime=build.contracts?.[key]?.[candidate.name]?.evm?.deployedBytecode;
   assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});
   assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
   let hex=runtime.object;
   if(candidate.name==="SignatureChecker"){assert.match(hex,/^73(?:00){20}[0-9a-f]+$/);hex="73"+libraryAddress.slice(2)+hex.slice(42);}
   const exactMatch=hex===candidate.observed;
   const result={contract:candidate.name,revision:historicalRevision,prefix,runs,bytes:hex.length/2,actualSha256:sha(Buffer.from(hex,"hex")),metadata:metadata(hex),exactMatch};
   console.log(JSON.stringify(result));if(exactMatch)matches.set(candidate.name,result);
  }
 }
}
const fullMatch=matches.size===candidates.length;
console.log(JSON.stringify({historicalRevision,exactMatchedContracts:[...matches.keys()],sourceBinaryParityVerified:fullMatch,transferSemanticsVerified:false,executionApproved:false}));
assert.ok(fullMatch,"Exact source/runtime match not established; independently obtain deployed build metadata and revision.");
