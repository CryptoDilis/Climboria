import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fetchVerifiedSnapshot, writeSnapshot} from './publish-static.mjs';
import {MINT} from './index.mjs';

const now = Date.now();
const rpc = 'https://example-rpc.test/private-credentials-redacted';
const data = {
  jsonrpc:'2.0', id:'climb-supply',
  result:{context:{slot:345678901},
    value:{amount:'123456789000000',decimals:9,uiAmount:'0'}}
};
const fetchResponse = (obj,status=200) =>
  new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});

test('publisher reads only exact finalized CLIMB mint and retains unrounded amount',async()=>{
  let calls=0;
  const result = await fetchVerifiedSnapshot({
    rpcUrl:rpc,now,
    fetchImpl:async(url, init)=>{
      calls++;
      assert.equal(url,rpc);
      assert.equal(init.method,'POST');
      assert.equal(init.redirect,'error');
      const request=JSON.parse(init.body);
      assert.deepEqual(request.params,[MINT,{commitment:'finalized'}]);
      assert.equal(request.method,'getTokenSupply');
      return fetchResponse(data);
    }
  });
  assert.equal(calls,1);
  assert.equal(result.status,'ready');
  assert.equal(result.schema,1);
  assert.equal(result.amount,'123456789000000');
  assert.equal(result.decimals,9);
  assert.equal(result.slot,345678901);
  assert.equal(result.source,'solana-mainnet-finalized-rpc');
  assert.equal(result.commitment,'finalized');
  assert.equal(result.observedAt,new Date(now).toISOString());
  assert.ok(!JSON.stringify(result).includes('private-credentials'));
  const dir=await mkdtemp(join(tmpdir(),'climb-supply-test-'));
  try{
    const path=join(dir,'snapshot.json');
    await writeSnapshot(result,path);
    const read=JSON.parse(await readFile(path,'utf8'));
    assert.deepEqual(read,result);
    await assert.rejects(writeSnapshot({...result,mint:'invalid'},path),/unverified/);
    assert.deepEqual(JSON.parse(await readFile(path,'utf8')),result);
  } finally {await rm(dir,{recursive:true,force:true})}
});

test('publisher rejects invalid RPC, overflow, non-finalized fields and error envelopes',async()=>{
  for(const url of ['http://rpc.example.test','https://user:pass@rpc.example.test','https://rpc.example.test/#key']){
    await assert.rejects(fetchVerifiedSnapshot({rpcUrl:url,now}),/Invalid/);
  }
  const mutated=[
    x=>x.jsonrpc='1.0',
    x=>x.id=123,
    x=>x.error={code:-32005},
    x=>x.result.context.slot=-1,
    x=>x.result.value.amount='18446744073709551616',
    x=>x.result.value.amount='1.2',
    x=>x.result.value.decimals=-1,
    x=>x.result.value.decimals=19
  ];
  for(const mutation of mutated){
    const clone=structuredClone(data);
    mutation(clone);
    await assert.rejects(fetchVerifiedSnapshot({
      rpcUrl:rpc,now,fetchImpl:async()=>fetchResponse(clone)
    }),/RPC/);
  }
  await assert.rejects(fetchVerifiedSnapshot({
    rpcUrl:rpc,now,fetchImpl:async()=>fetchResponse({error:'provider-credentials'},503)
  }),/unavailable/);
  await assert.rejects(fetchVerifiedSnapshot({
    rpcUrl:rpc,now,fetchImpl:async()=>new Response('x'.repeat(8193))
  }),/too large/);
});

test('publisher times out even if the fetch does not honor abort',async()=>{
  await assert.rejects(fetchVerifiedSnapshot({
    rpcUrl:rpc,now,timeoutMs:20,
    fetchImpl:async()=>new Promise(()=>{})
  }),/deadline reached/);
});
