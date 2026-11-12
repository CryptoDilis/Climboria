import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const mintA = 'SysvarRent111111111111111111111111111111111';
  const mintB = 'SysvarC1ock11111111111111111111111111111111';
  const pairA = { chainId:'solana', dexId:'chart-switch-fixture', pairAddress:'ChartSwitchPairAAAAAAAAAAAAAAAAAAAAAAAAAA', baseToken:{address:mintA,symbol:'CHARTA',name:'Chart Switch A'}, quoteToken:{address:'So11111111111111111111111111111111111111112',symbol:'SOL',name:'Solana'}, priceUsd:'1.11', priceChange:{h24:1}, volume:{h24:1000}, liquidity:{usd:5000}, txns:{h24:{buys:10,sells:5}} };
  const pairASecondary = { ...pairA, dexId:'chart-switch-secondary-fixture', pairAddress:'ChartSwitchPairASecondaryBBBBBBBBBBBBBBBB', priceUsd:'1.33', priceChange:{h24:-2.5}, volume:{h24:4321}, liquidity:{usd:2500}, txns:{h24:{buys:7,sells:9}} };
  const pairARefreshed = { ...pairA, priceUsd:'1.44', priceChange:{h24:4.5}, volume:{h24:5678}, liquidity:{usd:6789}, txns:{h24:{buys:21,sells:8}} };
  let mintARequestCount = 0;
  const pairB = { ...pairA, pairAddress:'ChartSwitchPairBBBBBBBBBBBBBBBBBBBBBBBBBB', baseToken:{address:mintB,symbol:'CHARTB',name:'Chart Switch B'}, priceUsd:'2.22' };
  await page.route('https://api.dexscreener.com/latest/dex/search**', async route => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'CHARTA') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairA]})});
    if (q === 'CHARTB') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairB]})});
    return route.continue();
  });
  await page.route('https://api.dexscreener.com/latest/dex/tokens/**', async route => {
    const mint = new URL(route.request().url()).pathname.split('/').pop();
    if (mint === mintA) {
      mintARequestCount++;
      const pairs = mintARequestCount === 1 ? [pairA,pairASecondary] : [pairARefreshed,pairASecondary];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs})});
    }
    if (mint === mintB) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairB]})});
    }
    return route.continue();
  });
  await page.route('https://api.climboria.fun/api/pump/coin**', route => route.fulfill({status:404,contentType:'application/json',body:'{}'}));
  const response = await page.goto('http://127.0.0.1:4173/dex/', {waitUntil:'domcontentloaded'});
  if (!response?.ok()) throw new Error('DEX page failed to load');
  await page.waitForFunction(() => ['Live provider connection · Solana pairs only','Market data temporarily unavailable'].includes(document.querySelector('#status')?.textContent), undefined, {timeout:15000});
  const search = page.locator('#search');
  await search.fill('CHARTA');
  await page.waitForFunction(() => document.querySelector('#rows')?.innerText.includes('CHARTA'), undefined, {timeout:10000});
  await page.locator('#rows button[data-mint="'+mintA+'"]').click();
  await page.waitForFunction(pair => document.querySelector('#detailChart')?.src.includes(pair), pairA.pairAddress, {timeout:10000});
  if (!(await page.locator('#detailTitle').innerText()).includes('CHARTA')) throw new Error('First selected token title did not match chart A');
  if (mintARequestCount !== 1) throw new Error('Expected exactly one initial detail request for token A, got '+mintARequestCount);

  // Same-mint pool switching must keep the requested mint/title stable while every
  // selected-pool metric and chart URL follows the chosen pair.
  await page.locator('#detailPairs button[data-pool="'+pairASecondary.pairAddress+'"]').click();
  await page.waitForFunction(pair => document.querySelector('#detailChart')?.src.includes(pair) &&
    document.querySelector('#detailPrice')?.textContent === '$1.33000' &&
    document.querySelector('#detailVolume')?.textContent === '$4.3K' &&
    document.querySelector('#detailChange')?.textContent === '-2.50%' &&
    document.querySelector('#flowBuySell')?.textContent === '7 / 9', pairASecondary.pairAddress, {timeout:10000});
  if (!(await page.locator('#detailTitle').innerText()).includes('CHARTA') ||
      !(await page.locator('#detailMint').innerText()).includes(mintA)) {
    throw new Error('Same-mint secondary pool selection changed token identity');
  }
  await page.locator('#detailPairs button[data-pool="'+pairA.pairAddress+'"]').click();
  await page.waitForFunction(pair => document.querySelector('#detailChart')?.src.includes(pair) &&
    document.querySelector('#detailPrice')?.textContent === '$1.11000', pairA.pairAddress, {timeout:10000});

  // Manual refresh must issue a second no-store token-detail request and render the
  // changed provider payload without changing the selected mint or pool identity.
  const refreshRequest = page.waitForRequest(r => r.url().includes('/latest/dex/tokens/'+mintA), {timeout:10000});
  await page.locator('#refreshDetail').click();
  await refreshRequest;
  await page.waitForFunction(() => document.querySelector('#detailPrice')?.textContent === '$1.44000' &&
    document.querySelector('#detailVolume')?.textContent === '$5.7K' &&
    document.querySelector('#detailChange')?.textContent === '+4.50%' &&
    document.querySelector('#flowBuySell')?.textContent === '21 / 8' &&
    document.querySelector('#detailChart')?.src.includes('ChartSwitchPairAAAAAAAAAAAAAAAAAAAAAAAAAA') &&
    !document.querySelector('#refreshDetail')?.disabled, undefined, {timeout:10000});
  const refreshedState = await page.evaluate(() => ({
    mint: document.querySelector('#detailMint')?.textContent,
    title: document.querySelector('#detailTitle')?.textContent,
    selectedPool: document.querySelector('#detailPairs .routecandidate.selected')?.dataset.pair,
    chart: document.querySelector('#detailChart')?.src,
    price: document.querySelector('#detailPrice')?.textContent,
    volume: document.querySelector('#detailVolume')?.textContent,
    change: document.querySelector('#detailChange')?.textContent,
    buysSells: document.querySelector('#flowBuySell')?.textContent,
    refreshDisabled: document.querySelector('#refreshDetail')?.disabled
  }));
  if (mintARequestCount !== 2 || !refreshedState.mint.includes(mintA) ||
      !refreshedState.title.includes('CHARTA') ||
      refreshedState.selectedPool !== pairA.pairAddress ||
      !refreshedState.chart.includes(pairA.pairAddress) ||
      refreshedState.price !== '$1.44000' || refreshedState.volume !== '$5.7K' ||
      refreshedState.change !== '+4.50%' || refreshedState.buysSells !== '21 / 8' ||
      refreshedState.refreshDisabled) {
    throw new Error('Manual refresh did not apply the updated provider response to the selected pool: '+JSON.stringify(refreshedState)+'; requests='+mintARequestCount);
  }

  await search.fill('CHARTB');
  await page.waitForFunction(() => document.querySelector('#rows')?.innerText.includes('CHARTB'), undefined, {timeout:10000});
  const pending = page.waitForRequest(r => r.url().includes('/latest/dex/tokens/'+mintB), {timeout:10000});
  await page.locator('#rows button[data-mint="'+mintB+'"]').click();
  await pending;
  const chartWhileLoading = await page.locator('#detailChart').getAttribute('src');
  if (chartWhileLoading !== 'about:blank') throw new Error('Previous token chart remained visible while the new token request was pending: '+chartWhileLoading);
  if (!(await page.locator('#detailUpdated').innerText()).includes('Loading live market')) throw new Error('New token detail did not expose its loading state');
  await page.waitForFunction(pair => document.querySelector('#detailChart')?.src.includes(pair), pairB.pairAddress, {timeout:10000});
  if (!(await page.locator('#detailTitle').innerText()).includes('CHARTB')) throw new Error('New chart did not resolve to selected token B');

  // A provider pair may contain the requested mint only on the quote side. Until quote-side
  // price/chart semantics are normalized, the DEX detail view must fail closed rather than
  // presenting the base asset's identity, price or chart as the selected mint.
  const quoteMint='SysvarStake1111111111111111111111111111111';
  const quoteOnlyPair={chainId:'solana',dexId:'quote-side-fixture',pairAddress:'QuoteSideOnlyPool11111111111111111111111111',baseToken:{address:'So11111111111111111111111111111111111111112',symbol:'SOL',name:'Solana'},quoteToken:{address:quoteMint,symbol:'QONLY',name:'Quote Side Only'},priceUsd:'150',priceNative:'0.0066667',priceChange:{h24:3},volume:{h24:900000},liquidity:{usd:250000}};
  await page.route('https://api.dexscreener.com/latest/dex/tokens/**',async route=>{
    const requested=new URL(route.request().url()).pathname.split('/').pop();
    if(requested===quoteMint)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[quoteOnlyPair]})});
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4173/dex/?token='+quoteMint,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(mint=>document.querySelector('#detailMint')?.textContent.includes(mint)&&document.querySelector('#detailPairs')?.textContent.includes('quote token'),quoteMint,{timeout:10000});
  const quoteOnlyState=await page.evaluate(()=>({mint:document.querySelector('#detailMint')?.textContent,title:document.querySelector('#detailTitle')?.textContent,price:document.querySelector('#detailPrice')?.textContent,chart:document.querySelector('#detailChart')?.getAttribute('src'),notice:document.querySelector('#detailPairs')?.textContent}));
  if(!quoteOnlyState.mint.includes(quoteMint)||quoteOnlyState.title.includes('Solana')||quoteOnlyState.price!=='Unavailable'||quoteOnlyState.chart!=='about:blank'||!quoteOnlyState.notice.includes('withholding'))throw new Error('Quote-side-only pool was not safely withheld for exact-mint identity: '+JSON.stringify(quoteOnlyState));
  if (errors.length) throw new Error('DEX page errors: '+errors.join(' | '));
  console.log('PASS same-mint pool synchronization, manual token-detail refresh, cross-token chart switch, and exact-mint quote-side fail-closed behavior.');
} finally { await browser.close(); }
