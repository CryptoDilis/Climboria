// Read-only budget evidence, not a transaction, funding request or approval.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkFrozenArtifacts} from './testnet-preflight.mjs';
import {observeTestnet,endpoints} from './observe-testnet.mjs';
import {expected} from '../v3-testnet/verify-creation.mjs';
const need=(ok,why)=>{if(!ok)throw Error(why);};
const qty=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'INVALID_QUANTITY');return BigInt(x);};
const dec=x=>{need(typeof x==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(x),'INVALID_DECIMAL');return BigInt(x);};
const order=['setupFactory','successorFactory','syntheticQuote','syntheticPoolBuilder','syntheticLPDestination','initializeSafeAndGuard','quorumAtomicIssuance'];
const read=p=>JSON.parse(readFileSync(p,'utf8'));
export function projectBudget(local,obs,estimates,build){
 need(build?.status==='FROZEN_ARTIFACTS_MATCH_NO_APPROVAL'&&obs?.sourceSha===build.sourceSha&&obs.chainId===84532&&obs.status==='DUAL_RPC_HISTORICAL_AND_CHAIN_OBSERVATION_ONLY_NO_GO','OBSERVATION_SOURCE_MISMATCH');
 need(local?.status==='LOCAL_ANVIL_REHEARSAL_ONLY'&&local.chainId===84532&&local.testOnly===true&&local.signatureMode==='ECDSA_ONLY'&&local.totalSupplyRaw==='888888888000000'&&/^[a-f0-9]{40}$/.test(local.sourceSha),'INVALID_REHEARSAL');
 need(Array.isArray(local.transactions)&&local.transactions.length===order.length,'REHEARSAL_STEPS');
 const localLimit=local.localBlockGasLimit,publicLimit=qty(obs.commonFinalizedBlock.gasLimit);
 need(Number.isSafeInteger(localLimit)&&localLimit>0,'LOCAL_LIMIT');
 const prices=obs.indicativeGasPriceWei.map(dec);
 need(prices.length===2&&prices.every(x=>x>0n),'INVALID_PRICE');
 const price=prices[0]>prices[1]?prices[0]:prices[1];
 need(Array.isArray(estimates)&&estimates.length===2&&estimates.every(x=>typeof x==='bigint'&&x>0n&&x<=publicLimit),'INVALID_ESTIMATES');
 const gas1=estimates[0]>estimates[1]?estimates[0]:estimates[1];
 const stages=local.transactions.map((t,i)=>{
  need(t.name===order[i]&&t.blockNumber===i+1&&t.status==='success'&&Number.isSafeInteger(t.gasUsed)&&t.gasUsed>0&&t.gasUsed<localLimit,'REHEARSAL_STEP_MISMATCH');
  const measured=BigInt(t.gasUsed),basis=i===0&&gas1>measured?gas1:measured;
  const bufferedGas=(basis*125n+99n)/100n;
  return {name:t.name,localGasUsed:String(measured),basisGas:String(basis),bufferedGas:String(bufferedGas),fitsObservedBlockGasLimit:bufferedGas<=publicLimit,illustrativeBufferedL2FeeWei:String(bufferedGas*price),payerType:'deployer'};
 });
 const sum=xs=>xs.reduce((a,b)=>a+dec(b.illustrativeBufferedL2FeeWei),0n);
 const roles=obs.priorFixture.previousRoles;
 const payer=roles.find(x=>x.role==='priorDeployer');
 need(payer?.address===expected.payer&&payer.codeState==='EMPTY','PRIOR_PAYER_CODE');
 const balance=dec(payer.balanceWei),payerFee=sum(stages.filter(x=>x.payerType==='deployer'));
 const signerFee=0n; // Offline signatures incur no separate on-chain approval transaction.
 return {status:'TESTNET_FEE_OBSERVATION_ONLY_NO_GO',sourceSha:build.sourceSha,localRehearsalSource:local.sourceSha,chainId:84532,commonFinalizedBlock:obs.commonFinalizedBlock,stageOne:{historicalPayer:expected.payer,publicGasEstimates:estimates.map(String),creationTemplateSha256:build.contracts[0].creationSha256},indicativeGasPricesWei:prices.map(String),planningGasBufferPercent:25,stages,illustrativeTotalL2FeeWei:String(payerFee+signerFee),illustrativeDeployerL2FeeWei:String(payerFee),illustrativeThreeApprovalL2FeeWei:String(signerFee),signatureMode:'ECDSA_ONLY',priorDeployerObservedBalanceWei:String(balance),priorDeployerCoversIllustrativeL2Only:balance>=payerFee,priorOwners:roles.filter(x=>x.role.startsWith('priorSigner')).map(x=>({role:x.role,balanceWei:x.balanceWei,codeState:x.codeState})),limitations:['First-stage exact frozen creation estimate only, using prior public payer for simulation; no successor role selection.','Remaining stages use local mined gas, not public estimates; 25% is a planning assumption, not a guaranteed margin.','Excludes L1 data fees, operator fees, future price changes, funding transfers and retries. No total fee ceiling established.','Prior role ownership and independence not verified. No signature, transaction submission or deployment approval.']};
}
export async function observeBudget(artifacts,local,fetchFn=fetch,now=Math.floor(Date.now()/1000)){
 const build=checkFrozenArtifacts(artifacts);
 const obs=await observeTestnet(fetchFn,now);
 const tag=obs.commonFinalizedBlock.number,data=artifacts[0].bytecode.object;
 let id=0;
 const rpc=async(url,method,params)=>{
  need(['eth_chainId','eth_getBlockByNumber','eth_estimateGas'].includes(method),'METHOD_NOT_ALLOWED');
  const requestId=++id;let r,d;
  try{r=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),signal:AbortSignal.timeout(20000)});d=await r.json();}catch{throw Error('BUDGET_RPC_TRANSPORT_'+method);}
  need(r.ok&&d?.jsonrpc==='2.0'&&d.id===requestId&&!d.error&&d.result!=null,'BUDGET_RPC_RESPONSE_'+method);return d.result;
 };
 const estimates=await Promise.all(endpoints.map(async url=>{
  need(await rpc(url,'eth_chainId',[])==='0x14a34','WRONG_CHAIN');
  const check=async()=>{const b=await rpc(url,'eth_getBlockByNumber',[tag,false]);need(b.number===tag&&b.hash===obs.commonFinalizedBlock.hash&&b.timestamp===obs.commonFinalizedBlock.timestamp&&b.gasLimit===obs.commonFinalizedBlock.gasLimit,'BUDGET_BLOCK_MISMATCH');};
  await check();
  const gas=qty(await rpc(url,'eth_estimateGas',[{from:expected.payer,data,value:'0x0'},tag]));
  await check();return gas;
 }));
 return projectBudget(local,obs,estimates,build);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  need(process.argv.length===3,'ARGUMENTS');
  const pin=read(new URL('./frozen-testnet-candidate.json',import.meta.url));
  const artifacts=pin.contracts.map(x=>read('out/SafeQuorumIssuanceFixture.sol/'+x.name+'.json'));
  console.log(JSON.stringify(await observeBudget(artifacts,read(process.argv[2])),null,2));
 }catch(e){console.error('NO_GO: '+(/^[A-Z_]+(?:_eth_[A-Za-z]+)?$/.test(e.message)?e.message:'LOCAL_OR_RPC_ERROR'));process.exitCode=1;}
}
