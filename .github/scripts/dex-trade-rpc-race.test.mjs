#!/usr/bin/env node
/**
 * Deterministic race tests for the scoped DEX token-decimal request handler.
 * The browser function lives in an IIFE; rather than exporting internal
 * runtime state to window, extract and exercise it with fake, queued RPCs.
 * Does NOT connect a wallet, call public RPC or make a signable transaction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../../dex/index.html',import.meta.url),'utf8');
const start=html.indexOf('async function dexTradeSyncToken(pair){');
const end=html.indexOf('\nfunction dexTradeApplyDirection(){',start);
assert.ok(start>=0 && end>start,'Expected existing DEX mint verification handler');
const source=html.slice(start,end);

const SOL='So11111111111111111111111111111111111111112';
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const selected=(mint,symbol)=>({baseToken:{address:mint,symbol,name:symbol+' token'},
  priceUsd:'1',liquidity:{usd:1},volume:{h24:2},priceChange:{h24:0}});
const rpcResult=decimals=>({ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:{value:{decimals}}})});

function harness(){
  const nodes=new Map(),pending=[],updates=[],statuses=[],invalidations=[];
  const $=id=>{
    if(!nodes.has(id))nodes.set(id,{
      disabled:false,textContent:'',className:'',
      querySelector:()=>({textContent:''})
    });
    return nodes.get(id);
  };
  let api;
  const sandbox={
    $,
    fmt:n=>String(n),
    dexTradeSetStatus:msg=>{statuses.push(msg);$('dexTradeStatus').textContent=msg;},
    discardDexTradeQuote:msg=>invalidations.push(msg),
    dexTradeApplyDirection:()=>{
      updates.push(api.inspect());
      return true;
    },
    fetch:(_endpoint,{body})=>{
      const data=JSON.parse(body);
      assert.equal(data.method,'getTokenSupply');
      const mint=data.params[0];
      return new Promise((resolve,reject)=>pending.push({mint,resolve,reject}));
    }
  };
  api=runInNewContext(
    'let dexTradeToken=null;let dexTradeTokenSelectionSequence=0;\n'+source+
    '\n({sync:dexTradeSyncToken,inspect:()=>({id:dexTradeToken?.id,decimals:dexTradeToken?.decimals,sequence:dexTradeTokenSelectionSequence})})',
    sandbox
  );
  const take=mint=>{
    const index=pending.findIndex(item=>item.mint===mint);
    assert.ok(index>=0,'Expected queued mint RPC for '+mint);
    return pending.splice(index,1)[0];
  };
  return {api, $,take,pending,updates,statuses,invalidations};
}

test('out-of-order RPC results cannot write old decimals to newly selected DEX token',async()=>{
  const t=harness();
  const old=t.api.sync(selected(SOL,'Old'));const oldRpc=t.take(SOL);
  const current=t.api.sync(selected(USDC,'Current'));const currentRpc=t.take(USDC);
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,null);
  assert.equal(t.$('dexTradeGetQuote').disabled,true);

  currentRpc.resolve(rpcResult(6));await current;
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,6);
  assert.equal(t.$('dexTradeGetQuote').disabled,false);
  const status=t.$('dexTradeStatus').textContent;

  oldRpc.resolve(rpcResult(9));await old;
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,6);
  assert.equal(t.$('dexTradeStatus').textContent,status);
  assert.equal(t.updates.length,1,'Only the newest market may apply swap direction');
  assert.equal(t.updates[0].id,USDC);
  assert.equal(t.invalidations.length,2,'Each new token selection invalidates old quote');
});

test('old RPC resolves before current one: stale result cannot reenable Get Quote',async()=>{
  const t=harness();
  const old=t.api.sync(selected(SOL,'Old'));const oldRpc=t.take(SOL);
  const current=t.api.sync(selected(USDC,'Latest'));const nextRpc=t.take(USDC);

  oldRpc.resolve(rpcResult(9));await old;
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,null);
  assert.equal(t.$('dexTradeGetQuote').disabled,true);
  assert.equal(t.updates.length,0);

  nextRpc.resolve(rpcResult(6));await current;
  assert.equal(t.api.inspect().decimals,6);
  assert.equal(t.$('dexTradeGetQuote').disabled,false);
  assert.equal(t.updates.length,1);
});

test('obsolete failed RPC cannot start fallback requests or replace newer market status',async()=>{
  const t=harness();
  const old=t.api.sync(selected(SOL,'Old'));const oldRpc=t.take(SOL);
  const current=t.api.sync(selected(USDC,'Current'));const currentRpc=t.take(USDC);

  currentRpc.resolve(rpcResult(6));await current;
  const status=t.$('dexTradeStatus').textContent;
  oldRpc.reject(new Error('stale upstream transport failure'));await old;
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,6);
  assert.equal(t.$('dexTradeStatus').textContent,status);
  assert.equal(t.pending.length,0,'Obsolete RPC must not retry its fallback endpoints');
  assert.equal(t.updates.length,1);
});

test('latest invalid decimals fail closed and do not guess token precision',async()=>{
  const t=harness();
  const task=t.api.sync(selected(USDC,'Invalid'));
  t.take(USDC).resolve(rpcResult(19));
  await task;
  assert.equal(t.api.inspect().id,USDC);
  assert.equal(t.api.inspect().decimals,null);
  assert.equal(t.$('dexTradeGetQuote').disabled,true);
  assert.equal(t.$('dexTradePrepare').disabled,true);
  assert.match(t.$('dexTradeStatus').textContent,/No guessed decimals will be used/);
  assert.equal(t.updates.length,0);
});
