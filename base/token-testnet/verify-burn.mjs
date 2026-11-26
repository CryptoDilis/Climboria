// Verify the first voluntary 10-token burn of the already deployed test prototype.
// Read-only, no signing, no mainnet or automatic retries.
import {verifyCreation,safeCreationError} from './verify-creation.mjs';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const INITIAL=1000000000n,AMOUNT=10000000n;
// Historical exception is limited to one observed Base Sepolia transaction. Not a signer policy.
const observedDelegated=Object.freeze({
 tx:'0x25b1d3df6321c559cd75bd89177f0a9a1537b85d103dbc6af7eafef4456dda89',
 creation:'0x105e638bed20059c3d6280948df682d96db5231f18cba96d07b21fb27d07b3f4',
 payer:'0x9ba615a67d6365849293521f6f9ce0dfd00d6012',
 token:'0xebcfcd744117aa74e7489ece72db93871dbe67ab',
 from:'0xc066ac5d385419b1a8c43a0e146fa439837a8b8c',
 to:'0xdb9b1e94b5b69df7e401ddbede43491141047db3',
 block:'0x'+(63879395).toString(16)
});

const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const word=n=>'0x'+n.toString(16).padStart(64,'0');
const topic=a=>'0x'+'0'.repeat(24)+a.slice(2);
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const reasons=new Set(['INVALID_BURN_INPUT','BURN_RPC_UNAVAILABLE','BURN_RPC_RESPONSE','BURN_WRONG_CHAIN','BURN_FINALIZED_HASH_INVALID','BURN_RECEIPT_BLOCK_HASH_INVALID','BURN_RECEIPT_STATUS_FAILED','BURN_RECEIPT_HASH_MISMATCH','BURN_RECEIPT_SENDER_MISMATCH','BURN_RECEIPT_TARGET_MISMATCH','BURN_RECEIPT_CONTRACT_ADDRESS_UNEXPECTED','BURN_NOT_FINALIZED','BURN_TRANSACTION_MISMATCH','BURN_EVENT_MISMATCH','BURN_BLOCK_MISMATCH','BURN_STATE_MISMATCH','BURN_RUNTIME_MISMATCH','BURN_SELECTOR_MISMATCH','DELEGATED_BURN_TYPE_MISMATCH','DELEGATED_BURN_ANCHOR_MISMATCH']);
class BurnError extends Error {constructor(code){super('NO_GO: '+code);this.code=code;}}
const fail=code=>{throw new BurnError(code);};
export const safeBurnError=e=>e instanceof BurnError&&reasons.has(e.code)?e.message:safeCreationError(e);
function qty(x){if(typeof x!=='string'||x.length>66||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x))fail('BURN_BLOCK_MISMATCH');return BigInt(x);}
export async function verifyBurn(artifact,source,commit,payer,token,creationTx,burnTx,fetchFn=fetch){
 if(typeof burnTx!=='string'||!hash(burnTx.toLowerCase())||typeof creationTx!=='string'||burnTx.toLowerCase()===creationTx.toLowerCase())fail('INVALID_BURN_INPUT');
 burnTx=burnTx.toLowerCase();
 const created=await verifyCreation(artifact,source,commit,payer,token,creationTx,fetchFn);
 payer=created.payer;token=created.token;
 const delegated=burnTx===observedDelegated.tx;
 if(delegated&&(payer!==observedDelegated.payer||token!==observedDelegated.token||created.transaction!==observedDelegated.creation))fail('DELEGATED_BURN_ANCHOR_MISMATCH');
 const outerFrom=delegated?observedDelegated.from:payer,outerTo=delegated?observedDelegated.to:token;
 const selectors=artifact.methodIdentifiers;
 const names=['totalSupply()','totalBurned()','balanceOf(address)'];
 if(selectors?.['burn(uint256)']!=='42966c68'||names.some(n=>!/^[0-9a-f]{8}$/.test(selectors?.[n]||''))||new Set(names.map(n=>selectors[n])).size!==3)fail('BURN_SELECTOR_MISMATCH');
 async function rpc(method,params){
  let r;try{r=await fetchFn('https://sepolia.base.org',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});}catch{fail('BURN_RPC_UNAVAILABLE');}
  if(!r?.ok)fail('BURN_RPC_UNAVAILABLE');let d;try{d=await r.json();}catch{fail('BURN_RPC_RESPONSE');}if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail('BURN_RPC_RESPONSE');return d.result;
 }
 if(await rpc('eth_chainId',[])!=='0x14a34')fail('BURN_WRONG_CHAIN');
 const [final,r,t]=await Promise.all([rpc('eth_getBlockByNumber',['finalized',false]),rpc('eth_getTransactionReceipt',[burnTx]),rpc('eth_getTransactionByHash',[burnTx])]);
 if(!hash(final?.hash))fail('BURN_FINALIZED_HASH_INVALID');
 if(!hash(r?.blockHash))fail('BURN_RECEIPT_BLOCK_HASH_INVALID');
 if(r.status!=='0x1')fail('BURN_RECEIPT_STATUS_FAILED');
 if(r.transactionHash!==burnTx)fail('BURN_RECEIPT_HASH_MISMATCH');
 if(r.from?.toLowerCase()!==outerFrom)fail('BURN_RECEIPT_SENDER_MISMATCH');
 if(r.to?.toLowerCase()!==outerTo)fail('BURN_RECEIPT_TARGET_MISMATCH');
 if(r.contractAddress!==null)fail('BURN_RECEIPT_CONTRACT_ADDRESS_UNEXPECTED');
 if(delegated&&(r.blockNumber!==observedDelegated.block))fail('DELEGATED_BURN_ANCHOR_MISMATCH');
 const n=qty(r.blockNumber);if(n<=qty(created.deploymentBlock))fail('BURN_BLOCK_MISMATCH');
 if(n>qty(final.number))fail('BURN_NOT_FINALIZED');
 if(t?.hash!==burnTx||t.from?.toLowerCase()!==outerFrom||t.to?.toLowerCase()!==outerTo||t.blockNumber!==r.blockNumber||t.blockHash!==r.blockHash||t.value!=='0x0')fail('BURN_TRANSACTION_MISMATCH');
 if(delegated){
  if(t.type!=='0x4'||r.type!=='0x4'||!Array.isArray(t.authorizationList)||t.authorizationList.length===0)fail('DELEGATED_BURN_TYPE_MISMATCH');
 }else if(t.input?.toLowerCase()!=='0x42966c68'+word(AMOUNT).slice(2))fail('BURN_TRANSACTION_MISMATCH');
 const l=r.logs?.[0];if(!Array.isArray(r.logs)||r.logs.length!==1||l?.address?.toLowerCase()!==token||l.removed!==false||l.transactionHash!==burnTx||l.blockHash!==r.blockHash||l.blockNumber!==r.blockNumber||JSON.stringify(l.topics)!==JSON.stringify([TRANSFER,topic(payer),word(0n)])||l.data!==word(AMOUNT))fail('BURN_EVENT_MISMATCH');
 const before='0x'+(n-1n).toString(16),after=r.blockNumber;
 const [pre,post]=await Promise.all([rpc('eth_getBlockByNumber',[before,false]),rpc('eth_getBlockByNumber',[after,false])]);
 if(pre?.number!==before||!hash(pre.hash)||post?.number!==after||post.hash!==r.blockHash||post.parentHash!==pre.hash)fail('BURN_BLOCK_MISMATCH');
 async function state(tag){
  const [code,...v]=await Promise.all([rpc('eth_getCode',[token,tag]),...names.map(name=>rpc('eth_call',[{to:token,data:'0x'+selectors[name]+(name==='balanceOf(address)'?topic(payer).slice(2):'')},tag]))]);
  if(typeof code!=='string'||code.toLowerCase()!==artifact.deployedBytecode.object.toLowerCase())fail('BURN_RUNTIME_MISMATCH');return v;
 }
 const [a,b]=await Promise.all([state(before),state(after)]);
 if(JSON.stringify(a)!==JSON.stringify([word(INITIAL),word(0n),word(INITIAL)])||JSON.stringify(b)!==JSON.stringify([word(INITIAL-AMOUNT),word(AMOUNT),word(INITIAL-AMOUNT)]))fail('BURN_STATE_MISMATCH');
 const refs=[[before,pre.hash],[after,post.hash],[final.number,final.hash]];
 await Promise.all(refs.map(async([tag,h])=>{const block=await rpc('eth_getBlockByNumber',[tag,false]);if(block?.number!==tag||block.hash!==h)fail('BURN_BLOCK_MISMATCH');}));
 return {status:'TEST_ONLY_FINALIZED_FIRST_BURN_OBSERVATION_NO_GO',chainId:84532,sourceCommit:commit,token,payer,creationTx:created.transaction,burnTx,burnBlock:after,burnBlockHash:post.hash,finalizedReferenceBlock:final.number,runtimeSha256:created.runtimeSha256,verifiedBurnEvent:true,observationMode:delegated?'HISTORICAL_DELEGATED_EVENT_AND_STATE_ONLY':'DIRECT_EXACT_CALLDATA',outerFrom,outerTo,directCalldataVerified:!delegated,beforeSupplyRaw:INITIAL.toString(),afterSupplyRaw:(INITIAL-AMOUNT).toString(),afterBurnedRaw:AMOUNT.toString(),afterPayerBalanceRaw:(INITIAL-AMOUNT).toString(),caveat:delegated?'Single provider, one pinned historical EIP-7702 outer transaction, exact token event and end-of-block state only; inner calldata, delegation authorization/signature, wallet implementation and future delegated transactions are NOT verified or authorized. No mainnet authorization.':'Single provider, end-of-block observations, first 10 test-token burn only. Not a production migration, audit, fee collector or mainnet authorization.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==9)fail('INVALID_BURN_INPUT');const [a,s,c,p,t,h,b]=process.argv.slice(2);console.log(JSON.stringify(await verifyBurn(JSON.parse(readFileSync(a,'utf8')),readFileSync(s,'utf8'),c,p,t,h,b),null,2));}catch(e){console.error(safeBurnError(e));process.exitCode=1;}
}
