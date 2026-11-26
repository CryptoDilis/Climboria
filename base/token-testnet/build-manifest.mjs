// Build-only evidence for the distinct CLIMBBURNTEST prototype. No signing/RPC/broadcast.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw new Error('NO_GO: unexpected test-only compiler artifact');};
const expected=['INITIAL_TEST_SUPPLY()','allowance(address,address)','approve(address,uint256)','balanceOf(address)','burn(uint256)','decimals()','decreaseAllowance(address,uint256)','increaseAllowance(address,uint256)','name()','symbol()','totalBurned()','totalSupply()','transfer(address,uint256)','transferFrom(address,address,uint256)'].sort();
function bytes(v,max){
  if(typeof v?.object!=='string'||v.object.length>max*2+2||!/^0x(?:[0-9a-fA-F]{2})+$/.test(v.object))fail();
  if(v.linkReferences&&Object.keys(v.linkReferences).length)fail();
  if(v.immutableReferences&&Object.keys(v.immutableReferences).length)fail();
  return Buffer.from(v.object.slice(2),'hex');
}
export function buildManifest(artifact,source,commit){
  if(typeof commit!=='string'||!/^[0-9a-f]{40}$/.test(commit)||typeof source!=='string'||!source.length||!Array.isArray(artifact?.abi))fail();
  const constructors=artifact.abi.filter(x=>x.type==='constructor');
  if(constructors.length!==1||constructors[0].stateMutability!=='nonpayable'||constructors[0].inputs?.length!==0)fail();
  if(artifact.abi.some(x=>x.type==='fallback'||x.type==='receive'))fail();
  const functions=artifact.abi.filter(x=>x.type==='function').map(x=>{
    if(!Array.isArray(x.inputs)||typeof x.name!=='string')fail();
    return x.name+'('+x.inputs.map(i=>i.type).join(',')+')';
  }).sort();
  if(JSON.stringify(functions)!==JSON.stringify(expected))fail();
  const creation=bytes(artifact.bytecode,49152),runtime=bytes(artifact.deployedBytecode,24576);
  return {status:'TEST_ONLY_BUILD_EVIDENCE_NO_GO',contract:'ClimbBurnPrototype',network:'Base Sepolia',chainId:84532,symbol:'CLIMBBURNTEST',decimals:6,initialTestSupplyRaw:'1000000000',sourceCommit:commit,sourceSha256:sha(source),compilerProfile:'solc 0.8.19; London; optimizer 200 runs',dependencyCommit:'dc44c9f1a4c3b10af99492eed84f83ed244203f6',creationBytes:creation.length,creationSha256:sha(creation),runtimeBytes:runtime.length,runtimeSha256:sha(runtime),functionSignatures:functions,caveat:'Compiler evidence only; no transaction payload, sender, deployed address or authorization. ABI and hashes are not proof of security or migration backing.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [artifactPath,sourcePath,commit,out]=process.argv.slice(2);
  if(process.argv.length!==6)fail();
  const result=buildManifest(JSON.parse(readFileSync(artifactPath,'utf8')),readFileSync(sourcePath,'utf8'),commit);
  writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result,null,2));
}
