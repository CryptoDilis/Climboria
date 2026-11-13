import test from "node:test";
import assert from "node:assert/strict";
import { validateLaunchCurveDefaults, WSOL } from "./launchlab-curve-economics.mjs";

// Reference-only candidate default params from the older LaunchLab audit.
// Not proof that either cluster currently has these values.
const fixture = () => ({
  config: { defaultParams: {
    supplyInit: "1000000000000000",
    totalSellA: "793100000000000",
    totalFundRaisingB: "85000000000"
  } },
  global: {
    minSupplyA: "10000000", maxLockRate: "800000",
    minSellRateA: "200000", minMigrateRateA: "150000",
    minFundRaisingB: "24000000000", migrateFee: "100000000",
    mintB: WSOL, curveType: 0, tradeFeeRate: "2500"
  },
  platform: { feeRate: "7500", creatorFeeRate: "500" }
});

test("valid reference fixture passes exact integer WSOL curve-zero economics", () => {
  const result = validateLaunchCurveDefaults(fixture());
  assert.equal(result.pass, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.transactionSubmitted, false);
  assert.equal(result.preliminaryOnly, true);
  assert.equal(result.amounts.migrationAmount, "206900000000000");
  assert.equal(result.rates.total, "10500");
});

test("rejects wrong quote token or non-constant-product curve", () => {
  const a = fixture();
  a.global.mintB = "11111111111111111111111111111111";
  assert.equal(validateLaunchCurveDefaults(a).checks.quoteMintIsWsol, false);
  const b = fixture();
  b.global.curveType = 1;
  assert.equal(validateLaunchCurveDefaults(b).checks.curveTypeIsConstantProduct, false);
});

test("rejects inadequate raise and migration fee coverage", () => {
  const a = fixture();
  a.config.defaultParams.totalFundRaisingB = "1";
  assert.equal(validateLaunchCurveDefaults(a).checks.quoteRaiseAtLeastMinimum, false);
  const b = fixture();
  b.config.defaultParams.totalFundRaisingB = "100000000";
  assert.equal(validateLaunchCurveDefaults(b).checks.quoteRaiseExceedsMigrationFee, false);
});

test("rejects an overcommitted sell amount or insufficient migration allocation", () => {
  const a = fixture();
  a.config.defaultParams.totalSellA = "900000000000000";
  assert.equal(validateLaunchCurveDefaults(a).checks.migrationAmountAtLeastMinimum, false);
  const b = fixture();
  b.config.defaultParams.totalSellA = "1000000000000001";
  assert.equal(validateLaunchCurveDefaults(b).checks.totalSellWithinSupply, false);
  const c = fixture();
  assert.equal(validateLaunchCurveDefaults({ ...c, totalLockedAmount: "900000000000000" }).checks.totalLockedWithinMaximum, false);
});

test("rejects excessive fee totals and out-of-range per-rate values", () => {
  const a = fixture();
  a.platform.feeRate = "999000";
  assert.equal(validateLaunchCurveDefaults(a).checks.totalFeeRateWithinDenominator, false);
  const b = fixture();
  b.global.minSellRateA = "1000001";
  assert.equal(validateLaunchCurveDefaults(b).checks.rateBoundsValid, false);
});

test("fails closed for malformed, fractional, signed or unsafe precision values", () => {
  for (const value of ["-1", "1.25", "1e10", " 123", "18446744073709551616", Number.MAX_SAFE_INTEGER + 1]) {
    const params = fixture();
    params.config.defaultParams.supplyInit = value;
    assert.throws(() => validateLaunchCurveDefaults(params), /nonnegative exact integer|exceeds u64/, String(value));
  }
  const invalid = fixture();
  invalid.global.minFundRaisingB = undefined;
  assert.throws(() => validateLaunchCurveDefaults(invalid), /minFundRaisingB/);
  assert.throws(() => validateLaunchCurveDefaults({ ...fixture(), baseDecimals: 19 }), /baseDecimals/);
  assert.throws(() => validateLaunchCurveDefaults({ config: {} }), /required/);
});
