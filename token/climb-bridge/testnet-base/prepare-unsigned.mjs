// Build artifact only. Never signs, broadcasts, calls RPC or chooses a wallet.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw new Error('Invalid Base Sepolia test-only compiler artifact');};
function bytes(v){
 const s=v?.object;
 if(typeof s!=='string'||!/^0x(?:[0-9a-fA-F]{2})+$/.test(s)||s.length>100000)fail();
 return Buffer.from(s.slice(2),'hex');
}
export function prepareUnsignedTestToken(artifact,commit,source){
 if(typeof commit!=='string'||! /^[0-9a-f]{40}$/.test(commit)||typeof source!=='string'||!source.length)fail();
 if(!Array.isArray(artifact?.abi))fail();
 const constructors=artifact.abi.filter(x=>x.type==='constructor');
 if(constructors.length!==1||constructors[0].inputs?.length!==0||constructors[0].stateMutability!=='nonpayable')fail();
 const signatures=new Set(artifact.abi.filter(x=>x.type==='function').map(x=>x.name+'('+x.inputs.map(i=>i.type).join(',')+')'));
 for(const s of ['bindManager(address)','mint(address,uint256)','burn(uint256)','decimals()','totalSupply()','binder()','manager()'])if(!signatures.has(s))fail();
 const creation=bytes(artifact.bytecode),runtime=bytes(artifact.deployedBytecode);
 if(creation.length>49152||runtime.length>24576)fail();
 return {
  assessment:'UNSIGNED_TESTNET_CONTRACT_CREATION_ONLY',
  network:'Base Sepolia',chainId:84532,contract:'ClimbTestnetToken',symbol:'CLIMBTEST',
  sourceCommit:commit,sourceSha256:hash(source),
  compilerProfile:'solc 0.8.19; London; optimizer 200 runs',
  dependencyCommit:'dc44c9f1a4c3b10af99492eed84f83ed244203f6',
  creationBytes:creation.length,creationSha256:hash(creation),
  runtimeTemplateBytes:runtime.length,runtimeTemplateSha256:hash(runtime),
  unsigned:{chainId:84532,to:null,value:'0x0',data:'0x'+creation.toString('hex')},
  caveat:'No sender, gas, nonce, signature, deployed address or broadcast. Runtime template has immutable binder placeholders; compare deployed bytecode with compiler immutable references after authorized deployment. Test only; no mainnet or backing proof.',
  bridgeRelease:'NO_GO'
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [artifactPath,sourcePath,commit,out]=process.argv.slice(2);
 if(process.argv.length!==6)fail();
 const report=prepareUnsignedTestToken(JSON.parse(readFileSync(artifactPath,'utf8')),commit,readFileSync(sourcePath,'utf8'));
 writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({assessment:report.assessment,chainId:report.chainId,sourceCommit:commit,creationBytes:report.creationBytes,creationSha256:report.creationSha256,runtimeTemplateBytes:report.runtimeTemplateBytes,runtimeTemplateSha256:report.runtimeTemplateSha256,bridgeRelease:report.bridgeRelease},null,2));
}
