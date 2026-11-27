// Public Base Sepolia read-only acceptance evidence. Never signs, sends or deploys.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {expected} from '../v3-testnet/verify-creation.mjs';
export const endpoints=['https://sepolia.base.org','https://base-sepolia-rpc.publicnode.com'];
const pin=JSON.parse(readFileSync(new URL('./frozen-testnet-candidate.json',import.meta.url),'utf8'));
const token='0x048361d2344a6b3bbb0aef04508f10038510d237',anchor='0x3d0744b',anchorHash='0x594ef6e177bb098f57a9a8c0c759c7c2d61419717cfa9c3075f89f3a62d60eb7';
const supply=888888888000000n;
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const quantity=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'INVALID_QUANTITY');return BigInt(x);};
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const bytes=x=>typeof x==='string'&&/^0x(?:[0-9a-f]{2})+$/.test(x);
const sha=x=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
const hex=x=>'0x'+x.toString(16);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function block(b){need(hash(b?.hash)&&quantity(b.number)>0n&&quantity(b.timestamp)>0n&&quantity(b.gasLimit)>0n,'BLOCK_INVALID');return {number:b.number,hash:b.hash,timestamp:b.timestamp,gasLimit:b.gasLimit};}
export async function observeTestnet(fetchFn=fetch,now=Math.floor(Date.now()/1000)){
 need(pin.status==='TEST_ONLY_FROZEN_BUILD_NOT_APPROVAL','FROZEN_CANDIDATE_RETIRED');
 need(Number.isSafeInteger(now)&&now>0,'CLOCK_INVALID');
 const allowed=new Set(['eth_chainId','eth_getBlockByNumber','eth_getTransactionReceipt','eth_getCode','eth_call','eth_getBalance','eth_gasPrice']);
 let id=0;
 const clients=endpoints.map((url,index)=>async(method,params=[])=>{
  need(allowed.has(method),'METHOD_NOT_ALLOWED');
  const requestId=++id;let r,d;
  try{r=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),signal:AbortSignal.timeout(15000)});d=await r.json();}catch{throw Error('RPC_TRANSPORT_'+index+'_'+method);}
  need(r.ok&&d?.jsonrpc==='2.0'&&d.id===requestId&&!d.error&&d.result!=null,'RPC_RESPONSE_'+index+'_'+method);
  return d.result;
 });
 const both=(method,params)=>Promise.all(clients.map(c=>c(method,params)));
 const chain=await both('eth_chainId',[]);need(chain.every(x=>x==='0x14a34'),'WRONG_CHAIN');
 const finals=(await both('eth_getBlockByNumber',['finalized',false])).map(block);
 const n=finals.map(x=>quantity(x.number)),tag=hex(n[0]<n[1]?n[0]:n[1]);
 const common=(await both('eth_getBlockByNumber',[tag,false])).map(block);
 need(same(common[0],common[1])&&common[0].number===tag,'COMMON_FINALIZED_BLOCK_MISMATCH');
 const age=BigInt(now)-quantity(common[0].timestamp);
 need(age>=-60n&&age<=7200n,'FINALIZED_REFERENCE_STALE');
 need(quantity(tag)>=quantity(anchor),'ANCHOR_NOT_FINALIZED');
 const historic=(await both('eth_getBlockByNumber',[anchor,false])).map(block);
 need(same(historic[0],historic[1])&&historic[0].number===anchor&&historic[0].hash===anchorHash,'HISTORICAL_ANCHOR_MISMATCH');
 const receipts=await both('eth_getTransactionReceipt',[expected.tx]);
 for(const r of receipts)need(r.status==='0x1'&&r.transactionHash===expected.tx&&r.blockNumber===anchor&&r.blockHash===anchorHash&&r.contractAddress?.toLowerCase()===token&&r.from?.toLowerCase()===expected.payer,'HISTORICAL_RECEIPT_MISMATCH');
 const code=await both('eth_getCode',[token,anchor]);
 need(bytes(code[0])&&code[0]===code[1],'HISTORICAL_CODE_MISMATCH');
 const supplyWords=await both('eth_call',[{to:token,data:'0x18160ddd'},anchor]);
 need(supplyWords.every(x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x)&&BigInt(x)===supply),'HISTORICAL_SUPPLY_MISMATCH');
 const prices=(await both('eth_gasPrice',[])).map(quantity);need(prices.every(x=>x>0n),'GAS_PRICE_INVALID');
 // Existing public test-role addresses are observed for the old fixture only.
 // They are NOT selected, approved, or controlled by the successor candidate.
 const roles=[['priorDeployer',expected.payer],['priorFounder',expected.founder],['priorDistributor',expected.distributor],...expected.signers.map((a,i)=>['priorSigner'+(i+1),a])];
 const previousRoles=[];
 for(const [role,address] of roles){
  const [balances,codes]=await Promise.all([both('eth_getBalance',[address,tag]),both('eth_getCode',[address,tag])]);
  const b=balances.map(quantity);
  need(b[0]===b[1]&&codes[0]===codes[1]&&(codes[0]==='0x'||bytes(codes[0])),'PRIOR_ROLE_STATE_MISMATCH');
  previousRoles.push({role,address,balanceWei:b[0].toString(),codeState:codes[0]==='0x'?'EMPTY':/^0xef0100[0-9a-f]{40}$/.test(codes[0])?'DELEGATED':'CODE_PRESENT'});
 }
 const recheck=(await both('eth_getBlockByNumber',[tag,false])).map(block);
 const reFinal=(await both('eth_getBlockByNumber',['finalized',false])).map(block);
 need(recheck.every(x=>same(x,common[0]))&&reFinal.every(x=>quantity(x.number)>=quantity(tag)),'FINALIZED_RECHECK_MISMATCH');
 return {status:'DUAL_RPC_HISTORICAL_AND_CHAIN_OBSERVATION_ONLY_NO_GO',chainId:84532,sourceSha:pin.sourceSha,providers:endpoints,finalizedHeads:finals,commonFinalizedBlock:common[0],priorFixture:{token,transaction:expected.tx,block:anchor,blockHash:anchorHash,runtimeSha256:sha(code[0]),initialSupplyRaw:supply.toString(),previousRoles},indicativeGasPriceWei:prices.map(String),limitations:['Two named RPC endpoints; underlying infrastructure independence not established.','Historical fixture only; no successor address or actual signer configuration selected.','No signer control, independent security approval, exact fee estimate, authorization or broadcast.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await observeTestnet(),null,2));}
 catch(e){console.error('NO_GO: '+(/^[A-Z_0-9]+(?:_eth_[A-Za-z]+)?$/.test(e.message)?e.message:'INTERNAL_OR_RPC_ERROR'));process.exitCode=1;}
}
