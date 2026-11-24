import test from 'node:test';
import assert from 'node:assert/strict';
import {mintPlan,estimateTestMintRent} from './testnet-solana/mint-plan.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
function mock({genesis=TESTNET.solana.genesis,rent=undefined}={}){
 const calls=[];
 const fetchFn=async(url,o)=>{
  assert.equal(url,TESTNET.solana.rpc);assert.equal(o.redirect,'error');
  const {method,params}=JSON.parse(o.body);calls.push({method,params});
  assert(['getGenesisHash','getMinimumBalanceForRentExemption'].includes(method));
  const result=method==='getGenesisHash'?genesis:rent===undefined?1000+params[0]*10:rent;
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
 return {calls,fetchFn};
}
test('isolated test mint reproduces metadata-only extension layout and test supply',()=>{
 const p=mintPlan();assert.equal(p.decimals,6);assert.equal(p.rawSupply,'1000000000');
 assert.equal(p.initialMintBytes,234);assert.equal(p.metadataValueBytes,80+Buffer.byteLength(p.name+p.symbol+p.uri));
 assert.equal(p.finalMintBytes,p.initialMintBytes+4+p.metadataValueBytes);
 assert.equal(p.mintAuthorityAfterIssue,null);assert.equal(p.freezeAuthority,null);assert.equal(p.bridgeRelease,'NO_GO');
});
test('public finalized rent query includes final mint and one illustrative ATA; never sends transactions',async()=>{
 const f=mock(),p=mintPlan(),r=await estimateTestMintRent(f.fetchFn);
 assert.equal(r.illustrativeMintPlusOneAtaLamports,2000+(p.finalMintBytes+170)*10);
 assert.equal(r.metadataRentTopUpLamports,(p.finalMintBytes-234)*10);
 assert.deepEqual(f.calls.slice(1).map(c=>c.params),[234,p.finalMintBytes,170].map(n=>[n,{commitment:'finalized'}]));
 assert.equal(r.bridgeRelease,'NO_GO');
});
test('reject mainnet identity and invalid rent',async()=>{
 for(const opts of [{genesis:'wrong'},{rent:-1},{rent:1.5}]){
  await assert.rejects(estimateTestMintRent(mock(opts).fetchFn),/NO_GO/);
 }
});
