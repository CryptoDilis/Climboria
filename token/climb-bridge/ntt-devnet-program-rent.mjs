// Read-only storage estimate from a locally built Devnet NTT sample ELF.
// No deployment, signer, wallet or transaction construction.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {TESTNET} from './ntt-testnet-core.mjs';
import {decodeKey} from './programdata-pda.mjs';
const fail=()=>{throw new Error('NO_GO: Devnet sample program storage evidence invalid');};
export const UPSTREAM='1a2a92ef7f289972b2d00dd1d58077d139fe68d7';
export const SAMPLE_ID='nttiK1SepaQt6sZ4WGW5whvc9tEnGXGxuKeptcQPCcS';
export async function estimateSampleProgramRent(image,commit,fetchFn=fetch){
 if(!Buffer.isBuffer(image)||image.length<64||image.length>10*1024*1024-45||!image.subarray(0,4).equals(Buffer.from([0x7f,0x45,0x4c,0x46]))||commit!==UPSTREAM)fail();
 if(!image.includes(decodeKey(TESTNET.solana.core))||!image.includes(decodeKey(SAMPLE_ID)))fail();
 async function rpc(method,params){
  const r=await fetchFn(TESTNET.solana.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
  if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;
 }
 if(await rpc('getGenesisHash',[])!==TESTNET.solana.genesis)fail();
 const sizes=[36,45+image.length,37+image.length];
 const rents=await Promise.all(sizes.map(n=>rpc('getMinimumBalanceForRentExemption',[n,{commitment:'finalized'}])));
 if(rents.some(n=>!Number.isSafeInteger(n)||n<=0)||rents[1]<rents[2])fail();
 const sum=rents[0]+rents[1];if(!Number.isSafeInteger(sum))fail();
 return {assessment:'DEVNET_SAMPLE_NTT_PROGRAM_STORAGE_ONLY',upstreamCommit:commit,sampleProgramId:SAMPLE_ID,feature:'solana-devnet',sampleElfBytes:image.length,sampleElfSha256:createHash('sha256').update(image).digest('hex'),programBytes:sizes[0],programDataBytes:sizes[1],bufferBytes:sizes[2],programRentLamports:rents[0],programDataRentLamports:rents[1],bufferRentMinimumLamports:rents[2],illustrativeFinalProgramStorageLamports:sum,cliInitialBufferFundingLamports:rents[1],caveat:'Sample upstream ID only, not owner deployment binary. CLI v1.18.26 initially funds buffer at ProgramData rent; do not sum buffer and ProgramData as independent permanent costs. Excludes fees, manager/peer/ATA/LUT accounts, upgrades and Base costs. Embedded bytes are not semantic or audited-binary verification.',bridgeRelease:'NO_GO'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==4)fail();console.log(JSON.stringify(await estimateSampleProgramRent(readFileSync(process.argv[2]),process.argv[3]),null,2));}
 catch{console.error('NO_GO: sample ELF or public rent observation failed');process.exitCode=1;}
}
