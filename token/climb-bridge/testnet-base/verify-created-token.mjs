// Test-only deployment evidence, never signs or sends transactions.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {TESTNET} from '../ntt-testnet-core.mjs';
const fail=()=>{throw new Error('NO_GO: Base Sepolia created test token evidence invalid');};
const address=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{40}$/.test(s)&&!/^0x0{40}$/.test(s);
const txhash=s=>typeof s==='string'&&/^0x[0-9a-fA-F]{64}$/.test(s);
const qty=s=>{if(typeof s!=='string'||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(s)||s.length>66)fail();return BigInt(s);};
const word=n=>'0x'+n.toString(16).padStart(64,'0');
const digest=b=>createHash('sha256').update(b).digest('hex');
function bytes(s,max){if(typeof s!=='string'||s.length>max*2+2||!/^0x(?:[0-9a-fA-F]{2})+$/.test(s))fail();return Buffer.from(s.slice(2),'hex');}
export function expectedRuntime(artifact,binder){
 if(!address(binder))fail();
 const b=bytes(artifact?.deployedBytecode?.object,24576);
 const refs=artifact.deployedBytecode.immutableReferences;
 if(!refs||typeof refs!=='object'||Object.keys(refs).length!==1)fail();
 const entries=Object.values(refs)[0];
 if(!Array.isArray(entries)||!entries.length||entries.length>32)fail();
 const patched=Buffer.from(b),seen=new Set();
 for(const ref of entries){
  const s=ref?.start;
  if(!Number.isSafeInteger(s)||s<0||ref.length!==32||s+32>b.length||!b.subarray(s,s+32).every(x=>x===0))fail();
  for(let i=s;i<s+32;i++){if(seen.has(i))fail();seen.add(i);}
  Buffer.from(binder.slice(2),'hex').copy(patched,s+12);
 }
 return patched;
}
export async function verifyCreatedBaseToken(artifact,commit,token,binder,tx,fetchFn=fetch){
 if(!address(token)||!address(binder)||token.toLowerCase()===binder.toLowerCase()||!txhash(tx)||! /^[0-9a-f]{40}$/.test(commit))fail();
 token=token.toLowerCase();binder=binder.toLowerCase();tx=tx.toLowerCase();
 const creation=bytes(artifact?.bytecode?.object,49152),runtime=expectedRuntime(artifact,binder);
 const selectors=artifact.methodIdentifiers;
 const names=['decimals()','totalSupply()','binder()','manager()','TEST_CAP()'];
 if(!selectors||names.some(n=>typeof selectors[n]!=='string'||!/^[0-9a-f]{8}$/.test(selectors[n]))||new Set(names.map(n=>selectors[n])).size!==names.length)fail();
 async function rpc(method,params){
  const r=await fetchFn(TESTNET.base.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
  if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
 }
 if(await rpc('eth_chainId',[])!==TESTNET.base.chainId)fail();
 const [final,receipt,transaction]=await Promise.all([rpc('eth_getBlockByNumber',['finalized',false]),rpc('eth_getTransactionReceipt',[tx]),rpc('eth_getTransactionByHash',[tx])]);
 if(!txhash(final?.hash)||qty(final.number)<=0n||receipt?.status!=='0x1'||receipt.transactionHash?.toLowerCase()!==tx||receipt.contractAddress?.toLowerCase()!==token||receipt.from?.toLowerCase()!==binder||receipt.to!==null||!txhash(receipt.blockHash)||qty(receipt.blockNumber)>qty(final.number))fail();
 if(transaction?.hash?.toLowerCase()!==tx||transaction.from?.toLowerCase()!==binder||transaction.to!==null||transaction.blockHash!==receipt.blockHash||transaction.blockNumber!==receipt.blockNumber||transaction.value!=='0x0'||transaction.input?.toLowerCase()!=='0x'+creation.toString('hex'))fail();
 const deployment=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]);
 if(deployment?.hash!==receipt.blockHash||deployment.number!==receipt.blockNumber)fail();
 const tag=final.number;
 const [code,...values]=await Promise.all([rpc('eth_getCode',[token,tag]),...names.map(n=>rpc('eth_call',[{to:token,data:'0x'+selectors[n]},tag]))]);
 if(!bytes(code,24576).equals(runtime))fail();
 const expected=[word(6n),word(0n),'0x'+'0'.repeat(24)+binder.slice(2),word(0n),word(1000000000n)];
 if(values.some((v,i)=>v!==expected[i]))fail();
 const again=await rpc('eth_getBlockByNumber',[tag,false]);
 if(again?.hash!==final.hash||again.number!==tag)fail();
 return {assessment:'BASE_SEPOLIA_TEST_TOKEN_PRE_BIND_ONLY',sourceCommit:commit,chainId:84532,token,binder,deploymentTransaction:tx,deploymentBlock:receipt.blockNumber,observedFinalizedBlock:tag,blockHash:final.hash,creationSha256:digest(creation),runtimeSha256:digest(runtime),runtimeMatchesBinderPatchedCompilerOutput:true,decimals:6,totalSupplyRaw:'0',manager:null,testCapRaw:'1000000000',bridgeRelease:'NO_GO',caveat:'Single public RPC evidence; no ownership proof, manager approval, transfer proof or mainnet readiness.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==7)fail();const [p,commit,token,binder,tx]=process.argv.slice(2);console.log(JSON.stringify(await verifyCreatedBaseToken(JSON.parse(readFileSync(p,'utf8')),commit,token,binder,tx),null,2));}
 catch{console.error('NO_GO: Base Sepolia test deployment verification failed (details redacted)');process.exitCode=1;}
}
