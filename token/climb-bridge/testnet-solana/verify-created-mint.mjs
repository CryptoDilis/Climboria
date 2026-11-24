// Finalized Devnet-only verification of the distinct test mint and its holder ATA.
// No signer, transaction, authority changes, or mainnet RPC.
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {TESTNET} from '../ntt-testnet-core.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from '../mint-inspect.mjs';
import {pubkey} from '../mint-raw-evidence.mjs';
import {decodeKey,onEdwards} from '../programdata-pda.mjs';
import {SPEC,mintPlan} from './mint-plan.mjs';
const fail=()=>{throw new Error('NO_GO: distinct Devnet mint or holder evidence invalid');};
const zero=b=>b.every(x=>x===0);
const hash=b=>createHash('sha256').update(b).digest('hex');
const ATA_PROGRAM='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
export function deriveTestAta(mint,holder){
 const seeds=[decodeKey(holder),decodeKey(TOKEN_2022_PROGRAM),decodeKey(mint)];
 for(let bump=255;bump>0;bump--){
  const digest=createHash('sha256').update(Buffer.concat([...seeds,Buffer.from([bump]),decodeKey(ATA_PROGRAM),Buffer.from('ProgramDerivedAddress')])).digest();
  if(!onEdwards(digest))return pubkey(digest);
 }
 fail();
}
function raw(a,len){
 if(a?.owner!==TOKEN_2022_PROGRAM||a.executable!==false||!Array.isArray(a.data)||a.data.length!==2||a.data[1]!=='base64'||typeof a.data[0]!=='string'||a.data[0].length>1000)fail();
 const b=Buffer.from(a.data[0],'base64');
 if(b.length!==len||b.toString('base64')!==a.data[0])fail();return b;
}
function authority(b,offset){
 const tag=b.readUInt32LE(offset);if(tag===0)return null;if(tag!==1)fail();return pubkey(b.subarray(offset+4,offset+36));
}
function metadataBytes(mint,authority){
 const strings=[SPEC.name,SPEC.symbol,SPEC.uri].map(s=>{const b=Buffer.from(s),n=Buffer.alloc(4);n.writeUInt32LE(b.length);return Buffer.concat([n,b]);});
 return Buffer.concat([authority?decodeKey(authority):Buffer.alloc(32),decodeKey(mint),...strings,Buffer.alloc(4)]);
}
export function verifyTestMintPair(accounts,mint,holder,phase){
 const mintKey=decodeKey(mint),owner=decodeKey(holder);
 if(mint===CLIMB_SOLANA_MINT||mint===holder||zero(mintKey)||zero(owner)||!['issued','revoked'].includes(phase)||!Array.isArray(accounts)||accounts.length!==2)fail();
 const plan=mintPlan(),b=raw(accounts[0],plan.finalMintBytes),a=raw(accounts[1],170),expected=phase==='issued'?holder:null;
 if(authority(b,0)!==expected||authority(b,46)!==null||b.readBigUInt64LE(36).toString()!==SPEC.rawSupply||b[44]!==6||b[45]!==1||!zero(b.subarray(82,165))||b[165]!==1)fail();
 let p=166;const seen=new Set();
 while(p<b.length){
  if(p+4>b.length)fail();const t=b.readUInt16LE(p),n=b.readUInt16LE(p+2);p+=4;
  if(seen.has(t)||p+n>b.length)fail();seen.add(t);const v=b.subarray(p,p+n);p+=n;
  if(t===18){if(n!==64||!v.subarray(0,32).equals(expected?owner:Buffer.alloc(32))||!v.subarray(32).equals(mintKey))fail();}
  else if(t===19){if(!v.equals(metadataBytes(mint,expected)))fail();}
  else fail();
 }
 if(seen.size!==2||!seen.has(18)||!seen.has(19))fail();
 if(!a.subarray(0,32).equals(mintKey)||!a.subarray(32,64).equals(owner)||a.readBigUInt64LE(64).toString()!==SPEC.rawSupply||a.readUInt32LE(72)!==0||a[108]!==1||a.readUInt32LE(109)!==0||a.readBigUInt64LE(121)!==0n||a.readUInt32LE(129)!==0||a[165]!==2||a.readUInt16LE(166)!==7||a.readUInt16LE(168)!==0)fail();
 return {phase,rawSupply:SPEC.rawSupply,decimals:6,mintAuthority:expected,freezeAuthority:null,metadataPointerAuthority:expected,metadataUpdateAuthority:expected,metadataMatchesTestSpec:true,holderRawBalance:SPEC.rawSupply,mintSha256:hash(b),ataSha256:hash(a),bridgeRelease:'NO_GO'};
}
export async function inspectCreatedTestMint(mint,holder,phase,fetchFn=fetch){
 if(mint===CLIMB_SOLANA_MINT||mint===holder||!['issued','revoked'].includes(phase))fail();
 const ata=deriveTestAta(mint,holder);
 async function rpc(method,params){const r=await fetchFn(TESTNET.solana.rpc,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});if(!r?.ok)fail();const d=await r.json();if(d?.jsonrpc!=='2.0'||d.id!==1||d.error||d.result==null)fail();return d.result;}
 if(await rpc('getGenesisHash',[])!==TESTNET.solana.genesis)fail();
 const head=await rpc('getSlot',[{commitment:'finalized'}]);
 if(!Number.isSafeInteger(head)||head<=0)fail();
 const pair=await rpc('getMultipleAccounts',[[mint,ata],{encoding:'base64',commitment:'finalized',minContextSlot:head}]);
 const slot=pair?.context?.slot;if(!Number.isSafeInteger(slot)||slot<head||slot>head+128)fail();
 return {assessment:'DEVNET_DISTINCT_TEST_MINT_AND_ATA_ONLY',mint,holder,ata,finalizedSlot:slot,...verifyTestMintPair(pair.value,mint,holder,phase),caveat:'Single public RPC; no signer ownership proof or manager/bridge readiness. Only before any bridge transfers.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==5)fail();console.log(JSON.stringify(await inspectCreatedTestMint(...process.argv.slice(2)),null,2));}
 catch{console.error('NO_GO: Devnet test mint verification failed (details redacted)');process.exitCode=1;}
}
