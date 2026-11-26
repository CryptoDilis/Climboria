// Base Sepolia only, read-only. No transaction submission or signer.
import {buildManifest} from './build-manifest.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const RPC='https://sepolia.base.org';
const fail=()=>{throw new Error('NO_GO: invalid testnet creation simulation');};
function quantity(v){if(typeof v!=='string'||v.length>66||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(v))fail();return BigInt(v);}
function validBlock(b){if(quantity(b?.number)<=0n||typeof b.hash!=='string'||!/^0x[0-9a-f]{64}$/.test(b.hash)||quantity(b.gasLimit)<=0n)fail();}
export async function simulateCreation(artifact,source,commit,payer,fetchFn=fetch){
 const manifest=buildManifest(artifact,source,commit);
 if(typeof payer!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(payer)||/^0x0{40}$/.test(payer))fail();
 const from=payer.toLowerCase(),data=artifact.bytecode.object.toLowerCase();
 async function rpc(method,params){
  const response=await fetchFn(RPC,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
  if(!response?.ok)fail();const d=await response.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
 }
 if(await rpc('eth_chainId',[])!=='0x14a34')fail();
 const block=await rpc('eth_getBlockByNumber',['latest',false]);validBlock(block);
 const tag=block.number;
 const [balance,code,price]=await Promise.all([rpc('eth_getBalance',[from,tag]),rpc('eth_getCode',[from,tag]),rpc('eth_gasPrice',[])]);
 if(code!=='0x')fail();
 const gas=quantity(await rpc('eth_estimateGas',[{from,data,value:'0x0'},tag])),p=quantity(price),funds=quantity(balance);
 if(gas===0n||gas>quantity(block.gasLimit)||p===0n)fail();
 const check=await rpc('eth_getBlockByNumber',[tag,false]);validBlock(check);
 if(check.number!==tag||check.hash!==block.hash)fail();
 return {status:'TEST_ONLY_CREATION_ESTIMATE_NO_GO',chainId:84532,payer:from,sourceCommit:commit,creationSha256:manifest.creationSha256,runtimeSha256:manifest.runtimeSha256,observedBlock:tag,blockHash:block.hash,executionGas:gas.toString(),gasPriceWei:p.toString(),illustrativeL2FeeWei:(gas*p).toString(),balanceWei:funds.toString(),coversIllustrativeL2Fee:funds>=gas*p,caveat:'Single RPC latest-block estimate only. Excludes L1 data fees, operator fees and gas margin; not finality, ownership, full fee or deployment authorization. No signing or broadcast.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==6)fail();const [artifact,source,commit,payer]=process.argv.slice(2);console.log(JSON.stringify(await simulateCreation(JSON.parse(readFileSync(artifact,'utf8')),readFileSync(source,'utf8'),commit,payer),null,2));}
 catch{console.error('NO_GO: invalid testnet artifact, payer, RPC or simulation (details redacted)');process.exitCode=1;}
}
