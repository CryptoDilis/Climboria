import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const mintA = 'SysvarRent111111111111111111111111111111111';
  const mintB = 'SysvarC1ock11111111111111111111111111111111';
  const pairA = { chainId:'solana', dexId:'chart-switch-fixture', pairAddress:'ChartSwitchPairAAAAAAAAAAAAAAAAAAAAAAAAAA', baseToken:{address:mintA,symbol:'CHARTA',name:'Chart Switch A'}, quoteToken:{address:'So11111111111111111111111111111111111111112',symbol:'SOL',name:'Solana'}, priceUsd:'1.11', priceChange:{h24:1}, volume:{h24:1000}, liquidity:{usd:5000} };
  const pairB = { ...pairA, pairAddress:'ChartSwitchPairBBBBBBBBBBBBBBBBBBBBBBBBBB', baseToken:{address:mintB,symbol:'CHARTB',name:'Chart Switch B'}, priceUsd:'2.22' };
  await page.route('https://api.dexscreener.com/latest/dex/search**', async route => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'CHARTA') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairA]})});
    if (q === 'CHARTB') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairB]})});
    return route.continue();
  });
  await page.route('https://api.dexscreener.com/latest/dex/tokens/**', async route => {
    const mint = new URL(route.request().url()).pathname.split('/').pop();
    if (mint === mintA) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:[pairA]})});
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
  await search.fill('CHARTB');
  await page.waitForFunction(() => document.querySelector('#rows')?.innerText.includes('CHARTB'), undefined, {timeout:10000});
  const pending = page.waitForResponse(r => r.url().includes('/latest/dex/tokens/'+mintB), {timeout:10000});
  await page.locator('#rows button[data-mint="'+mintB+'"]').click();
  await pending;
  const chartWhileLoading = await page.locator('#detailChart').getAttribute('src');
  if (chartWhileLoading !== 'about:blank') throw new Error('Previous token chart remained visible while the new token request was pending: '+chartWhileLoading);
  if (!(await page.locator('#detailUpdated').innerText()).includes('Loading live market')) throw new Error('New token detail did not expose its loading state');
  await page.waitForFunction(pair => document.querySelector('#detailChart')?.src.includes(pair), pairB.pairAddress, {timeout:10000});
  if (!(await page.locator('#detailTitle').innerText()).includes('CHARTB')) throw new Error('New chart did not resolve to selected token B');
  if (errors.length) throw new Error('DEX page errors: '+errors.join(' | '));
  console.log('PASS selected-token chart is cleared immediately and replaced only by the newly selected pool after provider response.');
} finally { await browser.close(); }
