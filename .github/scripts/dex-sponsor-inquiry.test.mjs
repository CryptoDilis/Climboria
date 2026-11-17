#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSponsorshipInquiry, SPONSORSHIP_EMAIL } from "../../dex/partners/sponsor-inquiry.mjs";

const sample = Object.freeze({
  project: "Sample Chain",
  email: "partner@example.com",
  website: "https://example.com",
  placement: "DEX premium banner inquiry",
  dates: "November 2026",
  budget: "Please quote",
  notes: "A clearly disclosed sponsored campaign"
});

test("builds a user-initiated draft to the existing Climboria support email, never sends", () => {
  const result = buildSponsorshipInquiry(sample);
  assert.equal(SPONSORSHIP_EMAIL, "climboria@gmail.com");
  assert.equal(result.to, SPONSORSHIP_EMAIL);
  assert.match(result.subject, /^Climboria DEX Sponsorship Inquiry/);
  assert.match(result.body, /DEX premium banner inquiry/);
  assert.match(result.body, /clearly disclosed sponsored/);
  assert.ok(result.href.startsWith("mailto:climboria@gmail.com?subject="));
  const parsed = new URL(result.href);
  assert.equal(parsed.searchParams.get("subject"), result.subject);
  assert.equal(parsed.searchParams.get("body"), result.body);
  assert.ok(Object.isFrozen(result));
});

test("refuses absent contact, invalid email, unsupported placement and unsafe website credentials", () => {
  for (const bad of [
    {...sample, project: " "},
    {...sample, email: "wrong"},
    {...sample, placement: "Guaranteed profitable listing"},
    {...sample, website: "javascript:alert(1)"},
    {...sample, website: "http://insecure.example"},
    {...sample, website: "https://user:password@example.com"}
  ]) {
    assert.throws(() => buildSponsorshipInquiry(bad));
  }
});

test("controls, CRLF, bidi, and raw user input cannot inject mailto headers", () => {
  const result = buildSponsorshipInquiry({
    ...sample,
    project: "OK\r\nBcc: victim@example.com\u202E",
    notes: "Trusted\u0007 info\nBcc: victim@example.com"
  });
  assert.doesNotMatch(result.subject, /[\r\n\u202e]/);
  assert.equal(new URL(result.href).searchParams.get("subject"), result.subject);
  assert.doesNotMatch(result.body, /[\r\u202e\u0007]/);
  assert.match(result.href, /^mailto:climboria@gmail\.com\?subject=/);
  assert.equal(result.href.split("&body=").length, 2);
});

test("DEX and Swap make partner intake reachable without requiring wallet connection", () => {
  const dex = readFileSync(new URL("../../dex/index.html", import.meta.url), "utf8");
  const swap = readFileSync(new URL("../../swap/index.html", import.meta.url), "utf8");
  const html = readFileSync(new URL("../../dex/partners/index.html", import.meta.url), "utf8");
  const module = readFileSync(new URL("../../dex/partners/sponsor-inquiry.mjs", import.meta.url), "utf8");
  assert.match(dex, /href="\/dex\/partners\/"/);
  assert.match(swap, /href="\/dex\/partners\/"/);
  assert.match(html, /id="sponsorshipForm"/);
  assert.match(html, /id="sponsorshipResults"[^>]*hidden/);
  assert.match(html, /type="module" src="\/dex\/partners\/sponsor-inquiry\.mjs"/);
  assert.match(html, /No sponsorship contract or live advertiser is implied/);
  assert.match(html, /No data is uploaded or saved by this form/);
  assert.doesNotMatch(module, /\bfetch\s*\(|localStorage|sessionStorage|signTransaction|api\/swap\/execute/);
});

test("retains protected trading and fee gates", () => {
  const cfg = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  assert.match(cfg, /feeCollectionEnabled:\s*false/);
  assert.match(cfg, /managedProvider:\s*Object\.freeze\(\{\s*enabled:\s*true/);
  const worker = readFileSync(new URL("../../dex/swap-proxy/src/index.mjs", import.meta.url), "utf8");
  assert.match(worker, /const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (?:true|false);/);
  assert.match(cfg, /surfaces:\s*Object\.freeze\(\{\s*swap:\s*true,\s*dex:\s*false\s*\}\)/);
  assert.match(cfg, /\benabled:\s*false/);
});
