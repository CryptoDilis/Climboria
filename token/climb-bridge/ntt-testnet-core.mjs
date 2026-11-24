// Public testnet ONLY; no secrets, signer, deployment or transaction submission.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {pubkey} from './mint-raw-evidence.mjs';
// Source: wormhole-foundation/wormhole-sdk-ts @ 031b5e315d80acda7bb11b8eb8bdfae209b80258
// core/base/src/constants/{contracts/core.ts,chains.ts,nativeChainIds.ts,rpc.ts}
export const TESTNET=Object.freeze({
 solana:Object.freeze({rpc:'https://api.devnet.solana.com',genesis:'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',core:'3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5',wormholeChainId:1}),
 base:Object.freeze({rpc:'https://sepolia.base.org',chainId:'0x14a34',core:'0x79A1027a6A159502049F10906D333EC57E95F083',wormholeChainId:10004})
});
const fail=()=>{throw new Error('NO_GO: testnet network or core bridge presence evidence failed');};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function call(url,method,params,fetchFn){
 const response=await fetchFn(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
 if(!response?.ok)fail();
 const d=await response.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
}
export async function inspectTestnetCorePresence(fetchFn=fetch){
 const s=TESTNET.solana,b=TESTNET.base;
 const [genesis,chainId]=await Promise.all([call(s.rpc,'getGenesisHash',[],fetchFn),call(b.rpc,'eth_chainId',[],fetchFn)]);
 if(genesis!==s.genesis||chainId!==b.chainId)fail();
 const [slot,block]=await Promise.all([call(s.rpc,'getSlot',[{commitment:'finalized'}],fetchFn),call(b.rpc,'eth_getBlockByNumber',['finalized',false],fetchFn)]);
 if(!Number.isSafeInteger(slot)||slot<=0||typeof block?.number!=='string'||!/^0x[1-9a-f][0-9a-f]*$/.test(block.number)||typeof block.hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(block.hash))fail();
 const [account,code]=await Promise.all([
 call(s.rpc,'getAccountInfo',[s.core,{encoding:'base64',commitment:'finalized',minContextSlot:slot}],fetchFn),
 call(b.rpc,'eth_getCode',[b.core,block.number],fetchFn)]);
 const a=account?.value,ctx=account?.context?.slot;
 if(!Number.isSafeInteger(ctx)||ctx<slot||ctx>slot+256||a?.executable!==true||!['BPFLoaderUpgradeab1e11111111111111111111111','BPFLoader2111111111111111111111111111111111'].includes(a.owner)||!Array.isArray(a.data)||a.data.length!==2||a.data[1]!=='base64'||typeof a.data[0]!=='string'||a.data[0].length>2000000)fail();
 const raw=Buffer.from(a.data[0],'base64');if(!raw.length||raw.toString('base64')!==a.data[0])fail();
 if(typeof code!=='string'||code.length>2000000||!/^0x(?:[0-9a-fA-F]{2})+$/.test(code))fail();
 return {assessment:'PUBLIC_TESTNET_CORE_PRESENCE_ONLY',network:'Testnet',solana:{cluster:'devnet',genesis,core:s.core,wormholeChainId:s.wormholeChainId,slot:ctx,owner:a.owner,accountDataSha256:hash(raw)},base:{chain:'BaseSepolia',chainId:84532,wormholeChainId:b.wormholeChainId,core:b.core,finalizedBlock:block.number,blockHash:block.hash,codeSha256:hash(Buffer.from(code.slice(2),'hex'))},caveat:'Single public RPC per chain; executable/account and bytecode presence only. Not audited binary, proxy implementation, ProgramData, canonical deployment, NTT peer or transfer proof.',bridgeRelease:'NO_GO'};
}

// Observations only: the linked ProgramData address is not independently PDA-derived;
// EIP-1967 storage is not proof of proxy semantics, audit scope or source/binary parity.
const LOADER='BPFLoaderUpgradeab1e11111111111111111111111';
export const IMPLEMENTATION_SLOT='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
function loaderBytes(a,executable,max){
 if(a?.owner!==LOADER||a.executable!==executable||!Array.isArray(a.data)||a.data.length!==2||a.data[1]!=='base64'||typeof a.data[0]!=='string'||a.data[0].length>Math.ceil(max*4/3)+4)fail();
 const b=Buffer.from(a.data[0],'base64');
 if(!b.length||b.length>max||b.toString('base64')!==a.data[0])fail();
 return b;
}
function programLink(a){
 const b=loaderBytes(a,true,36);
 if(b.length!==36||b.readUInt32LE(0)!==2||b.subarray(4).every(x=>x===0))fail();
 return {address:pubkey(b.subarray(4)),digest:hash(b)};
}
function dataObservation(a,slot){
 const b=loaderBytes(a,false,10*1024*1024+45);
 if(b.length<=49||b.readUInt32LE(0)!==3||b.readBigUInt64LE(4)>BigInt(slot)||![0,1].includes(b[12])||!b.subarray(45,49).equals(Buffer.from([0x7f,0x45,0x4c,0x46])))fail();
 return {deploymentSlot:b.readBigUInt64LE(4).toString(),upgradeAuthority:b[12]===0?null:pubkey(b.subarray(13,45)),allocatedImageBytes:b.length-45,allocatedImageSha256:hash(b.subarray(45)),fullProgramDataSha256:hash(b)};
}
export async function inspectTestnetImplementations(report,fetchFn=fetch){
 if(report?.assessment!=='PUBLIC_TESTNET_CORE_PRESENCE_ONLY'||report?.bridgeRelease!=='NO_GO')fail();
 const s=TESTNET.solana,e=TESTNET.base;
 const min=report.solana.slot,block=report.base.finalizedBlock;
 const header=await call(s.rpc,'getAccountInfo',[s.core,{encoding:'base64',commitment:'finalized',minContextSlot:min}],fetchFn);
 if(!Number.isSafeInteger(header?.context?.slot)||header.context.slot<min||header.context.slot>min+256)fail();
 const link=programLink(header.value);
 if(link.digest!==report.solana.accountDataSha256)fail();
 const pair=await call(s.rpc,'getMultipleAccounts',[[s.core,link.address],{encoding:'base64',commitment:'finalized',minContextSlot:header.context.slot}],fetchFn);
 const slot=pair?.context?.slot;
 if(!Number.isSafeInteger(slot)||slot<header.context.slot||slot>header.context.slot+256||!Array.isArray(pair.value)||pair.value.length!==2)fail();
 const linked=programLink(pair.value[0]);
 if(linked.address!==link.address||linked.digest!==link.digest)fail();
 const solana={programDataAddress:link.address,programDataPdaIndependentlyVerified:false,finalizedSlot:slot,...dataObservation(pair.value[1],slot)};
 const word=await call(e.rpc,'eth_getStorageAt',[e.core,IMPLEMENTATION_SLOT,block],fetchFn);
 if(typeof word!=='string'||!/^0x0{24}[0-9a-fA-F]{40}$/.test(word)||/^0x0{64}$/.test(word))fail();
 const address='0x'+word.slice(-40);
 if(address.toLowerCase()===e.core.toLowerCase())fail();
 const code=await call(e.rpc,'eth_getCode',[address,block],fetchFn);
 if(typeof code!=='string'||code.length>2000000||!/^0x(?:[0-9a-fA-F]{2})+$/.test(code))fail();
 const again=await call(e.rpc,'eth_getBlockByNumber',[block,false],fetchFn);
 if(again?.number!==block||again?.hash!==report.base.blockHash)fail();
 return {assessment:'PUBLIC_TESTNET_CORE_IMPLEMENTATION_OBSERVATIONS_ONLY',solana,base:{implementationSlot:IMPLEMENTATION_SLOT,reportedImplementation:address,implementationCodeSha256:hash(Buffer.from(code.slice(2),'hex')),finalizedBlock:block,blockHash:again.hash},sourceBinaryParityVerified:false,auditCoverageVerified:false,bridgeRelease:'NO_GO'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const presence=await inspectTestnetCorePresence();console.log(JSON.stringify(presence,null,2));console.log(JSON.stringify(await inspectTestnetImplementations(presence),null,2));}
 catch{console.error('NO_GO: public testnet RPC or core presence verification failed (details redacted)');process.exitCode=1;}
}
