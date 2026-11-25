// Reproduce actual deployment build from bounded public verified-source records.
// The record service is untrusted: full on-chain runtime equality is mandatory.
import assert from "node:assert/strict";
import solc from "solc";
import {keccak256,toUtf8Bytes} from "ethers";
const MAX_BYTES=4*1024*1024,MAX_SOURCES=256;
const allowedAddresses=new Set(["0x833589fcd6edb6e08f4c7c32d4f71b54bda02913","0x2ce6311ddae708829bc0784c967b7d77d19fd779","0x2d943e25e1859ed786afe4afb2b42e14efac691e"]);
async function record(address){
 assert.ok(allowedAddresses.has(address));
 const url=new URL("https://sourcify.dev/server/v2/contract/8453/"+address);
 url.searchParams.set("fields","metadata,sources");
 const response=await fetch(url,{redirect:"error",credentials:"omit",cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(30000)});
 if(!response.ok){await response.body?.cancel();throw Error("Verified-source record unavailable: HTTP "+response.status);}
 const reader=response.body?.getReader();assert.ok(reader);
 const chunks=[];let count=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>MAX_BYTES){await reader.cancel();throw Error("Oversized source record");}chunks.push(value);}}finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));
}
export function makeDeploymentCompilerInput(metadata,sourceRecords,contractName,libraryAddress){
 assert.equal(metadata?.language,"Solidity");
 assert.equal(metadata?.compiler?.version,"0.6.12+commit.27d51765");
 assert.ok(metadata.sources&&typeof metadata.sources==="object"&&!Array.isArray(metadata.sources));
 const names=Object.keys(metadata.sources);
 assert.ok(names.length>0&&names.length<=MAX_SOURCES);
 const target=Object.entries(metadata.settings?.compilationTarget??{});
 assert.equal(target.length,1);assert.equal(target[0][1],contractName);assert.ok(names.includes(target[0][0]));
 const sourceEntries=[];let bytes=0;
 for(const name of names){
  assert.ok(name.length<=512&&!/[\x00-\x1f]/.test(name)&&name.endsWith(".sol")&&!["__proto__","prototype","constructor"].includes(name));
  const source=sourceRecords?.[name]?.content;
  assert.equal(typeof source,"string");
  bytes+=Buffer.byteLength(source);assert.ok(bytes<=MAX_BYTES);
  const digest=metadata.sources[name]?.keccak256;
  assert.match(digest,/^0x[0-9a-f]{64}$/);
  assert.equal(keccak256(toUtf8Bytes(source)),digest,"Source content differs from deployment metadata");
  sourceEntries.push([name,{content:source}]);
 }
 const {compilationTarget,libraries:flatLibraries={},...settings}=structuredClone(metadata.settings);
 for(const key of Object.keys(settings))assert.ok(["optimizer","evmVersion","remappings","metadata","debug"].includes(key),"Unsupported deployment compiler setting");
 assert.ok(Number.isInteger(settings.optimizer?.runs)&&settings.optimizer.runs>=0&&settings.optimizer.runs<=10000000);
 const libEntries=[];
 for(const [qualified,address] of Object.entries(flatLibraries)){
  const split=qualified.lastIndexOf(":");assert.ok(split>0);
  const file=qualified.slice(0,split),name=qualified.slice(split+1);
  assert.ok(names.includes(file));assert.equal(name,"SignatureChecker");assert.equal(address.toLowerCase(),libraryAddress);
  libEntries.push([file,{[name]:address}]);
 }
 if(contractName==="FiatTokenV2_2")assert.equal(libEntries.length,1,"Explicit deployment library link required");
 else assert.equal(libEntries.length,0);
 const key=target[0][0];
 return {key,input:{language:"Solidity",sources:Object.fromEntries(sourceEntries),settings:{...settings,libraries:Object.fromEntries(libEntries),outputSelection:{[key]:{[contractName]:["evm.deployedBytecode","metadata"]}}}}};
}
export async function reproduceDeploymentRecord({address,contractName,observed,libraryAddress}){
 assert.match(observed,/^(?:[0-9a-f]{2})+$/);
 const data=await record(address);
 if(data.address!==undefined)assert.equal(data.address.toLowerCase(),address);
 if(data.chainId!==undefined)assert.equal(String(data.chainId),"8453");
 const metadata=typeof data.metadata==="string"?JSON.parse(data.metadata):data.metadata;
 const {key,input}=makeDeploymentCompilerInput(metadata,data.sources,contractName,libraryAddress);
 // No import callback, filesystem access, external source URL fetches or lifecycle scripts.
 const out=JSON.parse(solc.compile(JSON.stringify(input)));
 assert.deepEqual((out.errors??[]).filter(e=>e.severity==="error").map(e=>e.formattedMessage),[]);
 const artifact=out.contracts?.[key]?.[contractName],runtime=artifact?.evm?.deployedBytecode;
 assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});
 assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
 let compiled=runtime.object;
 if(contractName==="SignatureChecker"){assert.equal(address,libraryAddress);assert.match(compiled,/^73(?:00){20}[0-9a-f]+$/);compiled="73"+address.slice(2)+compiled.slice(42);}
 // Exact full equality includes original metadata commitment. Never splice its trailer.
 const exactMatch=compiled===observed;
 const result={contractName,address,sourceCount:Object.keys(input.sources).length,compiler:metadata.compiler.version,optimizerRuns:input.settings.optimizer.runs,exactMatch};
 console.log(JSON.stringify(result));
 assert.ok(exactMatch,"Deployment record failed full runtime reproduction");
 return Object.freeze(result);
}
