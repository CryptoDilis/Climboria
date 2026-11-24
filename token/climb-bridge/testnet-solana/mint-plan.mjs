// Testnet-only mint sizing and public rent observation. No transaction or key code.
import {pathToFileURL} from 'node:url';
import {TESTNET} from '../ntt-testnet-core.mjs';
export const SPEC=Object.freeze({
 network:'Solana Devnet',name:'CLIMB Devnet Test Only',symbol:'CLIMBTEST',
 uri:'https://example.invalid/climb-testnet.json',decimals:6,rawSupply:'1000000000',
 mintAuthorityAfterIssue:null,freezeAuthority:null,metadataPointerAuthorityAfterInit:null,
 metadataUpdateAuthorityAfterInit:null,extensions:Object.freeze(['metadataPointer','tokenMetadata'])
});
// Token-2022 pinned layout: 82-byte base mint padded to 165, account type at
// 165, TLV header 4 bytes, MetadataPointer 64 bytes. Borsh metadata includes
// two 32-byte keys, three u32-prefixed UTF-8 strings, u32 empty vector count.
export function mintPlan(){
 const initial=166+4+64;
 const metadata=64+4*4+[SPEC.name,SPEC.symbol,SPEC.uri].reduce((n,s)=>n+Buffer.byteLength(s,'utf8'),0);
 const unadjusted=initial+4+metadata;
 const final=unadjusted===355?357:unadjusted;
 return { ...SPEC,initialMintBytes:initial,metadataValueBytes:metadata,finalMintBytes:final,
   illustrativeImmutableOwnerAtaBytes:170,bridgeRelease:'NO_GO' };
}
const fail=()=>{throw new Error('NO_GO: public Solana Devnet rent estimate unavailable');};
async function rpc(method,params,fetchFn){
 const r=await fetchFn(TESTNET.solana.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
 if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
}
export async function estimateTestMintRent(fetchFn=fetch){
 const genesis=await rpc('getGenesisHash',[],fetchFn);
 if(genesis!==TESTNET.solana.genesis)fail();
 const plan=mintPlan(),sizes=[plan.initialMintBytes,plan.finalMintBytes,plan.illustrativeImmutableOwnerAtaBytes];
 const rent=await Promise.all(sizes.map(n=>rpc('getMinimumBalanceForRentExemption',[n,{commitment:'finalized'}],fetchFn)));
 if(rent.some(n=>!Number.isSafeInteger(n)||n<=0)||rent[1]<rent[0])fail();
 const total=rent[1]+rent[2];if(!Number.isSafeInteger(total))fail();
 return {assessment:'PUBLIC_DEVNET_RENT_ESTIMATE_ONLY',genesis,...plan,initialMintRentLamports:rent[0],finalMintRentLamports:rent[1],metadataRentTopUpLamports:rent[1]-rent[0],illustrativeAtaRentLamports:rent[2],illustrativeMintPlusOneAtaLamports:total,
 caveat:'Storage rent estimate only; not transaction fees, actual allocation, NTT program/manager deployment cost or transfer proof. No tokens created.',bridgeRelease:'NO_GO'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(await estimateTestMintRent(),null,2));}
 catch{console.error('NO_GO: public Devnet rent estimate failed (details redacted)');process.exitCode=1;}
}
