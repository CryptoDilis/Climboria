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
  outAmount:'1234567',...extra
});
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function quotePage(browser,kind,viewport) {
  const mobile = viewport.width < 600;
  const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
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
  await page.route('https://api.climboria.fun/api/tokens/search**',route =>
    route.fulfill({status:200,contentType:'application/json',body:'[]'})
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
  assert.match(result,/Not requested/);
  assert.match(result,/Not supplied/);
  assert.doesNotMatch(result,/NaN%|null bps|\[object Object\]|undefined bps/);
  assert.equal(forbidden.length,0,'Preview unexpectedly requested wallet execution');
  assert.deepEqual(errors,[],'Quote UI threw a browser error');
  return result;
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
            // Exercise real token selection logic, not merely input typing.
            await page.evaluate(({sol,usdc})=>{
              chooseQuoteToken('to',{id:sol,symbol:'SOL',name:'Solana',decimals:9});
              chooseQuoteToken('to',{id:usdc,symbol:'USDC',name:'USD Coin',decimals:6});
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
        await ctx.page.evaluate(usdc=>{
          dexTradeToken={id:usdc,symbol:'USDC',name:'USD Coin',decimals:6,isVerified:true};
          dexTradeSide='buy';dexTradeOrderType='market';dexTradeApplyDirection();
        },USDC);
        await pendingQuote(ctx,async page=>{
          await page.evaluate(kind=>{
            if(kind==='side') {
              document.querySelector('[data-dex-side="sell"]').click();
              document.querySelector('[data-dex-side="buy"]').click();
            } else {
              document.querySelector('[data-dex-order="limit"]').click();
              document.querySelector('[data-dex-order="market"]').click();
            }
          },kind);
          assert.equal(await page.locator('#getQuote').isDisabled(),false);
        },{assertStatus:kind==='side'?/Trade direction changed/i:/Order mode changed/i,
          assertResult:/No current quote/i});
        console.log('PASS DEX '+label+': '+kind+' A→B→A discards stale quote');
      } finally {await ctx.page.close();}
    }
    // Two independent mint-supply responses may complete out of order when
    // the user selects markets quickly. Only the most recent token can adopt
    // the RPC decimals or set the enabled quote-terminal state.
    {
      const ctx=await quotePage(browser,'DEX',viewport);
      try {
        const {page,errors}=ctx;
        let resolveFirst;
        const firstRequest=new Promise(resolve=>{resolveFirst=resolve;});
        await page.route('https://api.mainnet-beta.solana.com/**',async route=>{
          const body=route.request().postDataJSON();
          if(body?.method!=='getTokenSupply') return route.continue();
          if(body.params?.[0]===MINT) {resolveFirst(route);return;}
          if(body.params?.[0]===USDC) return route.fulfill({
            status:200,contentType:'application/json',
            body:JSON.stringify({jsonrpc:'2.0',id:1,result:{value:{decimals:6}}})
          });
          return route.abort();
        });
        await page.evaluate(mint=>{
          void dexTradeSyncToken({baseToken:{address:mint,symbol:'SOL',name:'Stale choice'},
            priceUsd:'100',liquidity:{usd:100}});
        },MINT);
        const oldRoute=await Promise.race([
          firstRequest,sleep(10000).then(()=>{throw new Error('First mint RPC was not requested');})
        ]);
        await page.evaluate(mint=>{
          void dexTradeSyncToken({baseToken:{address:mint,symbol:'USDC',name:'Latest choice'},
            priceUsd:'1',liquidity:{usd:100}});
        },USDC);
        await page.waitForFunction(mint=>{
          return dexTradeToken?.id===mint && dexTradeToken?.decimals===6 &&
            (document.querySelector('#dexTradeStatus')?.textContent||'').includes('On-chain mint verified');
        },USDC,{timeout:10000});
        await oldRoute.fulfill({status:200,contentType:'application/json',
          body:JSON.stringify({jsonrpc:'2.0',id:1,result:{value:{decimals:9}}})});
        await page.waitForTimeout(120);
        const state=await page.evaluate(()=>({
          id:dexTradeToken?.id,decimals:dexTradeToken?.decimals,
          input:quoteTokens.from.id,output:quoteTokens.to.id,
          status:document.querySelector('#dexTradeStatus')?.textContent
        }));
        assert.equal(state.id,USDC);
        assert.equal(state.decimals,6);
        assert.equal(state.input,MINT);
        assert.equal(state.output,USDC);
        assert.match(state.status,/On-chain mint verified/);
        assert.deepEqual(errors,[]);
        assert.equal(ctx.forbidden.length,0);
        console.log('PASS DEX '+label+': late old mint-supply RPC cannot overwrite current token decimals');
      } finally {await ctx.page.close();}
    }
  }
  console.log('PASS: offline read-only Swap/DEX quote-state browser regressions');
} finally {await browser.close();}
