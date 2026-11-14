import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exercise the real inline DEX graduation collector, not a copied implementation.
const html = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
const begin = html.indexOf("async function loadGraduations(){");
const end = html.indexOf("\nfunction graduationAge(", begin);
assert.ok(begin > 0 && end > begin, "DEX graduation collector must be present");
const collector = html.slice(begin, end);
const makeCollector = new Function("state", "fetch", "utcDayOffset", "normalizeGraduation",
  collector + "\nreturn loadGraduations;");

const recent = mint => ({mint, graduatedAt:Date.now()-10_000});
const source = (today, yesterday) => async url => {
  const result = url.endsWith("/today.json") ? today : yesterday;
  if (result instanceof Error) throw result;
  return {ok:result!==404, status:result===404?404:200, json:async()=>result};
};
const load = (state, today, yesterday) => makeCollector(state, source(today,yesterday), offset=>offset===0?"today":"yesterday", value=>value);

test("one missing daily file keeps independently verified graduation rows, explicitly partial", async () => {
  const state={graduations:[],graduationStatus:"unavailable"};
  await load(state, 404, [recent("VerifiedMint")])();
  assert.equal(state.graduationStatus, "partial");
  assert.deepEqual(state.graduations.map(x=>x.mint), ["VerifiedMint"]);
});

test("two missing daily files reject instead of claiming complete or fabricating data", async () => {
  const state={graduations:[],graduationStatus:"unavailable"};
  await assert.rejects(load(state,404,404)(), /unavailable/);
  assert.equal(state.graduations.length,0);
  assert.equal(state.graduationStatus,"unavailable");
});

test("two successful empty days are genuinely connected but contain no invented tokens", async () => {
  const state={graduations:[recent("OldMint")],graduationStatus:"unavailable"};
  await load(state,[],[])();
  assert.equal(state.graduationStatus,"connected");
  assert.deepEqual(state.graduations,[]);
});

test("duplicates and out-of-window graduation timestamps are filtered", async () => {
  const state={graduations:[],graduationStatus:"unavailable"};
  await load(state,[recent("A"),recent("A"),{mint:"Old",graduatedAt:Date.now()-3*86400000}],{graduations:[recent("B")]})();
  assert.equal(state.graduationStatus,"connected");
  assert.deepEqual(state.graduations.map(x=>x.mint).sort(),["A","B"]);
});

test("real DEX render path distinguishes unavailable and partial graduated feed states", () => {
  assert.match(html, /graduationStatus==='partial'/);
  assert.match(html, /Graduation feed temporarily unavailable\. No verified graduations to show\./);
  assert.match(html, /state\.graduations=\[\];console\.warn\('Climboria graduation feed unavailable'/);
});
