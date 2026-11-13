import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("support page publishes Climboria support email and official X contact", () => {
  const page = read("support/index.html");
  assert.match(page, /<title>Customer Support \| Climboria<\/title>/);
  assert.match(page, /href="mailto:climboria@gmail\.com\?subject=Climboria%20Support%20Inquiry"/);
  assert.match(page, /Email climboria@gmail\.com/);
  assert.match(page, /href="https:\/\/x\.com\/ClimboriaHQ"/);
  assert.match(page, /if direct messages are enabled/);
  assert.doesNotMatch(page, /Email address: Coming soon/);
  assert.doesNotMatch(page, /<form\b/i, "No personal information should be collected by the static website");
  assert.match(page, /will never ask for your seed phrase, private key, password, one-time code, or payment/);
});

test("support navigation is available across public Climboria product pages", () => {
  for (const route of ["index.html", "dex/index.html", "swap/index.html", "launchpad/index.html"]) {
    const page = read(route);
    assert.match(page, /href="\/support\/"/, route + " must link to Customer Support");
  }
  const home = read("index.html");
  assert.match(home, /<div class="navl"(?:\s[^>]*)?>[^]*?href="\/support\/"/, "Desktop homepage navigation needs Support");
  assert.match(home, /class="mobile-menu" id="mobileMenu"(?:\s[^>]*)?>[^]*?href="\/support\/"/, "Mobile homepage navigation needs Support");
});

test("official support route has simple mobile layout and safe external links", () => {
  const page = read("support/index.html");
  assert.match(page, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(page, /@media \(max-width:720px\)/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /<nav class="links" aria-label="Main navigation">/);
  assert.match(page, /aria-current="page">Support<\/a>/);
});
