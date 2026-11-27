// Offline binding of provider-reported context, not a cryptographic state proof.
// No RPC calls, signing, eligibility decisions, or production release.
import {createHash} from 'node:crypto';
import {inspectMintReply,CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {inspectRawMint,compareRawMints} from './mint-raw-evidence.mjs';
import {decodeLegacyAccount} from './legacy-account-raw-evidence.mjs';
import {reconcileInventories} from './migration-inventory.mjs';
const fail=msg=>{throw Error('NO_GO: '+msg);};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function normalize(bundle){
 const {genesis,block,parsedMint,rawMint,accounts,complete,commitment}=bundle??{};
 const slot=block?.slot;
 if(commitment!=='finalized'||complete!==true||!Number.isSafeInteger(slot)||slot<=0||
    parsedMint?.context?.slot!==slot||rawMint?.context?.slot!==slot||accounts?.context?.slot!==slot)
   fail('exact same-slot finalized context required');
 if(!Array.isArray(accounts.value)||accounts.value.length>1000000)fail('invalid raw inventory');
 const parsed=inspectMintReply(parsedMint);
 if(parsed.program!==TOKEN_2022_PROGRAM||parsed.mintAuthority!==null||parsed.freezeAuthority!==null)fail('unexpected mint program or authority');
 const mint=inspectRawMint(rawMint,parsed,slot);
 const rows=[],rawRows=[],seen=new Set();
 for(const account of accounts.value){
  const decoded=decodeLegacyAccount(account);
  const id=decoded.row.address;
  if(seen.has(id))fail('duplicate raw account');
  seen.add(id);rows.push(decoded.row);
  rawRows.push([id,decoded.evidence.rawSha256]);
 }
 rawRows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return {mint,rawRowsDigest:digest(['CLIMB_RAW_INVENTORY_V1',CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM,genesis,slot,block.blockhash,mint.digest,rawRows]),
  inventory:{mint:CLIMB_SOLANA_MINT,program:TOKEN_2022_PROGRAM,decimals:6,commitment,complete,genesis,slot,blockhash:block.blockhash,supplyRaw:parsed.supplyRaw,accounts:rows}};
}
export function reconcileRawInventories(first,second,{expectedGenesis}={}){
 const a=normalize(first),b=normalize(second);
 const result=reconcileInventories(a.inventory,b.inventory,{expectedGenesis});
 compareRawMints(a.mint,b.mint);
 if(a.rawRowsDigest!==b.rawRowsDigest)fail('raw account inventory bytes disagree');
 return {...result,rawInventoryDigest:a.rawRowsDigest,rawMintSha256:a.mint.digest,
  evidenceStatus:'MATCHED_REPORTED_CONTEXT_AND_RAW_BYTES',completenessProof:'NOT_VERIFIED',
  finalityProof:'NOT_VERIFIED',beneficialOwnership:'NOT_VERIFIED',authorization:false};
}
