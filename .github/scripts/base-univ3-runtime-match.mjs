// Compare independently compiled upstream bytecode against prior dual-RPC evidence.
// No masking, on-chain calls, signing, deployment or execution authorization.
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import solc from "solc";
import {BASE_UNIV3_FACTORY as factory,BASE_UNIV3_INIT_HASH as initHash} from "../../dex/base-execution/univ3-action-policy.mjs";
import {BASE_EXECUTION_ENABLED} from "../../dex/base-execution/intent-policy.mjs";
assert.equal(BASE_EXECUTION_ENABLED,false);
const root="official-uniswap-v3-core";
const revision="e3589b192d0be27e100cd0daaf6c97204fdb1899";
assert.equal(execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8",timeout:10000}).trim(),revision);
assert.match(solc.version(),/^0\.7\.6\+commit\.7338295f\./);
const sources={};
function walk(dir){
 for(const e of readdirSync(root+"/"+dir,{withFileTypes:true})){
  const p=dir+"/"+e.name;
  if(e.isDirectory()&&e.name!=="test")walk(p);
  else if(e.isFile()&&e.name.endsWith(".sol"))sources[p]={content:readFileSync(root+"/"+p,"utf8")};
 }
}
walk("contracts");
const settings={optimizer:{enabled:true,runs:800},metadata:{bytecodeHash:"none"},outputSelection:{"*":{"":["ast"],"*":["evm.bytecode.object","evm.deployedBytecode"]}}};
const out=JSON.parse(solc.compile(JSON.stringify({language:"Solidity",sources,settings})));
assert.deepEqual((out.errors??[]).filter(e=>e.severity==="error").map(e=>e.formattedMessage),[]);
const pool="0xd0b53d9277642d899df5c87a3966a349a798f224";
const token0="0x4200000000000000000000000000000000000006",token1="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const poolContract=out.contracts["contracts/UniswapV3Pool.sol"].UniswapV3Pool;
const factoryContract=out.contracts["contracts/UniswapV3Factory.sol"].UniswapV3Factory;
const creation=poolContract.evm.bytecode.object;
assert.match(creation,/^(?:[0-9a-f]{2})+$/);
assert.equal(execFileSync("cast",["keccak","0x"+creation],{encoding:"utf8",timeout:10000}).trim().toLowerCase(),initHash,"Pool creation hash mismatch");
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
compare(poolContract,valuesPool,"0d14cff6e9be9c1cf4ff7a4856a44e5d17b8a92db7e1f41f2fb5e73ad8b5419a","pool");
compare(factoryContract,{[original]:[factory,"address"]},"8545609892cc8d7d608dd4420ee110ab98448730570824fb029228e33846d28c","factory");
console.log(JSON.stringify({revision,compiler:solc.version(),pool,factory,blockHash:"0xac6a3fc3509fb628d87b7d61e21b9fdcd9c8d466022cab50ce40d53227f8d64d",runtimeFingerprintMatch:true,actualQuotePoolVerified:false,executionApproved:false}));
