import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const draft=JSON.parse(readFileSync(new URL('./climb-base-draft.json',import.meta.url),'utf8'));
test('draft is not an importable token list or live token',()=>{
 assert.equal(draft.status,'DRAFT_NOT_LIVE');
 assert.equal(draft.network.chainId,8453);
 assert.equal(draft.identity.name,'Climboria');
 assert.equal(draft.identity.symbol,'CLIMB');
 assert.equal(draft.identity.decimals,6);
 assert.equal(draft.identity.contractAddress,null);
 assert.equal(draft.release.tokenList,null);
 assert.equal(draft.release.circulatingSupply,null);
 assert.equal(draft.release.mainnetDeployment,'NO_GO');
 for(const k of ['trading','claims','gameRewards'])assert.equal(draft.release[k],'DISABLED');
 assert.equal(draft.release.productionContractVerified,false);
 assert.equal(draft.legacy.eligibilityCertified,false);
});
test('exact integer allocations sum to proposed fixed supply',()=>{
 const total=BigInt(draft.identity.initialSupplyRaw);
 assert.equal(total,888888888000000n);
 assert.equal(BigInt(draft.identity.initialSupply)*10n**BigInt(draft.identity.decimals),total);
 assert.equal(draft.allocations.length,7);
 assert.equal(new Set(draft.allocations.map(x=>x.purpose)).size,7);
 assert.equal(draft.allocations.reduce((s,x)=>s+x.percent,0),100);
 assert.equal(draft.allocations.reduce((s,x)=>s+BigInt(x.raw),0n),total);
 for(const x of draft.allocations)assert.equal(BigInt(x.raw)*100n,total*BigInt(x.percent));
 assert.equal(draft.allocations.find(x=>x.purpose==='legacyMaximum').percent,1);
});
test('official existing logo source and official domain links only',()=>{
 assert.equal(draft.identity.website,'https://climboria.fun/');
 assert.equal(draft.identity.whitepaper,'https://climboria.fun/whitepaper/');
 assert.equal(draft.identity.social.x,'https://x.com/ClimboriaHQ');
 for(const p of [draft.identity.logo.sourcePath,draft.identity.logo.alternatePath])assert(existsSync(new URL('../../'+p,import.meta.url)));
 assert.equal(draft.identity.logo.pngExportStatus,'PENDING_IMAGE_INSPECTION');
});
