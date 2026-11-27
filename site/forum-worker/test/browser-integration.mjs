import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlatformProxy } from 'wrangler';
import { Wallet, getBytes } from 'ethers';
import { chromium } from 'playwright';
import worker from '../index.mjs';
const origin='https://climboria.fun',api='https://forum.climboria.fun';
const platform=await getPlatformProxy({configPath:'wrangler.toml',persist:false});
let browser;
try{
 const db=platform.env.DB;
 for(const file of ['0001_forum.sql','0002_moderation.sql']){
  const sql=await readFile(new URL('../migrations/'+file,import.meta.url),'utf8');
  for(const stmt of (file.startsWith('0001')?sql.split(';'):sql.split('\n')).map(x=>x.trim()).filter(Boolean))await db.prepare(stmt).run();
 }
 const env={DB:db,FORUM_ORIGIN:origin,FORUM_ENABLED:'true'};
 const staticFiles={'/governance/':['index.html','text/html'],'/governance/forum.css':['forum.css','text/css'],'/governance/forum.mjs':['forum.mjs','text/javascript']};
 browser=await chromium.launch({headless:true});
 async function member(wallet,width){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.exposeBinding('signFixture',async(_,hex)=>wallet.signMessage(getBytes(hex)));
  await page.addInitScript(({address})=>{
   const events=new Map();
   window.ethereum={
    on(event,fn){if(!events.has(event))events.set(event,new Set());events.get(event).add(fn);},
    removeListener(event,fn){events.get(event)?.delete(fn);},
    async request({method,params}){
     if(method==='eth_chainId')return '0x2105';
     if(method==='eth_accounts'||method==='eth_requestAccounts')return [address];
     if(method==='personal_sign'){if(params[1]!==address.toLowerCase())throw Error('address mismatch');return window.signFixture(params[0]);}
     throw Error('unexpected wallet method '+method);
    }
   };
   window.changeFixtureWallet=()=>{for(const f of events.get('accountsChanged')||[])f([]);};
  },{address:wallet.address});
  await context.route(origin+'/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/governance/forum-release.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({enabled:true,status:'LOCAL_TEST_ONLY'})});
   const file=staticFiles[path];if(!file)return route.fulfill({status:404,body:''});
   const bytes=await readFile(new URL('../../../governance/'+file[0],import.meta.url));
   return route.fulfill({contentType:file[1],body:bytes});
  });
  await context.route(api+'/**',async route=>{
   const q=route.request(),headers=await q.allHeaders();
   // Browser interception exercises the real Worker handler and D1; not a live
   // Cloudflare deployment or an independent wallet extension certification.
   const res=await worker.fetch(new Request(q.url(),{method:q.method(),headers,body:q.postDataBuffer()??undefined}),env);
   return route.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())});
  });
  await page.goto(origin+'/governance/');
  await page.locator('#forum-feed').waitFor({state:'visible'});
  assert.equal(await page.locator('#new-topic').isDisabled(),true);
  return {context,page,errors};
 }
 const a=await member(Wallet.createRandom(),1536),b=await member(Wallet.createRandom(),390);
 const sign=async p=>{await p.locator('#forum-wallet').click();await p.locator('#forum-status').filter({hasText:'Signed in with'}).waitFor();};
 await sign(a.page);
 await a.page.locator('#new-topic').click();
 await a.page.locator('#topic-title').fill('Browser lifecycle');
 await a.page.locator('#topic-body').fill('<img src=x onerror=alert(1)> plain text');
 await a.page.getByRole('button',{name:'Publish topic'}).click();
 await a.page.getByRole('heading',{name:'Browser lifecycle'}).waitFor();
 assert.equal(await a.page.locator('#topic-list img').count(),0);
 await b.page.reload();await b.page.getByRole('heading',{name:'Browser lifecycle'}).waitFor();
 await b.page.getByRole('button',{name:'Read replies'}).click();
 assert.equal(await b.page.getByRole('button',{name:'Post reply'}).isDisabled(),true);
 await sign(b.page);
 await b.page.getByLabel('Write a reply').fill('Verified second wallet');
 await b.page.getByRole('button',{name:'Post reply'}).click();
 await b.page.getByText('Verified second wallet',{exact:true}).waitFor();
 await b.page.getByRole('button',{name:'Like',exact:true}).click();await b.page.getByText('Likes: 1',{exact:true}).waitFor();
 await b.page.getByRole('button',{name:'Read replies'}).click();
 await b.page.getByLabel('Report reason').fill('test report');
 await b.page.getByRole('button',{name:'Report topic'}).click();
 await b.page.locator('#forum-status').filter({hasText:'Report received.'}).waitFor();
 await b.page.evaluate(()=>window.changeFixtureWallet());
 assert.equal(await b.page.locator('#new-topic').isDisabled(),true);
 await a.page.locator('#forum-logout').click();assert.equal(await a.page.locator('#new-topic').isDisabled(),true);
 assert.ok(await b.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual([...a.errors,...b.errors],[]);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM topics').first()).n,1);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM replies').first()).n,1);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM reactions').first()).n,1);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM reports').first()).n,1);
 console.log('PASS actual local D1 + Chromium two-wallet discussion lifecycle, plain text, logout/account change, mobile width');
}finally{await browser?.close();await platform.dispose();}
