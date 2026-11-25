// Offline independent cross-check: SDK-derived public ATA addresses from the
// actual pinned local bank fixture versus the verifier implementation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveTestAta} from '../verify-created-mint.mjs';
import {pubkey} from '../../mint-raw-evidence.mjs';
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
