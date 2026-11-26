// Exact upstream release artifact and source reproduction. No wallet or execution.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import solc from "solc";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const root="official-op-contracts",revision="a12a09f7000ff785a4058998e09b366cbe5a3ed2";
assert.equal(execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim(),revision);
const expected="667c900c2c6da80d452501a9c6332e046384a0c438c3334ce6f71c86dd7b8735";
const artifactPath="op-bindings/bindings/weth9_more.go",sourceName="contracts/vendor/WETH9.sol",sourcePath="packages/contracts-bedrock/"+sourceName;
const read=(path,blob)=>{
 assert.equal(execFileSync("git",["-C",root,"hash-object",path],{encoding:"utf8",timeout:10000}).trim(),blob);
 return readFileSync(root+"/"+path,"utf8");
};
const binding=read(artifactPath,"739cfcce10ea6a15227f6e053959e910c10cfd56");
const matches=[...binding.matchAll(/^var WETH9DeployedBin = "0x([0-9a-f]+)"$/gm)];
assert.equal(matches.length,1);const upstream=matches[0][1];
const sha=hex=>createHash("sha256").update(Buffer.from(hex,"hex")).digest("hex");
assert.equal(upstream.length,4082);
assert.ok(upstream.endsWith("a265627a7a72315820e496abb80c5983b030f680d0bd88f66bf44e261bc3be070d612dd72f9f1f5e9a64736f6c63430005110032"));
assert.equal(sha(upstream),expected,"Pinned release artifact differs from previously dual-RPC observed full runtime");
console.log(JSON.stringify({revision,artifactPath,artifactBytes:upstream.length/2,upstreamArtifactSha256:sha(upstream),historicalObservedSha256:expected,upstreamArtifactFullRuntimeMatched:true,sourceBinaryParityVerified:false,executionApproved:false}));
const source=read(sourcePath,"7bb4ab4dde57692531f82c4597dc2668a215891d");
assert.match(solc.version(),/^0\.5\.17\+commit\.d19bba13\./);
// Release binding storage layout identifies this exact source-unit path.
// Compiler and optimization from release Hardhat config and verified deployment metadata.
// Remappings and EVM version from prior deployment record. No metadata masking.
// Bounded replay of documented upstream build configuration choices.
// The exact upstream Hardhat and Foundry files are checked before use.
const hardhat=read("packages/contracts-bedrock/hardhat.config.ts","d325df72f51fe7da67e088ea5680952f8a2e3ea3");
const foundry=read("packages/contracts-bedrock/foundry.toml","9161d0d8770a07461c6cf3f3d3b6c81222503d2d");
assert.match(hardhat,/version: '0\.5\.17', \/\/ Required for WETH9/);
assert.match(hardhat,/optimizer: \{ enabled: true, runs: 10_000 \}/);
assert.match(foundry,/^optimizer_runs = 999999$/m);
const remappingText=foundry.match(/^remappings = \[([\s\S]*?)^\]/m)?.[1];assert.ok(remappingText);
const foundryRemappings=[...remappingText.matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);assert.equal(foundryRemappings.length,6);
const attempts=[];
for(const optimizerRuns of [10000,999999])for(const remappings of [[],foundryRemappings])for(const useLiteralContent of [false,true]){
 const settings={optimizer:{enabled:true,runs:optimizerRuns},evmVersion:"istanbul",remappings,libraries:{},metadata:{useLiteralContent},outputSelection:{[sourceName]:{WETH9:["evm.deployedBytecode","metadata"]}}};
 const result=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{[sourceName]:{content:source}},settings})));
 assert.deepEqual((result.errors??[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
 const runtime=result.contracts?.[sourceName]?.WETH9?.evm?.deployedBytecode;
 assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
 const exactMatch=runtime.object===upstream;
 const diagnostic={optimizerRuns,remappings,useLiteralContent,compiledBytes:runtime.object.length/2,compiledSha256:sha(runtime.object),trailer:runtime.object.slice(-104),preTrailerFingerprintMatched:runtime.object.length===upstream.length&&runtime.object.slice(0,-104)===upstream.slice(0,-104),sourceBinaryParityVerified:exactMatch};
 attempts.push(diagnostic);console.log(JSON.stringify(diagnostic));
}
const exactMatches=attempts.filter(a=>a.sourceBinaryParityVerified);
console.log(JSON.stringify({revision,sourcePath,sourceBlob:"7bb4ab4dde57692531f82c4597dc2668a215891d",compiler:solc.version(),sourceUnit:sourceName,upstreamArtifactSha256:expected,attemptCount:attempts.length,exactMatches,sourceBinaryParityVerified:exactMatches.length>0,transferSemanticsVerified:false,executionApproved:false}));
assert.ok(exactMatches.length>0,"Pinned upstream source did not reproduce full runtime");
