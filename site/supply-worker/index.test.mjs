import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {MINT, PATH, CACHE_KEY, CACHE_SECONDS, parseRpcSupply, parseCachedSnapshot} from './index.mjs';

const RPC = 'https://example-rpc.test/v1/private-key-not-exposed';
const endpoint = 'https://supply.climboria.fun' + PATH;
const allowedOrigin = 'https://climboria.fun';
const valid = {
  jsonrpc: '2.0', id: 'climb-supply',
  result: {context: {slot: 345678901},
    value: {amount: '123456789000000', decimals: 9, uiAmountString: '123456.789'}}
};
const env = {SOLANA_RPC_URL: RPC};
const req = (path=endpoint, method='GET', origin=allowedOrigin) =>
  new Request(path, {method, headers: {'Origin': origin}});
const body = value => new Response(JSON.stringify(value),
  {status: 200, headers: {'Content-Type':'application/json'}});

test('valid RPC response preserves full raw u64, mint, finalized and slot', () => {
  const r = parseRpcSupply(valid, '2026-11-16T00:00:00.000Z');
  assert.deepEqual(r, {
    schema: 1, mint: MINT, source: 'solana-mainnet-finalized-rpc',
    commitment: 'finalized', amount: '123456789000000',
    decimals: 9, slot: 345678901, observedAt: '2026-11-16T00:00:00.000Z'
  });
  const extreme = structuredClone(valid);
  extreme.result.value.amount = '18446744073709551615';
  assert.equal(parseRpcSupply(extreme).amount, '18446744073709551615');
});
test('reject malformed response values, RPC errors and u64 overflow', () => {
  for (const change of [
    v => v.result.value.amount = '1.4',
    v => v.result.value.amount = '18446744073709551616',
    v => v.result.value.amount = '00001',
    v => v.result.value.decimals = -1,
    v => v.result.value.decimals = 99,
    v => v.result.context.slot = '123',
    v => v.result.context.slot = 0,
    v => v.id = 2,
    v => v.jsonrpc = '1.0',
    v => v.error = {code:-32001}
  ]) {
    const changed = structuredClone(valid);
    change(changed);
    assert.throws(() => parseRpcSupply(changed), /RPC/);
  }
});
test('cached supply is validated, fresh, and strips unknown injected fields', () => {
  const timestamp='2026-11-16T00:00:00.000Z';
  const at=Date.parse(timestamp);
  const raw={...parseRpcSupply(valid,timestamp), providerKey:'secret-leak', extra:{foo:'bar'}};
  const safe=parseCachedSnapshot(raw,at+1000);
  assert.deepEqual(Object.keys(safe).sort(),
    ['schema','mint','source','commitment','amount','decimals','slot','observedAt'].sort());
  assert.equal(safe.providerKey,undefined);
  for(const change of [
    x=>x.mint='wrong-mint',
    x=>x.source='unverified-explorer',
    x=>x.commitment='processed',
    x=>x.amount='1.2',
    x=>x.amount='18446744073709551616',
    x=>x.decimals=-1,
    x=>x.decimals=200,
    x=>x.slot=0,
    x=>x.slot='456',
    x=>x.observedAt='not-a-date',
    x=>x.schema=2
  ]) {
    const bad=structuredClone(raw);change(bad);
    assert.throws(()=>parseCachedSnapshot(bad,at+1000),/cached/);
  }
  assert.throws(()=>parseCachedSnapshot(raw,at+CACHE_SECONDS*1000+1),/Expired/);
  assert.throws(()=>parseCachedSnapshot(raw,at-5001),/Expired/);
  assert.equal(parseCachedSnapshot(raw,at+CACHE_SECONDS*1000).mint,MINT);
});
test('reject non-GET, unknown routes, disallowed Origin and unconfigured RPC', async () => {
  const ready = await worker.fetch(req('https://supply.climboria.fun/ready'), {}, {});
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), {configured:false,service:'climb-supply-read-only'});
  const goodReady = await worker.fetch(req('https://supply.climboria.fun/ready'), env, {});
  assert.equal(goodReady.status, 200);
  assert.equal((await goodReady.json()).configured, true);
  assert.equal((await worker.fetch(req(endpoint, 'POST'), env, {})).status, 405);
  assert.equal((await worker.fetch(req(endpoint, 'GET', 'https://attacker.example'), env, {})).status, 403);
  const unknown = await worker.fetch(req('https://supply.climboria.fun/api/trade'), env, {});
  assert.equal(unknown.status,404);
  const unavailable = await worker.fetch(req(), {}, {});
  assert.equal(unavailable.status,503);
  assert.deepEqual(await unavailable.json(),{error:'supply-service-unconfigured'});
  const cors = await worker.fetch(req(endpoint, 'OPTIONS'), env, {});
  assert.equal(cors.status,204);
  assert.equal(cors.headers.get('access-control-allow-origin'),allowedOrigin);
  assert.equal(cors.headers.get('cache-control'),'no-store');
  for (const invalid of ['http://rpc.example', 'https://bad:password@rpc.example', 'https://rpc.example/#key']) {
    assert.equal((await worker.fetch(req(), {SOLANA_RPC_URL:invalid}, {})).status,503);
  }
});
test('only finalized exact-mint successful snapshots are cached; no provider secrets are emitted', async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const store = new Map();
  const pending=[];
  let upstreamCalls=0;
  globalThis.caches = {default: {
    async match(key) { const cached=store.get(key); return cached?.clone(); },
    async put(key, response) { store.set(key,response.clone()); }
  }};
  globalThis.fetch = async (url, init) => {
    upstreamCalls++;
    assert.equal(url,RPC);
    assert.equal(init.method,'POST');
    assert.equal(init.redirect,'error');
    const payload=JSON.parse(init.body);
    assert.deepEqual(payload.params,[MINT,{commitment:'finalized'}]);
    assert.equal(payload.method,'getTokenSupply');
    return body(valid);
  };
  try {
    const ctx={waitUntil(p) {pending.push(p);}};
    const first=await worker.fetch(req(),env,ctx);
    assert.equal(first.status,200);
    assert.equal(first.headers.get('access-control-allow-origin'),allowedOrigin);
    assert.equal(first.headers.get('cache-control'),'no-store');
    assert.equal((await first.json()).amount,'123456789000000');
    await Promise.all(pending);
    assert.equal(upstreamCalls,1);
    assert.ok(store.has(CACHE_KEY));
    const fromCache=await worker.fetch(req(endpoint,'GET','https://www.climboria.fun'),env,ctx);
    assert.equal(fromCache.status,200);
    assert.equal(fromCache.headers.get('access-control-allow-origin'),'https://www.climboria.fun');
    assert.equal(fromCache.headers.get('vary'),'Origin');
    assert.equal(upstreamCalls,1);
    const encoded=JSON.stringify(await fromCache.json());
    assert.ok(!encoded.includes('private-key-not-exposed'));
    assert.ok(!encoded.includes(RPC));
    const nonBrowser=await worker.fetch(new Request(endpoint),env,ctx);
    assert.equal(nonBrowser.status,200);
    assert.equal(nonBrowser.headers.get('access-control-allow-origin'),null);
  } finally {
    globalThis.fetch=originalFetch;
    globalThis.caches=originalCaches;
  }
});
test('corrupt, stale, or poisoned edge cache is ignored and replaced by validated RPC', async () => {
  const originalFetch=globalThis.fetch, originalCaches=globalThis.caches;
  const bad=[
    {...parseRpcSupply(valid,'2026-11-16T00:00:00.000Z'), providerToken:'should-never-leak'},
    {...parseRpcSupply(valid),mint:'attacker-mint',amount:'1'},
    {...parseRpcSupply(valid),amount:'18446744073709551616'}
  ];
  let calls=0;
  globalThis.fetch=async()=>{calls++;return body(valid)};
  try{
    for(const payload of bad){
      globalThis.caches={default:{
        async match(){return new Response(JSON.stringify(payload),{status:200})},
        async put(){}
      }};
      const res=await worker.fetch(req(),env,{waitUntil:()=>{}});
      assert.equal(res.status,200);
      const safe=await res.json();
      assert.equal(safe.mint,MINT);
      assert.equal(safe.amount,'123456789000000');
      assert.equal(safe.providerToken,undefined);
    }
    assert.equal(calls,3,'invalid cache entries must trigger fresh validated RPC');
  }finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches}
});
test('upstream failure and invalid values produce sanitized 503 with no cache or stale fake number', async () => {
  const originalFetch=globalThis.fetch, originalCaches=globalThis.caches;
  const items = new Map();
  globalThis.caches={default:{
    async match(key){return items.get(key)?.clone()},
    async put(key,resp){items.set(key,resp.clone())}
  }};
  try {
    for (const upstreamResponse of [
      new Response('{"error":"provider-credentials"}',{status:503}),
      body({jsonrpc:'2.0',id:'climb-supply',result:{context:{slot:12},
        value:{amount:'-1',decimals:9}}}),
      new Response('a'.repeat(8193),{status:200}),
      new Response('{"broken":"json" not valid}',{status:200})
    ]) {
      globalThis.fetch=async()=>upstreamResponse.clone();
      const res=await worker.fetch(req(),env,{waitUntil:()=>{}});
      assert.equal(res.status,503);
      assert.deepEqual(await res.json(),{error:'supply-unavailable'});
      assert.equal(res.headers.get('cache-control'),'no-store');
      assert.equal(items.size,0);
    }
  } finally {
    globalThis.fetch=originalFetch;
    globalThis.caches=originalCaches;
  }
});
