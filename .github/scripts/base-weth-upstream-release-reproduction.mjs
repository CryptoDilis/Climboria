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
const settings={optimizer:{enabled:true,runs:10000},evmVersion:"istanbul",remappings:[],libraries:{},outputSelection:{[sourceName]:{WETH9:["evm.deployedBytecode","metadata"]}}};
const result=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources:{[sourceName]:{content:source}},settings})));
assert.deepEqual((result.errors??[]).filter(x=>x.severity==="error").map(x=>x.formattedMessage),[]);
const runtime=result.contracts?.[sourceName]?.WETH9?.evm?.deployedBytecode;
assert.ok(runtime);assert.deepEqual(runtime.linkReferences??{},{});assert.deepEqual(runtime.immutableReferences??{},{});assert.match(runtime.object,/^(?:[0-9a-f]{2})+$/);
const exactMatch=runtime.object===upstream;
console.log(JSON.stringify({revision,sourcePath,sourceBlob:"7bb4ab4dde57692531f82c4597dc2668a215891d",compiler:solc.version(),sourceUnit:sourceName,compiledSha256:sha(runtime.object),upstreamArtifactSha256:expected,sourceBinaryParityVerified:exactMatch,transferSemanticsVerified:false,executionApproved:false}));
assert.ok(exactMatch,"Pinned upstream source did not reproduce full runtime");
