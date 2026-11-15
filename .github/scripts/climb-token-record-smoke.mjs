// Browser-only regression for the permanent $CLIMB record (not a trading/live-market check).
// Run with a local Climboria static server on port 4173 after Playwright Chromium is installed.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const MINT='9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump';
const base='http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1365,390,360]){
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1});
  const page=await context.newPage();
  try{
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
   for(const url of ['https://pump.fun/coin/'+MINT,'https://solscan.io/token/'+MINT]){
    const link=record.locator('a[href="'+url+'"]');
    assert.equal(await link.count(),1,'external link must use identical owner-announced mint');
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.match(await link.getAttribute('rel'),/noopener/);
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
   await record.scrollIntoViewIfNeeded();
   await page.screenshot({path:'climb-tokenomics-'+width+'.png'});
   console.log('PASS permanent CLIMB Tokenomics layout, copy, links and CTA hierarchy at '+width+'px');
  }finally{await context.close()}
 }
}finally{await browser.close()}
