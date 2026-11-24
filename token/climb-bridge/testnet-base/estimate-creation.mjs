// Base Sepolia contract creation simulation ONLY. No signature or broadcast.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {TESTNET} from '../ntt-testnet-core.mjs';
const fail=()=>{throw new Error('NO_GO: testnet creation estimate unavailable or invalid');};
function quantity(x){
 if(typeof x!=='string'||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)||x.length>66)fail();
 return BigInt(x);
}
export async function estimateTestTokenCreation(report,payer,fetchFn=fetch){
 if(typeof payer!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(payer)||/^0x0{40}$/.test(payer))fail();
 const u=report?.unsigned;
 if(report?.assessment!=='UNSIGNED_TESTNET_CONTRACT_CREATION_ONLY'||report.bridgeRelease!=='NO_GO'||report.chainId!==84532||u?.chainId!==84532||u.to!==null||u.value!=='0x0'||typeof u.data!=='string'||u.data.length>98306||!/^0x(?:[0-9a-f]{2})+$/.test(u.data))fail();
 const bytes=Buffer.from(u.data.slice(2),'hex');
 if(bytes.length!==report.creationBytes||createHash('sha256').update(bytes).digest('hex')!==report.creationSha256)fail();
 const b=TESTNET.base;
 async function rpc(method,params){
  const r=await fetchFn(b.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
  if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
 }
 if(await rpc('eth_chainId',[])!==b.chainId)fail();
 const block=await rpc('eth_getBlockByNumber',['latest',false]);
 if(quantity(block?.number)<=0n||typeof block.hash!=='string'||!/^0x[0-9a-f]{64}$/.test(block.hash))fail();
 const from=payer.toLowerCase(),tag=block.number;
 const [balance,code,price]=await Promise.all([rpc('eth_getBalance',[from,tag]),rpc('eth_getCode',[from,tag]),rpc('eth_gasPrice',[])]);
 if(code!=='0x')fail();
 const gas=quantity(await rpc('eth_estimateGas',[{from,value:'0x0',data:u.data},tag]));
 const gasPrice=quantity(price),funds=quantity(balance);
 if(gas<=0n||gas>quantity(block.gasLimit)||gasPrice<=0n)fail();
 const check=await rpc('eth_getBlockByNumber',[tag,false]);
 if(check?.hash!==block.hash||check.number!==tag)fail();
 const l2=gas*gasPrice;
 return {assessment:'PUBLIC_BASE_SEPOLIA_CREATION_ESTIMATE_ONLY',chainId:84532,payer:from,sourceCommit:report.sourceCommit,creationSha256:report.creationSha256,observedBlock:tag,blockHash:block.hash,estimatedExecutionGas:gas.toString(),observedGasPriceWei:gasPrice.toString(),illustrativeL2ExecutionFeeWei:l2.toString(),balanceWei:funds.toString(),coversIllustrativeL2ExecutionFee:funds>=l2,caveat:'Latest block simulation, not finality or ownership proof. Excludes L1 data fees, operator fees, gas margin and manager deployment. Gas price can change. No transaction submitted or approval granted.',bridgeRelease:'NO_GO'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==4)fail();console.log(JSON.stringify(await estimateTestTokenCreation(JSON.parse(readFileSync(process.argv[2],'utf8')),process.argv[3]),null,2));}
 catch{console.error('NO_GO: invalid payer, artifact, RPC or creation simulation (details redacted)');process.exitCode=1;}
}
