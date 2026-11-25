// Test-only Token-2022 NTT custody accounting screen. No RPC, signing or release.
// Pinned NTT Solana v3.0.0: lib.rs TOKEN_AUTHORITY_SEED and
// instructions/initialize.rs custody associated-token constraints.
import {createHash} from 'node:crypto';
import {decodeKey,onEdwards} from '../programdata-pda.mjs';
import {pubkey} from '../mint-raw-evidence.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from '../mint-inspect.mjs';
import {deriveTestAta} from './verify-created-mint.mjs';
import {checkSupply} from '../supply-audit.mjs';
import {SPEC} from './mint-plan.mjs';
const fail=()=>{throw new Error('NO_GO: testnet NTT custody evidence invalid');};
const nonzero=b=>b.some(x=>x!==0);
export function deriveTestCustody(mint,program){
 const m=decodeKey(mint),p=decodeKey(program);
 if(mint===CLIMB_SOLANA_MINT||mint===program||!nonzero(m)||!nonzero(p))fail();
 for(let bump=255;bump>0;bump--){
  const digest=createHash('sha256').update('token_authority').update(Buffer.from([bump])).update(p).update('ProgramDerivedAddress').digest();
  if(!onEdwards(digest)){
   const authority=pubkey(digest);
   return {authority,ata:deriveTestAta(mint,authority)};
  }
 }
 fail();
}
export function screenTestCustody({mint,program,ata,account,wrappedSupplyRaw}){
 const expected=deriveTestCustody(mint,program);
 if(ata!==expected.ata||account?.owner!==TOKEN_2022_PROGRAM||account.executable!==false||
    !Array.isArray(account.data)||account.data.length!==2||account.data[1]!=='base64'||
    typeof account.data[0]!=='string'||account.data[0].length!==228)fail();
 const b=Buffer.from(account.data[0],'base64');
 if(b.length!==170||b.toString('base64')!==account.data[0]||
    !b.subarray(0,32).equals(decodeKey(mint))||!b.subarray(32,64).equals(decodeKey(expected.authority))||
    b.readUInt32LE(72)!==0||b[108]!==1||b.readUInt32LE(109)!==0||
    b.readBigUInt64LE(121)!==0n||b.readUInt32LE(129)!==0||
    b[165]!==2||b.readUInt16LE(166)!==7||b.readUInt16LE(168)!==0)fail();
 const accounting=checkSupply({originalSupplyRaw:SPEC.rawSupply,escrowBalanceRaw:b.readBigUInt64LE(64).toString(),
   wrappedSupplyRaw,solanaDecimals:6,baseDecimals:6});
 return {...accounting,assessment:'TEST_ONLY_CUSTODY_ACCOUNTING_SCREEN',mint,program,custody:ata,authority:expected.authority,
   custodySha256:createHash('sha256').update(b).digest('hex'),bridgeRelease:'NO_GO',
   caveat:'Caller-supplied test mint supply and wrapped supply; no RPC, deployment provenance, live VAA, manager configuration or pending-message proof.'};
}
