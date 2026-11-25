// Reproducibility candidate only, no masked bytes, no network calls or deployment.
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
const sources=Object.fromEntries(expected.map(e=>[e.path,{content:source(e.path)}]));
const input={language:"Solidity",sources,settings:{optimizer:{enabled:true,runs:10000000},outputSelection:{"*":{"*":["evm.deployedBytecode"]}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input),{import:p=>{try{return {contents:source(p)};}catch{return {error:"Unresolved reviewed source import: "+p};}}}));
assert.deepEqual((out.errors??[]).filter(e=>e.severity==="error").map(e=>e.formattedMessage),[]);
const results=[];
for(const e of expected){
 const runtime=out.contracts?.[e.path]?.[e.name]?.evm?.deployedBytecode;
 assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});
 assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
 const bytes=Buffer.from(runtime.object,"hex"),actual=createHash("sha256").update(bytes).digest("hex");
 const result={contract:e.name,address:e.address,bytes:bytes.length,actualSha256:actual,expectedSha256:e.sha256,exactMatch:actual===e.sha256};
 results.push(result);console.log(JSON.stringify(result));
}
console.log(JSON.stringify({revision,compiler:solc.version(),optimizerRuns:10000000,observedBlockHash:"0x7d3452bfd771332b5457603dd86211815de35dd1f3e0bf73938adfae62396a74",sourceBinaryParityVerified:results.every(r=>r.exactMatch),transferSemanticsVerified:false,executionApproved:false}));
assert.ok(results.every(r=>r.exactMatch),"Exact source/runtime match not established; investigate deployment revision and compiler metadata/settings.");
