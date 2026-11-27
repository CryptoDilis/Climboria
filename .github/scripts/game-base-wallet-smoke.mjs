import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Actual browser DOM with synthetic wallet only. No live wallet, sign-in or transaction.
const site='http://127.0.0.1:4173';
const address='0x'+'1'.repeat(40);
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1365,390,360]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({address})=>{
   window.__requests=[];window.__chain='0x2105';window.__events=new Map();
   window.ethereum={
    request:async({method})=>{
     window.__requests.push(method);
     if(method==='eth_chainId')return window.__chain;
     if(method==='eth_requestAccounts')return [address];
     throw Error('Unexpected wallet method: '+method);
    },
    on:(e,f)=>{const s=window.__events.get(e)||new Set();s.add(f);window.__events.set(e,s)},
    removeListener:(e,f)=>window.__events.get(e)?.delete(f)
   };
  },{address});
  await page.goto(site+'/game/wallet/',{waitUntil:'networkidle'});
  const connect=page.locator('#baseWalletConnect'),clear=page.locator('#baseWalletDisconnect'),status=page.locator('#baseWalletStatus'),account=page.locator('#baseWalletAddress');
  assert.deepEqual(await page.evaluate(()=>window.__requests),[]);
  assert.ok(await clear.isDisabled());
  assert.match(await page.locator('main').innerText(),/does not verify wallet ownership or permanently link/);
  assert.match(await page.locator('main').innerText(),/Playing Jarrell’s Peak does not require a wallet or gas/);
  const before=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
  await page.evaluate(()=>{window.__chain='0x1'});
  await connect.click();
  await page.waitForFunction(()=>document.getElementById('baseWalletStatus').textContent.includes('Switch your wallet'));
  assert.deepEqual(await page.evaluate(()=>window.__requests),['eth_chainId']);
  assert.equal(await account.innerText(),'');
  await page.evaluate(()=>{window.__chain='0x2105'});
  await connect.click();
  await page.waitForFunction(a=>document.getElementById('baseWalletAddress').textContent===a,address);
  assert.match(await status.innerText(),/read-only/);
  assert.deepEqual(await page.evaluate(()=>window.__requests),['eth_chainId','eth_chainId','eth_requestAccounts','eth_chainId']);
  const bounds=await account.boundingBox();
  assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.evaluate(()=>{for(const f of [...(window.__events.get('accountsChanged')||[])])f([])});
  assert.equal(await account.innerText(),'');
  assert.ok(await connect.isEnabled());
  await connect.click();
  await page.waitForFunction(a=>document.getElementById('baseWalletAddress').textContent===a,address);
  await clear.click();
  assert.equal(await account.innerText(),'');
  await connect.click();
  await page.waitForFunction(a=>document.getElementById('baseWalletAddress').textContent===a,address);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  assert.equal(await account.innerText(),'');
  assert.deepEqual(await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),before);
  assert.ok((await page.evaluate(()=>window.__requests)).every(m=>['eth_chainId','eth_requestAccounts'].includes(m)));
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('PASS optional Base game wallet at '+width+'px: no automatic access, wrong chain rejected, cleared on account change and navigation, no sign-in or signing');
 }
 const page=await browser.newPage();
 await page.goto(site+'/game/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('a[href="/game/wallet/"]').count(),1);
 assert.equal(await page.locator('#playGuestButton').count(),1);
 assert.equal(await page.locator('#openHeroCreator').count(),1);
 await page.close();
}finally{await browser.close()}
