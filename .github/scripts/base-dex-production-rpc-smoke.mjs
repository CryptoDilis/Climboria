import assert from "node:assert/strict";
import { chromium } from "playwright";

// Known Base USDC contract fixture, not a claim about the project's CLIMB token.
const contract="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const allowed=new Set(["eth_chainId","eth_blockNumber","eth_getCode","eth_call"]);
const selectors=new Set(["0x06fdde03","0x95d89b41","0x313ce567"]);
const browser=await chromium.launch({headless:true});
try {
 for(const viewport of [{width:1365,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const requests=[],violations=[],responses=[];
  await page.route("https://mainnet.base.org/**",async route=>{
   const request=route.request();
   if(request.method()==="OPTIONS") return route.continue();
   let body;try{body=request.postDataJSON();}catch{}
   const valid=request.method()==="POST"&&body?.jsonrpc==="2.0"&&allowed.has(body.method)&&Array.isArray(body.params)&&
    (body.method!=="eth_getCode"||body.params[0]===contract)&&
    (body.method!=="eth_call"||(body.params[0]?.to===contract&&selectors.has(body.params[0]?.data)));
   if(!valid){violations.push(body?.method||request.method());return route.abort();}
   requests.push(body);
   return route.continue();
  });
  page.on("response",response=>{if(response.url().startsWith("https://mainnet.base.org/"))responses.push(response.status());});
  await page.goto("https://climboria.fun/dex/",{waitUntil:"domcontentloaded",timeout:45000});
  if(viewport.width<760) await page.locator('[data-dex-mobile-view="base"]').first().click();
  const form=page.locator("#baseMetadataForm"),input=page.locator("#baseMetadataContract"),status=page.locator("#baseMetadataStatus"),result=page.locator("#baseMetadataResult");
  await form.waitFor({state:"visible",timeout:15000});
  assert.equal(requests.length,0,"RPC must not auto-query");
  await input.fill("USDC");
  await form.locator('button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector("#baseMetadataStatus")?.textContent.includes("valid nonzero"));
  assert.equal(requests.length,0,"invalid contract must not query");
  await input.fill(contract);
  await form.locator('button[type="submit"]').click();
  try{
   await page.waitForFunction(()=>{const s=document.querySelector("#baseMetadataStatus")?.textContent||"";return s.includes("Read-only RPC observation")||s.includes("lookup failed");},null,{timeout:20000});
   const observation=await result.innerText();
   assert.match(await status.innerText(),/Read-only RPC observation/);
   assert.match(observation,/Contract bytecode: Present/);
   assert.match(observation,/Symbol: USDC/);
   assert.match(observation,/Decimals: 6/);
   assert.match(observation,/Observed block: [0-9]+/);
   assert.equal(await result.locator("a").getAttribute("href"),"https://basescan.org/address/"+contract);
   assert.deepEqual(requests.map(x=>x.method).sort(),["eth_blockNumber","eth_call","eth_call","eth_call","eth_chainId","eth_getCode"].sort());
   const block=requests.find(x=>x.method==="eth_getCode").params[1];
   assert.ok(requests.filter(x=>x.method==="eth_call").every(x=>x.params[1]===block));
   assert.deepEqual(violations,[]);
   console.log("PASS",viewport.width,"Base USDC read-only contract observation",block,"RPC status",responses);
   await input.fill("");
   assert.equal(await result.innerText(),"","editing clears stale observation");
  }catch(error){
   console.error("Base RPC browser diagnostic",JSON.stringify({viewport,status:await status.innerText(),methods:requests.map(x=>x.method),responses,violations}));
   throw error;
  }finally{await context.close();}
 }
}finally{await browser.close();}
