import assert from "node:assert/strict";
import {chromium} from "playwright";
// Exercise deployed UI, but intercept ALL Base pricing host traffic.
// No live 0x requests or wallet permissions are consumed by this test.
const origin="https://climboria.fun",host="https://base-price.climboria.fun";
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",weth="0x4200000000000000000000000000000000000006";
const health={service:"climboria-base-price-preview",deployedGitSha:"a".repeat(40),pricingDisabled:false,publicPricingReady:true,bindingsReady:true,execution:"unsupported"};
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,serviceWorkers:"block"});
  const page=await context.newPage();
  const calls=[],violations=[];let ready=false;
  await context.route(host+"/**",async route=>{
   const req=route.request(),url=new URL(req.url());
   calls.push(url.pathname);
   const fulfill=(status,json)=>route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":origin,"cache-control":"no-store"},body:JSON.stringify(json)});
   if(req.method()!=="GET"){violations.push(req.method());return route.abort();}
   if(url.pathname==="/health"&&!url.search)return fulfill(ready?200:503,ready?health:{...health,pricingDisabled:true,publicPricingReady:false});
   if(url.pathname!=="/v1/base/indicative-price"){violations.push(url.pathname);return route.abort();}
   if(!ready){violations.push("price while disabled");return route.abort();}
   const q=Object.fromEntries(url.searchParams),buy=q.sellToken===usdc;
   const expected={chainId:"8453",sellToken:buy?usdc:weth,buyToken:buy?weth:usdc,sellAmount:buy?"100000":"100000000000000"};
   try{assert.deepEqual(q,expected);assert.equal([...url.searchParams].length,4);}catch{violations.push("unexpected price intent");return route.abort();}
   return fulfill(200,{provider:"0x",chainId:8453,indicativeOnly:true,executable:false,sellToken:q.sellToken,buyToken:q.buyToken,requestedSellAmount:q.sellAmount,reportedSellAmount:q.sellAmount,estimatedBuyAmount:buy?"59780853777889":"166752",providerMinBuyAmount:buy?"59183045240110":"165084",fees:{zeroExFee:{amount:buy?"150":"251",token:usdc},integratorFee:null,gasFee:null},reportedNetworkFee:buy?"2273321509221":"2096815560248"});
  });
  try{
   await page.goto(origin+"/dex/",{waitUntil:"domcontentloaded",timeout:45000});
   if(viewport.width<760)await page.locator('[data-dex-mobile-view="base"]').first().click();
   const check=page.locator("#basePriceAvailability"),submit=page.locator("#basePriceSubmit"),amount=page.locator("#basePriceAmount"),status=page.locator("#basePriceStatus"),result=page.locator("#basePriceResult");
   await check.waitFor({state:"visible",timeout:15000});
   assert.equal(await submit.isDisabled(),true);assert.deepEqual(calls,[]);
   await check.click();
   await page.waitForFunction(()=>document.querySelector("#basePriceStatus")?.textContent.includes("not currently available"));
   assert.equal(await submit.isDisabled(),true);assert.deepEqual(calls,["/health"]);
   ready=true;await check.click();
   await page.waitForFunction(()=>!document.querySelector("#basePriceSubmit")?.disabled);
   await amount.fill("0.1");await submit.click();
   await page.waitForFunction(()=>document.querySelector("#basePriceResult")?.textContent.includes("0.000059780853777889 WETH"));
   assert.match(await result.innerText(),/Provider fee: 0.00015 USDC/);
   assert.deepEqual(calls,["/health","/health","/health","/v1/base/indicative-price"]);
   await page.locator("#basePriceDirection").selectOption("sell");
   assert.equal(await result.innerText(),"");
   await amount.fill("0.0001");await submit.click();
   await page.waitForFunction(()=>document.querySelector("#basePriceResult")?.textContent.includes("0.166752 USDC"));
   assert.match(await result.innerText(),/Provider fee: 0.000251 USDC/);
   ready=false;await submit.click();
   await page.waitForFunction(()=>document.querySelector("#basePriceStatus")?.textContent.includes("No price request was sent"));
   assert.equal(await submit.isDisabled(),true);assert.equal(await result.innerText(),"");
   assert.deepEqual(calls,["/health","/health","/health","/v1/base/indicative-price","/health","/v1/base/indicative-price","/health"]);
   assert.deepEqual(violations,[]);
   console.log("PASS",viewport.width,"deployed public Base preview UI: disabled, ready, buy, sell, expired; zero live provider calls");
  }finally{await context.close();}
 }
}finally{await browser.close();}
