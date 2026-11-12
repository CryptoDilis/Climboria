import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const basePair = {
    chainId: 'base', dexId: 'base-search-fixture',
    pairAddress: 'BaseSearchPair1111111111111111111111111111',
    baseToken: { address: '0x1111111111111111111111111111111111111111', symbol: 'CLIMBORIA_BASE_SEARCH_TEST', name: 'Climboria Base Search Fixture' },
    quoteToken: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether' },
    priceUsd: '1.25', priceChange: { h24: 3.5 }, volume: { h24: 12345 }, liquidity: { usd: 67890 }, pairCreatedAt: 1760000000000
  };
  const wrongChainPair = {
    ...basePair, chainId: 'solana', pairAddress: 'WrongChainSearchPair111111111111111111111',
    baseToken: { address: 'So11111111111111111111111111111111111111112', symbol: 'WRONGCHAINFIXTURE', name: 'Wrong Chain Fixture' }
  };
  await page.route('https://api.dexscreener.com/latest/dex/search**', async route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === 'CLIMBORIA_BASE_SEARCH_TEST') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pairs: [basePair, wrongChainPair] }) });
    if (query === 'CLIMBORIA_BASE_SEARCH_FAIL') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'fixture provider unavailable' }) });
    return route.continue();
  });
  const response = await page.goto('http://127.0.0.1:4173/dex/', { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error('DEX page failed to load');
  const input = page.locator('#baseSearch');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill('CLIMBORIA_BASE_SEARCH_TEST');
  const searchResponse = await page.waitForResponse(r => {
    const u = new URL(r.url());
    return u.pathname === '/latest/dex/search' && u.searchParams.get('q') === 'CLIMBORIA_BASE_SEARCH_TEST';
  }, { timeout: 10000 });
  if (!searchResponse.ok()) throw new Error('Live Base search fixture returned HTTP ' + searchResponse.status());
  await page.waitForFunction(() => document.querySelector('#baseRows')?.innerText.includes('CLIMBORIA_BASE_SEARCH_TEST'), undefined, { timeout: 5000 });
  const rows = await page.locator('#baseRows').innerText();
  if (!rows.includes('Climboria Base Search Fixture')) throw new Error('Base search result did not render provider token metadata');
  if (rows.includes('WRONGCHAINFIXTURE')) throw new Error('Base search accepted a non-Base chain result');
  if (!(await page.locator('#baseCoverage').innerText()).includes('Live provider search completed')) throw new Error('Base search did not report completed live provider discovery');
  await input.fill('CLIMBORIA_BASE_SEARCH_FAIL');
  const failedResponse = await page.waitForResponse(r => {
    const u = new URL(r.url());
    return u.pathname === '/latest/dex/search' && u.searchParams.get('q') === 'CLIMBORIA_BASE_SEARCH_FAIL';
  }, { timeout: 10000 });
  if (failedResponse.status() !== 503) throw new Error('Provider failure fixture did not return HTTP 503');
  await page.waitForFunction(() => (document.querySelector('#baseCoverage')?.innerText || '').includes('Live search failed'), undefined, { timeout: 5000 });
  const failedRows = await page.locator('#baseRows').innerText();
  if (failedRows.includes('CLIMBORIA_BASE_SEARCH_TEST')) throw new Error('Stale prior search result remained visible after the new query failed');
  if (errors.length) throw new Error('DEX page errors: ' + errors.join(' | '));
  console.log('PASS live Base provider search, Base-only chain filtering, stale-result clearing, and honest HTTP 503 state.');
} finally {
  await browser.close();
}
