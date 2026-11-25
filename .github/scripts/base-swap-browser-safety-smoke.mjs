import assert from "node:assert/strict";
import {chromium} from "playwright";

/**
 * Real Chromium DOM smoke for the published Base Swap workspace. Mocked EIP-1193
 * wallet + unavailable pricing service ONLY; no real user account, provider
 * credentials, quote requests, approvals, signatures or transactions.
 */
const site=process.env.CLIMBORIA_BROWSER_BASE_URL||"http://127.0.0.1:4173";
const mainUrl=site+"/swap/?chain=base";
const ACCOUNT="0x"+"1".repeat(40);

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const width of [1365,390]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
  const errors=[],providerRequests=[],pricingRequests=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.addInitScript(({account})=>{
   const callbacks=new Map();
   window.__baseWalletRequests=[];
   window.__baseWalletEvents=callbacks;
   window.ethereum={
    request:async({method})=>{
     window.__baseWalletRequests.push(method);
     if(method==="eth_chainId")return "0x2105";
     if(method==="eth_requestAccounts")return [account];
     throw Error("Unexpected wallet request: "+method);
    },
    on:(event,fn)=>{const s=callbacks.get(event)||new Set();s.add(fn);callbacks.set(event,s);},
    removeListener:(event,fn)=>callbacks.get(event)?.delete(fn)
   };
  },{account:ACCOUNT});
  await page.route("https://base-price.climboria.fun/**",async route=>{
   pricingRequests.push({url:route.request().url(),method:route.request().method()});
   // Exactly the disabled public health check is permitted, never a provider price.
   assert.equal(new URL(route.request().url()).pathname,"/health",
    "No Base indicative price request may occur while public service disabled");
   await route.fulfill({status:503,contentType:"application/json",
    headers:{"access-control-allow-origin":"*","cache-control":"no-store"},
    body:JSON.stringify({service:"climboria-base-price-preview",pricingDisabled:true,publicPricingReady:false,execution:"unsupported"})});
  });
  await page.goto(mainUrl,{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>document.documentElement.dataset.climboriaSwapNetwork==="base"&&
    !document.getElementById("baseSwapWorkspace")?.hidden,{timeout:12000});
  assert.equal(await page.locator("#baseSwapWorkspace").isVisible(),true);
  assert.equal(await page.locator("#baseMarketPanel").isVisible(),true);
  assert.equal(await page.locator("#getQuote").isDisabled(),true);
  assert.equal(await page.locator("#prepareSwap").isDisabled(),true);
  assert.equal(await page.locator("#connectWallet").isDisabled(),true);
  assert.equal(await page.locator("#basePriceSubmit").isDisabled(),true);
  assert.equal(await page.locator("#swapExternalBaseHandoff").isVisible(),true);
  assert.equal(await page.locator("#swapExternalJupiterHandoff").isVisible(),false);
  const a=page.locator("#swapExternalBaseHandoff a");
  assert.equal(await a.getAttribute("href"),"https://app.uniswap.org/swap");
  assert.equal(await a.getAttribute("referrerpolicy"),"no-referrer");
  assert.equal(await page.evaluate(()=>window.__baseWalletRequests.length),0,
   "No wallet access before explicit Base connect");
  await page.locator("#basePriceAmount").fill("0.1");
  await page.locator("#basePriceAvailability").click();
  await page.waitForFunction(()=>/not currently available/i.test(document.getElementById("basePriceStatus")?.textContent||""),null,{timeout:9000});
  assert.equal(await page.locator("#basePriceSubmit").isDisabled(),true);
  assert.ok(pricingRequests.length>=1);
  assert.ok(pricingRequests.every(x=>x.url==="https://base-price.climboria.fun/health"&&x.method==="GET"));
  assert.equal(await page.locator("#basePriceResult > *").count(),0);
  await page.locator("#baseWalletConnect").click();
  await page.waitForFunction(account=>document.getElementById("baseWalletAddress")?.textContent?.toLowerCase()===account.toLowerCase(),ACCOUNT,{timeout:9000});
  assert.deepEqual(await page.evaluate(()=>window.__baseWalletRequests),["eth_chainId","eth_requestAccounts","eth_chainId"]);
  assert.match(await page.locator("#baseWalletStatus").innerText(),/read-only/);
  await page.locator("#chainSolana").click();
  await page.waitForFunction(()=>document.documentElement.dataset.climboriaSwapNetwork==="solana"&&
    document.getElementById("baseSwapWorkspace")?.hidden,null,{timeout:9000});
  assert.equal(await page.locator("#baseSwapWorkspace").isVisible(),false);
  assert.equal(await page.locator("#basePriceAmount").inputValue(),"");
  assert.equal(await page.locator("#baseWalletAddress").innerText(),"");
  assert.equal(await page.locator("#swapExternalBaseHandoff").isVisible(),false);
  assert.equal(await page.locator("#swapExternalJupiterHandoff").isVisible(),true);
  assert.equal(await page.locator("#getQuote").isEnabled(),true);
  assert.equal(await page.locator("#connectWallet").isEnabled(),true);
  await page.goBack({waitUntil:"domcontentloaded",timeout:15000});
  await page.waitForFunction(()=>document.documentElement.dataset.climboriaSwapNetwork==="base"&&
    !document.getElementById("baseSwapWorkspace")?.hidden,null,{timeout:12000});
  assert.equal(await page.locator("#baseWalletAddress").innerText(),"",
   "Back/forward must not resurrect a stale Base wallet session");
  assert.equal(await page.locator("#basePriceSubmit").isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__baseWalletRequests),["eth_chainId","eth_requestAccounts","eth_chainId"],
   "No EVM signing/approval/account prompts after chain toggles or browser history");
  assert.equal(errors.filter(s=>/base-workspace|base-wallet-session|base-price-preview/i.test(s)).length,0,
   "Base module page errors: "+JSON.stringify(errors));
  await page.close();
  console.log("PASS: "+width+"px Base Swap network, read-only EIP-1193, disabled price gate and browser history; 0 paid quotes or signatures");
 }
}finally{await browser.close();}
