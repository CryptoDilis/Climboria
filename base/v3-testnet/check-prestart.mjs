// Read-only negative acceptance at the exact historical creation block.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {expected,specs} from './verify-creation.mjs';
const TOKEN='0x048361d2344a6b3bbb0aef04508f10038510d237',BLOCK='0x3d0744b',BLOCK_HASH='0x594ef6e177bb098f57a9a8c0c759c7c2d61419717cfa9c3075f89f3a62d60eb7';
const need=(ok,label)=>{if(!ok)throw Error(label);};
const word=n=>BigInt(n).toString(16).padStart(64,'0');
export const errors=['NothingDue()','OutsideWindow()','NotDistributor()','NotReady()','Unauthorized()'];
export async function checkPrestart(artifacts,evidence,selectors,fetchFn=fetch){
 need(evidence?.status==='V3_TEST_ONLY_FINALIZED_CREATION_OBSERVATION_NO_GO'&&evidence.chainId===84532&&evidence.token===TOKEN&&evidence.transaction===expected.tx&&evidence.creationSha256===expected.creation&&evidence.deploymentBlock===BLOCK&&evidence.blockHash===BLOCK_HASH,'EVIDENCE_MISMATCH');
 need(errors.every(s=>/^0x[0-9a-f]{8}$/.test(selectors[s]??''))&&new Set(errors.map(s=>selectors[s])).size===errors.length,'ERROR_SELECTORS');
 const vaults=evidence.vaults;
 need(Array.isArray(vaults)&&vaults.length===7&&specs.every((s,i)=>vaults[i].getter===s[0]&&vaults[i].type===s[1]&&vaults[i].allocationRaw===s[2].toString()&&/^0x[0-9a-f]{40}$/.test(vaults[i].address)&&/^[0-9a-f]{64}$/.test(vaults[i].runtimeSha256)),'VAULT_EVIDENCE');
 need(new Set(vaults.map(v=>v.address)).size===7,'VAULT_COLLISION');
 async function raw(method,params){
  let r,d;try{r=await fetchFn('https://sepolia.base.org',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});d=await r.json();}catch{throw Error('RPC_TRANSPORT_'+method);}
  need(r.ok&&d?.jsonrpc==='2.0'&&d.id===1,'RPC_RESPONSE_'+method);return d;
 }
 async function rpc(method,params){const d=await raw(method,params);need(!d.error&&d.result!=null,'RPC_RESULT_'+method);return d.result;}
 need(await rpc('eth_chainId',[])==='0x14a34','WRONG_CHAIN');
 const f=await rpc('eth_getBlockByNumber',['finalized',false]);
 need(/^0x[0-9a-f]+$/.test(f.number)&&/^0x[0-9a-f]{64}$/.test(f.hash)&&BigInt(f.number)>=BigInt(BLOCK),'NOT_FINALIZED');
 const block=await rpc('eth_getBlockByNumber',[BLOCK,false]);
 need(block.number===BLOCK&&block.hash===BLOCK_HASH&&/^0x[0-9a-f]+$/.test(block.timestamp)&&BigInt(block.timestamp)<expected.start,'NOT_PRESTART');
 for(const v of vaults){
  const c=await rpc('eth_getCode',[v.address,BLOCK]);
  need(typeof c==='string'&&/^0x(?:[a-f0-9]{2})+$/.test(c)&&createHash('sha256').update(Buffer.from(c.slice(2),'hex')).digest('hex')===v.runtimeSha256,'VAULT_RUNTIME');
 }
 const observations=[];
 async function revert(i,method,args,from,error){
  const v=vaults[i],a=artifacts[v.type],selector=a?.methodIdentifiers?.[method];
  need(/^[0-9a-f]{8}$/.test(selector??'')&&a.abi?.some(x=>x.type==='error'&&x.name===error.slice(0,-2)&&x.inputs.length===0),'ABI_MISMATCH');
  const d=await raw('eth_call',[{from,to:v.address,data:'0x'+selector+args},BLOCK]);
  // Do not accept generic failures, rate limits or transport errors as proof of a revert.
  need(d.result===undefined&&d.error&&Number.isInteger(d.error.code)&&d.error.data===selectors[error],'EXPECTED_REVERT_'+v.getter+'_'+method);
  observations.push({vault:v.getter,method,from,error,revertData:d.error.data});
 }
 await revert(0,'release()','',expected.founder,'NothingDue()');
 await revert(1,'release(uint256)',word(1),expected.distributor,'OutsideWindow()');
 await revert(1,'release(uint256)',word(1),expected.payer,'NotDistributor()');
 for(const i of [3,4,5]){
  await revert(i,'execute(bytes32)',word(0),expected.payer,'NotReady()');
  await revert(i,'propose(address,uint256,bytes32,uint256,bytes32)',word(expected.distributor)+word(1)+word(1)+word(0)+word(1),expected.payer,'Unauthorized()');
 }
 const [again,fa]=await Promise.all([rpc('eth_getBlockByNumber',[BLOCK,false]),rpc('eth_getBlockByNumber',[f.number,false])]);
 need(again.number===BLOCK&&again.hash===BLOCK_HASH&&fa.number===f.number&&fa.hash===f.hash,'BLOCK_RECHECK');
 return {status:'V3_HISTORICAL_PRESTART_NEGATIVE_OBSERVATION_NO_GO',chainId:84532,token:TOKEN,block:BLOCK,blockHash:BLOCK_HASH,finalizedReference:f.number,observations,caveat:'Single RPC exact revert data at historical creation block; no signed transactions, positive release, current-state or production security claim.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const paths={V3FounderVesting:'ClimbV3TestToken.sol',V3GamingVault:'ClimbV3TestToken.sol',V3InactiveReserve:'ClimbV3TestToken.sol',V3RestrictedSpend:'V3RestrictedSpend.sol'};
  const a=Object.fromEntries(Object.entries(paths).map(([n,p])=>[n,JSON.parse(readFileSync('out/'+p+'/'+n+'.json','utf8'))]));
  const selectors=Object.fromEntries(errors.map(s=>[s,execFileSync('cast',['sig',s],{encoding:'utf8'}).trim()]));
  console.log(JSON.stringify(await checkPrestart(a,JSON.parse(readFileSync(process.argv[2],'utf8')),selectors),null,2));
 }catch(e){console.error('NO_GO: '+(/^[A-Z_]+[A-Za-z_()0-9,]*$/.test(e.message)?e.message:'LOCAL_OR_INTERNAL_ERROR'));process.exitCode=1;}
}
