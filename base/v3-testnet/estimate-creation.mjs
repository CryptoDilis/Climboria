// Estimate only. Public role addresses do not establish control or approval.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const RPC='https://sepolia.base.org';
class EstimateError extends Error {
 constructor(code){super(code);this.code=code;}
}
const fail=(code='INVALID_EVIDENCE')=>{throw new EstimateError(code);};
const sha=hex=>createHash('sha256').update(Buffer.from(hex.slice(2),'hex')).digest('hex');
const quantity=v=>{if(typeof v!=='string'||v.length>66||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(v))fail();return BigInt(v);};
const addr=v=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x0{40}$/.test(v);
const word=n=>n.toString(16).padStart(64,'0');
const synthetic=Array.from({length:7},(_,i)=>'0x'+(10001+i).toString(16).padStart(40,'0'));
export function parseRoleConfig(input,payer){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='distributor,founder,signers'||!Array.isArray(input.signers)||input.signers.length!==5||!addr(payer))fail('ROLE_CONFIG_INVALID');
 const addresses=[input.founder,input.distributor,...input.signers];
 if(addresses.some(a=>!addr(a)||BigInt(a)<=65535n))fail('ROLE_ADDRESS_INVALID');
 const normalized=addresses.map(a=>a.toLowerCase());
 if(new Set([...normalized,payer.toLowerCase()]).size!==8)fail('ROLE_ADDRESS_COLLISION');
 return normalized;
}
function blockCheck(b){
 if(quantity(b?.number)<=0n||quantity(b.timestamp)<=0n||quantity(b.gasLimit)<=0n||!/^0x[0-9a-f]{64}$/.test(b.hash))fail();
}
export async function estimateV3(artifact,manifest,source,payer,fetchFn=fetch,roleConfig=null){
 const creation=artifact?.bytecode?.object;
 const entry=manifest?.contracts?.find(x=>x.name==='ClimbV3IntegratedTestToken');
 if(!/^[a-f0-9]{40}$/.test(source)||manifest?.sourceSha!==source||manifest?.chainId!==84532||manifest?.status!=='TEST_ONLY_BUILD_TEMPLATE_NO_DEPLOYMENT'||!addr(payer)||!entry||!/^0x(?:[a-fA-F0-9]{2})+$/.test(creation??'')||sha(creation)!==entry.creationSha256||entry.creationBytes!==(creation.length-2)/2||entry.creationBytes+256>49152)fail('ARTIFACT_OR_PAYER_INVALID');
 const abi=artifact.abi?.filter(x=>x.type==='constructor');
 if(abi?.length!==1||JSON.stringify(abi[0].inputs.map(x=>x.type))!==JSON.stringify(['address','address','uint256','address[5]']))fail('CONSTRUCTOR_ABI_INVALID');
 const from=payer.toLowerCase();
 const roles=roleConfig===null?synthetic:parseRoleConfig(roleConfig,from);
 if(roles.includes(from))fail('PAYER_ROLE_COLLISION');
 async function rpc(method,params){
  let response,d;
  try{response=await fetchFn(RPC,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});}catch{fail('RPC_TRANSPORT_'+method);}
  if(!response?.ok)fail('RPC_HTTP_'+method);
  try{d=await response.json();}catch{fail('RPC_JSON_'+method);}
  if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail('RPC_RESPONSE_'+method);return d.result;
 }
 if(await rpc('eth_chainId',[])!=='0x14a34')fail('WRONG_CHAIN');
 const block=await rpc('eth_getBlockByNumber',['latest',false]);blockCheck(block);
 const tag=block.number,start=quantity(block.timestamp)+604800n;
 const data=creation+word(BigInt(roles[0]))+word(BigInt(roles[1]))+word(start)+roles.slice(2).map(a=>word(BigInt(a))).join('');
 const [balance,code,price]=await Promise.all([rpc('eth_getBalance',[from,tag]),rpc('eth_getCode',[from,tag]),rpc('eth_gasPrice',[])]);
 if(code!=='0x')fail(typeof code==='string'&&/^0xef0100[0-9a-fA-F]{40}$/.test(code)?'PAYER_DELEGATED_EIP7702':'PAYER_CODE_NOT_EMPTY');
 if(roleConfig!==null){
  for(const role of roles){
   if(await rpc('eth_getCode',[role,tag])!=='0x')fail('ROLE_CODE_NOT_EMPTY');
  }
 }
 const gas=quantity(await rpc('eth_estimateGas',[{from,data,value:'0x0'},tag])),p=quantity(price),funds=quantity(balance);
 if(gas===0n||gas>quantity(block.gasLimit)||p===0n)fail('GAS_RANGE_INVALID');
 const check=await rpc('eth_getBlockByNumber',[tag,false]);blockCheck(check);
 if(check.number!==tag||check.hash!==block.hash||check.timestamp!==block.timestamp)fail('BLOCK_CHANGED');
 return {status:roleConfig===null?'SYNTHETIC_ROLES_ESTIMATE_ONLY_NO_DEPLOYMENT':'PUBLIC_ROLE_ESTIMATE_ONLY_NO_DEPLOYMENT',chainId:84532,sourceSha:source,payer:from,
 creationTemplateSha256:entry.creationSha256,constructorSpecificCreationSha256:sha(data),
 [roleConfig===null?'syntheticRoles':'publicRoles']:{founder:roles[0],distributor:roles[1],signers:roles.slice(2),start:start.toString()},
 observedBlock:tag,blockHash:block.hash,executionGas:gas.toString(),gasPriceWei:p.toString(),
 illustrativeL2FeeWei:(gas*p).toString(),balanceWei:funds.toString(),coversIllustrativeL2Fee:funds>=gas*p,
 caveat:roleConfig===null?'Uncontrolled synthetic role addresses; NEVER deploy this configuration. Single RPC latest block estimate; excludes L1 data/operator fees and margin. No transaction payload, signing or broadcast. Actual controlled addresses and exact deployment approval remain required.':'Public role addresses passed syntax/distinctness/empty-code checks only; control and independence are NOT verified. Single RPC latest-block estimate excludes L1 data/operator fees and margin. No transaction payload, signing or broadcast. Exact reviewed configuration and authorization required.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [manifestPath,source,payer]=process.argv.slice(2);if(process.argv.length!==5)fail();
 const raw=process.env.TEST_ROLE_CONFIG??'';
 const config=raw===''?null:JSON.parse(raw);
 if(raw!==''&&config===null)fail('ROLE_CONFIG_INVALID');
 console.log(JSON.stringify(await estimateV3(JSON.parse(readFileSync('out/ClimbV3IntegratedTestToken.sol/ClimbV3IntegratedTestToken.json','utf8')),JSON.parse(readFileSync(manifestPath,'utf8')),source,payer,fetch,config),null,2));}
 catch(error){console.error('NO_GO: '+(error instanceof EstimateError?error.code:'LOCAL_INPUT_OR_INTERNAL_ERROR')+' (raw details redacted)');process.exitCode=1;}
}
