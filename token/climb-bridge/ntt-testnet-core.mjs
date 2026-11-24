// Public testnet ONLY; no secrets, signer, deployment or transaction submission.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
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
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await inspectTestnetCorePresence(),null,2));}
 catch{console.error('NO_GO: public testnet RPC or core presence verification failed (details redacted)');process.exitCode=1;}
}
