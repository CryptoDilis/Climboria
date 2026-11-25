import test from "node:test";
import assert from "node:assert/strict";
import {keccak256,toUtf8Bytes} from "ethers";
import {makeDeploymentCompilerInput} from "./base-usdc-deployment-build.mjs";
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
