import assert from "node:assert/strict";
import {chromium} from "playwright";

// Public deployed UI acceptance with a simulated EIP-1193 provider.
// Never uses a real wallet, signs, broadcasts, or calls a remote quote provider.
const origin="https://climboria.fun";
const account="0x"+"a".repeat(40);
const networks=[{id:"1",hex:"0x1",name:"Ethereum"},{id:"56",hex:"0x38",name:"BNB Chain"}];
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1365,390]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:"block"});
  const errors=[];
  try{
   page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/*",route=>{
    const req=route.request();
    return req.method()==="GET"&&new URL(req.url()).origin===origin?route.continue():route.abort();
   });
   await page.addInitScript(({account})=>{
    const events=new Map();
    window.__walletCalls=[];window.__walletChain="0x2105";
    window.__emitWalletEvent=name=>{for(const cb of [...(events.get(name)||[])])cb();};
    window.ethereum={
     on(name,cb){const s=events.get(name)||new Set();s.add(cb);events.set(name,s);},
     removeListener(name,cb){events.get(name)?.delete(cb);},
     async request({method}){
      window.__walletCalls.push(method);
      if(method==="eth_chainId")return window.__walletChain;
      if(method==="eth_requestAccounts")return [account];
      throw Error("Forbidden wallet method: "+method);
     }
    };
   },{account});
   for(const network of networks){
    const dex=await page.goto(origin+"/dex/",{waitUntil:"domcontentloaded",timeout:45000});
    assert.ok(dex?.ok(),"Public DEX HTTP failure");
    const link=page.locator(".secondary-research-links a").filter({hasText:network.name});
    assert.ok(await link.isVisible(),"Deployed DEX research link missing");
    assert.equal(await link.getAttribute("href"),"/swap/?chain=base&research="+network.id+"#secondaryEvmResearch");
    await link.click();
    await page.waitForURL(url=>url.pathname==="/swap/"&&url.searchParams.get("research")===network.id);
    const panel=page.locator("#secondaryEvmResearch"),connect=page.locator("#secondaryWalletConnect"),address=page.locator("#secondaryWalletAddress");
    // A missing control must not satisfy readiness via !undefined.
    // Keep deployment mismatch distinct from an actual wallet failure.
    await connect.waitFor({state:"visible",timeout:15000}).catch(async error=>{
     const evidence=await page.evaluate(()=>({
      url:location.href,network:document.documentElement.dataset.climboriaSwapNetwork,
      researchOpen:document.querySelector("#secondaryEvmResearch")?.open??null,
      walletControlPresent:!!document.querySelector("#secondaryWalletConnect"),
      walletModuleScripts:[...document.scripts].map(s=>s.getAttribute("src")).filter(s=>s?.includes("secondary-evm")),
      title:document.title
     }));
     throw Error("Deployed secondary wallet control unavailable: "+JSON.stringify(evidence)+"; "+error.message);
    });
    await page.waitForFunction(()=>{
     const panel=document.querySelector("#secondaryEvmResearch"),button=document.querySelector("#secondaryWalletConnect");
     return panel?.open===true&&button!==null&&button.disabled===false;
    },null,{timeout:15000});
    assert.equal(await page.locator("#secondaryEvmChain").inputValue(),network.id);
    assert.equal(await page.locator("#secondaryEvmContract").inputValue(),"");
    assert.equal(await page.locator("html").getAttribute("data-climboria-swap-network"),"base");
    assert.equal(await page.locator("#getQuote").isDisabled(),true);
    assert.equal(await page.locator("#prepareSwap").isDisabled(),true);
    assert.deepEqual(await page.evaluate(()=>window.__walletCalls),[],"No implicit wallet access");
    await connect.click();
    await page.waitForFunction(name=>document.querySelector("#secondaryWalletStatus")?.textContent.includes("Manually select "+name),network.name);
    assert.deepEqual(await page.evaluate(()=>window.__walletCalls),["eth_chainId"]);
    await page.evaluate(hex=>{window.__walletChain=hex;window.__walletCalls=[];},network.hex);
    await connect.click();
    await page.waitForFunction(account=>document.querySelector("#secondaryWalletAddress")?.textContent===account,account);
    assert.deepEqual(await page.evaluate(()=>window.__walletCalls),["eth_chainId","eth_requestAccounts","eth_chainId"]);
    await page.evaluate(()=>window.__emitWalletEvent("accountsChanged"));
    assert.equal(await address.textContent(),"");
    await connect.click();
    await page.waitForFunction(account=>document.querySelector("#secondaryWalletAddress")?.textContent===account,account);
    await panel.locator("summary").evaluate(el=>{el.click();el.click();});
    assert.equal(await address.textContent(),"","Rapid reopen must clear session");
    await page.waitForFunction(()=>document.querySelector("#secondaryWalletConnect")?.disabled===false);
    assert.equal(await address.textContent(),"");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),"Horizontal overflow");
    console.log(JSON.stringify({result:"PASS",width,chainId:network.id,source:"public deployed UI, simulated wallet only",execution:"disabled"}));
   }
   assert.deepEqual(errors,[],"Public runtime errors");
  }finally{await page.close();}
 }
}finally{await browser.close();}
