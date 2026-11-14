import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decodeBase58 } from "./launchlab-provenance.mjs";
import { WSOL } from "./launchlab-curve-economics.mjs";
import { CONFIG_TARGETS, decodeConfigAccounts, assertApiMatchesChain, getFinalizedConfigSnapshot, runLiveConfigCheck } from "./launchlab-live-config.mjs";
import { PROGRAMS } from "./launchlab-provenance.mjs";

const fixture = (cluster, modify = () => {}) => {
  const target = CONFIG_TARGETS[cluster], program = PROGRAMS[cluster].launchpad;
  const globalData = Buffer.alloc(371), platformData = Buffer.alloc(944);
  for (const [name, data] of [["GlobalConfig", globalData], ["PlatformConfig", platformData]]) {
    createHash("sha256").update("account:" + name).digest().copy(data, 0, 0, 8);
  }
  const set64 = (data, offset, value) => data.writeBigUInt64LE(BigInt(value), offset);
  const entries = {
    epoch: "10", curveType: 0, index: 0, migrateFee: "100000000", tradeFeeRate: "2500",
    maxShareFeeRate: "100000", minSupplyA: "10000000", maxLockRate: "800000",
    minSellRateA: "200000", minMigrateRateA: "150000", minFundRaisingB: "24000000000",
    mintB: WSOL, requiresPlatformAuth: false
  };
  set64(globalData, 8, entries.epoch);
  globalData.writeUInt8(0, 16);
  globalData.writeUInt16LE(0, 17);
  for (const [key, offset] of [
    ["migrateFee", 19], ["tradeFeeRate", 27], ["maxShareFeeRate", 35],
    ["minSupplyA", 43], ["maxLockRate", 51], ["minSellRateA", 59],
    ["minMigrateRateA", 67], ["minFundRaisingB", 75]
  ]) set64(globalData, offset, entries[key]);
  Buffer.from(decodeBase58(WSOL)).copy(globalData, 83);
  globalData.writeUInt8(0, 243);
  set64(platformData, 80, "100000");
  set64(platformData, 88, "0");
  set64(platformData, 96, "900000");
  set64(platformData, 104, "7500");
  set64(platformData, 720, "500");
  const toAccount = bytes => ({ owner: program, executable: false, data: [bytes.toString("base64"), "base64"] });
  const accounts = {
    [target.globalConfig]: toAccount(globalData),
    [target.platformConfig]: toAccount(platformData)
  };
  const api = { success: true, data: { data: [{
    key: { ...entries, pubKey: target.globalConfig },
    defaultParams: { supplyInit: "1000000000000000", totalSellA: "793100000000000", totalFundRaisingB: "85000000000" }
  }] } };
  modify({ api, accounts, globalData, platformData, target });
  return { api, accounts, target };
};
function fakeFetch(modify = () => {}) {
  const calls = [];
  const fixtures = Object.fromEntries(["mainnet", "devnet"].map(cluster => [cluster, fixture(cluster, data => modify(cluster, data))]));
  const fetchImpl = async (url, init = {}) => {
    const cluster = url.includes("devnet") ? "devnet" : "mainnet";
    const chosen = fixtures[cluster];
    if (!chosen) throw new Error("Unexpected endpoint");
    calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : null });
    if (url === chosen.target.api && !init.method)
      return new Response(JSON.stringify(chosen.api), { status: 200 });
    if (url === chosen.target.rpc && init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.method, "getMultipleAccounts");
      assert.equal(body.jsonrpc, "2.0");
      assert.equal(body.id, "climboria-launch-config-joint-readonly");
      assert.deepEqual(body.params[0], [chosen.target.globalConfig, chosen.target.platformConfig]);
      assert.equal(body.params[1].encoding, "base64");
      assert.equal(body.params[1].commitment, "finalized");
      assert.equal(Object.hasOwn(body.params[1], "dataSlice"), false);
      return Response.json({ jsonrpc: "2.0", id: body.id,
        result: { context: { slot: cluster === "mainnet" ? 240 : 241 },
          value: body.params[0].map(address => chosen.accounts[address] ?? null) } });
    }
    throw new Error("Unexpected method or endpoint");
  };
  return { fetchImpl, calls, fixtures };
}
test("reads both configs per cluster from exactly ONE finalized getMultipleAccounts without signing", async () => {
  const { fetchImpl, calls } = fakeFetch();
  const report = await runLiveConfigCheck(fetchImpl);
  assert.equal(report.pass, true, JSON.stringify(report.results.filter(x => !x.pass)));
  assert.equal(report.approvalToLaunch, false);
  assert.equal(report.transactionSubmitted, false);
  assert.deepEqual(report.results.map(x => x.cluster), ["mainnet", "devnet"]);
  assert.ok(report.results.every(x => x.economics.pass && x.global.mintB === WSOL));
  assert.equal(calls.length, 4);
  assert.equal(calls.filter(x => x.method === "GET").length, 2);
  assert.equal(calls.filter(x => x.method === "POST").length, 2);
  assert.ok(calls.filter(x => x.method === "POST").every(x => x.body.method === "getMultipleAccounts"));
  assert.deepEqual(report.results.map(x => x.providerReportedFinalizedContextSlot), [240, 241]);
  assert.ok(report.results.every(x => x.bothConfigsFromOneFinalizedRpcResponse === true));
  assert.ok(report.results.every(x => x.independentlyAuthenticatedLedgerSnapshot === false));
  assert.ok(report.results.every(x => x.sdkIdlSemanticCompatibilityVerified === false));
});
test("rejects API/on-chain fee drift even when candidate economics otherwise pass", async () => {
  const { fetchImpl } = fakeFetch((cluster, d) => {
    if (cluster === "mainnet") d.api.data.data[0].key.tradeFeeRate = "2501";
  });
  const report = await runLiveConfigCheck(fetchImpl);
  assert.equal(report.pass, false);
  assert.match(report.results[0].blockers[0], /drift: tradeFeeRate/);
  assert.equal(report.results[1].pass, true);
});
test("fails closed for unsafe numeric API fields, wrong quote mint and missing config", async () => {
  for (const update of [
    d => { d.api.data.data[0].key.minFundRaisingB = Number.MAX_SAFE_INTEGER + 4; },
    d => { d.api.data.data[0].key.mintB = "11111111111111111111111111111111"; },
    d => { d.api.data.data = []; }
  ]) {
    const { fetchImpl } = fakeFetch((cluster, d) => { if (cluster === "devnet") update(d); });
    const report = await runLiveConfigCheck(fetchImpl);
    assert.equal(report.pass, false);
    assert.equal(report.results[0].pass, true);
    assert.equal(report.results[1].pass, false);
  }
});
test("rejects missing, wrong-owner, truncated and wrong-discriminator accounts", async () => {
  for (const update of [
    d => { d.accounts[d.target.globalConfig] = null; },
    d => { d.accounts[d.target.globalConfig].owner = "11111111111111111111111111111111"; },
    d => { d.accounts[d.target.platformConfig].data[0] = Buffer.alloc(90).toString("base64"); },
    d => { const bytes = Buffer.from(d.accounts[d.target.globalConfig].data[0], "base64"); bytes[0] ^= 255; d.accounts[d.target.globalConfig].data[0] = bytes.toString("base64"); }
  ]) {
    const { fetchImpl } = fakeFetch((cluster, d) => { if (cluster === "mainnet") update(d); });
    const report = await runLiveConfigCheck(fetchImpl);
    assert.equal(report.pass, false);
    assert.equal(report.results[0].pass, false);
  }
});
test("rejects unsafe fundraising or LP distribution, without submitting a transaction", async () => {
  for (const update of [
    d => { d.api.data.data[0].defaultParams.totalFundRaisingB = "1"; },
    d => { const bytes = Buffer.from(d.accounts[d.target.platformConfig].data[0], "base64"); bytes.writeBigUInt64LE(800000n, 96); d.accounts[d.target.platformConfig].data[0] = bytes.toString("base64"); }
  ]) {
    const { fetchImpl, calls } = fakeFetch((cluster, d) => { if (cluster === "devnet") update(d); });
    const report = await runLiveConfigCheck(fetchImpl);
    assert.equal(report.pass, false);
    assert.equal(report.results[1].pass, false);
    assert.ok(calls.every(x => x.method === "GET" || x.body.method === "getMultipleAccounts"));
  }
});
test("direct decoder validates ownership and fields before economics", () => {
  const d = fixture("mainnet");
  const parsed = decodeConfigAccounts(d.accounts[d.target.globalConfig], d.accounts[d.target.platformConfig], PROGRAMS.mainnet.launchpad);
  assert.equal(parsed.global.minFundRaisingB, "24000000000");
  assert.equal(parsed.platform.creatorFeeRate, "500");
  assert.equal(parsed.scaleTotal, "1000000");
  assert.equal(assertApiMatchesChain(d.api.data.data[0], parsed.global, d.target.globalConfig), true);
});
