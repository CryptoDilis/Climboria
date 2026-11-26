// Compare independently compiled upstream bytecode against prior dual-RPC evidence.
// No masking, on-chain calls, signing, deployment or execution authorization.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import solc from "solc";
import {BASE_UNIV3_INIT_HASH as initHash} from "../../dex/base-execution/univ3-action-policy.mjs";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const root="official-sushi-v3-core";
const revision="21dfbed6b5e343559a14a7825e3d2f3be2611d8a";
assert.equal(execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim(),revision);
assert.match(solc.version(),/^0\.7\.6\+commit\.7338295f\./);
const factory="0xc35dadb65012ec5796536bd9864ed8773abc74c4";
function pinnedJson(path,blob){
 assert.equal(execFileSync("git",["-C",root,"hash-object",path],{encoding:"utf8",timeout:10000}).trim(),blob);
 return JSON.parse(readFileSync(root+"/"+path,"utf8"));
}
const artifact=pinnedJson("deployments/base/UniswapV3Factory.json","952bfc032d854bd1f6fe557049d5dbfd43385e40");
assert.equal(artifact.address.toLowerCase(),factory);
assert.equal(artifact.solcInputHash,"2e84228bb9aeab570a80cb63b27f21da");
const input=pinnedJson("deployments/base/solcInputs/"+artifact.solcInputHash+".json","5e4201878fc9d945449ae996e001d8617b0596cd");
assert.equal(input.language,"Solidity");assert.equal(Object.keys(input.sources).length,62);
assert.deepEqual(input.settings.optimizer,{enabled:true,runs:800});
assert.deepEqual(input.settings.metadata,{bytecodeHash:"none",useLiteralContent:true});
const metadata=JSON.parse(artifact.metadata);
assert.equal(metadata.compiler.version,"0.7.6+commit.7338295f");
assert.deepEqual(metadata.settings.compilationTarget,{"contracts/UniswapV3Factory.sol":"UniswapV3Factory"});
for(const [path,source] of Object.entries(metadata.sources))assert.equal(input.sources[path].content,source.content,"Source differs from deployment metadata");
const out=JSON.parse(solc.compile(JSON.stringify(input)));
assert.deepEqual((out.errors??[]).filter(e=>e.severity==="error").map(e=>e.formattedMessage),[]);
const pool="0x57713f7716e0b0f65ec116912f834e49805480d2";
const token0="0x4200000000000000000000000000000000000006",token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const poolContract=out.contracts["contracts/UniswapV3Pool.sol"].UniswapV3Pool;
const factoryContract=out.contracts["contracts/UniswapV3Factory.sol"].UniswapV3Factory;
const creation=poolContract.evm.bytecode.object;
assert.match(creation,/^(?:[0-9a-f]{2})+$/);
assert.equal(execFileSync("cast",["keccak","0x"+creation],{encoding:"utf8",timeout:10000}).trim().toLowerCase(),initHash,"Pool creation hash mismatch");
assert.equal("0x"+factoryContract.evm.bytecode.object,artifact.bytecode,"Archived factory creation bytecode mismatch");
assert.equal("0x"+factoryContract.evm.deployedBytecode.object,artifact.deployedBytecode,"Archived factory runtime template mismatch");
const keccak=hex=>execFileSync("cast",["keccak","0x"+hex],{encoding:"utf8",timeout:10000}).trim().toLowerCase();
const word=hex=>hex.padStart(64,"0");
const salt=keccak(word(token0.slice(2))+word(token1.slice(2))+word("1f4"));
const derived="0x"+keccak("ff"+factory.slice(2)+salt.slice(2)+initHash.slice(2)).slice(-40);
assert.equal(derived,pool,"CREATE2 address mismatch");
const declarations=new Map();
function visit(n,path,contract){
 if(!n||typeof n!=="object")return;
 if(n.nodeType==="ContractDefinition")contract=n.name;
 if(n.nodeType==="VariableDeclaration"&&n.mutability==="immutable"){
  assert.ok(!declarations.has(String(n.id)));
  declarations.set(String(n.id),{key:path+":"+contract+":"+n.name,type:n.typeDescriptions?.typeString});
 }
 for(const v of Object.values(n))if(Array.isArray(v)){for(const item of v)visit(item,path,contract);}else if(v&&typeof v==="object")visit(v,path,contract);
}
for(const [path,s] of Object.entries(out.sources))visit(s.ast,path,"");
const prefix="contracts/UniswapV3Pool.sol:UniswapV3Pool:";
const original="contracts/NoDelegateCall.sol:NoDelegateCall:original";
const spacing=10n;
const numTicks=((887272n/spacing)*spacing*2n)/spacing+1n;
const maxLiquidity=((1n<<128n)-1n)/numTicks;
const valuesPool={
 [original]:[pool,"address"],[prefix+"factory"]:[factory,"address"],[prefix+"token0"]:[token0,"address"],[prefix+"token1"]:[token1,"address"],[prefix+"fee"]:[500n,"uint24"],[prefix+"tickSpacing"]:[spacing,"int24"],[prefix+"maxLiquidityPerTick"]:[maxLiquidity,"uint128"]
};
function compare(contract,values,expected,label){
 const obj=contract.evm.deployedBytecode;
 assert.match(obj.object,/^(?:[0-9a-f]{2})+$/);
 assert.equal(Object.keys(obj.linkReferences??{}).length,0);
 const code=Buffer.from(obj.object,"hex"),used=new Set(),seen=new Set();
 for(const [id,refs] of Object.entries(obj.immutableReferences??{})){
  const decl=declarations.get(id);assert.ok(decl&&Object.hasOwn(values,decl.key),"Unexpected immutable "+id);
  assert.ok(!seen.has(decl.key));seen.add(decl.key);
  const [value,type]=values[decl.key];assert.equal(decl.type,type);
  const hex=(typeof value==="bigint"?value.toString(16):value.slice(2)).padStart(64,"0");
  assert.match(hex,/^[0-9a-f]{64}$/);assert.ok(refs.length>0);
  for(const {start,length} of refs){
   assert.equal(length,32);assert.ok(Number.isInteger(start)&&start>=0&&start+length<=code.length);
   for(let i=start;i<start+length;i++){assert.ok(!used.has(i));used.add(i);assert.equal(code[i],0,"Nonzero immutable placeholder");}
   Buffer.from(hex,"hex").copy(code,start);
  }
 }
 assert.deepEqual([...seen].sort(),Object.keys(values).sort(),"Missing expected immutable reference");
 const sha=createHash("sha256").update(code).digest("hex");
 console.log(JSON.stringify({label,bytes:code.length,sha256:sha,expected,exactFingerprintMatch:sha===expected}));
 assert.equal(sha,expected,"Compiled runtime fingerprint differs");
}
compare(poolContract,valuesPool,"247e5d81491db358150b965130444ab294ab0b0fd9496bc348d6442f4c0e5bab","pool");
compare(factoryContract,{[original]:[factory,"address"]},"fa9b8c432ace122dba87eeb8e1d85f47027bde5a2be5202280ca07260f02e849","factory");
console.log(JSON.stringify({revision,compiler:solc.version(),pool,factory,blockHash:"0xd6dae468d071ef8b582d18b98c9432bca4edcda06e00ff4e078a515bb1d4ec5c",runtimeFingerprintMatch:true,create2AddressVerified:true,sourceBinaryParityVerified:true,actualQuotePoolVerified:false,executionApproved:false}));
