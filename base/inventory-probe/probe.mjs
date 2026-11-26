// Read-only candidate discovery, not a finalized migration snapshot or custody proof.
import {CLIMB_SOLANA_MINT as MINT,TOKEN_2022_PROGRAM as PROGRAM,assertDistinctRpcEndpoints,inspectMintReply} from '../../token/climb-bridge/mint-inspect.mjs';
import {createHash} from 'node:crypto';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const fail=()=>{throw new Error('NO_GO: inventory probe failed');};
function key(s){if(typeof s!=='string'||s.length<32||s.length>44)fail();let n=0n;for(const c of s){const i=alphabet.indexOf(c);if(i<0)fail();n=n*58n+BigInt(i);}let l=0;while(n){l++;n>>=8n;}for(const c of s){if(c!=='1')break;l++;}if(l!==32)fail();return s;}
function raw(s){if(typeof s!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(s))fail();const n=BigInt(s);if(n>(1n<<64n)-1n)fail();return n;}
function slot(n){if(!Number.isSafeInteger(n)||n<=0)fail();return n;}
export function candidateKeys(reply){slot(reply?.context?.slot);if(!Array.isArray(reply.value)||reply.value.length>20)fail();const keys=reply.value.map(r=>key(r.address));if(new Set(keys).size!==keys.length||keys.includes(MINT))fail();return keys;}
export function inspectBatch(reply,keys,floor){
  const at=slot(reply?.context?.slot);if(at<slot(floor)||!Array.isArray(reply.value)||reply.value.length!==keys.length+1)fail();
  const mint=inspectMintReply({context:reply.context,value:reply.value[0]});
  if(mint.program!==PROGRAM||mint.mintAuthority!==null||mint.freezeAuthority!==null||mint.extensionTypeSummary!=='TOKEN_2022_REPORTED_TYPES:["metadataPointer","tokenMetadata"]')fail();
  const supply=raw(mint.supplyRaw);let sum=0n;const rows=[];
  for(let i=0;i<keys.length;i++){
    const v=reply.value[i+1];if(v===null)continue;
    const p=v?.data?.parsed,info=p?.info;
    if(v?.owner!==PROGRAM||v.executable!==false||v.data?.program!=='spl-token-2022'||p?.type!=='account'||info?.mint!==MINT||!['initialized','frozen'].includes(info.state)||info.tokenAmount?.decimals!==6||info.isNative!==false)fail();
    if(info.extensions!==undefined&&(!Array.isArray(info.extensions)||info.extensions.length>1||info.extensions.some(e=>e?.extension!=='immutableOwner')))fail();
    const n=raw(info.tokenAmount.amount);sum+=n;if(sum>supply)fail();
    rows.push({account:key(keys[i]),authority:key(info.owner),amountRaw:n.toString(),state:info.state,delegatePresent:info.delegate!=null,closeAuthorityPresent:info.closeAuthority!=null});
  }
  rows.sort((a,b)=>a.account<b.account?-1:a.account>b.account?1:0);
  return {slot:at,supplyRaw:supply.toString(),sampledRaw:sum.toString(),unaccountedRaw:(supply-sum).toString(),rows,digest:createHash('sha256').update(JSON.stringify([mint.supplyRaw,rows])).digest('hex')};
}
async function rpc(url,method,params,fetchFn){
  const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)fail();const body=await response.text();if(body.length>1000000)fail();const j=JSON.parse(body);if(j.jsonrpc!=='2.0'||j.id!==1||j.error||j.result==null)fail();return j.result;
}
export async function probe(a,b,expectedGenesis,fetchFn=fetch){
  assertDistinctRpcEndpoints(a,b);key(expectedGenesis);
  const endpoints=[a,b];
  const discovery=await Promise.all(endpoints.map(async url=>{
    const genesis=await rpc(url,'getGenesisHash',[],fetchFn);if(genesis!==expectedGenesis)fail();
    const head=slot(await rpc(url,'getSlot',[{commitment:'finalized'}],fetchFn));
    const reply=await rpc(url,'getTokenLargestAccounts',[MINT,{commitment:'finalized'}],fetchFn);
    const at=slot(reply.context?.slot);if(Math.abs(head-at)>128)fail();
    return {head,at,keys:candidateKeys(reply)};
  }));
  const keys=[...new Set(discovery.flatMap(d=>d.keys))].sort();
  if(!keys.length||keys.length>40)fail();
  const results=await Promise.all(endpoints.map(async(url,i)=>{
    const floor=Math.max(discovery[i].head,discovery[i].at);
    const reply=await rpc(url,'getMultipleAccounts',[[MINT,...keys],{commitment:'finalized',encoding:'jsonParsed',minContextSlot:floor}],fetchFn);
    const r=inspectBatch(reply,keys,floor);if(r.slot-floor>128)fail();return r;
  }));
  return {status:'READ_ONLY_CANDIDATES_NO_GO',sameReportedSlot:results[0].slot===results[1].slot,parsedCandidateDigestMatched:results[0].digest===results[1].digest,providerIndependence:'UNVERIFIED',rawLayout:'UNVERIFIED',canonicalBlockhash:'UNVERIFIED',inventoryCompleteness:'NOT_CERTIFIED',custody:'UNCLASSIFIED',results};
}
