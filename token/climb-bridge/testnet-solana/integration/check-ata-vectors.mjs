// Offline independent cross-check: SDK-derived public ATA addresses from the
// actual pinned local bank fixture versus the verifier implementation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveTestAta,verifyTestMintPair} from '../verify-created-mint.mjs';
import {pubkey} from '../../mint-raw-evidence.mjs';
import {TOKEN_2022_PROGRAM} from '../../mint-inspect.mjs';
import {deriveTestCustody,screenTestCustody} from '../custody-screen.mjs';
assert.equal(process.argv.length,3);
const lines=readFileSync(process.argv[2],'utf8').split(/\r?\n/);
const vectors=lines.filter(line=>line.startsWith('CLIMB_ATA_VECTOR ')).map(line=>{
 const m=line.match(/^CLIMB_ATA_VECTOR ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44})$/);
 assert.ok(m,'invalid vector line');return m.slice(1);
});
assert.equal(vectors.length,4);
assert.equal(new Set(vectors.map(v=>v[0]+':'+v[1])).size,4);
for(const [m,h] of [[3,4],[7,8],[9,10]]) assert.ok(vectors.some(v=>v[0]===pubkey(Buffer.alloc(32,m))&&v[1]===pubkey(Buffer.alloc(32,h))));
for(const [mint,holder,ata] of vectors) assert.equal(deriveTestAta(mint,holder),ata);
console.log('CLIMB_TOKEN_2022_ATA_SDK_MATCH: 4/4 local public vectors; bridgeRelease=NO_GO');

const pairs=lines.filter(line=>line.startsWith('CLIMB_LOCAL_REVOKED_PAIR '));
assert.equal(pairs.length,1);
const match=pairs[0].match(/^CLIMB_LOCAL_REVOKED_PAIR ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([0-9a-f]{782}) ([0-9a-f]{340})$/);
assert.ok(match,'invalid local account pair');
const [,mint,holder,ata,mintHex,ataHex]=match;
assert.ok(vectors.some(v=>v[0]===mint&&v[1]===holder&&v[2]===ata));
const mintBytes=Buffer.from(mintHex,'hex'),ataBytes=Buffer.from(ataHex,'hex');
const wrap=b=>({owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']});
const result=verifyTestMintPair([wrap(mintBytes),wrap(ataBytes)],mint,holder,'revoked');
assert.equal(result.rawSupply,'1000000000');
assert.equal(result.holderRawBalance,'1000000000');
assert.equal(result.metadataMatchesTestSpec,true);
assert.equal(result.bridgeRelease,'NO_GO');
assert.throws(()=>verifyTestMintPair([wrap(mintBytes),wrap(ataBytes)],mint,holder,'issued'),/NO_GO/);
const wrongBalance=Buffer.from(ataBytes);
wrongBalance.writeBigUInt64LE(999999999n,64);
assert.throws(()=>verifyTestMintPair([wrap(mintBytes),wrap(wrongBalance)],mint,holder,'revoked'),/NO_GO/);
console.log('CLIMB_LOCAL_REVOKED_PAIR_VERIFIER_MATCH: 391-byte mint, 170-byte ATA, exact 1000 test units; bridgeRelease=NO_GO');

const custodyLines=lines.filter(line=>line.startsWith('CLIMB_CUSTODY_VECTOR '));
assert.equal(custodyLines.length,3);
const phases=['before','locked','returned'];
for(let i=0;i<3;i++){
 const row=custodyLines[i].match(/^CLIMB_CUSTODY_VECTOR (before|locked|returned) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([1-9A-HJ-NP-Za-km-z]{32,44}) ([0-9a-f]{340})$/);
 assert.ok(row);
 const [,phase,custodyMint,program,authority,custody,hex]=row;
 assert.equal(phase,phases[i]);assert.equal(custodyMint,mint);
 assert.deepEqual(deriveTestCustody(mint,program),{authority,ata:custody});
 const raw=Buffer.from(hex,'hex'),expected=phase==='locked'?'1050':'0';
 const result=screenTestCustody({mint,program,ata:custody,account:wrap(raw),wrappedSupplyRaw:expected});
 assert.equal(result.escrowBalanceRaw,expected);
 assert.equal(result.economicallyClaimableRaw,'1000000000');
 assert.equal(result.bridgeRelease,'NO_GO');
}
console.log('CLIMB_LOCAL_CUSTODY_SCREEN_MATCH: 3/3 before/locked/returned, simulated wrapped amounts only; bridgeRelease=NO_GO');
