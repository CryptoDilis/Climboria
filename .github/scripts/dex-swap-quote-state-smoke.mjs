#!/usr/bin/env node
/**
 * Local browser regression for read-only DEX and Swap quote state.
 * This intercepts quote requests with fixtures: never connects a wallet,
 * invokes Jupiter /order or /execute, or sends on-chain transactions.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ORIGIN = 'http://127.0.0.1:4173';
const QUOTE = 'https://api.climboria.fun/api/swap/quote**';
const MINT = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const fixture = extra => ({
  requestId:'local-readonly-quote-fixture',inAmount:'100000000',
  outAmount:'1234567',otherAmountThreshold:'1200000',...extra
});
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function quotePage(browser,kind,viewport,{walletProvider=false,tokenSearchUnavailable=false,marketUnavailable=false,virtualClock=false}={}) {
  const mobile = viewport.width < 600;
  const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
  // Virtual wall clock lets us verify the real in-browser expiry paths in milliseconds,
  // without waiting 30 seconds or sending on-chain transactions.
  if(virtualClock)await page.clock.install({time:new Date('2026-11-16T05:00:00.000Z')});
  if(walletProvider) await page.addInitScript(() => {
    const listeners = new Map();
    const primary = 'FirstWallet111111111111111111111111111111111';
    const provider = {
      isPhantom: true,
      publicKey: { toString: () => primary },
      connect: async () => ({ publicKey: provider.publicKey }),
      disconnect: async () => {},
      on: (event, handler) => {
        const handlers = listeners.get(event) ?? new Set();
        handlers.add(handler); listeners.set(event, handlers);
      },
      off: (event, handler) => listeners.get(event)?.delete(handler)
    };
    const emit = (event, value) => {
      for(const handler of [...(listeners.get(event) ?? [])]) handler(value);
    };
    window.phantom = { solana: provider };
    window.__climboriaWalletTest = {
      accountChanged: () => emit('accountChanged', { toString: () => 'SecondWallet22222222222222222222222222222222' }),
      disconnect: () => emit('disconnect'),
      listenerCount: event => listeners.get(event)?.size ?? 0
    };
  });
  const forbidden = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    try {
      const u = new URL(r.url());
      if(u.hostname === 'api.climboria.fun' &&
          ['/api/swap/order','/api/swap/execute'].includes(u.pathname))
        forbidden.push(u.pathname);
    } catch { /* ignore non-HTTP browser internals */ }
  });
  // Stub market feeds only. The quote endpoint is separately controlled.
  await page.route('https://api.dexscreener.com/**',route =>
    route.fulfill({status:200,contentType:'application/json',body:'{"pairs":[]}'})
  );
  await page.route('https://api.coingecko.com/**',route => marketUnavailable
    ? route.abort('timedout')
    : route.fulfill({status:200,contentType:'application/json',body:'[]'})
  );
  await page.route('https://api.climboria.fun/api/tokens/search**',route => tokenSearchUnavailable
    ? route.abort('timedout')
    : route.fulfill({status:200,contentType:'application/json',body:'[]'})
  );
  const response = await page.goto(ORIGIN+(kind==='DEX'?'/dex/':'/swap/'),
    {waitUntil:'domcontentloaded',timeout:35000});
  assert.ok(response?.ok(),kind+' local shell HTTP failure');
  await page.locator('#getQuote').waitFor({state:'attached'});
  const config = await page.evaluate(() => window.CLIMBORIA_SWAP_CONFIG ?? null);
  assert.equal(config?.enabled,false,'Wallet execution must remain off');
  assert.equal(config?.proxyEnabled,true,'Quote must use API proxy');
  if(kind==='DEX') {
    await page.locator('#showDexQuote').click();
    assert.equal(await page.locator('#swapQuote').isVisible(),true);
  }
  return {page,forbidden,errors};
}
async function walletSessionResult(ctx,kind) {
  const {page,forbidden,errors}=ctx;
  await page.locator('#connectWallet').click();
  const connected=await page.locator('#walletStatus').innerText();
  assert.notEqual(connected,'Not connected',kind+' must display the connected wallet');
  assert.match(await page.locator('#quoteStatus').innerText(),/Wallet connected/i);
  await page.evaluate(()=>window.__climboriaWalletTest.accountChanged());
  await page.waitForFunction(previous => {
    const current=document.querySelector('#walletStatus')?.textContent?.trim();
    return current && current !== previous;
  },connected,{timeout:5000});
  assert.match(await page.locator('#quoteStatus').innerText(),/Wallet account changed/i);
  assert.equal(await page.locator('#swapReview').isHidden(),true,'Account change must clear any prepared order UI');
  await page.evaluate(()=>window.__climboriaWalletTest.disconnect());
  await page.waitForFunction(() => document.querySelector('#walletStatus')?.textContent?.trim()==='Not connected',null,{timeout:5000});
  assert.equal(await page.locator('#connectWallet').innerText(),'Connect wallet');
  assert.match(await page.locator('#quoteStatus').innerText(),/Wallet disconnected/i);
  assert.equal(await page.evaluate(()=>window.__climboriaWalletTest.listenerCount('disconnect')),0,
    'Disconnected wallet must not retain event listeners');
  assert.equal(forbidden.length,0,'Wallet state changes must not request order execution');
  assert.deepEqual(errors,[],'Wallet session handling caused a browser error');
}
async function mockResult(ctx,metadata) {
  const {page,forbidden,errors}=ctx;
  await page.route(QUOTE,route=>{
    const u=new URL(route.request().url());
    assert.equal(u.searchParams.get('inputMint'),MINT);
    assert.equal(u.searchParams.get('outputMint'),USDC);
    assert.equal(u.searchParams.get('amount'),'100000000');
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify(fixture(metadata))
    });
  });
  await page.locator('#getQuote').click();
  await page.waitForFunction(() =>
    (document.querySelector('#quoteStatus')?.textContent||'').includes('Quote received from Jupiter'),
    null,{timeout:10000});
  const result = await page.locator('#quoteResults').innerText();
  assert.match(result,/Estimated output/i);
  assert.match(result,/Minimum received/i);
  assert.match(result,/1\.2/);
  assert.match(result,/Slippage setting/i);
  assert.match(result,/Not requested/);
  assert.match(result,/Not supplied/);
  assert.doesNotMatch(result,/NaN%|null bps|\[object Object\]|undefined bps/);
  assert.equal(forbidden.length,0,'Preview unexpectedly requested wallet execution');
  assert.deepEqual(errors,[],'Quote UI threw a browser error');
  return result;
}
async function quoteExpiryResult(ctx,kind) {
  const {page,forbidden,errors}=ctx;
  const unexpectedScripts=[];
  page.on('request',request=>{
    const host=new URL(request.url()).hostname;
    if(host==='terminal.jup.ag'||host==='plugin.jup.ag')
      unexpectedScripts.push(request.url());
  });
  // Use the same exact Solana token/amount fixture as other quote-only E2E checks.
  await page.route(QUOTE,route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify(fixture({feeBps:15,router:'jupiter',slippageBps:50}))
  }));
  const fresh=async()=>{
    await page.locator('#getQuote').click();
    await page.waitForFunction(()=>
      (document.querySelector('#quoteStatus')?.textContent||'').includes('Quote received from Jupiter'),
      null,{timeout:10000});
    assert.match(await page.locator('#quoteResults').innerText(),/1\.234567/);
  };
  await fresh();
  await page.clock.fastForward(29_000);
  assert.match(await page.locator('#quoteStatus').innerText(),/Quote received from Jupiter/,
    kind+' must retain a quote before the 30-second local UI age');
  assert.match(await page.locator('#quoteResults').innerText(),/1\.234567/);
  await page.clock.fastForward(1_100);
  assert.match(await page.locator('#quoteStatus').innerText(),/over 30 seconds old/,
    kind+' must invalidate a quote when the 30s browser timer fires');
  assert.doesNotMatch(await page.locator('#quoteResults').innerText(),/1\.234567|15 bps|jupiter\s+route/i,
    kind+' must remove expired amounts, provider and fees');
  // Stable section headings such as 'Jupiter fee' are allowed after expiry;
  // it is the stale provider VALUE, amount and fee VALUE that must disappear.
  assert.equal(await page.locator('#getQuote').isDisabled(),false,
    kind+' must make a fresh read-only quote available after expiry');

  // Simulate a backgrounded mobile tab with a throttled timer. setFixedTime
  // advances Date.now() WITHOUT triggering timer callbacks. A real browser
  // visibility return must drop the stale quote synchronously instead.
  await fresh();
  await page.clock.setFixedTime(new Date('2026-11-16T05:02:00.000Z'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.match(await page.locator('#quoteStatus').innerText(),/over 30 seconds old/,
    kind+' must invalidate an overage preview on visibility resume');
  assert.doesNotMatch(await page.locator('#quoteResults').innerText(),/1\.234567|15 bps|jupiter\s+route/i,
    kind+' must not expose a background-stale amount or fee');
  assert.equal(forbidden.length,0,'Quote expiry must not call /order or /execute');
  assert.deepEqual(unexpectedScripts,[],'Quote expiry must not inject a wallet-capable provider SDK');
  assert.deepEqual(errors,[],'Quote expiry caused a browser page error');
}

async function customSlippageResult(ctx,kind) {
  const {page,forbidden,errors}=ctx;
  const control=kind==='DEX'?'#dexTradeSlippage':'#swapSlippage';
  await page.route(QUOTE,route=>{
    const u=new URL(route.request().url());
    assert.equal(u.searchParams.get('slippageBps'),'50',
      'Selected slippage must reach the Climboria quote-only proxy');
    return route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify(fixture({slippageBps:50}))
    });
  });
  const advanced=page.locator(control).locator('xpath=ancestor::details[1]');
  if(await advanced.count()&&!(await advanced.evaluate(element=>element.open)))
    await advanced.locator('summary').click();
  await page.locator(control).selectOption('50');
  await page.locator('#getQuote').click();
  await page.waitForFunction(() =>
    (document.querySelector('#quoteStatus')?.textContent||'').includes('Quote received from Jupiter'),
    null,{timeout:10000});
  const result=await page.locator('#quoteResults').innerText();
  assert.match(result,/Minimum received/i);
  assert.match(result,/0\.50% · provider reported/);
  assert.match(result,/Not requested/);
  assert.equal(forbidden.length,0,'Custom quote unexpectedly requested wallet execution');
  assert.deepEqual(errors,[],'Custom slippage UI caused a browser error');
}
async function unavailableQuote(ctx,kind) {
  const {page,forbidden,errors}=ctx;
  await page.route(QUOTE,route=>route.abort('timedout'));
  await page.locator('#getQuote').click();
  await page.waitForFunction(() =>
    (document.querySelector('#quoteStatus')?.textContent||'').includes('Quote unavailable'),
    null,{timeout:10000});
  assert.equal(await page.locator('#getQuote').isDisabled(),false,kind+' must recover the quote control after an unavailable provider');
  const result=await page.locator('#quoteResults').innerText();
  assert.match(result,/Quote request failed|timed out|Failed to fetch/i,kind+' must show an unavailable state rather than a cached estimate');
  assert.doesNotMatch(result,/Estimated output|1234567/);
  assert.equal(forbidden.length,0,'An unavailable quote must not request wallet execution');
  assert.deepEqual(errors,[],'Unavailable quote handling caused a browser error');
}
async function unavailableTokenSearch(ctx,kind) {
  const {page,forbidden,errors}=ctx;
  await page.locator('#quoteFromSearch').fill('SOL');
  await page.locator('#searchFrom').click();
  await page.waitForFunction(() =>
    (document.querySelector('#fromResults')?.textContent||'').includes('Token search unavailable. No token was selected.'),
    null,{timeout:10000});
  const result=await page.locator('#fromResults').innerText();
  assert.match(result,/Token search unavailable\. No token was selected\. Failed to fetch/,kind+' must preserve an honest unavailable token-search state');
  assert.equal(forbidden.length,0,'An unavailable token search must not request wallet execution');
  assert.deepEqual(errors,[],'Unavailable token search handling caused a browser error');
}
async function unavailableSwapMarket(ctx) {
  const {page,forbidden,errors}=ctx;
  await page.waitForFunction(() =>
    (document.querySelector('#majorStatus')?.textContent||'').includes('Live price provider unavailable'),
    null,{timeout:10000});
  assert.match(await page.locator('#majorCoins').innerText(),/BTC/, 'Swap must retain its selectable market list when the public feed is unavailable');
  assert.equal(forbidden.length,0,'An unavailable public market feed must not request wallet execution');
  assert.deepEqual(errors,[],'Unavailable public market handling caused a browser error');
}
async function pendingQuote(ctx,action,{assertStatus,assertResult}) {
  const {page,forbidden,errors}=ctx;
  let resolveRoute;
  const routed=new Promise(resolve => { resolveRoute=resolve; });
  await page.route(QUOTE,route => {resolveRoute(route);});
  await page.locator('#getQuote').click();
  const route=await Promise.race([
    routed, sleep(10000).then(()=>{throw new Error('Timed out awaiting mocked quote request');})
  ]);
  const url=new URL(route.request().url());
  assert.equal(url.searchParams.get('inputMint'),MINT);
  assert.equal(url.searchParams.get('outputMint'),USDC);
  await action(page);
  // Deliver a now-obsolete successful quote, after the user has changed state.
  await route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(fixture({feeBps:15,priceImpactPct:0.0025,router:'metis'}))});
  // Allow fetch() / response.json() microtasks to settle, then verify stale data is absent.
  await page.waitForTimeout(160);
  const status=await page.locator('#quoteStatus').innerText();
  const results=await page.locator('#quoteResults').innerText();
  assert.match(status,assertStatus);
  assert.match(results,assertResult);
  assert.doesNotMatch(status,/Quote received from Jupiter/);
  assert.doesNotMatch(results,/metis|1234567|0\.2500%|15 bps/);
  assert.equal(forbidden.length,0,'Stale quote triggered wallet execution');
  assert.deepEqual(errors,[],'Stale quote caused browser error');
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const label=viewport.width<600?'mobile':'desktop';
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport);
      try {
        await mockResult(ctx,{feeBps:null,priceImpactPct:null,router:null,mode:null});
        console.log('PASS '+kind+' '+label+': unavailable fee, impact and router remain honest; no wallet requests');
      } finally {await ctx.page.close();}
    }
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport,{virtualClock:true});
      try {
        await quoteExpiryResult(ctx,kind);
        console.log('PASS '+kind+' '+label+': real browser 30-second timer and background-tab quote expiry; no wallet');
      } finally {await ctx.page.close();}
    }
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport);
      try {
        await customSlippageResult(ctx,kind);
        console.log('PASS '+kind+' '+label+': chosen slippage reaches proxy and verified provider minimum is disclosed');
      } finally {await ctx.page.close();}
    }
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport,{tokenSearchUnavailable:true});
      try {
        await unavailableTokenSearch(ctx,kind);
        console.log('PASS '+kind+' '+label+': unavailable token search recovers without selection or execution');
      } finally {await ctx.page.close();}
    }
    {
      const ctx=await quotePage(browser,'Swap',viewport,{marketUnavailable:true});
      try {
        await unavailableSwapMarket(ctx);
        console.log('PASS Swap '+label+': unavailable public market feed preserves selection and does not execute');
      } finally {await ctx.page.close();}
    }
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport);
      try {
        await unavailableQuote(ctx,kind);
        console.log('PASS '+kind+' '+label+': unavailable quote recovers without cached estimate or execution');
      } finally {await ctx.page.close();}
    }
    for(const kind of ['Swap','DEX']) {
      const ctx=await quotePage(browser,kind,viewport,{walletProvider:true});
      try {
        await walletSessionResult(ctx,kind);
        console.log('PASS '+kind+' '+label+': wallet disconnect and account changes clear stale session state without execution');
      } finally {await ctx.page.close();}
    }
    {
      const ctx=await quotePage(browser,'Swap',viewport);
      try {
        await pendingQuote(ctx,async page=>{
          await page.locator('#chainBase').click();
          assert.equal(await page.locator('#getQuote').isDisabled(),true);
        },{assertStatus:/Base ERC-20 swap is not yet connected/,assertResult:/Base quote provider not configured/});
        console.log('PASS Swap '+label+': Solana response cannot override Base network state');
      } finally {await ctx.page.close();}
    }
    {
      const ctx=await quotePage(browser,'Swap',viewport);
      try {
        await pendingQuote(ctx,async page=>{
          await page.evaluate(()=>{
            const s=document.getElementById('swapSlippage');
            s.value='50';s.dispatchEvent(new Event('change',{bubbles:true}));
          });
          assert.equal(await page.locator('#getQuote').isDisabled(),false);
        },{assertStatus:/Slippage changed/i,assertResult:/Estimated output/i});
        console.log('PASS Swap '+label+': slippage change discards response and re-enables quote control');
      } finally {await ctx.page.close();}
    }
    {
      const ctx=await quotePage(browser,'DEX',viewport);
      try {
        await pendingQuote(ctx,async page=>{
          await page.evaluate(()=>{
            const s=document.getElementById('dexTradeSlippage');
            s.value='50';s.dispatchEvent(new Event('change',{bubbles:true}));
          });
          assert.equal(await page.locator('#getQuote').isDisabled(),false);
        },{assertStatus:/Slippage changed/,assertResult:/No current quote/});
        console.log('PASS DEX '+label+': slippage change discards in-flight quote');
      } finally {await ctx.page.close();}
    }
    {
      const ctx=await quotePage(browser,'DEX',viewport);
      try {
        await pendingQuote(ctx,async page=>{
          await page.locator('#showDexQuote').click();
          assert.equal(await page.locator('#swapQuote').isVisible(),false);
        },{assertStatus:/Quote preview closed/,assertResult:/No current quote/});
        console.log('PASS DEX '+label+': closing preview discards pending provider response');
      } finally {await ctx.page.close();}
    }

    // A→B→A changes are especially dangerous: the eventual provider response
    // has the same amount/mints as the current form but belongs to an old user
    // intent. Each actual input event must invalidate the request sequence.
    for(const kind of ['Swap','DEX']) {
      {
        const ctx=await quotePage(browser,kind,viewport);
        try {
          await pendingQuote(ctx,async page=>{
            await page.locator('#quoteAmount').fill('0.2');
            await page.locator('#quoteAmount').fill('0.1');
            assert.equal(await page.locator('#getQuote').isDisabled(),false);
          },{assertStatus:/Amount changed/i,
            assertResult:kind==='Swap'?/Estimated output/i:/No current quote/i});
          console.log('PASS '+kind+' '+label+': amount A→B→A rejects stale response');
        } finally {await ctx.page.close();}
      }
      {
        const ctx=await quotePage(browser,kind,viewport);
        try {
          await pendingQuote(ctx,async page=>{
            // Trigger the actual delegated token-selection click handler.
            // DEX deliberately closes this handler over private module state:
            // do not expose internals to window just for a test.
            await page.evaluate(({sol,usdc})=>{
              const box=document.getElementById('toResults');
              const candidates=[
                {id:sol,symbol:'SOL',name:'Solana',decimals:9},
                {id:usdc,symbol:'USDC',name:'USD Coin',decimals:6}
              ];
              for(const index of [0,1]){
                box._tokens=candidates;
                box.innerHTML='<button type="button" data-index="'+index+'">Select candidate</button>';
                box.querySelector('button').click();
              }
            },{sol:MINT,usdc:USDC});
            assert.equal(await page.locator('#getQuote').isDisabled(),false);
          },{assertStatus:kind==='Swap'?/Asset updated/i:/Token changed/i,
            assertResult:kind==='Swap'?/Estimated output/i:/No current quote/i});
          console.log('PASS '+kind+' '+label+': output token A→B→A rejects stale response');
        } finally {await ctx.page.close();}
      }
      {
        const ctx=await quotePage(browser,kind,viewport);
        try {
          await pendingQuote(ctx,async page=>{
            await page.locator('#quoteFromSearch').fill('BTC');
            assert.equal(await page.locator('#getQuote').isDisabled(),false);
          },{assertStatus:kind==='Swap'?/Finding token/i:/Input token search changed/i,
            assertResult:kind==='Swap'?/Estimated output/i:/No current quote/i});
          console.log('PASS '+kind+' '+label+': typing a new source token discards old quote');
        } finally {await ctx.page.close();}
      }
    }
    // Terminal mode changes invalidate the quote even if Buy→Sell→Buy
    // restores the SAME pair. This cannot be caught with pair equality alone.
    for(const kind of ['side','mode']) {
      const ctx=await quotePage(browser,'DEX',viewport);
      try {
        await pendingQuote(ctx,async page=>{
          await page.evaluate(kind=>{
            // Production trade tabs remain intentionally disabled.
            // Activate only this isolated DOM fixture to test the dormant
            // invalidation handlers; restore disabled state immediately.
            const attrs=kind==='side'?['sell','buy']:['limit','market'];
            const name=kind==='side'?'dex-side':'dex-order';
            for(const value of attrs){
              const button=document.querySelector('[data-'+name+'="'+value+'"]');
              if(!button||!button.disabled)throw new Error('Expected a disabled production trading tab');
              button.disabled=false;
              try{button.click();}finally{button.disabled=true;}
            }
            if([...document.querySelectorAll('[data-'+name+']')].some(x=>!x.disabled))
              throw new Error('Trading tab was not returned to fail-closed state');
          },kind);
          assert.equal(await page.locator('#getQuote').isDisabled(),false);
        },{assertStatus:kind==='side'?/Trade direction changed/i:/Order mode changed/i,
          assertResult:/No current quote/i});
        console.log('PASS DEX '+label+': '+kind+' A→B→A discards stale quote');
      } finally {await ctx.page.close();}
    }
  }
  console.log('PASS: offline read-only Swap/DEX quote-state browser regressions');
} finally {await browser.close();}
