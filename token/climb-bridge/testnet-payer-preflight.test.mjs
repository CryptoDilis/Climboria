import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTestnetPayers} from './testnet-payer-preflight.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
import {pubkey} from './mint-raw-evidence.mjs';
import {CLIMB_SOLANA_MINT} from './mint-inspect.mjs';
const sol=pubkey(Buffer.alloc(32,7)),base='0x'+'1'.repeat(40);
function mock(overrides={}){
 const calls=[];const fetchFn=async(url,opts)=>{
  assert([TESTNET.solana.rpc,TESTNET.base.rpc].includes(url));assert.equal(opts.redirect,'error');
  const {method,params}=JSON.parse(opts.body);calls.push({method,params});
  const result=({getGenesisHash:TESTNET.solana.genesis,getMinimumBalanceForRentExemption:1000,eth_chainId:TESTNET.base.chainId,getBalance:{context:{slot:123},value:3000},eth_getBalance:'0x1',eth_getCode:'0x',...overrides})[method];
  assert.notEqual(result,undefined);return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };return {calls,fetchFn};
}
test('public testnet balances, illustrative rent floor and no release approval',async()=>{
 const f=mock(),r=await inspectTestnetPayers(sol,base,f.fetchFn);
 assert.equal(r.solana.coversIllustrativeRent,true);assert.equal(r.base.balanceWei,'1');assert.equal(r.bridgeRelease,'NO_GO');
 assert.deepEqual(f.calls.find(x=>x.method==='getBalance').params,[sol,{commitment:'finalized'}]);
 assert.deepEqual(f.calls.find(x=>x.method==='eth_getBalance').params,[base,'finalized']);
});
test('reject malformed addresses, real mint, wrong network and contract payer',async()=>{
 const f=mock();for(const a of ['secret',CLIMB_SOLANA_MINT,'1'.repeat(32)])await assert.rejects(inspectTestnetPayers(a,base,f.fetchFn),/NO_GO/);
 await assert.rejects(inspectTestnetPayers(sol,'0x'+'0'.repeat(40),f.fetchFn),/NO_GO/);
 assert.equal(f.calls.length,0);
 for(const override of [{eth_chainId:'0x2105'},{getGenesisHash:'wrong'},{eth_getCode:'0x6001'},{eth_getBalance:'-1'}])await assert.rejects(inspectTestnetPayers(sol,base,mock(override).fetchFn),/NO_GO/);
});
