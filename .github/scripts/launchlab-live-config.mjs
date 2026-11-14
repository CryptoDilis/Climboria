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
const RPC_REQUEST_ID = "climboria-launch-config-joint-readonly";
const API_RESPONSE_MAX_BYTES = 512 * 1024;
const RPC_RESPONSE_MAX_BYTES = 64 * 1024;

// Operator-only, read-only upstream capture; never allocate unbounded API/RPC
// response text. A single provider claim is NOT a chain-state attestation.
async function json(fetchImpl, url, init = {}, maxBytes = API_RESPONSE_MAX_BYTES) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...init, redirect: "error", signal: AbortSignal.timeout(20000)
    });
  } catch { throw new Error("LaunchLab read-only provider request failed or redirected"); }
  if (!response?.ok) throw new Error("LaunchLab read-only provider unavailable (HTTP " + response?.status + ")");
  if (!response.body || typeof response.body.getReader !== "function")
    throw new Error("LaunchLab provider response has no readable stream");
  const declared = response.headers?.get?.("content-length");
  if (declared !== null && declared !== undefined) {
    if (!/^[0-9]{1,20}$/.test(declared) || BigInt(declared) > BigInt(maxBytes))
      throw new Error("LaunchLab provider response exceeded byte limit");
  }
  let reader;
  try { reader = response.body.getReader(); }
  catch { throw new Error("LaunchLab provider stream unavailable"); }
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("LaunchLab provider stream invalid");
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        throw new Error("LaunchLab provider response exceeded byte limit");
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    if (error?.message === "LaunchLab provider response exceeded byte limit" ||
        error?.message === "LaunchLab provider stream invalid") throw error;
    throw new Error("LaunchLab provider read failed");
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal:true }).decode(Buffer.concat(chunks,total)));
  } catch { throw new Error("LaunchLab provider returned invalid JSON"); }
}

/**
 * One finalized Solana JSON-RPC getMultipleAccounts for both exact config
 * addresses. Both payloads share ONE provider-reported context slot.
 * The returned slot, owner and content are not independently authenticated;
 * existing critical IDL type/constraint mismatches still block any launch.
 */
export async function getFinalizedConfigSnapshot(fetchImpl, target) {
  if (!target?.rpc || !target?.globalConfig || !target?.platformConfig ||
      target.globalConfig === target.platformConfig)
    throw new Error("Invalid pinned LaunchLab configuration target");
  const payload = await json(fetchImpl, target.rpc, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: RPC_REQUEST_ID, method: "getMultipleAccounts",
      params: [[target.globalConfig, target.platformConfig],
        { encoding: "base64", commitment: "finalized" }]
    })
  }, RPC_RESPONSE_MAX_BYTES);
  if (payload?.jsonrpc !== "2.0" || payload.id !== RPC_REQUEST_ID ||
      payload.error !== undefined || !Number.isSafeInteger(payload?.result?.context?.slot) ||
      payload.result.context.slot <= 0 || !Array.isArray(payload?.result?.value) ||
      payload.result.value.length !== 2 || payload.result.value.some(item => !item)) {
    throw new Error("Invalid joint finalized LaunchLab RPC config response");
  }
  return {
    slot: payload.result.context.slot,
    globalAccount: payload.result.value[0],
    platformAccount: payload.result.value[1]
  };
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
  const snapshot = await getFinalizedConfigSnapshot(fetchImpl, target);
  const decoded = decodeConfigAccounts(snapshot.globalAccount, snapshot.platformAccount, programId);
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
    providerReportedFinalizedContextSlot: snapshot.slot,
    bothConfigsFromOneFinalizedRpcResponse: true,
    independentlyAuthenticatedLedgerSnapshot: false,
    sdkIdlSemanticCompatibilityVerified: false,
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
