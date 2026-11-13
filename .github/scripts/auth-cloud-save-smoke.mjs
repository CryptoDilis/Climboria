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
