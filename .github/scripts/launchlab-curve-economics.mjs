/**
 * Read-only Raydium LaunchLab economics validator.
 * This is an offline preflight of candidate/API defaults, NOT an on-chain
 * approval, transaction builder, token launch, or custody mechanism.
 */
export const DENOMINATOR = 1_000_000n;
export const WSOL = "So11111111111111111111111111111111111111112";
const MAX_U64 = (1n << 64n) - 1n;

function asU64(value, label) {
  const raw = typeof value === "bigint" ? String(value) :
    typeof value === "number" && Number.isSafeInteger(value) ? String(value) :
    typeof value === "string" ? value : "";
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) throw new Error(label + " must be a nonnegative exact integer string");
  const parsed = BigInt(raw);
  if (parsed > MAX_U64) throw new Error(label + " exceeds u64");
  return parsed;
}

export function validateLaunchCurveDefaults({
  config, global, platform, baseDecimals = 6, totalLockedAmount = 0n, shareFeeRate = 0n
} = {}) {
  if (!Number.isInteger(baseDecimals) || baseDecimals < 0 || baseDecimals > 18)
    throw new Error("baseDecimals must be an integer in 0..18");
  if (!config?.defaultParams || !global || !platform) throw new Error("Launch config, global and platform fields are required");
  const p = config.defaultParams;
  const supply = asU64(p.supplyInit, "supplyInit");
  const totalSell = asU64(p.totalSellA, "totalSellA");
  const totalRaise = asU64(p.totalFundRaisingB, "totalFundRaisingB");
  const locked = asU64(totalLockedAmount, "totalLockedAmount");
  const minSupply = asU64(global.minSupplyA, "minSupplyA") * (10n ** BigInt(baseDecimals));
  const minSellRate = asU64(global.minSellRateA, "minSellRateA");
  const minMigrateRate = asU64(global.minMigrateRateA, "minMigrateRateA");
  const maxLockRate = asU64(global.maxLockRate, "maxLockRate");
  const minRaise = asU64(global.minFundRaisingB, "minFundRaisingB");
  const migrateFee = asU64(global.migrateFee ?? "0", "migrateFee");
  const tradeFee = asU64(global.tradeFeeRate, "tradeFeeRate");
  const platformFee = asU64(platform.feeRate, "platform.feeRate");
  const creatorFee = asU64(platform.creatorFeeRate, "platform.creatorFeeRate");
  const shareFee = asU64(shareFeeRate, "shareFeeRate");
  const minSell = supply * minSellRate / DENOMINATOR;
  const minMigrate = supply * minMigrateRate / DENOMINATOR;
  const maxLocked = supply * maxLockRate / DENOMINATOR;
  const migrationAmount = supply - totalSell - locked;
  const totalFee = tradeFee + platformFee + creatorFee + shareFee;
  const checks = {
    rateBoundsValid: [minSellRate, minMigrateRate, maxLockRate, tradeFee, platformFee, creatorFee, shareFee].every(x => x <= DENOMINATOR),
    supplyPositive: supply > 0n,
    supplyAtLeastMinimum: supply >= minSupply,
    totalSellPositive: totalSell > 0n,
    totalSellWithinSupply: totalSell + locked <= supply,
    totalSellAtLeastMinimum: totalSell >= minSell,
    totalLockedWithinMaximum: locked <= maxLocked,
    migrationAmountAtLeastMinimum: migrationAmount >= minMigrate,
    quoteRaiseAtLeastMinimum: totalRaise >= minRaise,
    quoteRaiseExceedsMigrationFee: totalRaise > migrateFee,
    quoteMintIsWsol: global.mintB === WSOL,
    curveTypeIsConstantProduct: global.curveType === 0 || global.curveType === "0",
    totalFeeRateWithinDenominator: totalFee <= DENOMINATOR
  };
  return {
    pass: Object.values(checks).every(Boolean),
    readOnly: true,
    transactionSubmitted: false,
    preliminaryOnly: true,
    checks,
    amounts: {
      supply: String(supply), totalSellA: String(totalSell),
      totalFundRaisingB: String(totalRaise), totalLockedAmount: String(locked),
      migrationAmount: String(migrationAmount), migrateFee: String(migrateFee),
      minSupplyUnits: String(minSupply), minSellUnits: String(minSell),
      minMigrateUnits: String(minMigrate), maxLockedUnits: String(maxLocked)
    },
    rates: {
      denominator: String(DENOMINATOR), protocol: String(tradeFee),
      platform: String(platformFee), creator: String(creatorFee),
      share: String(shareFee), total: String(totalFee)
    }
  };
}
