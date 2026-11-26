// Read-only Base Sepolia prototype evidence. No signer or broadcast.
import {buildManifest} from './build-manifest.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const fail=()=>{throw new Error('NO_GO: invalid test-only creation receipt evidence');};
const addr=x=>typeof x==='string'&&/^0x[0-9a-fA-F]{40}$/.test(x)&&!/^0x0{40}$/.test(x);
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const qty=x=>{if(typeof x!=='string'||x.length>66||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x))fail();return BigInt(x);};
const word=n=>'0x'+n.toString(16).padStart(64,'0');
const topicAddress=a=>'0x'+'0'.repeat(24)+a.slice(2);
const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO='0x'+'0'.repeat(64),SUPPLY=1000000000n;
const signatures=['decimals()','totalSupply()','totalBurned()','INITIAL_TEST_SUPPLY()','balanceOf(address)'];
export async function verifyCreation(artifact,source,commit,payer,token,tx,fetchFn=fetch){
 const manifest=buildManifest(artifact,source,commit);
 if(!addr(payer)||!addr(token)||typeof tx!=='string')fail();
 payer=payer.toLowerCase();token=token.toLowerCase();tx=tx.toLowerCase();
 if(payer===token||!hash(tx))fail();
 const selectors=artifact.methodIdentifiers;
 if(!selectors||signatures.some(s=>typeof selectors[s]!=='string'||!/^[0-9a-f]{8}$/.test(selectors[s]))||new Set(signatures.map(s=>selectors[s])).size!==signatures.length)fail();
 async function rpc(method,params){
  const r=await fetchFn('https://sepolia.base.org',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
  if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
 }
 if(await rpc('eth_chainId',[])!=='0x14a34')fail();
 const [final,r,t]=await Promise.all([rpc('eth_getBlockByNumber',['finalized',false]),rpc('eth_getTransactionReceipt',[tx]),rpc('eth_getTransactionByHash',[tx])]);
 if(!hash(final?.hash)||qty(final.number)<=0n||r?.status!=='0x1'||r.transactionHash!==tx||r.contractAddress?.toLowerCase()!==token||r.from?.toLowerCase()!==payer||r.to!==null||!hash(r.blockHash)||qty(r.blockNumber)<=0n||qty(r.blockNumber)>qty(final.number))fail();
 if(t?.hash!==tx||t.from?.toLowerCase()!==payer||t.to!==null||t.blockHash!==r.blockHash||t.blockNumber!==r.blockNumber||t.value!=='0x0'||t.input?.toLowerCase()!==artifact.bytecode.object.toLowerCase())fail();
 if(!Array.isArray(r.logs)||r.logs.length!==1)fail();
 const log=r.logs[0];if(log.address?.toLowerCase()!==token||log.removed!==false||log.transactionHash!==tx||log.blockHash!==r.blockHash||log.blockNumber!==r.blockNumber||!Array.isArray(log.topics)||log.topics.length!==3||log.topics[0]!==TRANSFER||log.topics[1]!==ZERO||log.topics[2]!==topicAddress(payer)||log.data!==word(SUPPLY))fail();
 const block=await rpc('eth_getBlockByNumber',[r.blockNumber,false]);
 if(block?.number!==r.blockNumber||block.hash!==r.blockHash)fail();
 const tag=r.blockNumber;
 const [code,...values]=await Promise.all([rpc('eth_getCode',[token,tag]),...signatures.map(s=>rpc('eth_call',[{to:token,data:'0x'+selectors[s]+(s==='balanceOf(address)'?topicAddress(payer).slice(2):'')},tag]))]);
 if(typeof code!=='string'||code.toLowerCase()!==artifact.deployedBytecode.object.toLowerCase()||values.some((v,i)=>v!==[word(6n),word(SUPPLY),word(0n),word(SUPPLY),word(SUPPLY)][i]))fail();
 const [again,finalAgain]=await Promise.all([rpc('eth_getBlockByNumber',[tag,false]),rpc('eth_getBlockByNumber',[final.number,false])]);
 if(again?.number!==tag||again.hash!==r.blockHash||finalAgain?.number!==final.number||finalAgain.hash!==final.hash)fail();
 return {status:'TEST_ONLY_FINALIZED_CREATION_OBSERVATION_NO_GO',chainId:84532,sourceCommit:commit,token,payer,transaction:tx,deploymentBlock:tag,deploymentBlockHash:r.blockHash,finalizedReferenceBlock:final.number,creationSha256:manifest.creationSha256,runtimeSha256:manifest.runtimeSha256,initialMintEventMatched:true,endOfDeploymentBlockSupplyRaw:SUPPLY.toString(),endOfDeploymentBlockBurnedRaw:'0',caveat:'Single RPC, provider-reported finality and exact artifact match only. Checks state at end of creation block; later state not verified. Not actual migration, audit or mainnet authorization.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==8)fail();const [a,s,c,p,t,h]=process.argv.slice(2);console.log(JSON.stringify(await verifyCreation(JSON.parse(readFileSync(a,'utf8')),readFileSync(s,'utf8'),c,p,t,h),null,2));}
 catch{console.error('NO_GO: test-only creation verification failed (details redacted)');process.exitCode=1;}
}
