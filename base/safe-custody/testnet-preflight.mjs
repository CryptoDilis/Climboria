// Offline configuration and frozen build check. Never connects, signs, broadcasts or authorizes.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const pin=read(new URL('./frozen-testnet-candidate.json',import.meta.url));
const example=read(new URL('./testnet-preflight.example.json',import.meta.url));
const fields=Object.keys(example).sort();
const reject=(ok,reason)=>{if(!ok)throw Error(reason);};
const sha=hex=>createHash('sha256').update(Buffer.from(hex.slice(2),'hex')).digest('hex');
const commitment=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hexBytes=x=>typeof x==='string'&&/^0x(?:[a-fA-F0-9]{2})+$/.test(x);
const evidence=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)&&!/^0+$/.test(x);
const amount=(x,max)=>typeof x==='string'&&/^[1-9][0-9]{0,77}$/.test(x)&&BigInt(x)<=max;
const local=new Set([
'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266','0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
'0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc','0x90f79bf6eb2c4f870365e785982e1f101e93b906',
'0x15d34aaf54267db7d7c367839aaf71a00a2c6a65','0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
'0x976ea74026e726554db657fa54763abd0c3a0aa9','0x14dc79964da2c08b23698b3d3cc7ca32193d9955',
'0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f','0xa0ee7a142d267c1f36714e4a8f75612f20a79720'
]);
function addr(a){
 reject(typeof a==='string'&&/^0x[0-9a-fA-F]{40}$/.test(a),'missing or invalid public role address');
 const x=a.toLowerCase();
 reject(BigInt(x)>0xffffn&&!local.has(x),'zero/sentinel/fixture/disposable address');
 return x;
}
export function checkFrozenArtifacts(artifacts){
 reject(Array.isArray(artifacts)&&artifacts.length===pin.contracts.length,'missing artifact set');
 for(let i=0;i<pin.contracts.length;i++){
  const p=pin.contracts[i],a=artifacts[i];
  const creation=a?.bytecode?.object,runtime=a?.deployedBytecode?.object;
  reject(hexBytes(creation)&&hexBytes(runtime),'invalid bytecode');
  reject(sha(creation)===p.creationSha256&&sha(runtime)===p.runtimeTemplateSha256,'frozen candidate hash mismatch');
  reject((creation.length-2)/2+32*p.constructorTypes.length===p.initcodeBytes&&(runtime.length-2)/2===p.runtimeBytes,'frozen size mismatch');
  reject(p.initcodeBytes<=49152&&p.runtimeBytes<=24576,'EVM size limit');
  const ctors=a.abi?.filter(x=>x.type==='constructor');
  reject(Array.isArray(ctors)&&ctors.length<=1&&JSON.stringify(ctors[0]?.inputs.map(x=>x.type)??[])===JSON.stringify(p.constructorTypes),'constructor type mismatch');
  reject(Object.keys(a.bytecode.linkReferences??{}).length===0&&Object.keys(a.deployedBytecode.linkReferences??{}).length===0,'unresolved link references');
 }
 return {status:'FROZEN_ARTIFACTS_MATCH_NO_APPROVAL',sourceSha:pin.sourceSha,chainId:pin.chainId,contracts:pin.contracts};
}
export function checkConfig(c,now=Math.floor(Date.now()/1000)){
 reject(c&&typeof c==='object'&&!Array.isArray(c)&&JSON.stringify(Object.keys(c).sort())===JSON.stringify(fields),'unknown or missing configuration fields');
 reject(c.chainId===84532&&c.testOnly===true&&c.sourceSha===pin.sourceSha,'wrong chain, source or mode');
 reject(Array.isArray(c.owners)&&c.owners.length===5,'exact five owner slots required');
 const deployer=addr(c.deployer),owners=c.owners.map(addr),founder=addr(c.founder),distributor=addr(c.distributor);
 reject(new Set([deployer,...owners,founder,distributor]).size===8,'duplicate roles or owners');
 reject(Number.isSafeInteger(now)&&Number.isSafeInteger(c.startTimestamp)&&c.startTimestamp>=now+86400&&c.startTimestamp<=now+365*86400,'start outside review window');
 reject(amount(c.gamingWalletMonthlyCapRaw,5_185_185_180_000n)&&amount(c.liquidityTrancheCapRaw,222_222_222_000_000n),'invalid test cap');
 reject(amount(c.maxTotalFeeWei,2n**256n-1n),'missing positive test fee ceiling');
 for(const k of ['signerControlEvidenceSha256','independentReviewEvidenceSha256','recoveryAcceptanceEvidenceSha256','configurationApprovalEvidenceSha256'])reject(evidence(c[k]),'missing '+k);
 // These are unverified user-provided references, NOT proof of approval, signer independence or RPC state.
 const publicConfig={chainId:84532,sourceSha:pin.sourceSha,testOnly:true,deployer,owners,founder,distributor,startTimestamp:c.startTimestamp,gamingWalletMonthlyCapRaw:c.gamingWalletMonthlyCapRaw,liquidityTrancheCapRaw:c.liquidityTrancheCapRaw,maxTotalFeeWei:c.maxTotalFeeWei,signerControlEvidenceSha256:c.signerControlEvidenceSha256,independentReviewEvidenceSha256:c.independentReviewEvidenceSha256,recoveryAcceptanceEvidenceSha256:c.recoveryAcceptanceEvidenceSha256,configurationApprovalEvidenceSha256:c.configurationApprovalEvidenceSha256};
 return {status:'STRUCTURE_ONLY_NO_GO',publicConfig,configSha256:commitment(publicConfig),remaining:['verify each evidence document independently','confirm dedicated signer ownership and recovery acceptance','observe two public Base Sepolia RPCs at common finalized block','verify balances, current fees, gas estimates and actual chain time','review exact test-only dependencies and constructor bindings','obtain explicit per-transaction testnet authorization']};
}
export function prepareStageOne(artifacts,c,now){
 const build=checkFrozenArtifacts(artifacts),config=checkConfig(c,now);
 return {status:'UNSIGNED_SETUP_CREATION_REVIEW_NO_GO',build,config,creationData:artifacts[0].bytecode.object.toLowerCase(),creationDataSha256:pin.contracts[0].creationSha256,warning:'Not a transaction or approval. No nonce, gas, fee, RPC or signatures. Never broadcast automatically. Subsequent stages require finalized prior-stage receipts and new review.'};
}
function loadArtifacts(){return pin.contracts.map(x=>read('out/SafeQuorumIssuanceFixture.sol/'+x.name+'.json'));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--verify-build')console.log(JSON.stringify(checkFrozenArtifacts(loadArtifacts()),null,2));
  else if(args.length===2){
   const result=prepareStageOne(loadArtifacts(),read(args[0]));
   writeFileSync(args[1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:result.status,sourceSha:pin.sourceSha,configSha256:result.config.configSha256,creationDataSha256:result.creationDataSha256},null,2));
  }else throw Error('invalid arguments');
 }catch{console.error('NO_GO: frozen candidate or public configuration rejected; no review output produced');process.exitCode=1;}
}
