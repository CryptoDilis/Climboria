// Read-only raw evidence for the previously observed four positive accounts, not a snapshot certification.
import {createHash} from 'node:crypto';
import {CLIMB_SOLANA_MINT as M,TOKEN_2022_PROGRAM as P,assertDistinctRpcEndpoints,inspectMintReply} from '../../token/climb-bridge/mint-inspect.mjs';
import {pubkey,inspectRawMint} from '../../token/climb-bridge/mint-raw-evidence.mjs';
import {inspectBatch} from './probe.mjs';
export const KEYS=Object.freeze(['4YtuWcQN8UxcHVVfPspPAb4NrucGsHxvW9a1RGHYcTu9','9hPR8t7ZYpLTPWoM5yW76UeScQtnyYE9CiemSNweyqKU','CiJYEU7SaNvvMTFG4ufaiUKVxbFbr6fHXLvka1y1L4B8','FZZbYE8uchTGd3Q6kXvWNmK4Qdq9t5eyghvhHoEk6oMd']);
export const CURVE_AUTH='EZfyVaAzfDcFuDCEv1T7SzQ8Ly7waJJfXfeaxmT8GR23';
const fail=code=>{throw new Error('NO_GO: '+code);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const zero=b=>b.every(x=>x===0);
const key=s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const slot=n=>{if(!Number.isSafeInteger(n)||n<=0)fail('RAW_SLOT');return n;};
function bytes(v){if(!Array.isArray(v?.data)||v.data.length!==2||v.data[1]!=='base64'||typeof v.data[0]!=='string'||v.data[0].length>90000)fail('RAW_ENCODING');const b=Buffer.from(v.data[0],'base64');if(b.toString('base64')!==v.data[0]||b.length>65536)fail('RAW_ENCODING');return b;}
function option(b,i){const n=b.readUInt32LE(i);if(n!==0&&n!==1)fail('RAW_OPTION');return n===1;}
export function inspectRawAccount(v,row){
 if(v?.owner!==P||v.executable!==false||!row)fail('RAW_ACCOUNT_OWNER');
 const b=bytes(v);if(b.length<165||b.length>1024||b.length===355)fail('RAW_ACCOUNT_LAYOUT');
 if(b.length!==165){
  if(b.length<166||b[165]!==2)fail('RAW_ACCOUNT_TYPE');
  let at=166,seen=false;
  while(at<b.length&&!zero(b.subarray(at))){
   if(at+4>b.length||b.readUInt16LE(at)!==7||b.readUInt16LE(at+2)!==0||seen)fail('RAW_ACCOUNT_EXTENSION');
   seen=true;at+=4;
  }
 }
 if(pubkey(b.subarray(0,32))!==M||pubkey(b.subarray(32,64))!==row.authority||b.readBigUInt64LE(64).toString()!==row.amountRaw||b[108]!==({initialized:1,frozen:2}[row.state])||option(b,109)||option(b,72)!==row.delegatePresent||option(b,129)!==row.closeAuthorityPresent)fail('RAW_PARSED_MISMATCH');
 if(!row.delegatePresent&&b.readBigUInt64LE(121)!==0n)fail('RAW_DELEGATED_AMOUNT');
 return {account:row.account,authority:row.authority,amountRaw:row.amountRaw,sha256:sha(b),byteLength:b.length};
}
async function rpc(url,method,params,f){
 let r;try{r=await f(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});}catch{fail('RAW_RPC_UNAVAILABLE');}
 if(!r?.ok)fail('RAW_RPC_UNAVAILABLE');const t=await r.text();if(t.length>1000000)fail('RAW_RPC_RESPONSE');let j;try{j=JSON.parse(t);}catch{fail('RAW_RPC_RESPONSE');}if(j?.jsonrpc!=='2.0'||j.id!==1||j.error||j.result==null)fail('RAW_RPC_RESPONSE');return j.result;
}
export async function observeRaw(a,b,genesis,f=fetch){
 assertDistinctRpcEndpoints(a,b);if(!key(genesis))fail('RAW_GENESIS');
 const result=await Promise.all([a,b].map(async url=>{
  if(await rpc(url,'getGenesisHash',[],f)!==genesis)fail('RAW_GENESIS');
  const head=slot(await rpc(url,'getSlot',[{commitment:'finalized'}],f));
  const addresses=[M,...KEYS,CURVE_AUTH];
  const cfg={commitment:'finalized',minContextSlot:head};
  const [p,r]=await Promise.all([rpc(url,'getMultipleAccounts',[addresses,{...cfg,encoding:'jsonParsed'}],f),rpc(url,'getMultipleAccounts',[addresses,{...cfg,encoding:'base64'}],f)]);
  const at=slot(r?.context?.slot);if(at!==slot(p?.context?.slot)||at<head||at-head>128)fail('RAW_CONTEXT_MISMATCH');
  if(!Array.isArray(p.value)||!Array.isArray(r.value)||p.value.length!==addresses.length||r.value.length!==addresses.length)fail('RAW_BATCH');
  const parsed=inspectBatch({context:p.context,value:p.value.slice(0,-1)},KEYS,head);
  const pm=inspectMintReply({context:p.context,value:p.value[0]});
  const mint=inspectRawMint({context:r.context,value:r.value[0]},pm,head);
  const rows=KEYS.map((k,i)=>{const row=parsed.rows.find(x=>x.account===k);if(!row){if(r.value[i+1]!==null)fail('RAW_MISSING_ACCOUNT');return null;}return inspectRawAccount(r.value[i+1],row);});
  const cv=r.value.at(-1);if(!cv||!key(cv.owner)||typeof cv.executable!=='boolean')fail('RAW_CURVE_AUTHORITY');
  const authority={address:CURVE_AUTH,programOwner:cv.owner,executable:cv.executable,dataSha256:sha(bytes(cv))};
  const block=await rpc(url,'getBlock',[at,{commitment:'finalized',transactionDetails:'none',rewards:false,maxSupportedTransactionVersion:0}],f);
  if(!key(block?.blockhash))fail('RAW_BLOCKHASH');
  return {slot:at,blockhash:block.blockhash,supplyRaw:parsed.supplyRaw,sampledRaw:parsed.sampledRaw,unaccountedRaw:parsed.unaccountedRaw,mintSha256:mint.digest,rows,authority,parsedDigest:parsed.digest};
 }));
 if(JSON.stringify(result[0])!==JSON.stringify(result[1]))fail('RAW_PROVIDER_MISMATCH');
 return {status:'RAW_CANDIDATE_OBSERVATION_NO_GO',sameSlotAndReportedBlockhash:true,rawCandidateBytesMatched:true,providerIndependence:'UNVERIFIED',inventoryCompleteness:'NOT_CERTIFIED',custody:'UNCLASSIFIED',reserveRetirement:'UNVERIFIED',result:result[0]};
}
