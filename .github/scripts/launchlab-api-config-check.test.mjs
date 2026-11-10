import test from "node:test";
import assert from "node:assert/strict";
import { validateCurveDefaults } from "./launchlab-api-config-check.mjs";

const valid = {
  config: { defaultParams: { supplyInit: "1000000000000000", totalSellA: "793100000000000", totalFundRaisingB: "85000000000" } },
  global: { minSupplyA: "10000000", maxLockRate: "800000", minSellRateA: "200000", minMigrateRateA: "150000", minFundRaisingB: "24000000000", mintB: "So11111111111111111111111111111111111111112", curveType: 0, tradeFeeRate: "2500" },
  platform: { feeRate: "7500", creatorFeeRate: "500" }
};
test("accepts actual WSOL constant-product defaults that satisfy curve constraints", () => {
  const result = validateCurveDefaults(valid);
  assert.equal(result.pass, true);
  assert.equal(result.amounts.migrateAmount, "206900000000000");
  assert.equal(result.rates.total, "10500");
});
test("rejects defaults below minimum quote raise", () => {
  const invalid = structuredClone(valid);
  invalid.config.defaultParams.totalFundRaisingB = "1";
  const result = validateCurveDefaults(invalid);
  assert.equal(result.pass, false);
  assert.equal(result.checks.quoteRaiseAtLeastMinimum, false);
});
test("rejects defaults with insufficient migration amount", () => {
  const invalid = structuredClone(valid);
  invalid.config.defaultParams.totalSellA = "900000000000000";
  const result = validateCurveDefaults(invalid);
  assert.equal(result.pass, false);
  assert.equal(result.checks.migrationAmountAtLeastMinimum, false);
});
test("rejects fee totals above the protocol denominator", () => {
  const invalid = structuredClone(valid);
  invalid.platform.feeRate = "999000";
  const result = validateCurveDefaults(invalid);
  assert.equal(result.pass, false);
  assert.equal(result.checks.totalFeeRateWithinDenominator, false);
});
