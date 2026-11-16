import assert from "node:assert/strict";
import test from "node:test";
import { classifyQuoteJourneyRequest as classify, KNOWN_CLOUDFLARE_BEACON } from "./dex-swap-quote-request-guard.mjs";

function inspect(url, method = "GET", resourceType = "fetch") {
  return classify({ url, method, resourceType });
}

test("actual read-only Worker quote and first-party scripts are permitted", () => {
  const quote = inspect("https://api.climboria.fun/api/swap/quote?amount=100000000");
  assert.equal(quote.protectedSwapRoute, false);
  assert.equal(quote.unexpectedApiWrite, false);
  assert.equal(quote.unexpectedSiteSwapWrite, false);
  assert.equal(quote.unexpectedExternalExecutable, false);
  const localScript = inspect("https://climboria.fun/swap/swap-config.js", "GET", "script");
  assert.equal(localScript.unexpectedExternalExecutable, false);
  assert.equal(inspect("https://api.climboria.fun/health", "HEAD").unexpectedApiWrite, false);
});

test("any unexpected write to actual Worker API is rejected, including unknown route", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(inspect("https://api.climboria.fun/api/swap/unknown", method).unexpectedApiWrite, true);
  }
  assert.equal(inspect("https://api.climboria.fun/api/swap/quote", "GET").unexpectedApiWrite, false);
});

test("wallet order and execute paths are forbidden on Worker and site origins", () => {
  for (const host of ["api.climboria.fun", "climboria.fun"]) {
    for (const path of ["/api/swap/order", "/api/swap/execute", "/api/swap/execute/staged"]) {
      assert.equal(inspect("https://" + host + path).protectedSwapRoute, true, host + path);
    }
  }
  assert.equal(inspect("https://climboria.fun/api/swap/executed").protectedSwapRoute, false);
  assert.equal(inspect("https://api.climboria.fun/api/swap/quote").protectedSwapRoute, false);
});

test("first-party reverse-proxy writes cannot evade exact API host guard", () => {
  assert.equal(inspect("https://climboria.fun/api/swap/quote", "POST").unexpectedSiteSwapWrite, true);
  assert.equal(inspect("https://climboria.fun/api/swap/route", "PUT").unexpectedSiteSwapWrite, true);
  assert.equal(inspect("https://climboria.fun/api/swap/quote", "GET").unexpectedSiteSwapWrite, false);
  assert.equal(inspect("https://climboria.fun/swap/", "GET").unexpectedSiteSwapWrite, false);
});

test("spoofed domains do not inherit first-party or Cloudflare-script trust", () => {
  assert.equal(inspect("https://climboria.fun.evil.example/payload.js", "GET", "script").unexpectedExternalExecutable, true);
  assert.equal(inspect("https://static.cloudflareinsights.com.evil.example/x.js", "GET", "script").unexpectedExternalExecutable, true);
  assert.equal(inspect("http://climboria.fun/unsafe.js", "GET", "script").unexpectedExternalExecutable, true);
});

test("only exact observed Cloudflare analytics script is exempted, not arbitrary vendors", () => {
  const exact = "https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092";
  assert.equal(KNOWN_CLOUDFLARE_BEACON, exact,
    "Known telemetry URL must be reviewed explicitly before any version change");
  assert.equal(inspect(exact, "GET", "script").knownCloudflareAnalyticsScript, true);
  assert.equal(inspect(exact, "GET", "script").unexpectedExternalExecutable, false);
  assert.equal(inspect(exact + "?changed=1", "GET", "script").unexpectedExternalExecutable, true);
  assert.equal(inspect(exact, "GET", "worker").unexpectedExternalExecutable, true);
  assert.equal(inspect("https://static.cloudflareinsights.com/beacon.min.js/next", "GET", "script").unexpectedExternalExecutable, true);
});

test("Jupiter widget hosts are forbidden regardless of resource type", () => {
  for (const host of ["terminal.jup.ag", "plugin.jup.ag"]) {
    assert.equal(inspect("https://" + host + "/widget.js", "GET", "script").jupiterProviderRequest, true);
    assert.equal(inspect("https://" + host + "/config", "GET", "fetch").jupiterProviderRequest, true);
  }
  assert.equal(inspect("https://quote-api.jup.ag/v6/quote").jupiterProviderRequest, false);
});
