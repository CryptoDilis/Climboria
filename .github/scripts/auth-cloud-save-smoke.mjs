import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const authPage = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const pageErrors = [];
  authPage.on("pageerror", error => pageErrors.push(error.message));
  await authPage.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0", route => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `window.supabase={createClient:()=>({auth:{
      onAuthStateChange(callback){window.__authCallback=callback;return {data:{subscription:{unsubscribe(){}}}};},
      getSession(){return Promise.resolve({data:{session:null},error:null});},
      signInWithOAuth({provider}){window.__oauthProvider=provider;return Promise.resolve({data:{url:"https://auth.example"},error:null});},
      signInWithPassword(){return Promise.resolve({data:{session:null},error:{message:"invalid login credentials"}});},
      signUp(){return Promise.resolve({data:{session:null},error:null});},
      signOut(){return Promise.resolve({error:null});},
      signInWithWeb3(){return Promise.resolve({data:{session:{user:{id:"wallet-user"}}},error:null});}
    }})};`
  }));
  await authPage.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  const desktopAuth = authPage.locator('.navl [data-open-auth]');
  if (await desktopAuth.isVisible()) {
    await desktopAuth.click();
  } else {
    await authPage.locator('#hamburger').click();
    await authPage.locator('#mobileMenu [data-open-auth]').click();
  }
  await authPage.locator("#authEmailForm").waitFor({ state: "visible" });
  for (const selector of ["#authSolana", "#authEthereum", "#authGoogle", "#authX", "#authEmail", "#authPassword", "#authSignIn", "#authSignUp", "#authSignOut"]) {
    if (selector === "#authSignOut") continue;
    assert.equal(await authPage.locator(selector).count(), 1, "missing auth control " + selector);
  }
  assert.equal(await authPage.locator("#authGuest").isDisabled(), true, "guest login must remain disabled until CAPTCHA is configured");
  await authPage.locator("#authX").click();
  await authPage.waitForFunction(() => window.__oauthProvider === "x");
  assert.deepEqual(pageErrors, [], "auth UI should not raise browser exceptions");
  await authPage.close();

  // Mock Supabase only. Browser regression: an existing email session must
  // retain its Supabase UID during Google/X linking and wallet connections.
  async function identityFixture() {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__walletSignals={connect:0,signMessage:0,ethereumConnect:0};
      const key={toBase58:()=>"9xQeWvG816bUx9EPjHmaT23yvVM5d4X3q9hYkZ8f9xQe"};
      const signer={
        publicKey:key,
        connect(){window.__walletSignals.connect++;return Promise.resolve({publicKey:key});},
        signMessage(){window.__walletSignals.signMessage++;return Promise.resolve(new Uint8Array(64));}
      };
      // The Phantom wrapper lacks signMessage; the nested provider supports it.
      window.phantom={solana:signer};
      window.ethereum={request({method}){
        if(method!=="eth_requestAccounts")throw new Error("unexpected method "+method);
        window.__walletSignals.ethereumConnect++;
        return Promise.resolve(["0x1234567890123456789012345678901234567890"]);
      }};
    });
    await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0",route=>
      route.fulfill({status:200,contentType:"application/javascript",body:`
(() => {
  let session=null;
  let callback=null;
  window.__authCalls=[];
  window.supabase={createClient:()=>({auth:{
    onAuthStateChange(cb){callback=cb;return {data:{subscription:{unsubscribe(){}}}};},
    getSession(){return Promise.resolve({data:{session},error:null});},
    getUser(){window.__authCalls.push({method:"getUser"});return Promise.resolve({data:{user:session?.user||null},error:null});},
    signInWithPassword({email}){
      window.__authCalls.push({method:"signInWithPassword",email});
      session={user:{id:"email-owner",email,identities:[{provider:"email"}]}};
      callback?.("SIGNED_IN",session);
      return Promise.resolve({data:{session},error:null});
    },
    signInWithOAuth({provider}){window.__authCalls.push({method:"signInWithOAuth",provider});return Promise.resolve({data:{url:"https://example.test/oauth"},error:null});},
    linkIdentity({provider,options}){
      window.__authCalls.push({method:"linkIdentity",provider,redirectTo:options?.redirectTo,uid:session?.user?.id});
      return Promise.resolve({data:{url:"https://example.test/link"},error:null});
    },
    signInWithWeb3({chain,wallet}){
      window.__authCalls.push({method:"signInWithWeb3",chain,
        isActualProvider:wallet===window.phantom?.solana,
        compatible:typeof wallet?.signMessage==="function"&&typeof wallet?.publicKey?.toBase58==="function"});
      session={user:{id:"wallet-owner",identities:[{provider:chain,identity_data:{address:"Wallet"}}]}};
      callback?.("SIGNED_IN",session);
      return Promise.resolve({data:{session},error:null});
    },
    signUp(){return Promise.resolve({data:{session:null},error:null});},
    signOut(){window.__authCalls.push({method:"signOut"});session=null;callback?.("SIGNED_OUT",null);return Promise.resolve({error:null});}
  }})};
})();
`}));
    await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
    await page.evaluate(() => document.querySelector("[data-open-auth]")?.click());
    await page.locator("#authEmail").waitFor({state:"visible",timeout:10000});
    return {page,errors};
  }

  async function signIntoEmail(page) {
    await page.locator("#authEmail").fill("email-owner@example.test");
    await page.locator("#authPassword").fill("secure-test-password");
    await page.locator("#authSignIn").click();
    await page.waitForFunction(()=>window.__authCalls.some(c=>c.method==="signInWithPassword"));
    assert.equal(await page.locator("#authEmailSection").isHidden(),true);
    assert.equal(await page.locator("#authConnections").isHidden(),false);
    assert.match(await page.locator("#authStatus").innerText(),/Signed in as email-owner/);
    assert.deepEqual(await page.evaluate(()=>window.__authCalls.filter(c=>c.method==="signInWithWeb3")),[],
      "Email login never invokes wallet-signing flow");
  }

  for (const provider of ["google","x"]) {
    const {page,errors}=await identityFixture();
    try {
      await signIntoEmail(page);
      const btn=page.locator(provider==="google"?"#authGoogle":"#authX");
      assert.match(await btn.textContent(),/Link/);
      await btn.click();
      await page.waitForFunction(p=>window.__authCalls.some(c=>c.method==="linkIdentity"&&c.provider===p),provider);
      const calls=await page.evaluate(()=>window.__authCalls);
      assert.deepEqual(calls.filter(c=>c.method==="signInWithOAuth"||c.method==="signInWithWeb3"),[]);
      assert.ok(calls.some(c=>c.method==="getUser"),"Link must verify active user");
      assert.equal(calls.find(c=>c.method==="linkIdentity").uid,"email-owner");
      assert.equal(calls.find(c=>c.method==="linkIdentity").redirectTo,"http://127.0.0.1:4173/");
      assert.deepEqual(errors,[]);
    } finally {await page.close();}
  }

  {
    const {page,errors}=await identityFixture();
    try {
      await signIntoEmail(page);
      await page.locator("#authSolana").click();
      await page.waitForFunction(()=>document.querySelector("#authWalletStatus")?.textContent.includes("wallet connected"));
      await page.locator("#authEthereum").click();
      await page.waitForFunction(()=>document.querySelector("#authWalletStatus")?.textContent.includes("Ethereum wallet connected"));
      const data=await page.evaluate(()=>({
        calls:window.__authCalls,
        signals:window.__walletSignals,
        account:document.querySelector("#authStatus")?.textContent,
        connection:document.querySelector("#authWalletStatus")?.textContent
      }));
      assert.deepEqual(data.calls.filter(c=>["signInWithWeb3","signInWithOAuth","linkIdentity"].includes(c.method)),[],
        "Wallet connect while logged in cannot create or switch Supabase account");
      assert.equal(data.signals.connect,1);
      assert.equal(data.signals.signMessage,0,"Connection must not request signature");
      assert.equal(data.signals.ethereumConnect,1);
      assert.match(data.account,/Signed in as email-owner/);
      assert.match(data.connection,/NOT permanently linked/);
      assert.deepEqual(errors,[]);
    } finally {await page.close();}
  }

  {
    const {page,errors}=await identityFixture();
    try {
      await page.locator("#authSolana").click();
      await page.waitForFunction(()=>window.__authCalls.some(c=>c.method==="signInWithWeb3"));
      const call=(await page.evaluate(()=>window.__authCalls)).find(c=>c.method==="signInWithWeb3");
      assert.equal(call.chain,"solana");
      assert.equal(call.isActualProvider,true,"Never pass Phantom wrapper to Supabase");
      assert.equal(call.compatible,true,"Supabase requires signMessage and publicKey.toBase58");
      assert.deepEqual(errors,[]);
    } finally {await page.close();}
  }

  const savePage = await browser.newPage();
  const saveErrors = [];
  savePage.on("pageerror", error => saveErrors.push(error.message));
  await savePage.setContent("<!doctype html><html><body></body></html>");
  await savePage.evaluate(() => {
    window.__testPayload = { version: 1, player: { x: 1, z: 2, yaw: 0 }, inventory: [{ name: "Rope", qty: 1 }] };
    window.__scopeCalls = [];
    window.__saveCalls = [];
    window.__CLIMBORIA_GAME_SAVE_ADAPTER__ = {
      capture: () => window.__testPayload,
      restore: () => true,
      setUserScope(userId) { window.__scopeCalls.push(userId); return { unclaimedLocalItems: 0 }; }
    };
    window.supabase = {
      createClient() {
        return {
          auth: {
            onAuthStateChange(callback) { window.__authCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; },
            getSession() { return Promise.resolve({ data: { session: { user: { id: "user-A" } } }, error: null }); }
          },
          from(table) {
            if (table !== "player_saves") throw new Error("unexpected table " + table);
            const query = { operation: null, payload: null, filters: {} };
            query.select = () => { if (!query.operation) query.operation = "select"; return query; };
            query.update = payload => { query.operation = "update"; query.payload = payload; return query; };
            query.insert = payload => { query.operation = "insert"; query.payload = payload; return query; };
            query.eq = (key, value) => { query.filters[key] = value; return query; };
            query.maybeSingle = () => {
              if (query.operation === "select") {
                const data = query.filters.user_id === "user-A"
                  ? { schema_version: 1, save_data: window.__testPayload, saved_at: "A1" }
                  : null;
                return Promise.resolve({ data, error: null });
              }
              if (query.operation === "update") {
                window.__saveCalls.push({ operation: "update", userId: query.filters.user_id, payload: query.payload });
                return new Promise(resolve => { window.__resolveAUpdate = resolve; });
              }
              throw new Error("unexpected maybeSingle operation " + query.operation);
            };
            query.single = () => {
              window.__saveCalls.push({ operation: "insert", userId: query.payload.user_id, payload: query.payload });
              return Promise.resolve({ data: { saved_at: "B1" }, error: null });
            };
            return query;
          }
        };
      }
    };
  });
  await savePage.addScriptTag({ path: "game-save.js" });
  await savePage.waitForFunction(() => window.__CLIMBORIA_GAME_SAVE?.userId === "user-A" && window.__CLIMBORIA_GAME_SAVE.status === "loaded");
  await savePage.evaluate(() => { void window.__CLIMBORIA_GAME_SAVE.saveNow(true); });
  await savePage.waitForFunction(() => typeof window.__resolveAUpdate === "function");
  await savePage.evaluate(() => {
    window.__authCallback("SIGNED_OUT", null);
    window.__authCallback("SIGNED_IN", { user: { id: "user-B" } });
  });
  await savePage.waitForFunction(() => window.__CLIMBORIA_GAME_SAVE?.userId === "user-B" && window.__scopeCalls.includes("user-B"));
  await savePage.evaluate(() => window.__resolveAUpdate({ data: { saved_at: "A2" }, error: null }));
  await savePage.waitForFunction(() => window.__saveCalls.some(call => call.operation === "insert" && call.userId === "user-B"));
  const evidence = await savePage.evaluate(() => ({
    calls: window.__saveCalls,
    status: window.__CLIMBORIA_GAME_SAVE.status,
    userId: window.__CLIMBORIA_GAME_SAVE.userId
  }));
  assert.equal(evidence.userId, "user-B");
  assert.equal(evidence.status, "synced");
  assert.deepEqual(evidence.calls.filter(call => call.operation === "update").map(call => call.userId), ["user-A"]);
  assert.deepEqual(evidence.calls.filter(call => call.operation === "insert").map(call => call.userId), ["user-B"]);
  assert.deepEqual(saveErrors, [], "cloud-save session switching should not raise browser exceptions");
  await savePage.close();
  console.log("PASS Supabase auth UI, X OAuth provider identifier, CAPTCHA-gated guest mode, and cloud-save account-switch isolation.");
} finally {
  await browser.close();
}
