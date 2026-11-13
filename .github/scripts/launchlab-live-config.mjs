#!/usr/bin/env node
/**
 * Read-only LaunchLab configuration consistency check.
 * Raydium launch config GET + finalized Solana getAccountInfo only.
 * NO wallet, no keys, no transaction builder, no token creation.
 *
 * Historical addresses below are candidate references: this module checks
 * account ownership, Anchor account discriminator, byte lengths, and API drift.
 * A passing result is NOT approval of fees, custody or mainnet token launches.
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PROGRAMS, encodeBase58 } from "./launchlab-provenance.mjs";
import { validateLaunchCurveDefaults, WSOL, DENOMINATOR } from "./launchlab-curve-economics.mjs";

export const CONFIG_TARGETS = Object.freeze({
  mainnet: Object.freeze({
    rpc: "https://api.mainnet-beta.solana.com",
    api: "https://launch-mint-v1.raydium.io/main/configs",
    globalConfig: "6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX",
    platformConfig: "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4"
  }),
  devnet: Object.freeze({
    rpc: "https://api.devnet.solana.com",
    api: "https://launch-mint-v1-devnet.raydium.io/main/configs",
    globalConfig: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
    platformConfig: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a"
  })
});

const U64_MAX = (1n << 64n) - 1n;
function integer(value, label) {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new Error(label + " is not a safe JSON integer");
  const s = typeof value === "bigint" || typeof value === "number" ? String(value) : value;
  if (typeof s !== "string" || !/^(0|[1-9]\d*)$/.test(s) || BigInt(s) > U64_MAX)
    throw new Error(label + " is not a valid u64");
  return s;
}
function stringBool(value, label) {
  if (value === true || value === 1 || value === "1") return "1";
  if (value === false || value === 0 || value === "0") return "0";
  throw new Error(label + " is not an exact boolean");
}
function keyAt(data, offset) {
  if (offset < 0 || offset + 32 > data.length) throw new Error("Out-of-bounds public key");
  return encodeBase58(data.subarray(offset, offset + 32));
}
function accountBytes(account, program, name, length) {
  if (!account || account.owner !== program || account.executable !== false)
    throw new Error(name + " missing, executable or not owned by LaunchLab");
  const value = account.data;
  if (!Array.isArray(value) || value[1] !== "base64" || typeof value[0] !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value[0]))
    throw new Error(name + " must be canonical base64 data");
  const data = Buffer.from(value[0], "base64");
  if (data.toString("base64") !== value[0] || data.length !== length)
    throw new Error(name + " account length/base64 mismatch (expected " + length + ")");
  const expected = createHash("sha256").update("account:" + name).digest().subarray(0, 8);
  if (!data.subarray(0, 8).equals(expected))
    throw new Error(name + " Anchor discriminator mismatch");
  return data;
}
export function decodeConfigAccounts(globalAccount, platformAccount, programId) {
  const gd = accountBytes(globalAccount, programId, "GlobalConfig", 371);
  const pd = accountBytes(platformAccount, programId, "PlatformConfig", 944);
  const u64 = (bytes, offset) => String(bytes.readBigUInt64LE(offset));
  const global = {
    epoch: u64(gd, 8), curveType: gd.readUInt8(16), index: gd.readUInt16LE(17),
    migrateFee: u64(gd, 19), tradeFeeRate: u64(gd, 27),
    maxShareFeeRate: u64(gd, 35), minSupplyA: u64(gd, 43),
    maxLockRate: u64(gd, 51), minSellRateA: u64(gd, 59),
    minMigrateRateA: u64(gd, 67), minFundRaisingB: u64(gd, 75),
    mintB: keyAt(gd, 83), requiresPlatformAuth: gd.readUInt8(243)
  };
  if (global.requiresPlatformAuth > 1) throw new Error("GlobalConfig platform auth tag malformed");
  const platform = {
    platformScale: u64(pd, 80), creatorScale: u64(pd, 88),
    burnScale: u64(pd, 96), feeRate: u64(pd, 104),
    creatorFeeRate: u64(pd, 720),
    claimFeeWallet: keyAt(pd, 16),
    lockNftWallet: keyAt(pd, 48),
    cpmmConfigId: keyAt(pd, 688)
  };
  const scaleTotal = BigInt(platform.platformScale) + BigInt(platform.creatorScale) + BigInt(platform.burnScale);
  if (scaleTotal !== DENOMINATOR) throw new Error("PlatformConfig LP scale sum is not 1,000,000");
  if (pd.readUInt8(832) > 1 || pd.readUInt8(833) > 1)
    throw new Error("PlatformConfig restriction flags malformed");
  return { global, platform, scaleTotal: String(scaleTotal) };
}
export function assertApiMatchesChain(config, global, configAddress) {
  if (config?.key?.pubKey !== configAddress) throw new Error("API selected different GlobalConfig account");
  const fields = ["epoch", "migrateFee", "curveType", "index", "tradeFeeRate",
    "maxShareFeeRate", "minSupplyA", "maxLockRate", "minSellRateA",
    "minMigrateRateA", "minFundRaisingB"];
  for (const field of fields) {
    const actual = integer(config.key[field], "API " + field);
    if (actual !== String(global[field])) throw new Error("API/on-chain GlobalConfig drift: " + field);
  }
  if (config.key.mintB !== global.mintB) throw new Error("API/on-chain quote mint drift");
  if (stringBool(config.key.requiresPlatformAuth, "API requiresPlatformAuth") !== String(global.requiresPlatformAuth))
    throw new Error("API/on-chain platform-auth drift");
  if (global.mintB !== WSOL || global.curveType !== 0 || global.index !== 0)
    throw new Error("Pinned GlobalConfig is not WSOL constant-product curve index zero");
  return true;
}
async function json(fetchImpl, url, init = {}) {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + new URL(url).host);
  return response.json();
}
async function getFinalizedAccount(fetchImpl, target, address) {
  const response = await json(fetchImpl, target.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: "climboria-launch-config-readonly",
      method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }]
    })
  });
  if (response.error) throw new Error("Solana RPC error: " + (response.error.message || "unknown"));
  return response.result?.value ?? null;
}
export async function inspectLaunchConfigCluster(fetchImpl, cluster) {
  const target = CONFIG_TARGETS[cluster], programId = PROGRAMS[cluster]?.launchpad;
  if (!target || !programId) throw new Error("Unsupported cluster");
  const api = await json(fetchImpl, target.api);
  if (api?.success !== true || !Array.isArray(api.data?.data))
    throw new Error(cluster + " LaunchLab API config response is malformed");
  const configs = api.data.data.filter(item => item?.key?.pubKey === target.globalConfig);
  if (configs.length !== 1) throw new Error(cluster + " API has missing/duplicate pinned WSOL GlobalConfig");
  const config = configs[0];
  const [ga, pa] = await Promise.all([
    getFinalizedAccount(fetchImpl, target, target.globalConfig),
    getFinalizedAccount(fetchImpl, target, target.platformConfig)
  ]);
  const decoded = decodeConfigAccounts(ga, pa, programId);
  assertApiMatchesChain(config, decoded.global, target.globalConfig);
  const economics = validateLaunchCurveDefaults({
    config,
    global: decoded.global,
    platform: decoded.platform
  });
  if (!economics.pass) {
    const failed = Object.entries(economics.checks).filter(([, ok]) => !ok).map(([key]) => key);
    throw new Error(cluster + " unsafe LaunchLab curve defaults: " + failed.join(", "));
  }
  return {
    cluster, pass: true, readOnly: true, transactionSubmitted: false,
    candidateAccountReferences: true,
    apiUrl: target.api, rpc: target.rpc, programId,
    globalConfig: target.globalConfig, platformConfig: target.platformConfig,
    global: decoded.global, platform: decoded.platform, economics,
    configAccountLengths: { global: 371, platform: 944 },
    note: "Preliminary read-only consistency ONLY: pinned platform attribution, SDK/IDL semantics, authority/custody policies and real Devnet lifecycle still require independent verification."
  };
}
export async function runLiveConfigCheck(fetchImpl = fetch) {
  const results = [];
  for (const cluster of ["mainnet", "devnet"]) {
    try { results.push(await inspectLaunchConfigCluster(fetchImpl, cluster)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error?.message || error)] }); }
  }
  return {
    checkedAt: new Date().toISOString(), pass: results.every(x => x.pass),
    readOnly: true, transactionSubmitted: false, approvalToLaunch: false, results
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await runLiveConfigCheck();
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
