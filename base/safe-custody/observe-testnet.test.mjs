import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {observeTestnet,endpoints} from './observe-testnet.mjs';
import {expected} from '../v3-testnet/verify-creation.mjs';
const now=1795820000, anchor='0x3d0744b', anchorHash='0x594ef6e177bb098f57a9a8c0c759c7c2d61419717cfa9c3075f89f3a62d60eb7';
const token='0x048361d2344a6b3bbb0aef04508f10038510d237', common='0x3d10000', later='0x3d10001';
const block=(number,hash,timestamp=now-120)=>({number,hash,timestamp:'0x'+timestamp.toString(16),gasLimit:'0x1c9c380'});
const shared=block(common,'0x'+'a'.repeat(64));
const initial=block(anchor,anchorHash,now-86400);
const mock=(alter=()=>undefined)=>{
 const seen=[];
 const fn=async(url,request)=>{
  const i=endpoints.indexOf(url),{id,method,params}=JSON.parse(request.body);
  assert.ok(i>=0);assert.equal(request.redirect,'error');seen.push(method);
  let result;
  switch(method){
   case 'eth_chainId':result='0x14a34';break;
   case 'eth_getBlockByNumber':result=params[0]==='finalized'?(i===0?shared:block(later,'0x'+'b'.repeat(64))):params[0]===anchor?initial:shared;break;
   case 'eth_getTransactionReceipt':result={status:'0x1',transactionHash:expected.tx,blockNumber:anchor,blockHash:anchorHash,contractAddress:token,from:expected.payer};break;
   case 'eth_getCode':result=params[0]===token?'0x6000':'0x';break;
   case 'eth_call':result='0x'+888888888000000n.toString(16).padStart(64,'0');break;
   case 'eth_getBalance':result='0x123';break;
   case 'eth_gasPrice':result='0x1';break;
   default:throw Error('unexpected method');
  }
  const override=alter({i,method,params,result});
  return {ok:true,json:async()=>({jsonrpc:'2.0',id,result:override===undefined?result:override})};
 };
 return {fn,seen};
};
const pin=JSON.parse(readFileSync(new URL('./frozen-testnet-candidate.json',import.meta.url),'utf8'));
if(pin.status==='RETIRED_PENDING_VERIFIED_REPIN'){
 test('retired candidate blocks public RPC before any request',async()=>{
  let called=false;
  await assert.rejects(observeTestnet(async()=>{called=true;throw Error('unexpected RPC');},now),/FROZEN_CANDIDATE_RETIRED/);
  assert.equal(called,false);
 });
}else{
test('different finalized heights reconcile on common finalized block; no signing',async()=>{
 const {fn,seen}=mock();const a=await observeTestnet(fn,now);
 assert.equal(a.status,'DUAL_RPC_HISTORICAL_AND_CHAIN_OBSERVATION_ONLY_NO_GO');
 assert.equal(a.commonFinalizedBlock.number,common);assert.equal(a.priorFixture.previousRoles.length,8);
 assert.equal(a.priorFixture.initialSupplyRaw,'888888888000000');
 assert.ok(seen.every(x=>x.startsWith('eth_get')||x==='eth_call'||x==='eth_chainId'||x==='eth_gasPrice'));
});
test('wrong chain rejected',async()=>assert.rejects(observeTestnet(mock(({i,method})=>i===1&&method==='eth_chainId'?'0x2105':undefined).fn,now),/WRONG_CHAIN/));
test('different block hash rejected',async()=>assert.rejects(observeTestnet(mock(({i,method,params,result})=>i===1&&method==='eth_getBlockByNumber'&&params[0]===common?{...result,hash:'0x'+'c'.repeat(64)}:undefined).fn,now),/COMMON_FINALIZED_BLOCK_MISMATCH/));
test('stale common block rejected',async()=>assert.rejects(observeTestnet(mock(({method,params,result})=>method==='eth_getBlockByNumber'&&params[0]===common?{...result,timestamp:'0x1'}:undefined).fn,now),/FINALIZED_REFERENCE_STALE/));
test('historical receipt mismatch rejected',async()=>assert.rejects(observeTestnet(mock(({i,method,result})=>i===1&&method==='eth_getTransactionReceipt'?{...result,status:'0x0'}:undefined).fn,now),/HISTORICAL_RECEIPT_MISMATCH/));
test('historical code mismatch rejected',async()=>assert.rejects(observeTestnet(mock(({i,method,params})=>i===1&&method==='eth_getCode'&&params[0]===token?'0x6001':undefined).fn,now),/HISTORICAL_CODE_MISMATCH/));
test('historical supply mismatch rejected',async()=>assert.rejects(observeTestnet(mock(({i,method})=>i===1&&method==='eth_call'?'0x'+'0'.repeat(64):undefined).fn,now),/HISTORICAL_SUPPLY_MISMATCH/));
test('prior role mismatch rejected',async()=>assert.rejects(observeTestnet(mock(({i,method})=>i===1&&method==='eth_getBalance'?'0x124':undefined).fn,now),/PRIOR_ROLE_STATE_MISMATCH/));
test('delegated prior role clearly reported, never approved',async()=>{
 const r=await observeTestnet(mock(({method,params})=>method==='eth_getCode'&&params[0]===expected.payer?'0xef0100'+'a'.repeat(40):undefined).fn,now);
 assert.equal(r.priorFixture.previousRoles[0].codeState,'DELEGATED');
 assert.match(r.status,/NO_GO$/);
});

}
