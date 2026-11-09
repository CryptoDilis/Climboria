import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  const scenarios = [
    { name: "guest", session: null, row: null, guest: "Adventurer", expected: "You are playing as a guest", queries: 0 },
    { name: "account-only", session: { user: { id: "player-1" } }, row: { schema_version: 1, save_data: { selectedHero: "Adventurer" } }, guest: null, expected: "An account hero choice is available", queries: 1, chooseAccount: true },
    { name: "account-save-no-hero", session: { user: { id: "player-1" } }, row: { schema_version: 1, save_data: {} }, guest: null, expected: "no supported cosmetic hero choice", queries: 1 },
    { name: "same-choice", session: { user: { id: "player-1" } }, row: { schema_version: 1, save_data: { selectedHero: "Adventurer" } }, guest: "Adventurer", expected: "choices match", queries: 1 },
    { name: "invalid-payload", session: { user: { id: "player-1" } }, row: { schema_version: 99, save_data: { selectedHero: "Adventurer" } }, guest: "Adventurer", expected: "cannot safely use", queries: 1 },
    { name: "read-failure", session: { user: { id: "player-1" } }, row: null, readError: { message: "fixture read failure" }, guest: "Adventurer", expected: "could not be read", queries: 1 }
  ];

  for (const scenario of scenarios) {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("climboria_jarrell_inventory_v1", '[{"name":"Quartz","qty":7}]');
      localStorage.removeItem("climboria-selected-hero");
    });
    if (scenario.guest) await page.evaluate(value => localStorage.setItem("climboria-selected-hero", value), scenario.guest);
    await page.evaluate(async ({ session, row, readError }) => {
      const { installGameSaveOptions } = await import("/auth/game-save-options.js");
      const calls = { select: 0, insert: 0, update: 0, upsert: 0 };
      const client = {
        auth: { getSession: async () => ({ data: { session }, error: null }) },
        from(table) {
          if (table !== "player_saves") throw new Error("Unexpected table read: " + table);
          return {
            select(columns) {
              calls.select++;
              if (columns !== "schema_version,save_data") throw new Error("Unexpected selected columns: " + columns);
              return { maybeSingle: async () => ({ data: row, error: readError || null }) };
            },
            insert() { calls.insert++; throw new Error("Cloud insert must never occur"); },
            update() { calls.update++; throw new Error("Cloud update must never occur"); },
            upsert() { calls.upsert++; throw new Error("Cloud upsert must never occur"); }
          };
        }
      };
      window.__saveCalls = calls;
      installGameSaveOptions({ client });
    }, scenario);
    await page.getByRole("button", { name: "SAVE OPTIONS" }).click();
    await page.locator("#climboria-save-options .save-status").waitFor({ state: "visible" });
    await page.waitForFunction(expected => document.querySelector("#climboria-save-options .save-status")?.textContent.includes(expected), scenario.expected);
    const inventoryBefore = await page.evaluate(() => localStorage.getItem("climboria_jarrell_inventory_v1"));
    if (scenario.chooseAccount) {
      const button = page.getByRole("button", { name: "USE ACCOUNT CHOICE ON THIS DEVICE" });
      if (await button.count() !== 1) failures.push(scenario.name + ": explicit account choice action missing");
      const heroBefore = await page.evaluate(() => localStorage.getItem("climboria-selected-hero"));
      if (heroBefore !== null) failures.push(scenario.name + ": account choice changed before explicit click");
      await button.click();
      const heroAfter = await page.evaluate(() => localStorage.getItem("climboria-selected-hero"));
      if (heroAfter !== "Adventurer") failures.push(scenario.name + ": explicit account choice did not apply validated hero locally");
    }
    const result = await page.evaluate(() => ({
      calls: window.__saveCalls,
      inventory: localStorage.getItem("climboria_jarrell_inventory_v1"),
      hero: localStorage.getItem("climboria-selected-hero")
    }));
    if (result.calls.select !== scenario.queries) failures.push(scenario.name + ": expected " + scenario.queries + " player_saves read(s), got " + result.calls.select);
    if (result.calls.insert || result.calls.update || result.calls.upsert) failures.push(scenario.name + ": unexpected cloud write " + JSON.stringify(result.calls));
    if (result.inventory !== inventoryBefore) failures.push(scenario.name + ": inventory changed");
    await page.keyboard.press("Escape");
    if (await page.locator("#climboria-save-options").isVisible()) failures.push(scenario.name + ": Escape did not close the panel");
    if (await page.getByRole("button", { name: "SAVE OPTIONS" }).getAttribute("aria-expanded") !== "false") failures.push(scenario.name + ": trigger aria-expanded was not reset");
    await page.close();
  }
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("PASS save options guest/account-only/same-choice/invalid/read-error matrix; explicit local account choice; inventory byte-preservation; zero cloud writes.");
} finally {
  await browser.close();
}
