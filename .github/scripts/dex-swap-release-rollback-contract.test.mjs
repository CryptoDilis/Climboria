#!/usr/bin/env node
/**
 * Offline emergency rollback drill for the third-party Jupiter provider gate.
 * Does not deploy, load vendor scripts, request wallet consent or send trades.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const originalSrcDir = fileURLToPath(new URL("../../dex/swap-proxy/src/", import.meta.url));
const source = readFileSync(join(originalSrcDir, "index.mjs"), "utf8");
const statePattern = /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (true|false);$/gm;

test("single literal third-party provider gate and independent native security gates", () => {
  const values = [...source.matchAll(statePattern)];
  assert.equal(values.length, 1, "The provider gate must be an unambiguous reviewed literal");
  assert.match(source, /^const SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false;$/m);
  assert.match(source, /^const EXECUTION_SECURITY_REVIEW_COMPLETE = false;$/m);
  const cfg = readFileSync(new URL("../../swap-config.js", import.meta.url), "utf8");
  assert.match(cfg, /surfaces:\s*Object\.freeze\(\{\s*swap:\s*true,\s*dex:\s*false\s*\}\)/);
  assert.match(cfg, /feeCollectionEnabled:\s*false/);
  assert.match(cfg, /feeRecipient:\s*null/);
});

test("source-only OFF rollback returns uncached false under hostile client overrides", async () => {
  // Copy the *real* Worker implementation including its relative modules to
  // an isolated temp directory, change ONLY the literal source gate, and
  // import it as a fresh module. This tests the real code, not a status mock.
  const temp = mkdtempSync(join(tmpdir(), "climboria-swap-rollback-"));
  try {
    const copiedSrcDir = join(temp, "src");
    cpSync(originalSrcDir, copiedSrcDir, { recursive: true });
    const workerPath = join(copiedSrcDir, "index.mjs");
    const sourceToRevert = readFileSync(workerPath, "utf8");
    const revertedSource = sourceToRevert.replace(
      /^const THIRD_PARTY_JUPITER_WIDGET_APPROVED = (?:true|false);$/m,
      "const THIRD_PARTY_JUPITER_WIDGET_APPROVED = false;"
    );
    assert.notEqual(revertedSource, sourceToRevert,
      "Release branch must actually have an ON source gate for this rollback drill");
    writeFileSync(workerPath, revertedSource, "utf8");
    const { default: worker } = await import(pathToFileURL(workerPath).href);
    const env = {
      ALLOWED_ORIGINS: "https://climboria.fun,https://www.climboria.fun",
      EXECUTION_ENABLED: "true",
      THIRD_PARTY_JUPITER_WIDGET_APPROVED: "true",
      JUPITER_WIDGET_ENABLED: "true"
    };
    const base = "https://api.climboria.fun/api/swap/provider-status";
    const origin = "https://climboria.fun";
    for (const url of [base, base + "?enabled=true", base + "?enabled=false"]) {
      const response = await worker.fetch(new Request(url, {
        headers: { origin, cookie: "jupiter_approved=true", "x-jupiter-enabled": "true" }
      }), env);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control") || "", /(?:^|,)\s*no-store\s*(?:,|$)/i);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.deepEqual(await response.json(), { enabled: false },
        "After OFF source revert, no environment, cookie, header or query may reopen Swap");
    }
    const denied = await worker.fetch(new Request(base, {
      headers: { origin: "https://evil.example" }
    }), env);
    assert.equal(denied.status, 403);
    const write = await worker.fetch(new Request(base, {
      method: "POST", headers: { origin }
    }), env);
    assert.equal(write.status, 405);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
