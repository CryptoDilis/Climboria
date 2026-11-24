import test from 'node:test';
import assert from 'node:assert/strict';
import {TESTNET,inspectTestnetCorePresence} from './ntt-testnet-core.mjs';
function fixture(overrides={}){
 const calls=[];
 const fetchFn=async(url,opts)=>{
  const {method,params}=JSON.parse(opts.body);calls.push({url,method,params});
  assert.equal(opts.redirect,'error');
  assert([TESTNET.solana.rpc,TESTNET.base.rpc].includes(url));
  const result=({getGenesisHash:TESTNET.solana.genesis,eth_chainId:TESTNET.base.chainId,getSlot:1000,eth_getBlockByNumber:{number:'0x123',hash:'0x'+'a'.repeat(64)},getAccountInfo:{context:{slot:1001},value:{executable:true,owner:'BPFLoaderUpgradeab1e11111111111111111111111',data:['AQID','base64']}},eth_getCode:'0x6001',...overrides})[method];
  assert.notEqual(result,undefined);
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
 return {calls,fetchFn};
}
test('pinned testnet identities, finalized core presence and NO_GO only',async()=>{
 const f=fixture(),r=await inspectTestnetCorePresence(f.fetchFn);
 assert.equal(r.bridgeRelease,'NO_GO');assert.equal(r.base.chainId,84532);assert.equal(r.base.wormholeChainId,10004);
 assert.equal(r.solana.slot,1001);assert.equal(f.calls.length,6);
 assert.deepEqual(f.calls.find(x=>x.method==='eth_getCode').params,[TESTNET.base.core,'0x123']);
 assert.deepEqual(f.calls.find(x=>x.method==='getAccountInfo').params,[TESTNET.solana.core,{encoding:'base64',commitment:'finalized',minContextSlot:1000}]);
});
test('wrong network, missing code or stale/nonexecutable core fail closed',async()=>{
 for(const override of [{eth_chainId:'0x2105'},{getGenesisHash:'wrong'},{eth_getCode:'0x'},{getAccountInfo:{context:{slot:999},value:{executable:true}}},{getAccountInfo:{context:{slot:1001},value:{executable:false}}}]){
  await assert.rejects(inspectTestnetCorePresence(fixture(override).fetchFn),/NO_GO/);
 }
});
