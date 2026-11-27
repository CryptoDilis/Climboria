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
  const research=page.locator("#secondaryEvmResearch");
  assert.ok(await research.isVisible());
  assert.equal(await research.evaluate(e=>e.open),false);
  const researchRequests=[],pool="0x"+"c".repeat(40),other="0x"+"b".repeat(40);
  await page.route("https://api.dexscreener.com/latest/dex/tokens/"+ACCOUNT.toLowerCase(),route=>{
    researchRequests.push(route.request().method());
    return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({pairs:["base","ethereum","bsc"].map((chainId,i)=>({chainId,pairAddress:pool,baseToken:{address:ACCOUNT,symbol:"QA"},quoteToken:{address:other,symbol:"WETH"},priceUsd:String(i+1),liquidity:{usd:1000}}))})});
  });
  // Follow the DEX link without initiating a lookup or wallet session.
  await page.goto(site+"/swap/?chain=base&research=56#secondaryEvmResearch",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#secondaryEvmResearch")?.open);
  assert.equal(await page.locator("#secondaryEvmChain").inputValue(),"56");
  assert.equal(await page.locator("#secondaryEvmContract").inputValue(),"");
  assert.equal(await page.locator("html").getAttribute("data-climboria-swap-network"),"base");
  assert.equal(await page.locator("#getQuote").isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__baseWalletRequests),[]);
  assert.equal(researchRequests.length,0);
  await page.goto(mainUrl,{waitUntil:"domcontentloaded"});
  await research.waitFor({state:"visible"});
  await research.locator("summary").click();
  assert.equal(researchRequests.length,0);
  await page.locator("#secondaryEvmContract").fill(ACCOUNT);
  await research.getByRole("button",{name:"Find pools"}).click();
  await page.waitForFunction(()=>document.querySelector("#secondaryEvmStatus")?.textContent.includes("Found 1 Ethereum pool"));
  assert.equal(await research.locator("a").getAttribute("href"),"https://dexscreener.com/ethereum/"+pool);
  await page.locator("#secondaryEvmChain").selectOption("56");
  assert.equal(await page.locator("#secondaryEvmContract").inputValue(),"");
  assert.equal(await research.locator("article").count(),0);
  await page.locator("#secondaryEvmContract").fill(ACCOUNT);
  await research.getByRole("button",{name:"Find pools"}).click();
  await page.waitForFunction(()=>document.querySelector("#secondaryEvmStatus")?.textContent.includes("Found 1 BNB Chain pool"));
  assert.equal(await research.locator("a").getAttribute("href"),"https://dexscreener.com/bsc/"+pool);
  assert.deepEqual(researchRequests,["GET","GET"]);
  assert.equal(await page.locator("html").getAttribute("data-climboria-swap-network"),"base");
  assert.deepEqual(await page.evaluate(()=>window.__baseWalletRequests),[]);
  await research.locator("summary").click();

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
  assert.equal(await page.locator("#chainBase").getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator("#chainSolana").getAttribute("aria-pressed"),"false");
  // Unsupported EVM deep links must not reinterpret the same hex address as Base.
  for(const chain of ["ethereum","bsc"]){
   const url=new URL(mainUrl);
   url.searchParams.set("chain",chain);
   url.searchParams.set("contract",ACCOUNT);
   url.searchParams.set("from","foreign-chain-asset");
   url.searchParams.set("to","foreign-chain-asset");
   await page.goto(url.href,{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>new URL(location.href).searchParams.get("chain")==="base");
   assert.equal(await page.locator("#baseMarketContract").inputValue(),"");
   assert.match(await page.locator("#chainNotice").innerText(),/Requested network is not supported yet/);
   assert.ok(["contract","from","to"].every(k=>!new URL(page.url()).searchParams.has(k)));
   assert.equal(await page.locator("#getQuote").isDisabled(),true);
   assert.deepEqual(await page.evaluate(()=>window.__baseWalletRequests),[]);
  }
  assert.equal(errors.filter(s=>/base-workspace|base-wallet-session|base-price-preview/i.test(s)).length,0,
   "Base module page errors: "+JSON.stringify(errors));
  await page.close();
  console.log("PASS: "+width+"px Base Swap network, read-only EIP-1193, disabled price gate and browser history; 0 paid quotes or signatures");
 }


 // Secondary wallet: simulated EIP-1193 only; explicit clicks, no signing or writes.
 for(const width of [1365,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  try{
   await page.route("**/*",route=>new URL(route.request().url()).origin===new URL(site).origin?route.continue():route.abort());
   await page.addInitScript(()=>{
    const events=new Map();window.__walletCalls=[];window.__walletChain="0x2105";
    window.__emitWalletEvent=name=>{for(const fn of [...(events.get(name)||[])])fn();};
    window.ethereum={on(name,fn){const s=events.get(name)||new Set();s.add(fn);events.set(name,s);},removeListener(name,fn){events.get(name)?.delete(fn);},async request({method}){window.__walletCalls.push(method);if(method==="eth_chainId")return window.__walletChain;if(method==="eth_requestAccounts")return ["0x"+"a".repeat(40)];throw Error("Forbidden wallet method");}};
   });
   await page.goto(site+"/swap/?chain=base",{waitUntil:"domcontentloaded"});
   const research=page.locator("#secondaryEvmResearch"),connect=page.locator("#secondaryWalletConnect"),address=page.locator("#secondaryWalletAddress");
   await research.waitFor({state:"visible"});await research.locator("summary").click();
   await page.waitForFunction(()=>!document.getElementById("secondaryWalletConnect").disabled);
   assert.deepEqual(await page.evaluate(()=>window.__walletCalls),[]);
   await connect.click();
   await page.waitForFunction(()=>document.querySelector("#secondaryWalletStatus")?.textContent.includes("Manually select Ethereum"));
   assert.deepEqual(await page.evaluate(()=>window.__walletCalls),["eth_chainId"]);
   await page.evaluate(()=>{window.__walletChain="0x1";window.__walletCalls=[];});
   await connect.click();await page.waitForFunction(()=>document.querySelector("#secondaryWalletAddress")?.textContent==="0x"+"a".repeat(40));
   assert.deepEqual(await page.evaluate(()=>window.__walletCalls),["eth_chainId","eth_requestAccounts","eth_chainId"]);
   await page.evaluate(()=>window.__emitWalletEvent("accountsChanged"));assert.equal(await address.textContent(),"");
   await page.locator("#secondaryEvmChain").selectOption("56");
   await page.evaluate(()=>{window.__walletChain="0x38";window.__walletCalls=[];});
   await connect.click();await page.waitForFunction(()=>document.querySelector("#secondaryWalletAddress")?.textContent==="0x"+"a".repeat(40));
   assert.deepEqual(await page.evaluate(()=>window.__walletCalls),["eth_chainId","eth_requestAccounts","eth_chainId"]);
   await research.locator("summary").click();await page.waitForFunction(()=>document.getElementById("secondaryWalletConnect").disabled);
   assert.equal(await address.textContent(),"");
   await research.locator("summary").click();await page.waitForFunction(()=>!document.getElementById("secondaryWalletConnect").disabled);
   assert.equal(await address.textContent(),"");
   await connect.click();await page.waitForFunction(()=>document.querySelector("#secondaryWalletAddress")?.textContent==="0x"+"a".repeat(40));
   await page.locator("#chainSolana").click();assert.equal(await address.textContent(),"");
   assert.ok(await research.isHidden());
   console.log("PASS secondary EVM read-only wallet lifecycle at "+width+"px");
  }finally{await page.close();}
 }

 // Independent DEX/Swap notification UI regression, with external services blocked.
 // Only local document interactions; no provider calls or wallet access.
 for(const path of ["/dex/","/swap/"]){
  for(const width of [1365,390,360,320]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   try{
    await page.route("**/*",route=>new URL(route.request().url()).origin===new URL(site).origin?route.continue():route.abort());
    await page.goto(site+path,{waitUntil:"domcontentloaded",timeout:45000});
    const bell=page.locator('.top [data-panel="notifications"]'),x=page.locator('.top .dex-social-x');
    const panel=page.locator('#climboriaPanelBackdrop'),close=page.locator('#climboriaPanelClose');
    const context=path+" "+width+"px";
    assert.equal(await bell.count(),1,context);assert.equal(await x.count(),1,context);
    assert.equal(await page.locator('.top [data-panel="announcements"]').count(),0,context);
    assert.equal(await x.getAttribute('href'),'https://x.com/ClimboriaHQ');
    for(const item of [bell,x]){
     assert.ok(await item.isVisible(),context+" control hidden");
     const rect=await item.boundingBox();
     assert.ok(rect&&rect.width>=29&&rect.x>=-1&&rect.x+rect.width<=width+1,context+" control outside viewport: "+JSON.stringify(rect));
    }
    if(path==="/dex/"){
     const researchLinks=page.locator(".secondary-research-links a");
     assert.equal(await researchLinks.count(),2);
     for(const [i,chain] of ["1","56"].entries()){
      const link=researchLinks.nth(i);
      assert.ok(await link.isVisible(),context+" research link hidden");
      assert.equal(await link.getAttribute("href"),"/swap/?chain=base&research="+chain+"#secondaryEvmResearch");
     }
     assert.match(await page.title(),/Base Markets/);
     assert.equal(await page.locator('.hero #heroMarket').count(),0);
     assert.ok(await page.locator('.base-primary-hero').isVisible());
     if(width<=760){
      assert.equal(await page.locator('.base-secondary-tools').isVisible(),false);
      await page.locator('#dexMobileNav [data-dex-mobile-view="solana"]').click();
      assert.ok(await page.locator('.base-secondary-tools').isVisible());
      await page.locator('#dexMobileNav [data-dex-mobile-view="base"]').click();
     }else{
      const base=await page.locator('#evmMarkets').boundingBox(),secondary=await page.locator('#secondaryNetwork').boundingBox();
      assert.ok(base&&secondary&&base.y+base.height<=secondary.y+1,context+" Base must precede all Solana highlights");
     }
    }else{
     assert.equal(await page.locator('html').getAttribute('data-climboria-swap-network'),'base');
     assert.ok(await page.locator('.card .base-swap-identity').isVisible());
     assert.equal(await page.locator('.card > .quote-controls').isVisible(),false);
     assert.equal(await page.locator('#getQuote').isDisabled(),true);
     assert.equal(await page.locator("#chainBase").getAttribute("aria-pressed"),"true");
     assert.equal(await page.locator("#chainSolana").getAttribute("aria-pressed"),"false");
     const roadmap=page.locator(".network-roadmap");
     assert.equal(await roadmap.locator("button,a,select,input").count(),0);
     assert.match(await roadmap.textContent(),/Ethereum.*Market research.*BNB Chain.*Market research/s);
     if(width<=760)await page.locator(".mobile-routing-details summary").click();
     assert.ok(await roadmap.isVisible(),context+" secondary network capabilities not accessible");
     if(width<=760)await page.locator(".mobile-routing-details summary").click();

     if(width<=760){
      await page.locator('#mobileWorkspaceTabs [data-workspace-tab="market"]').click();
      assert.ok(await page.locator('#baseMarketPanel').isVisible(),context+" Base Markets tab must display actual Base explorer");
      await page.locator('#mobileWorkspaceTabs [data-workspace-tab="swap"]').click();
     }
    }
    assert.equal(await panel.isVisible(),false,context);
    await bell.click();
    assert.ok(await panel.isVisible(),context);
    assert.equal(await bell.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#climboriaPanelContent h3').count(),2);
    assert.ok(await page.locator('#climboriaPanelContent a[href="/#climb-base-transition"]').isVisible());
    assert.match(await panel.innerText(),/when notification services are enabled/);
    assert.ok(await close.evaluate(e=>document.activeElement===e));
    await page.keyboard.press('Shift+Tab');
    assert.ok(await panel.locator('a').last().evaluate(e=>document.activeElement===e));
    await page.keyboard.press('Tab');
    assert.ok(await close.evaluate(e=>document.activeElement===e));
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(),false);
    assert.equal(await bell.getAttribute('aria-expanded'),'false');
    assert.ok(await bell.evaluate(e=>document.activeElement===e));
    await bell.click();await close.click();
    assert.equal(await panel.isVisible(),false);
    console.log("PASS unified notification, official X, bounds and keyboard: "+context);
   }finally{await page.close();}
  }
 }
}finally{await browser.close();}
