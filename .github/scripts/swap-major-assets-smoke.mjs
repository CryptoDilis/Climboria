const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173/swap/';
const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const mintFor = (prefix) => prefix + '1'.repeat(32 - prefix.length);
const assets = {
  BTC: { name: 'Bitcoin', candidates: [mintFor('BTC'), mintFor('BTCA')], price: '65000', pair: 'PairBTC111111111111111111111111111111111' },
  ETH: { name: 'Ethereum', candidates: [mintFor('ETH'), mintFor('ETHA')], price: '3200', pair: 'PairETH111111111111111111111111111111111' },
  BNB: { name: 'BNB', candidates: [mintFor('BNB'), mintFor('BNBA')], price: '600', pair: 'PairBNB111111111111111111111111111111111' },
  XRP: { name: 'XRP', candidates: [mintFor('XRP'), mintFor('XRPA')], price: '0.62', pair: 'PairXRP111111111111111111111111111111111' },
  SOL: { name: 'Solana', mint: SOL, price: '180', pair: 'PairSOL111111111111111111111111111111111' },
  USDC: { name: 'USD Coin', mint: USDC, price: '1', pair: 'PairUSDC11111111111111111111111111111111' },
  ALT: { name: 'Alternate Output', candidates: [mintFor('ALT')], price: '2', pair: 'PairALT111111111111111111111111111111111' }
};
const tokenByMint = new Map();
for (const [symbol, asset] of Object.entries(assets)) {
  const mints = asset.mint ? [asset.mint] : asset.candidates;
  for (const [index, mint] of mints.entries()) {
    tokenByMint.set(mint, {
      id: mint, symbol, name: asset.name + (mints.length > 1 ? ' representation ' + (index + 1) : ''),
      decimals: symbol === 'SOL' ? 9 : symbol === 'USDC' ? 6 : 8, isVerified: index === 0
    });
  }
}
function pairFor(mint) {
  const token = tokenByMint.get(mint);
  if (!token) return null;
  const asset = assets[token.symbol];
  return {
    chainId: 'solana', dexId: 'six-asset-fixture', pairAddress: asset.pair + (['BTC','ETH','BNB','XRP'].includes(token.symbol) ? token.id.slice(-2) : ''),
    baseToken: { address: mint, symbol: token.symbol, name: token.name },
    quoteToken: { address: USDC, symbol: 'USDC', name: 'USD Coin' },
    priceUsd: asset.price, priceChange: { h24: 1.5 }, volume: { h24: 123456 },
    marketCap: 1000000, liquidity: { usd: 250000 }
  };
}
async function installFixtures(page) {
  page.on('pageerror', e => page._smokeErrors.push(e.message));
  await page.route('https://api.coingecko.com/api/v3/coins/markets**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(['bitcoin','ethereum','solana','binancecoin','ripple','usd-coin'].map((id,i)=>({
      id, symbol:['btc','eth','sol','bnb','xrp','usdc'][i],
      name:['Bitcoin','Ethereum','Solana','BNB','XRP','USD Coin'][i],
      current_price:[65000,3200,180,600,0.62,1][i], price_change_percentage_24h:1,
      sparkline_in_7d:{price:[1,2,3]}
    })))
  }));
  const searchFixture = route => {
    const query = new URL(route.request().url()).searchParams.get('query')?.toUpperCase();
    const asset = assets[query];
    const tokens = asset ? (asset.mint ? [asset.mint] : asset.candidates).map(mint => tokenByMint.get(mint)) : [];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(tokens)});
  };
  await page.route('**/api/tokens/search**', searchFixture);
  await page.route('https://api.jup.ag/tokens/v2/search**', searchFixture);
  await page.route('https://api.dexscreener.com/latest/dex/tokens/**', async route => {
    const mint = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() || '');
    const pair = pairFor(mint);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pairs:pair?[pair]:[]})});
  });
  const rpc = route => {
    const body = route.request().postDataJSON?.() || {};
    const token = tokenByMint.get(body.params?.[0]);
    const decimals = token?.decimals ?? 8;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:body.id||1,result:{value:{decimals,amount:'100000000'}}})});
  };
  for (const url of ['https://api.mainnet-beta.solana.com','https://solana-rpc.publicnode.com','https://rpc.ankr.com/solana']) await page.route(url,rpc);
}
async function assertChart(page, symbol, mint) {
  const asset = assets[symbol];
  await page.waitForFunction(pair=>document.querySelector('#selectedAssetChart')?.src.includes(pair),asset.pair,{timeout:12000});
  const state = await page.evaluate(()=>({
    input:document.querySelector('#quoteFromSearch')?.value,
    title:document.querySelector('#selectedAssetTitle')?.textContent,
    price:document.querySelector('#selectedAssetPrice')?.textContent,
    chart:document.querySelector('#selectedAssetChart')?.getAttribute('src')
  }));
  const formattedPrice = Number(asset.price).toLocaleString('en-US');
  if (state.input !== symbol || !state.title?.startsWith(symbol) || !state.price?.includes(formattedPrice) || !state.chart?.includes(asset.pair)) {
    throw new Error(symbol + ' selected state/chart mismatch: ' + JSON.stringify(state));
  }
  if (new URL(page.url()).searchParams.get('from') !== mint) throw new Error(symbol + ' exact From mint missing from URL');
}
async function selectAsset(page, symbol, mobile) {
  const row = page.locator('#majorCoins .major-row[data-major-symbol="' + symbol + '"]');
  await row.waitFor({state:'visible',timeout:12000});
  if (mobile) {
    const hit = await row.evaluate(el => {
      const r=el.getBoundingClientRect(), top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {cursor:getComputedStyle(el).cursor,after:getComputedStyle(el,'::after').content,hit:!!top&&!!top.closest('button.major-row')};
    });
    if (hit.cursor !== 'pointer' || (hit.after !== 'none' && hit.after !== 'normal') || !hit.hit) throw new Error(symbol + ' mobile major-asset hit target failed: ' + JSON.stringify(hit));
    await row.tap();
  } else {
    const hover=await row.evaluate(el=>getComputedStyle(el,'::after').content);
    if (hover!=='none'&&hover!=='normal') throw new Error(symbol + ' major-asset SELECT overlay present: ' + hover);
    await row.click();
  }
  if (symbol === 'SOL' || symbol === 'USDC') {
    const mint=assets[symbol].mint;
    await page.waitForFunction(m=>new URL(location.href).searchParams.get('from')===m,mint,{timeout:12000});
    await assertChart(page,symbol,mint);
    return mint;
  }
  if (mobile) await page.locator('#mobileWorkspaceTabs [data-workspace-tab="swap"]').tap();
  await page.locator('#fromResults button[data-index="0"]').waitFor({state:'visible',timeout:12000});
  if (await page.locator('#fromResults button').count() !== 2) throw new Error(symbol + ' must expose both ambiguous candidate mints');
  const pre=await page.evaluate(()=>({input:document.querySelector('#quoteFromSearch')?.value,selected:document.querySelector('#fromSelected')?.textContent}));
  if (pre.input!==symbol || !pre.selected?.includes('Selection required')) throw new Error(symbol + ' was silently selected before explicit mint choice: ' + JSON.stringify(pre));
  const mint=assets[symbol].candidates[0];
  if (mobile) await page.locator('#fromResults button[data-index="0"]').tap();
  else await page.locator('#fromResults button[data-index="0"]').click();
  await page.waitForFunction(m=>new URL(location.href).searchParams.get('from')===m,mint,{timeout:12000});
  await assertChart(page,symbol,mint);
  return mint;
}
async function runViewport(browser, options) {
  const width=options.width, mobile=options.mobile;
  const page=await browser.newPage({viewport:{width,height:844},isMobile:mobile,hasTouch:mobile});
  page._smokeErrors=[];
  try {
    await installFixtures(page);
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    if(mobile) await page.locator('#mobileWorkspaceTabs [data-workspace-tab="market"]').tap();
    await page.locator('#majorCoins .major-row[data-major-symbol="BTC"]').waitFor({state:'visible',timeout:15000});
    for (const symbol of ['BTC','ETH','SOL','BNB','XRP','USDC']) {
      if (mobile && symbol!=='BTC') await page.locator('#mobileWorkspaceTabs [data-workspace-tab="market"]').tap();
      if (symbol==='USDC') {
        await page.locator('#quoteToSearch').fill('ALT');
        await page.locator('#searchTo').click();
        await page.waitForFunction(()=>document.querySelector('#toSelected')?.textContent.includes('ALT'),null,{timeout:12000});
      }
      const mint=await selectAsset(page,symbol,mobile);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(({symbol,mint})=>document.querySelector('#quoteFromSearch')?.value===symbol&&new URL(location.href).searchParams.get('from')===mint,{symbol,mint},{timeout:12000});
      if(mobile) await page.locator('#mobileWorkspaceTabs [data-workspace-tab="chart"]').tap();
      await assertChart(page,symbol,mint);
    }
    if(page._smokeErrors.length) throw new Error((mobile?'Mobile':'Desktop') + ' six-asset page errors: ' + page._smokeErrors.join(' | '));
    console.log('PASS ' + (mobile?'mobile':'desktop') + ' six-major-asset click/input/mint/chart/URL/reload acceptance.');
  } finally { await page.close(); }
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    await runViewport(browser,{width:1365,mobile:false});
    await runViewport(browser,{width:390,mobile:true});
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
