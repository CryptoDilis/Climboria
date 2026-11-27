// Base V3 tokenomics UI; prior-holder protection without historical mint display.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const MINT='9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump',base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1536,1365,1200,1180,1160,1024,768,430,390,360]){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
  const page=await context.newPage();
  try{
   const supplyRequests=[];
   page.on('request',r=>{if(/climb-token-supply\.js|climb-supply\.json|api\.mainnet-beta\.solana\.com/.test(r.url()))supplyRequests.push(r.url());});
   assert.ok((await page.goto(base,{waitUntil:'domcontentloaded'}))?.ok());
   const primary=page.locator('#climb-base-transition'),notice=page.locator('#climb-token-record'),utility=page.locator('.climb-token-utility');
   assert.equal(await primary.count(),1);assert.equal(await notice.count(),1);assert.equal(await utility.count(),1);
   assert.match(await primary.innerText(),/Not yet published/);assert.match(await primary.innerText(),/888,888,888 CLIMB/);assert.match(await primary.innerText(),/Not open/);
   assert.match(await notice.innerText(),/first official public retirement announcement/);
   assert.match(await notice.innerText(),/Purchases after that announcement will not qualify/);
   assert.match(await notice.innerText(),/exact UTC publication time, finalized snapshot/);
   assert.match(await notice.innerText(),/No conversion rate or allocation is guaranteed/);
   assert.match(await notice.innerText(),/may still exist and trade independently/);
   assert.equal(await primary.locator('a[href="/whitepaper/#economy"]').count(),1);
   assert.equal(await primary.locator("#climb-v3-allocations .climb-token-fact").count(),7);
   assert.equal(await notice.locator("#climb-v3-marketing .climb-token-fact").count(),4);
   assert.equal(await page.locator('#climbOfficialCa,#copyClimbCa,#climbSupplyPanel,#climbSupplyRefresh,script[src="/climb-token-supply.js"]').count(),0);
   assert.ok(!(await page.content()).includes(MINT));assert.equal(await page.locator('a[href*="pump.fun/coin/"],a[href*="solscan.io/token/"]').count(),0);
   assert.match(await utility.innerText(),/NOT YET LIVE/);
   const desktop=page.locator('#climbCaNavLink'),mobile=page.locator('#mobileClimbCaNavLink');
   assert.equal(await desktop.getAttribute('href'),'/#climb-base-transition');assert.equal(await mobile.getAttribute('href'),'/#climb-base-transition');
   assert.match(await mobile.textContent(),/BASE/);
   if(width===1536){
    const header=await page.evaluate(()=>{const n=document.querySelector('nav'),m=n.querySelector('.navl');return {height:n.getBoundingClientRect().height,cols:getComputedStyle(m).gridTemplateColumns.split(' ').length,items:[...m.children].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width}})}});
    assert.equal(header.items.length,11);assert.equal(header.cols,11);assert.ok(header.height<90);
    for(const r of header.items)assert.ok(r.width>0&&r.left>=0&&r.right<=width+1&&Math.abs(r.top-header.items[0].top)<2);
    assert.ok(header.items.at(-1).left>header.items.at(-2).left);
   }
   if(await desktop.isVisible())await desktop.click();else{await page.locator('#hamburger').click();assert.ok(await mobile.isVisible());await mobile.click();assert.equal(await page.locator('#mobileMenu').evaluate(el=>el.classList.contains('active')),false);}
   assert.equal(new URL(page.url()).hash,'#climb-base-transition');
   await primary.scrollIntoViewIfNeeded();
   const bounds=await page.evaluate(()=>({width:document.documentElement.clientWidth,cards:['#climb-base-transition','#climb-token-record','.climb-token-utility'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}})}));
   for(const r of bounds.cards)assert.ok(r.width>100&&r.left>=-2&&r.right<=bounds.width+2,'card overflow '+width);
   if(width>=1071)assert.ok(bounds.cards[2].left>=bounds.cards[1].right-2);else assert.ok(bounds.cards[2].top>=bounds.cards[1].bottom-2);
   assert.deepEqual(supplyRequests,[],'retired supply client must not load or request data');
   await page.screenshot({path:'climb-tokenomics-'+width+'.png'});
   if([1536,390,360].includes(width)){
    assert.ok((await page.goto(base+'whitepaper/',{waitUntil:'domcontentloaded'}))?.ok());
    const planned=page.locator('[aria-labelledby="climb-base-facts-title"]'),legacy=page.locator('[aria-labelledby="climb-token-facts-title"]');
    assert.equal(await planned.count(),1);assert.equal(await legacy.count(),1);
    assert.match(await planned.innerText(),/Exclusive planned/);assert.match(await planned.innerText(),/Not yet published/);assert.match(await planned.innerText(),/Not open/);
    assert.ok(!(await planned.innerText()).includes(MINT));
    assert.equal(await legacy.locator(".token-address").count(),0);
    assert.ok(!(await page.content()).includes(MINT));
    assert.match(await legacy.innerText(),/Prior-holder notice/);assert.match(await planned.innerText(),/888,888,888 CLIMB/);
    assert.match(await legacy.innerText(),/not a supply-conserving bridge/);
    assert.equal(await page.locator("#climb-v3-allocations tbody tr").count(),7);
    assert.equal(await page.locator("#climb-v3-marketing tbody tr").count(),4);
    assert.match(await legacy.innerText(),/Purchases after that announcement will not qualify/);
    assert.equal(await legacy.locator('a[href*="solscan.io/token/"]').count(),0);assert.equal(await legacy.locator('a[href*="pump.fun"]').count(),0);
    const boxes=await page.evaluate(()=>({width:document.documentElement.clientWidth,cards:[...document.querySelectorAll('.token-record')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})}));
    assert.equal(boxes.cards.length,2);assert.ok(boxes.cards[0].bottom<=boxes.cards[1].top+1);for(const r of boxes.cards)assert.ok(r.left>=-1&&r.right<=boxes.width+1);
    await page.screenshot({path:'climb-whitepaper-'+width+'.png'});
   }
   console.log('PASS Base-exclusive CLIMB UI, legacy notice, no supply requests, navigation at '+width+'px');
  }finally{await context.close();}
 }
}finally{await browser.close();}
