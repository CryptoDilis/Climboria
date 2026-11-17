import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { probeProductionApi, classifyReadOnlyApiFailure, SOL } from "./api-production-readiness.mjs";
import { runExactRevisionReadinessProbe } from "./api-production-readiness-retry.mjs";

const ORIGIN = "https://climboria.fun";
const REVISION = "a".repeat(40);
const health = {
  ok: true, service: "climboria-swap-proxy", deployedGitSha: REVISION, execution: "disabled",
  configured: { jupiterKey: true, rateLimiter: true, orderStore: true, solanaRpc: true, executionEnabled: false }
};

function fixture(overrides = {}) {
  const calls = [];
  const respond = (data, status = 200, cors = true) => Response.json(data, {
    status, headers: cors ? { "access-control-allow-origin": ORIGIN } : {}
  });
  const fakeFetch = async (url, init) => {
    const u = new URL(url);
    calls.push({ url: u.pathname, method: init.method || "GET", origin: init.headers.origin, body: init.body });
    if (u.pathname === "/health" && init.headers.origin !== ORIGIN)
      return overrides.unknownOrigin || respond({ error: "Origin not allowed" }, 403, false);
    if (u.pathname === "/health") return overrides.health || respond(health);
    if (u.pathname === "/api/swap/quote" && init.method === "OPTIONS")
      return overrides.preflight || new Response(null, { status: 204, headers: { "access-control-allow-origin": ORIGIN } });
    if (u.pathname === "/api/tokens/search") return overrides.tokens || respond([{ id: SOL, decimals: 9, symbol: "SOL" }]);
    if (u.pathname === "/api/swap/quote") {
      if (u.searchParams.get("amount") === "15700") return overrides.smallQuote || respond({ inAmount: "15700", outAmount: "25", requestId: "test-small-request-id" });
      return overrides.quote || respond({ inAmount: "1000000", outAmount: "1234", requestId: "test-request-id" });
    }
    if (u.pathname === "/api/swap/order") return overrides.order || respond({ error: "wallet-signable orders disabled" }, 503);
    if (u.pathname === "/api/swap/execute") return overrides.execute || respond({ error: "execution disabled" }, 503);
    throw new Error("Unexpected route " + u.pathname);
  };
  return { fakeFetch, calls, respond };
}

test("production acceptance probe verifies real quote preview but never signs or submits", async () => {
  const { fakeFetch, calls } = fixture();
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 7);
  assert.deepEqual(result.observations, []);
  assert.equal(calls.filter(c => c.url === "/api/swap/quote" && c.method === "GET").length, 2);
  assert.deepEqual(calls.filter(c => c.method === "POST").map(c => c.url), ["/api/swap/execute"]);
  assert.ok(!calls.some(c => c.url === "/api/swap/order"), "Never create wallet-signable orders in production monitoring");
  assert.equal(calls.find(c => c.url === "/api/swap/execute").body, "{}");
  assert.ok(calls.every(c => c.origin === ORIGIN || c.origin === "https://unauthorized.example"));
});

test("production readiness matches the exact deploy commit after a guarded release", async () => {
  const { fakeFetch } = fixture();
  const result = await probeProductionApi({ fetchImpl: fakeFetch, expectedRevision: REVISION });
  assert.equal(result.ok, true);
});

test("production readiness rejects old, missing and malformed deployment revisions", async () => {
  const { fakeFetch } = fixture();
  await assert.rejects(probeProductionApi({
    fetchImpl: fakeFetch, expectedRevision: "b".repeat(40)
  }), /revision differs from the exact GitHub commit deployed/);
  for (const value of [undefined, null, "unpublished", "b".repeat(39), "A".repeat(40)]) {
    const { fakeFetch: bad } = fixture({
      health: Response.json({ ...health, deployedGitSha: value }, {
        headers: { "access-control-allow-origin": ORIGIN }
      })
    });
    await assert.rejects(probeProductionApi({ fetchImpl: bad }),
      /no valid deployed Git revision marker/);
  }
});

test("invalid expected commit is rejected before contacting the production API", async () => {
  let calls = 0;
  await assert.rejects(probeProductionApi({
    expectedRevision: "not-a-commit",
    fetchImpl: () => { calls++; throw Error("must not fetch"); }
  }), /Invalid expected deployed Git SHA/);
  assert.equal(calls, 0);
});

test("probe refuses oversized declared and streamed API responses before unbounded allocation", async () => {
  const hugeDeclared = fixture({
    health: new Response('{"ok":true}', {
      headers: { "content-length": "1000000", "access-control-allow-origin": ORIGIN }
    })
  });
  await assert.rejects(probeProductionApi({ fetchImpl: hugeDeclared.fakeFetch }), /oversized response/);

  let cancelled = false;
  const base = fixture();
  const fakeFetch = async (url, options) => {
    if (new URL(url).pathname !== "/health") return base.fakeFetch(url, options);
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "access-control-allow-origin": ORIGIN }),
      body: {
        getReader() {
          return {
            read: async () => ({ done: false, value: new Uint8Array(70000) }),
            cancel: async () => { cancelled = true; },
            releaseLock: () => {}
          };
        }
      }
    };
  };
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /oversized response/);
  assert.equal(cancelled, true);
});

test("read-only readiness probe accepts intentionally missing Solana RPC", async () => {
  const { fakeFetch } = fixture({
    health: Response.json({ ...health, configured: { ...health.configured, solanaRpc: false } }, {
      headers: { "access-control-allow-origin": ORIGIN }
    })
  });
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
});

test("read-only readiness probe still requires order store binding", async () => {
  const { fakeFetch } = fixture({
    health: Response.json({ ...health, configured: { ...health.configured, orderStore: false, solanaRpc: false } }, {
      headers: { "access-control-allow-origin": ORIGIN }
    })
  });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /orderStore/);
});

test("probe rejects non-HTTPS origins before making requests", async () => {
  await assert.rejects(probeProductionApi({ baseUrl: "http://localhost:4173", fetchImpl: () => { throw Error("should not fetch"); } }), /HTTPS/);
});

test("probe blocks accidental production execution flag enablement", async () => {
  const { fakeFetch, respond } = fixture({ health: Response.json({ ...health, execution: "enabled", configured: { ...health.configured, executionEnabled: true } }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /executable trading enabled/i);
});

test("probe rejects a quote for a different input amount", async () => {
  const { fakeFetch } = fixture({ quote: Response.json({ inAmount: "1000001", outAmount: "1234", requestId: "wrong" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /input amount differs/);
});

test("small-amount live quote rejects mismatched lamports or signable transactions", async () => {
  const { fakeFetch } = fixture({ smallQuote: Response.json({ inAmount: "15699", outAmount: "25", requestId: "bad" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /Small quote input amount differs/);
  const second = fixture({ smallQuote: Response.json({ inAmount: "15700", outAmount: "25", requestId: "bad", transaction: "not-allowed" }, { headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: second.fakeFetch }), /must never expose a signable transaction/);
});

test("legitimate unavailable tiny route is recorded without claiming quote success", async () => {
  const { fakeFetch, calls } = fixture({ smallQuote: Response.json({ error: "Jupiter quote request failed", upstreamStatus: 400, details: "No route" }, { status: 400, headers: { "access-control-allow-origin": ORIGIN } }) });
  const result = await probeProductionApi({ fetchImpl: fakeFetch });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 6);
  assert.match(result.observations[0], /NOT available \(HTTP 400\)/);
  assert.ok(!calls.some(c => c.url === "/api/swap/order"));
});

test("failed tiny quote cannot return a signed or signable transaction", async () => {
  const { fakeFetch } = fixture({ smallQuote: Response.json({ error: "No route", transaction: "unsafe" }, { status: 422, headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /must never expose a signable transaction/);
});

test("probe fails when a configured provider search or quote is unavailable", async () => {
  const { fakeFetch } = fixture({ tokens: Response.json({ error: "Jupiter offline" }, { status: 502, headers: { "access-control-allow-origin": ORIGIN } }) });
  await assert.rejects(probeProductionApi({ fetchImpl: fakeFetch }), /token-search/);
});

// Regression for the Nov 13 race: live probe started while Wrangler was still deploying.
test("production smoke is triggered after a successful Worker deployment, not by main push", () => {
  const workflow = readFileSync(new URL("../workflows/api-production-readiness.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_run:\n\s+workflows: \["Deploy Climboria API"\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.doesNotMatch(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /CLIMBORIA_EXPECTED_DEPLOY_SHA:/);
  const deploy = readFileSync(new URL("../workflows/deploy-climboria-api.yml", import.meta.url), "utf8");
  assert.match(deploy, /DEPLOYED_GIT_SHA/);
  assert.match(deploy, /EXPECTED_DEPLOY_SHA/);
  assert.match(deploy, /CLIMBORIA_EXPECTED_DEPLOY_SHA/);
});

test("production deployment trigger tracks reviewed Worker source and rejects non-main manual dispatch", () => {
  const deploy = readFileSync(new URL("../workflows/deploy-climboria-api.yml", import.meta.url), "utf8");
  const readiness = readFileSync(new URL("../workflows/api-production-readiness.yml", import.meta.url), "utf8");
  assert.match(deploy, /workflow_dispatch:\n  push:\n    branches: \[main\]/,
    "Deployment workflow must permit only reviewed main pushes or manually initiated releases");
  assert.match(deploy, /'dex\/swap-proxy\/src\/\*\*'/,
    "Every reviewed Worker source change must start a guarded quote-only deploy");
  assert.match(deploy, /'dex\/swap-proxy\/wrangler\.toml'/,
    "Reviewed config changes must start a guarded quote-only deploy");
  assert.match(deploy, /'\.github\/workflows\/deploy-climboria-api\.yml'/,
    "Changes to the guarded workflow must themselves receive a deploy attempt");
  assert.doesNotMatch(deploy, /(?:^|\n)  pull_request:/,
    "Never deploy production from a pull request event");
  assert.match(deploy, /^    if: github\.ref == 'refs\/heads\/main'$/m,
    "Manual dispatches selected on non-main branches must be rejected");
  assert.match(deploy, /grep -Fqx 'EXECUTION_ENABLED = "false"' wrangler\.toml/);
  assert.match(deploy, /grep -Fqx 'const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;' src\/index\.mjs/);
  assert.match(deploy, /grep -Fqx 'const EXECUTION_SECURITY_REVIEW_COMPLETE = false;' src\/index\.mjs/);
  assert.match(deploy, /grep -Eq '\^\[\[:space:\]\]\*enabled:\[\[:space:\]\]\*false' \.\.\/\.\.\/swap-config\.js/);
  assert.match(deploy, /node --test test\/\*\.test\.mjs/);
  assert.match(deploy, /CLIMBORIA_EXPECTED_DEPLOY_SHA:/,
    "Deployment must verify exact revision and quote-only production readiness");
  assert.match(readiness, /"\.github\/workflows\/deploy-climboria-api\.yml"/,
    "Any change to the deployment workflow must run the API readiness unit tests in PR CI");
});



test("only fixed known categories from public error data may appear in deployment logs", () => {
  assert.equal(classifyReadOnlyApiFailure({code:"RATE_LIMITER_UNAVAILABLE"}), "RATE_LIMITER_UNAVAILABLE");
  assert.equal(classifyReadOnlyApiFailure({code:"RATE_LIMITER_NOT_CONFIGURED"}), "RATE_LIMITER_NOT_CONFIGURED");
  assert.equal(classifyReadOnlyApiFailure({code:"RATE_LIMIT_EXCEEDED"}), "RATE_LIMIT_EXCEEDED");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter upstream request failed or redirected"}), "JUPITER_TRANSPORT_OR_REDIRECT");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter upstream request timed out"}), "JUPITER_TIMEOUT");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter upstream redirect blocked"}), "JUPITER_REDIRECT_BLOCKED");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter token search failed",upstreamStatus:403}), "JUPITER_HTTP_403");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter quote request failed",upstreamStatus:503}), "JUPITER_HTTP_503");
  assert.equal(classifyReadOnlyApiFailure({error:"Jupiter token search failed",upstreamStatus:"403"}), "JUPITER_HTTP_UNKNOWN");
  for(const body of [null,{},{code:"PRIVATE_SECRET_123",error:"PRIVATE_SECRET_123"},
    {error:"Jupiter quote request failed",upstreamStatus:-1},
    {error:"Jupiter quote request failed",upstreamStatus:999999}]) {
    const category=classifyReadOnlyApiFailure(body);
    assert.match(category,/^(?:UNKNOWN_PUBLIC_API_FAILURE|JUPITER_HTTP_UNKNOWN)$/);
    assert.doesNotMatch(category,/PRIVATE_SECRET_123/);
  }
});

test("live readiness probes both token-search and quote and reports only safe failure categories", async () => {
  const bad = fixture({
    tokens:Response.json({error:"Backend rate limiter temporarily unavailable",
      code:"RATE_LIMITER_UNAVAILABLE",providerDebug:"SENSITIVE_KEY_NEVER_LOG"}, {
      status:503,headers:{"access-control-allow-origin":ORIGIN}
    }),
    quote:Response.json({error:"Jupiter upstream request failed or redirected",
      debug:"https://example.invalid/?token=SENSITIVE_KEY_NEVER_LOG"}, {
      status:503,headers:{"access-control-allow-origin":ORIGIN}
    })
  });
  await assert.rejects(probeProductionApi({fetchImpl:bad.fakeFetch}), error=>{
    assert.match(error.message,/token-search HTTP 503 category RATE_LIMITER_UNAVAILABLE/);
    assert.match(error.message,/quote HTTP 503 category JUPITER_TRANSPORT_OR_REDIRECT/);
    assert.doesNotMatch(error.message,/SENSITIVE_KEY_NEVER_LOG|example.invalid/);
    return true;
  });
  assert.ok(bad.calls.some(x=>x.url==="/api/tokens/search"));
  assert.ok(bad.calls.some(x=>x.url==="/api/swap/quote" && x.method==="GET"));
  assert.ok(!bad.calls.some(x=>x.url==="/api/swap/order"),"no signable order probe");
});

test("production readiness still hard fails for provider outage after passing health and CORS", async () => {
  const bad=fixture({
    tokens:Response.json({error:"Jupiter token search failed",upstreamStatus:401},{
      status:401,headers:{"access-control-allow-origin":ORIGIN}
    })
  });
  await assert.rejects(probeProductionApi({fetchImpl:bad.fakeFetch}),
    /token-search HTTP 401 category JUPITER_HTTP_401; quote HTTP 200 category OK/);
});

test("production probe transport exceptions cannot echo credential-bearing URLs", async () => {
  const normal=fixture();
  const fakeFetch=async(url,options)=>{
    if(new URL(url).pathname==="/api/tokens/search"){
      throw Error("https://private.provider.invalid?key=SECRET_DO_NOT_ECHO");
    }
    return normal.fakeFetch(url,options);
  };
  await assert.rejects(probeProductionApi({fetchImpl:fakeFetch}),error=>{
    assert.match(error.message,/Production API probe transport unavailable/);
    assert.doesNotMatch(error.message,/SECRET_DO_NOT_ECHO|private.provider.invalid/);
    return true;
  });
});


test("stale edge is retried by running the complete original quote-only probe", async () => {
  const attemptCalls = [];
  let count = 0, sleeps = 0;
  const result = await runExactRevisionReadinessProbe({
    expectedRevision: REVISION, maxAttempts: 3, delayMs: 0,
    sleepImpl: async () => { sleeps++; },
    probeImpl: async ({ expectedRevision }) => {
      count++;
      const f = fixture(count === 1 ? {
        health: Response.json({ ...health, deployedGitSha: "b".repeat(40) },
          { headers: { "access-control-allow-origin": ORIGIN } })
      } : {});
      try { return await probeProductionApi({ expectedRevision, fetchImpl: f.fakeFetch }); }
      finally { attemptCalls.push(f.calls); }
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.equal(count, 2);
  assert.equal(sleeps, 1);
  assert.deepEqual(attemptCalls[0].map(c => c.url), ["/health"]);
  assert.ok(attemptCalls[1].some(c => c.url === "/api/tokens/search"));
  assert.equal(attemptCalls[1].filter(c => c.url === "/api/swap/quote" && c.method === "GET").length, 2);
  assert.deepEqual(attemptCalls[1].filter(c => c.method === "POST").map(c => c.url), ["/api/swap/execute"]);
  assert.ok(attemptCalls.flat().every(c => c.url !== "/api/swap/order"));
});

test("perpetually stale Worker SHA exhausts the finite retry budget and fails", async () => {
  let calls = 0, sleeps = 0;
  await assert.rejects(runExactRevisionReadinessProbe({
    expectedRevision: REVISION, maxAttempts: 3, delayMs: 0,
    sleepImpl: async () => { sleeps++; },
    probeImpl: async ({ expectedRevision }) => {
      calls++;
      const f = fixture({
        health: Response.json({ ...health, deployedGitSha: "b".repeat(40) },
          { headers: { "access-control-allow-origin": ORIGIN } })
      });
      return probeProductionApi({ expectedRevision, fetchImpl: f.fakeFetch });
    }
  }), /revision differs from the exact GitHub commit deployed/);
  assert.equal(calls, 3);
  assert.equal(sleeps, 2);
});

test("any unsafe execution, origin policy, or quote error is immediately fatal", async () => {
  for (const [name, make, match] of [
    ["execution", () => fixture({ health: Response.json({
      ...health, execution: "enabled", configured: { ...health.configured, executionEnabled: true }
    }, { headers: { "access-control-allow-origin": ORIGIN } }) }), /executable trading enabled/],
    ["origin", () => fixture({ unknownOrigin: Response.json({ error: "wrong" }, { status: 200 }) }),
      /Unknown browser origins must be rejected/],
    ["quote", () => fixture({ quote: Response.json({ error: "Jupiter quote request failed" },
      { status: 502, headers: { "access-control-allow-origin": ORIGIN } }) }),
      /Live read-only Jupiter checks failed/]
  ]) {
    let count = 0, sleepCount = 0;
    await assert.rejects(runExactRevisionReadinessProbe({
      expectedRevision: REVISION, maxAttempts: 4, delayMs: 0,
      sleepImpl: async () => { sleepCount++; },
      probeImpl: ({ expectedRevision }) => {
        count++;
        return probeProductionApi({ expectedRevision, fetchImpl: make().fakeFetch });
      }
    }), match, name);
    assert.equal(count, 1, name);
    assert.equal(sleepCount, 0, name);
  }
});

test("unsafe result after earlier stale revision is not mistaken for success", async () => {
  let count = 0;
  await assert.rejects(runExactRevisionReadinessProbe({
    expectedRevision: REVISION, maxAttempts: 4, delayMs: 0,
    sleepImpl: async () => {},
    probeImpl: ({ expectedRevision }) => {
      count++;
      const f = fixture(count === 1
        ? { health: Response.json({ ...health, deployedGitSha: "b".repeat(40) },
          { headers: { "access-control-allow-origin": ORIGIN } }) }
        : { execute: Response.json({ signature: "unsafe" },
          { status: 200, headers: { "access-control-allow-origin": ORIGIN } }) });
      return probeProductionApi({ expectedRevision, fetchImpl: f.fakeFetch });
    }
  }), /Execution must remain disabled/);
  assert.equal(count, 2);
});

test("deployment runner requires exact pin and is wired to production-readiness CI", async () => {
  let calls = 0;
  await assert.rejects(runExactRevisionReadinessProbe({
    expectedRevision: null, probeImpl: () => { calls++; }
  }), /exact canonical Git SHA/);
  assert.equal(calls, 0);
  const deployment = readFileSync(new URL("../workflows/deploy-climboria-api.yml", import.meta.url), "utf8");
  const readiness = readFileSync(new URL("../workflows/api-production-readiness.yml", import.meta.url), "utf8");
  assert.match(deployment, /node \.github\/scripts\/api-production-readiness-retry\.mjs/);
  assert.match(deployment, /CLIMBORIA_EXPECTED_DEPLOY_SHA: \${\{ github\.sha \}\}/);
  assert.match(readiness, /"\.github\/scripts\/api-production-readiness-retry\.mjs"/);
  assert.match(readiness, /node --check \.github\/scripts\/api-production-readiness-retry\.mjs/);
});
