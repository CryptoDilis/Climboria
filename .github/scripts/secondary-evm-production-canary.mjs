import assert from "node:assert/strict";
import {chromium} from "playwright";
// Public browser acceptance: no simulated market response, no wallet, no write.
// Missing deployed UI or provider CORS is a real failure, not a pass.
const origin="https://climboria.fun";
const endpoint="https://api.dexscreener.com/latest/dex/tokens/";
const networks=[
 {id:"1",name:"Ethereum",slug:"ethereum",contract:"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"},
 {id:"56",name:"BNB Chain",slug:"bsc",contract:"0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"}
];
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1365,390]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:"block"});
  const requests=[],errors=[];
  await page.addInitScript(()=>{
   window.__walletCalls=[];
   window.ethereum={request:async ({method})=>{window.__walletCalls.push(method);throw Error("Wallet prohibited in read-only canary");}};
  });
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/*",route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()!=="GET")return route.abort();
   if(url.origin===origin)return route.continue();
   if(networks.some(n=>req.url()===endpoint+n.contract)){
    requests.push(req.url());return route.continue();
   }
   return route.abort();
  });
  const response=await page.goto(origin+"/swap/?chain=base",{waitUntil:"domcontentloaded",timeout:45000});
  assert.ok(response?.ok(),"Public Swap HTTP failure");
  const research=page.locator("#secondaryEvmResearch");
  await research.waitFor({state:"visible",timeout:15000});
  assert.equal(await page.locator("html").getAttribute("data-climboria-swap-network"),"base");
  assert.deepEqual(requests,[],"No secondary provider request without consent");
  await research.locator("summary").click();
  for(const network of networks){
   await page.locator("#secondaryEvmChain").selectOption(network.id);
   await page.locator("#secondaryEvmContract").fill(network.contract);
   await research.getByRole("button",{name:"Find pools"}).click();
   await page.waitForFunction(name=>document.querySelector("#secondaryEvmStatus")?.textContent.includes(name+" pool(s)"),network.name,{timeout:18000});
   const cards=research.locator("article"),count=await cards.count();
   assert.ok(count>0&&count<=8,"No bounded matching live pools");
   for(const card of await cards.all()){
    assert.ok((await card.innerText()).includes(network.name+" · Chain "+network.id+" · Contract "+network.contract));
    assert.match(await card.locator("a").getAttribute("href"),new RegExp("^https://dexscreener\\.com/"+network.slug+"/0x[0-9a-f]{40}$"));
   }
   assert.equal(await page.locator("#getQuote").isDisabled(),true);
   assert.equal(await page.locator("#prepareSwap").isDisabled(),true);
   assert.deepEqual(await page.evaluate(()=>window.__walletCalls),[]);
   console.log(JSON.stringify({result:"PASS",width,chainId:network.id,pools:count,source:"public browser live GET"}));
  }
  assert.deepEqual(requests,networks.map(n=>endpoint+n.contract));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),"Horizontal overflow");
  assert.deepEqual(errors,[],"Public browser runtime errors");
  await page.close();
 }
}finally{await browser.close();}
