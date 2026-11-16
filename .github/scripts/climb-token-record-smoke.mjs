// Browser-only regression for the permanent $CLIMB record (not a trading/live-market check).
// Run with a local Climboria static server on port 4173 after Playwright Chromium is installed.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const MINT='9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1536,1365,1024,768,430,390,360]){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
  const page=await context.newPage();
  try{
   // The 768px fixture simulates a hung RPC without waiting seven real seconds.
   // Do not change production timeouts; this override is browser-test only.
   if(width===768) await page.addInitScript(()=>{
    const nativeSetTimeout=window.setTimeout.bind(window);
    window.setTimeout=(fn,delay,...args)=>nativeSetTimeout(fn,delay===6500?35:delay,...args);
   });
   // Supply is read only and user-initiated. Keep all tests offline with
   // explicitly synthetic RPC fixtures; never claim these values on mainnet.
   let rpcRequests=0;
   let snapshotRequests=0;
   let mirrorRequests=0;
   await page.route('https://raw.githubusercontent.com/CryptoDilis/Climboria/main/data/climb-supply.json',async route=>{
    mirrorRequests++;
    const snapshot={
     schema:1,mint:MINT,status:'ready',
     source:'solana-mainnet-finalized-rpc',commitment:'finalized',
     amount:'123456789000000',decimals:9,slot:345678901,
     observedAt:new Date().toISOString()
    };
    if(width===390) snapshot.status='pending';
    if(width===768) snapshot.observedAt='2020-01-01T00:00:00.000Z';
    if(width===360) snapshot.mint='untrusted-mint';
    await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify(snapshot)});
   });
   await page.route('http://127.0.0.1:4173/data/climb-supply.json', async route=>{
    snapshotRequests++;
    // All fixtures below are synthetic. None represent live CLIMB supply.
    const valid={
     schema:1,mint:MINT,status:'ready',
     source:'solana-mainnet-finalized-rpc',commitment:'finalized',
     amount:'123456789000000',decimals:9,slot:345678901,
     observedAt:new Date().toISOString()
    };
    if(width===390||width===430) valid.status='pending';
    if(width===768) valid.observedAt='2020-01-01T00:00:00.000Z';
    if(width===360) valid.mint='incorrect-mint';
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(valid)});
   });
   await page.route(/^https:\/\/api\.mainnet-beta\.solana\.com\/?$/, async route=>{
    rpcRequests++;
    const payload=JSON.parse(route.request().postData()||'{}');
    assert.equal(payload.method,'getTokenSupply');
    assert.equal(payload.params[0],MINT);
    assert.equal(payload.params[1].commitment,'finalized');
    const mode=width===390?'malformed':width===360||width===1024?'unavailable':width===768?'timeout':'valid';
    if(mode==='unavailable')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"mock-offline"}'});
    if(mode==='timeout')await new Promise(resolve=>setTimeout(resolve,450));
    const valid={jsonrpc:'2.0',id:'climb-supply',result:{context:{slot:345678901},value:{amount:'123456789000000',decimals:9,uiAmountString:'123456.789'}}};
    if(mode==='malformed')valid.result.value.amount='123456.78';
    return route.fulfill({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},body:JSON.stringify(valid)});
   });
   const response=await page.goto(base,{waitUntil:'domcontentloaded'});
   assert.equal(response?.ok(),true,'local Climboria homepage should load');
   const hero=page.locator('.hero');
   const section=page.locator('#tokenomics');
   const record=section.locator('#climb-token-record');
   const utility=section.locator('.climb-token-utility');
   assert.equal(await hero.locator('#climb-token-record').count(),0,'hero must be free of token overlay');
   assert.equal(await record.count(),1,'one permanent official CA card belongs to Tokenomics');
   assert.equal(await utility.count(),1,'one planned utility card accompanies token record');
   assert.equal(await page.locator('#climbOfficialCa').count(),1,'avoid duplicate contract address');
   assert.equal((await record.locator('#climbOfficialCa').textContent()).trim(),MINT);
   assert.equal((await section.textContent()).includes('TBD'),false,'no raw TBD placeholders');
   assert.match(await utility.textContent(),/NOT YET LIVE/);
   await page.waitForFunction(()=>{
    const value=document.querySelector('#climbSupplyValue')?.textContent;
    return value==='123,456.789'||value==='Unavailable';
   },null,{timeout:6000});
   assert.equal(snapshotRequests,1,'homepage first tries exactly one same-origin snapshot');
   assert.equal(mirrorRequests,(width===1536||width===1365||width===1024)?0:1,
    'GitHub public mirror is used only when the Pages file is unavailable or stale');
   assert.equal(rpcRequests,0,'homepage load must never automatically contact cross-origin Solana RPC');
   assert.equal(await page.locator('#climbSupplyPanel').getAttribute('aria-busy'),'false');
   if(width===1536||width===1365||width===1024||width===430){
    assert.equal(await page.locator('#climbSupplyValue').textContent(),'123,456.789');
    assert.equal(await page.locator('#climbSupplyDecimals').textContent(),'9');
    assert.equal(await page.locator('#climbSupplyState').textContent(),'Finalized RPC snapshot');
    assert.match(await page.locator('#climbSupplyChecked').textContent(),/Finalized snapshot observed at/);
    const source=await page.locator('#climbSupplySource').textContent();
    if(width===430)assert.match(source,/GitHub repository finalized/);
    else assert.match(source,/Same-origin finalized/);
   }else{
    assert.equal(await page.locator('#climbSupplyValue').textContent(),'Unavailable');
    assert.equal(await page.locator('#climbSupplyDecimals').textContent(),'—');
    assert.equal(await page.locator('#climbSupplyState').textContent(),'Supply unavailable');
    assert.match(await page.locator('#climbSupplySource').textContent(),/No fresh finalized supply snapshot is reachable/);
   }
   assert.equal(await record.locator('.climb-supply-explorer').getAttribute('href'),
    'https://solscan.io/token/'+MINT);
   // The owner-approved CA must remain reachable from the main nav, even
   // though the temporary launch hero announcement has been removed.
   const desktopNav=page.locator('#climbCaNavLink');
   const mobileNav=page.locator('#mobileClimbCaNavLink');
   assert.equal(await desktopNav.getAttribute('href'),'/#climb-token-record');
   assert.equal(await mobileNav.getAttribute('href'),'/#climb-token-record');
   if(await desktopNav.isVisible()){
    const logo=await page.locator('nav .logo').boundingBox();
    const navToken=await desktopNav.boundingBox();
    assert.ok(navToken.x>=logo.x+logo.width-2,
     'desktop permanent CA entry must not collide with the wordmark');
    await desktopNav.click();
   }else{
    await page.locator('#hamburger').click();
    assert.equal(await mobileNav.isVisible(),true,'mobile token CA nav must be discoverable');
    await mobileNav.click();
    assert.equal(await page.locator('#mobileMenu').evaluate(el=>el.classList.contains('active')),false,
     'mobile menu must close after navigating to the official CA');
   }
   assert.equal(new URL(page.url()).hash,'#climb-token-record');
   const sectionTop=await record.evaluate(el=>el.getBoundingClientRect().top);
   assert.ok(sectionTop>=60,'fixed navigation should not conceal CA heading: '+sectionTop);

   for(const url of ['https://pump.fun/coin/'+MINT,'https://solscan.io/token/'+MINT]){
    const link=record.locator('a[href="'+url+'"]');
    // Solscan is deliberately linked twice: the original CA verification
    // action and the always-visible supply fallback. Both must share the mint.
    const countExpected=url.includes('solscan.io/token/')?2:1;
    assert.equal(await link.count(),countExpected,'external links must use identical owner-announced mint');
    for(let i=0;i<countExpected;i++){
     assert.equal(await link.nth(i).getAttribute('target'),'_blank');
     assert.match(await link.nth(i).getAttribute('rel'),/noopener/);
    }
   }
   await record.scrollIntoViewIfNeeded();
   const geometry=await page.evaluate(()=>{
    const a=document.querySelector('#climb-token-record').getBoundingClientRect();
    const b=document.querySelector('#tokenomics .climb-token-utility').getBoundingClientRect();
    const mint=document.querySelector('#climbOfficialCa').getBoundingClientRect();
    return {viewport:document.documentElement.clientWidth,
      primary:{left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width},
      secondary:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width},
      mint:{left:mint.left,right:mint.right,width:mint.width}
    };
   });
   for(const box of [geometry.primary,geometry.secondary,geometry.mint]){
    assert.ok(box.width>100,'responsive token card must remain visibly sized: '+JSON.stringify(geometry));
    assert.ok(box.left>=-2 && box.right<=geometry.viewport+2,
      'tokenomics cards/CA cannot overflow viewport '+width+': '+JSON.stringify(geometry));
   }
   if(width>=1071){
    assert.ok(geometry.secondary.left>geometry.primary.right-2,
      'desktop token records must be side-by-side');
   }else{
    assert.ok(geometry.secondary.top>=geometry.primary.bottom-2,
      'mobile token cards must stack with no overlap');
   }
   // Exercise real click/DOM event flow with a browser-controlled clipboard mock;
   // no wallet or actual token transaction is involved.
   await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async value=>{window.__copiedClimbMint=value;}
    }});
   });
   await page.locator('#copyClimbCa').click();
   assert.equal(await page.evaluate(()=>window.__copiedClimbMint),MINT);
   assert.match(await page.locator('#copyClimbCaStatus').textContent(),/Contract address copied/i);
   await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw new Error('blocked')}
    }});
   });
   await page.locator('#copyClimbCa').click();
   assert.match(await page.locator('#copyClimbCaStatus').textContent(),/Copy unavailable/i,
     'clipboard failure must preserve selectable visible CA');
   const manualSelection=await page.evaluate(()=>window.getSelection()?.toString());
   assert.equal(manualSelection,MINT,
     'when clipboard is blocked, automatically select exactly the displayed official CA');
   await record.scrollIntoViewIfNeeded();
   const supplyButton=page.locator('#climbSupplyRefresh');
   assert.equal(await supplyButton.count(),1);
   await supplyButton.click();
   await page.waitForFunction(()=>{
    const label=document.querySelector('#climbSupplyState')?.textContent;
    return label==='Live RPC snapshot' || label==='Supply unavailable' ||
      label==='Cached snapshot · live RPC unavailable';
   },null,{timeout:8000});
   assert.equal(rpcRequests,1,'one user action must make exactly one read-only RPC request');
   assert.equal(await page.locator('#climbSupplyPanel').getAttribute('aria-busy'),'false',
    'load must always finish or return a fail-closed state');
   if(width===1024){
    assert.equal(await page.locator('#climbSupplyValue').textContent(),'123,456.789',
      'failed live refresh must preserve a still-fresh verified static snapshot');
    assert.equal(await page.locator('#climbSupplyState').textContent(),
      'Cached snapshot · live RPC unavailable');
    assert.match(await supplyButton.textContent(),/RETRY LIVE SOLANA/);
   }else if(width===390||width===360||width===768){
    assert.equal(await page.locator('#climbSupplyValue').textContent(),'Unavailable',
      'malformed or unreachable RPC must fail closed, never show invented supply');
    assert.equal(await page.locator('#climbSupplyDecimals').textContent(),'—');
    assert.match(await page.locator('#climbSupplySource').textContent(),/Browser CORS, rate limits or timeout may block/i);
    assert.match(await page.locator('#climbSupplyState').textContent(),/Supply unavailable/);
    assert.equal(await supplyButton.textContent(),'CHECK LIVE SOLANA ↗');
    assert.match(await page.locator('#climbSupplyChecked').textContent(),/No current on-chain supply snapshot/);
    if(width===768){
     await page.waitForTimeout(500);
     assert.equal(await page.locator('#climbSupplyValue').textContent(),'Unavailable',
      'late RPC response must never overwrite a timed-out result');
    }
   }else{
    assert.equal(await page.locator('#climbSupplyValue').textContent(),'123,456.789',
      'precision-safe response must use raw amount and decimals, not rounded uiAmount');
    assert.equal(await page.locator('#climbSupplyDecimals').textContent(),'9');
    assert.match(await page.locator('#climbSupplySource').textContent(),/finalized RPC snapshot · slot 345,678,901/);
    assert.equal(await page.locator('#climbSupplyState').textContent(),'Live RPC snapshot');
    assert.match(await page.locator('#climbSupplyChecked').textContent(),/Finalized snapshot observed at/);
    assert.match(await supplyButton.textContent(),/RECHECK LIVE SOLANA/);
   }
   assert.match(await page.locator('.climb-supply-meta').textContent(),/Not independently verified/,
    'circulating supply cannot be inferred from total mint supply');
   await page.screenshot({path:'climb-tokenomics-'+width+'.png'});
   console.log('PASS permanent CLIMB Tokenomics layout, copy, links and CTA hierarchy at '+width+'px');
  }finally{await context.close()}
 }
}finally{await browser.close()}
