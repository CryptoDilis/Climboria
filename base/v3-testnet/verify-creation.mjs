// Read-only verification of the exact approved Base Sepolia V3 creation.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const expected={tx:'0x2a09f140b2d20826a73706a213f1de03b813ffab13086ce29ccabf48959a1288',payer:'0xe429e7a5838879a40b4a1821f13fe80065109f70',founder:'0x87f9d486bcddc5c6ea964834747e4efe204f8fc5',distributor:'0x9c35fc1b8cb17f500591b5656a8ceb4c68c8e84c',signers:['0x9768acb407a4c16aba8c7d9e020f997b84cfdce7','0x2b4c305ca68af34c870d83fae3f18536645fe0b3','0x0289b0058a78bf426d89474a044efdef71bcbaa7','0x88146fafcffb6a29bbcd3c69a75af7d4454e8108','0xe54e6a08fc4c7225cdbfac7e4dd99bf0ac01ebd8'],start:1796316972n,template:'75a53139963cbbf3b62e8769f22064f3a7c4056d1b772be7f64ac15c8aa383cd',creation:'f573582d728db3e86987ca63b7f3d3e857f495fbb2f86ee9e3972bb2f40c599c'};
export const specs=[['founderVault','V3FounderVesting',17777777760000n],['gamingVault','V3GamingVault',311111110800000n],['liquidityReserve','V3InactiveReserve',222222222000000n,'LIQUIDITY'],['ecosystemReserve','V3RestrictedSpend',133333333200000n,'ECOSYSTEM'],['communityReserve','V3RestrictedSpend',88888888800000n,'COMMUNITY'],['treasuryReserve','V3RestrictedSpend',106666666560000n,'TREASURY'],['legacyReserve','V3InactiveReserve',8888888880000n,'LEGACY']];
const SUPPLY=888888888000000n,TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
class Failure extends Error{}
const need=(ok,reason)=>{if(!ok)throw new Failure(reason);};
const hash=x=>typeof x==='string'&&/^0x[0-9a-f]{64}$/.test(x);
const addr=x=>typeof x==='string'&&/^0x[0-9a-f]{40}$/.test(x)&&x!=='0x'+'0'.repeat(40);
const qty=x=>{need(typeof x==='string'&&/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(x)&&x.length<=66,'INVALID_QUANTITY');return BigInt(x);};
const word=x=>BigInt(x).toString(16).padStart(64,'0');
const sha=x=>createHash('sha256').update(Buffer.from(x.slice(2),'hex')).digest('hex');
const bytes=x=>typeof x==='string'&&/^0x(?:[0-9a-fA-F]{2})+$/.test(x);
const label=x=>Buffer.from(x,'ascii').toString('hex').padEnd(64,'0');
export function matchRuntime(artifact,code,allowed){
 const template=artifact?.deployedBytecode?.object;
 need(bytes(template)&&bytes(code)&&template.length===code.length,'RUNTIME_LENGTH');
 const t=Buffer.from(template.slice(2),'hex'),v=Buffer.from(code.slice(2),'hex');
 const groups=Object.values(artifact.deployedBytecode.immutableReferences??{}),used=new Set();
 for(const group of groups){
  let prior=null;
  for(const {start,length} of group){
   need(Number.isSafeInteger(start)&&start>=0&&length===32&&start+length<=t.length,'IMMUTABLE_RANGE');
   const val=v.subarray(start,start+length).toString('hex');
   need(allowed.has(val)&&(prior===null||prior===val),'IMMUTABLE_VALUE');prior=val;
   for(let i=start;i<start+length;i++){need(!used.has(i)&&t[i]===0,'IMMUTABLE_TEMPLATE');used.add(i);v[i]=0;}
  }
 }
 need(v.equals(t),'RUNTIME_MISMATCH');
 return sha(code);
}
export async function verify(artifacts,e=expected,fetchFn=fetch){
 const main=artifacts.ClimbV3IntegratedTestToken,creation=main?.bytecode?.object;
 need(bytes(creation)&&sha(creation)===e.template,'BUILD_HASH');
 const data=creation.toLowerCase()+[e.founder,e.distributor,e.start,...e.signers].map(word).join('');
 need(sha(data)===e.creation,'CREATION_HASH');
 async function rpc(method,params){
  let r,d;try{r=await fetchFn('https://sepolia.base.org',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});d=await r.json();}catch{throw new Failure('RPC_TRANSPORT_'+method);}
  need(r.ok&&d?.jsonrpc==='2.0'&&d.id===1&&!d.error&&d.result!=null,'RPC_RESPONSE_'+method);return d.result;
 }
 need(await rpc('eth_chainId',[])==='0x14a34','WRONG_CHAIN');
 const [final,r,t]=await Promise.all([rpc('eth_getBlockByNumber',['finalized',false]),rpc('eth_getTransactionReceipt',[e.tx]),rpc('eth_getTransactionByHash',[e.tx])]);
 const token=r.contractAddress,tag=r.blockNumber;
 need(hash(final.hash)&&qty(final.number)>0n,'FINALIZED_REFERENCE');
 need(r.status==='0x1'&&r.transactionHash===e.tx&&addr(token)&&r.from?.toLowerCase()===e.payer&&r.to===null&&hash(r.blockHash)&&qty(tag)>0n,'RECEIPT_MISMATCH');
 need(qty(tag)<=qty(final.number),'NOT_FINALIZED');
 need(t.hash===e.tx&&t.from?.toLowerCase()===e.payer&&t.to===null&&t.value==='0x0'&&t.blockNumber===tag&&t.blockHash===r.blockHash&&t.input?.toLowerCase()===data,'TRANSACTION_MISMATCH');
 const block=await rpc('eth_getBlockByNumber',[tag,false]);need(block.number===tag&&block.hash===r.blockHash&&qty(block.timestamp)<e.start,'BLOCK_MISMATCH');
 async function call(to,artifact,signature,args=''){
  const selector=artifact?.methodIdentifiers?.[signature];need(typeof selector==='string'&&/^[0-9a-f]{8}$/.test(selector),'SELECTOR');
  const v=await rpc('eth_call',[{to,data:'0x'+selector+args},tag]);need(hash(v),'CALL_WORD');return v.slice(2);
 }
 const eq=async(to,a,s,w,args='')=>need(await call(to,a,s,args)===w,'STATE_'+s);
 const vaults=[];
 for(const [getter,type,allocation,purpose] of specs){
  const result=await call(token,main,getter+'()');need(/^0{24}[0-9a-f]{40}$/.test(result),'VAULT_WORD');
  const address='0x'+result.slice(24);need(addr(address),'VAULT_ADDRESS');vaults.push({getter,type,allocation,purpose,address});
 }
 need(new Set([token,e.payer,e.founder,e.distributor,...e.signers,...vaults.map(v=>v.address)]).size===16,'ADDRESS_COLLISION');
 const mainRuntime=matchRuntime(main,await rpc('eth_getCode',[token,tag]),new Set(vaults.map(v=>word(v.address))));
 await eq(token,main,'decimals()',word(6));await eq(token,main,'totalSupply()',word(SUPPLY));await eq(token,main,'INITIAL_SUPPLY()',word(SUPPLY));
 for(const a of [e.payer,e.founder,e.distributor,...e.signers])await eq(token,main,'balanceOf(address)',word(0),word(a));
 need(Array.isArray(r.logs)&&r.logs.length===7,'MINT_LOG_COUNT');
 for(let i=0;i<vaults.length;i++){
  const v=vaults[i],a=artifacts[v.type],l=r.logs[i];
  need(l.address?.toLowerCase()===token&&l.removed===false&&l.transactionHash===e.tx&&l.blockHash===r.blockHash&&l.blockNumber===tag&&JSON.stringify(l.topics)===JSON.stringify([TRANSFER,'0x'+word(0),'0x'+word(v.address)])&&l.data==='0x'+word(v.allocation),'MINT_LOG_MISMATCH');
  await eq(token,main,'balanceOf(address)',word(v.allocation),word(v.address));
  const allowed=new Set();
  if(v.purpose){allowed.add(label(v.purpose));await eq(v.address,a,'purpose()',label(v.purpose));}
  if(v.type!=='V3InactiveReserve'){
   allowed.add(word(token));allowed.add(word(e.start));
   await eq(v.address,a,'token()',word(token));await eq(v.address,a,'start()',word(e.start));
  }
  if(v.type==='V3FounderVesting'){allowed.add(word(e.founder));await eq(v.address,a,'beneficiary()',word(e.founder));await eq(v.address,a,'ALLOCATION()',word(v.allocation));await eq(v.address,a,'released()',word(0));await eq(v.address,a,'vested()',word(0));}
  if(v.type==='V3GamingVault'){allowed.add(word(e.distributor));await eq(v.address,a,'distributor()',word(e.distributor));await eq(v.address,a,'ALLOCATION()',word(v.allocation));await eq(v.address,a,'released()',word(0));}
  if(v.type==='V3RestrictedSpend'){
   allowed.add(word(e.founder));allowed.add(word(v.allocation));
   await eq(v.address,a,'excludedFounder()',word(e.founder));await eq(v.address,a,'budget()',word(v.allocation));await eq(v.address,a,'totalSpent()',word(0));
   for(const s of e.signers)await eq(v.address,a,'signer(address)',word(1),word(s));
   for(const s of [e.payer,e.founder,e.distributor,token,v.address])await eq(v.address,a,'signer(address)',word(0),word(s));
  }
  v.runtimeSha256=matchRuntime(a,await rpc('eth_getCode',[v.address,tag]),allowed);
  v.allocationRaw=v.allocation.toString();delete v.allocation;
 }
 const [again,finalAgain]=await Promise.all([rpc('eth_getBlockByNumber',[tag,false]),rpc('eth_getBlockByNumber',[final.number,false])]);
 need(again.number===tag&&again.hash===r.blockHash&&finalAgain.number===final.number&&finalAgain.hash===final.hash,'BLOCK_RECHECK');
 return {status:'V3_TEST_ONLY_FINALIZED_CREATION_OBSERVATION_NO_GO',chainId:84532,transaction:e.tx,token,payer:e.payer,deploymentBlock:tag,blockHash:r.blockHash,finalizedReferenceBlock:final.number,creationSha256:e.creation,runtimeSha256:mainRuntime,supplyRaw:SUPPLY.toString(),vaults,caveat:'Single RPC provider-reported finality; creation-block state only, normalized runtime templates plus immutable getter checks. Not audit, production authorization or current balance proof.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const paths={ClimbV3IntegratedTestToken:'ClimbV3IntegratedTestToken.sol',V3FounderVesting:'ClimbV3TestToken.sol',V3GamingVault:'ClimbV3TestToken.sol',V3InactiveReserve:'ClimbV3TestToken.sol',V3RestrictedSpend:'V3RestrictedSpend.sol'};
  const a=Object.fromEntries(Object.entries(paths).map(([n,p])=>[n,JSON.parse(readFileSync('out/'+p+'/'+n+'.json','utf8'))]));
  console.log(JSON.stringify(await verify(a),null,2));
 }catch(e){console.error('NO_GO: '+(e instanceof Failure?e.message:'LOCAL_OR_INTERNAL_ERROR'));process.exitCode=1;}
}
