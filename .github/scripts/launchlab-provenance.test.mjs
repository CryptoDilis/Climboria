import test from "node:test";
import assert from "node:assert/strict";
import { PROGRAMS, runProvenanceCheck } from "./launchlab-provenance.mjs";

test("published program identifiers are stable and cluster-specific", () => {
  assert.notEqual(PROGRAMS.mainnet.launchpad, PROGRAMS.devnet.launchpad);
  assert.equal(Object.keys(PROGRAMS.mainnet).length, 3);
  assert.equal(Object.keys(PROGRAMS.devnet).length, 3);
});

test("read-only provenance check reports executable upgradeable programs", async () => {
  const fetchMock = async (url, init = {}) => {
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      const address = body.params[0];
      const cluster = url.includes("devnet") ? "devnet" : "mainnet";
      assert.equal(body.method, "getAccountInfo");
      assert.equal(body.params[1].commitment, "finalized");
      assert.ok(Object.values(PROGRAMS[cluster]).includes(address));
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { value: { executable: true, owner: "BPFLoaderUpgradeab1e11111111111111111111111", lamports: 1000 } } }));
    }
    return new Response(JSON.stringify({ success: true, data: {} }));
  };
  const report = await runProvenanceCheck(fetchMock);
  assert.equal(report.readOnly, true);
  assert.equal(report.transactionSubmitted, false);
  assert.equal(report.pass, true);
  assert.equal(report.results.length, 2);
});

test("missing program accounts fail the provenance gate", async () => {
  const fetchMock = async (url, init = {}) => {
    if (init.method === "POST") return new Response(JSON.stringify({ jsonrpc: "2.0", id: "x", result: { value: null } }));
    return new Response(JSON.stringify({ success: true }));
  };
  const report = await runProvenanceCheck(fetchMock);
  assert.equal(report.pass, false);
  assert.equal(report.results.every(x => x.blockers.length === 3), true);
});

test("API and RPC failures are surfaced as blockers", async () => {
  const fetchMock = async () => new Response("unavailable", { status: 503 });
  const report = await runProvenanceCheck(fetchMock);
  assert.equal(report.pass, false);
  assert.match(report.results[0].blockers[0], /HTTP 503/);
});
