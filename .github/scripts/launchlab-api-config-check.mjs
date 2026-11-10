#!/usr/bin/env node
/**
 * Validate Raydium's live launch-config API against finalized on-chain WSOL/curve-0 config.
 * Read-only GET + getAccountInfo only; no wallet, signing, or transaction submission.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(`${process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools"}/package.json`);
const { PublicKey } = require("@solana/web3.js");

const DENOMINATOR = 1_000_000n;
const WSOL = "So11111111111111111111111111111111111111112";
const CLUSTERS = {
  mainnet: {
    api: "https://launch-mint-v1.raydium.io/main/configs",
    rpc: "https://api.mainnet-beta.solana.com",
    program: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
    globalConfig: "6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX",
    platformConfig: "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4"
  },
  devnet: {
    api: "https://launch-mint-v1-devnet.raydium.io/main/configs",
    rpc: "https://api.devnet.solana.com",
    program: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    globalConfig: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
    platformConfig: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a"
  }
};
const sha = value => createHash("sha256").update(value).digest("hex");
const u64 = (data, offset) => data.readBigUInt64LE(offset);
async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}
async function getAccount(rpc, address) {
  const res = await fetch(rpc, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-launch-config-readonly", method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }] }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Solana RPC error");
  return json.result?.value ?? null;
}
export function validateCurveDefaults({ config, global, platform, baseDecimals = 6, totalLockedAmount = 0n, shareFeeRate = 0n }) {
  const p = config.defaultParams;
  const supply = BigInt(p.supplyInit), totalSell = BigInt(p.totalSellA), totalRaise = BigInt(p.totalFundRaisingB);
  const minSupply = BigInt(global.minSupplyA) * (10n ** BigInt(baseDecimals));
  const minSell = supply * BigInt(global.minSellRateA) / DENOMINATOR;
  const minMigrate = supply * BigInt(global.minMigrateRateA) / DENOMINATOR;
  const maxLocked = supply * BigInt(global.maxLockRate) / DENOMINATOR;
  const migrateAmount = supply - totalSell - totalLockedAmount;
  const checks = {
    supplyPositive: supply > 0n,
    supplyAtLeastMinimum: supply >= minSupply,
    totalSellPositive: totalSell > 0n,
    totalSellWithinSupply: totalSell <= supply - totalLockedAmount,
    totalSellAtLeastMinimum: totalSell >= minSell,
    totalLockedWithinMaximum: totalLockedAmount <= maxLocked,
    migrationAmountAtLeastMinimum: migrateAmount >= minMigrate,
    quoteRaiseAtLeastMinimum: totalRaise >= BigInt(global.minFundRaisingB),
    quoteMintIsWsol: global.mintB === WSOL,
    curveTypeIsConstantProduct: Number(global.curveType) === 0,
    totalFeeRateWithinDenominator: BigInt(global.tradeFeeRate) + BigInt(platform.feeRate) + BigInt(platform.creatorFeeRate) + shareFeeRate <= DENOMINATOR
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    amounts: { supply: supply.toString(), totalSellA: totalSell.toString(), totalFundRaisingB: totalRaise.toString(), totalLockedAmount: totalLockedAmount.toString(), minSupplyUnits: minSupply.toString(), minSellUnits: minSell.toString(), minMigrateUnits: minMigrate.toString(), migrateAmount: migrateAmount.toString(), maxLockedUnits: maxLocked.toString() },
    rates: { denominator: DENOMINATOR.toString(), protocol: String(global.tradeFeeRate), platform: String(platform.feeRate), creator: String(platform.creatorFeeRate), share: shareFeeRate.toString(), total: (BigInt(global.tradeFeeRate) + BigInt(platform.feeRate) + BigInt(platform.creatorFeeRate) + shareFeeRate).toString() }
  };
}
async function verifyCluster(cluster) {
  const target = CLUSTERS[cluster];
  const api = await getJson(target.api);
  if (api.success !== true || !Array.isArray(api.data?.data)) throw new Error(`${cluster}: unexpected Launch Config API response shape`);
  const config = api.data.data.find(x => x.key?.pubKey === target.globalConfig);
  if (!config) throw new Error(`${cluster}: WSOL curve-0 GlobalConfig not found in live API response`);
  if (config.key.mintB !== WSOL || Number(config.key.curveType) !== 0 || Number(config.key.index) !== 0) throw new Error(`${cluster}: selected config is not WSOL / curve type 0 / index 0`);
  const [globalAccount, platformAccount] = await Promise.all([
    getAccount(target.rpc, target.globalConfig), getAccount(target.rpc, target.platformConfig)
  ]);
  if (!globalAccount || globalAccount.owner !== target.program || !platformAccount || platformAccount.owner !== target.program) throw new Error(`${cluster}: GlobalConfig/PlatformConfig missing or wrong owner`);
  const gd = Buffer.from(globalAccount.data[0], "base64"), pd = Buffer.from(platformAccount.data[0], "base64");
  if (gd.length !== 371 || pd.length !== 944) throw new Error(`${cluster}: unexpected config account lengths`);
  const global = {
    epoch: u64(gd, 8).toString(), curveType: gd.readUInt8(16), index: gd.readUInt16LE(17),
    tradeFeeRate: u64(gd, 27).toString(), maxShareFeeRate: u64(gd, 35).toString(),
    minSupplyA: u64(gd, 43).toString(), maxLockRate: u64(gd, 51).toString(),
    minSellRateA: u64(gd, 59).toString(), minMigrateRateA: u64(gd, 67).toString(),
    minFundRaisingB: u64(gd, 75).toString(), mintB: new PublicKey(gd.subarray(83,115)).toBase58()
  };
  const platform = { feeRate: u64(pd,104).toString(), creatorFeeRate: u64(pd,720).toString() };
  for (const key of ["epoch","curveType","index","tradeFeeRate","maxShareFeeRate","minSupplyA","maxLockRate","minSellRateA","minMigrateRateA","minFundRaisingB","mintB"]) {
    if (String(config.key[key]) !== String(global[key])) throw new Error(`${cluster}: API/on-chain GlobalConfig mismatch for ${key}`);
  }
  const validation = validateCurveDefaults({ config, global, platform });
  return {
    cluster, apiUrl: target.api, apiResponseSha256: sha(JSON.stringify(api)),
    configId: config.key.pubKey, apiResponseShape: "success.data.data[]",
    epoch: global.epoch, curveType: global.curveType, curveName: "Constant Product",
    quoteMint: global.mintB, quoteSymbol: config.mintInfoB?.symbol, quoteDecimals: config.mintInfoB?.decimals,
    baseDecimalsDefaultedBySdk: 6, defaultParams: config.defaultParams,
    onchainGlobalConfigMatchesApi: true, onchainPlatformConfig: platform,
    feeDenominator: DENOMINATOR.toString(), validation,
    transactionSubmitted: false
  };
}
export async function runLiveLaunchConfigCheck() {
  const results = [];
  for (const cluster of ["mainnet","devnet"]) {
    try { results.push(await verifyCluster(cluster)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error.message || error)] }); }
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, transactionSubmitted: false, pass: results.every(x => x.validation?.pass === true), results };
}
if (process.argv[1]?.endsWith("launchlab-api-config-check.mjs")) {
  const report = await runLiveLaunchConfigCheck();
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
