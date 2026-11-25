import test from "node:test";
import assert from "node:assert/strict";
import {keccak256,toUtf8Bytes} from "ethers";
import {makeDeploymentCompilerInput,linkDeploymentSignatureChecker} from "./base-usdc-deployment-build.mjs";
const key="contracts/v1/FiatTokenProxy.sol",content="pragma solidity 0.6.12; contract FiatTokenProxy {}";
const library="0x2d943e25e1859ed786afe4afb2b42e14efac691e";
const metadata={language:"Solidity",compiler:{version:"0.6.12+commit.27d51765"},sources:{[key]:{keccak256:keccak256(toUtf8Bytes(content))}},settings:{compilationTarget:{[key]:"FiatTokenProxy"},optimizer:{enabled:true,runs:200},evmVersion:"istanbul",libraries:{}}};
const sources={[key]:{content}};
test("metadata replay preserves source and compiler settings without compilationTarget",()=>{
 const result=makeDeploymentCompilerInput(metadata,sources,"FiatTokenProxy",library);
 assert.equal(result.key,key);assert.equal(result.input.sources[key].content,content);assert.equal(result.input.settings.optimizer.runs,200);
 assert.equal(Object.hasOwn(result.input.settings,"compilationTarget"),false);
});
test("reject source digest mismatch, missing content, compiler or target mismatch",()=>{
 for(const [m,s] of [[metadata,{[key]:{content:content+" "}}],[metadata,{}],[{...metadata,compiler:{version:"0.8.0"}},sources],[{...metadata,settings:{...metadata.settings,compilationTarget:{[key]:"Wrong"}}},sources]])assert.throws(()=>makeDeploymentCompilerInput(m,s,"FiatTokenProxy",library));
});
test("reject unknown settings or unexpected library link",()=>{
 for(const settings of [{...metadata.settings,optimizer:{enabled:true,runs:10000001}},{...metadata.settings,arbitrary:true},{...metadata.settings,libraries:{[key+":SignatureChecker"]:library}}])assert.throws(()=>makeDeploymentCompilerInput({...metadata,settings},sources,"FiatTokenProxy",library));
});

test("empty implementation library metadata is preserved for post-compilation linking",()=>{
 const m={...metadata,settings:{...metadata.settings,compilationTarget:{[key]:"FiatTokenV2_2"}}};
 const result=makeDeploymentCompilerInput(m,sources,"FiatTokenV2_2",library);
 assert.equal(result.postLinkRequired,true);assert.deepEqual(result.input.settings.libraries,{});
});
const libFile="contracts/util/SignatureChecker.sol";
const placeholder="__$"+keccak256(toUtf8Bytes(libFile+":SignatureChecker")).slice(2,36)+"$__";
const trailer="a1000003";
const template="73"+placeholder+"5073"+placeholder+"50"+trailer;
const observed="73"+library.slice(2)+"5073"+library.slice(2)+"50"+trailer;
const linkedRuntime={object:template,linkReferences:{[libFile]:{SignatureChecker:[{start:1,length:20},{start:23,length:20}]}}};
test("post-link substitutes only declared PUSH20 placeholders and preserves metadata",()=>{
 assert.equal(linkDeploymentSignatureChecker(linkedRuntime,observed,library,[libFile]),observed);
});
test("reject wrong observed address, placeholder, overlap, extra links, unreviewed library and metadata offsets",()=>{
 const bad="0x"+"1".repeat(40);
 const refs=entries=>({...linkedRuntime,linkReferences:{[libFile]:{SignatureChecker:entries}}});
 for(const runtime of [{...linkedRuntime,object:template.replace(placeholder,"00".repeat(20))},refs([{start:1,length:20},{start:1,length:20}]),refs([{start:1,length:20},{start:45,length:20}]),refs([{start:1,length:20}]),{...linkedRuntime,linkReferences:{...linkedRuntime.linkReferences,other:{Other:[]}}}])assert.throws(()=>linkDeploymentSignatureChecker(runtime,observed,library,[libFile]));
 assert.throws(()=>linkDeploymentSignatureChecker(linkedRuntime,observed.replace(library.slice(2),bad.slice(2)),library,[libFile]));
 assert.throws(()=>linkDeploymentSignatureChecker(linkedRuntime,observed,bad,[libFile]));
 assert.throws(()=>linkDeploymentSignatureChecker(linkedRuntime,observed,library,[]));
});
