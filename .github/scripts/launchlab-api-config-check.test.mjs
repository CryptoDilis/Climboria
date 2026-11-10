import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { decodeConfigDestinations, validateCpmmMigrationAccounts, validateCurveDefaults } from "./launchlab-api-config-check.mjs";
const require = createRequire("/tmp/launchlab-tools/package.json");
const { PublicKey } = require("@solana/web3.js");

const valid = {
  config: { defaultParams: { supplyInit: "1000000000000000", totalSellA: "793100000000000", totalFundRaisingB: "85000000000" } },
  global: { minSupplyA: "10000000", maxLockRate: "800000", minSellRateA: "200000", minMigrateRateA: "150000", minFundRaisingB: "24000000000", migrateFee: "100000000", mintB: "So11111111111111111111111111111111111111112", curveType: 0, tradeFeeRate: "2500" },
  platform: { feeRate: "7500", creatorFeeRate: "500" }
};
test("requires executable CPMM and LP-lock programs plus a present CPMM create-pool fee account", () => {
  const target = {
    cpmmProgram: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    cpmmFeeAccount: "DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8",
    cpmmAdmin: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ",
    cpmmProtocolOwner: "ProCXqRcXJjoUd1RNoo28bSizAA6EEqt9wURZYPDc5u",
    cpmmFundOwner: "FUNDduJTA7XcckKHKfAoEnnhuSud2JUCUZv6opWEjrBU",
    lockProgram: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
    lockAuthority: "3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH",
  };
  const feeData = Buffer.alloc(165);
  const cpmmConfigData = Buffer.alloc(236);
  new PublicKey(target.cpmmProtocolOwner).toBuffer().copy(cpmmConfigData, 44);
  new PublicKey(target.cpmmFundOwner).toBuffer().copy(cpmmConfigData, 76);
  cpmmConfigData.writeBigUInt64LE(99n, 36);
  new PublicKey("So11111111111111111111111111111111111111112").toBuffer().copy(feeData, 0);
  new PublicKey(target.cpmmAdmin).toBuffer().copy(feeData, 32);
  feeData.writeBigUInt64LE(42n, 64);
  feeData.writeUInt8(1, 108);
  const result = validateCpmmMigrationAccounts({
    cpmmProgramAccount: { executable: true },
    lockProgramAccount: { executable: true },
    cpmmFeeAccount: { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", lamports: 123, data: [feeData.toString("base64"), "base64"] },
    cpmmConfigAccount: { owner: target.cpmmProgram, data: [cpmmConfigData.toString("base64"), "base64"] },
    target: { ...target, cpmmConfigId: "11111111111111111111111111111113" },
    PublicKey,
  });
  assert.equal(result.cpmmProgramExecutable, true);
  assert.equal(result.lockProgramExecutable, true);
  assert.equal(result.cpmmCreatePoolFeeAccount, target.cpmmFeeAccount);
  assert.equal(result.cpmmCreatePoolFeeAccountLamports, "123");
  assert.equal(result.cpmmCreatePoolFeeTokenAmount, "42");
  assert.equal(result.cpmmCreatePoolFeeTokenAuthorityMatchesProgramAdmin, true);
  assert.equal(result.cpmmCreatePoolFeeIsPinnedProgramReceiver, true);
  assert.equal(result.cpmmCreatePoolFeeIsAssociatedTokenAccount, false);
  assert.equal(result.cpmmCreatePoolFeeMintIsWsol, true);
  assert.equal(result.cpmmCreatePoolFeeAuthorityMatchesConfigProtocolOwner, false);
  assert.equal(result.cpmmCreatePoolFeeAuthorityMatchesConfigFundOwner, false);
  assert.equal(result.cpmmConfig.createPoolFee, "99");
  assert.equal(result.lockAuthority, target.lockAuthority);
});
test("rejects a missing CPMM migration fee destination account", () => {
  assert.throws(() => validateCpmmMigrationAccounts({
    cpmmProgramAccount: { executable: true }, lockProgramAccount: { executable: true },
    cpmmFeeAccount: null, target: {},
  }), /fee destination account is missing/);
});
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
test("rejects a quote raise that does not exceed the configured migration fee", () => {
  const invalid = structuredClone(valid);
  invalid.config.defaultParams.totalFundRaisingB = "100000000";
  const result = validateCurveDefaults(invalid);
  assert.equal(result.pass, false);
  assert.equal(result.checks.quoteRaiseExceedsMigrationFee, false);
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

test("decodes GlobalConfig fee/migration wallets and PlatformConfig fee/lock destinations from pinned SDK offsets", () => {
  const globalData = Buffer.alloc(371);
  globalData.writeBigUInt64LE(123n, 19);
  const platformData = Buffer.alloc(944);
  const { Keypair } = require("@solana/web3.js");
  const addresses = Array.from({ length: 11 }, () => Keypair.generate().publicKey);
  const putKey = (buffer, offset, key) => key.toBuffer().copy(buffer, offset);
  [115,147,179,211].forEach((offset, i) => putKey(globalData, offset, addresses[i]));
  [16,48,688,728,760,800,834].forEach((offset, i) => putKey(platformData, offset, addresses[i+4]));
  platformData.writeBigUInt64LE(0n, 80);
  platformData.writeBigUInt64LE(100000n, 88);
  platformData.writeBigUInt64LE(900000n, 96);
  const result = decodeConfigDestinations({
    globalData, platformData, PublicKey,
    programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
    mintB: "So11111111111111111111111111111111111111112",
  });
  assert.equal(result.globalConfigDestinations.migrateFee, "123");
  assert.equal(result.globalConfigDestinations.protocolFeeOwner, addresses[0].toBase58());
  assert.equal(result.globalConfigDestinations.migrateFeeOwner, addresses[1].toBase58());
  assert.equal(result.globalConfigDestinations.migrateToAmmWallet, addresses[2].toBase58());
  assert.equal(result.globalConfigDestinations.migrateToCpmmWallet, addresses[3].toBase58());
  assert.equal(result.platformConfigDestinations.platformClaimFeeWallet, addresses[4].toBase58());
  assert.equal(result.platformConfigDestinations.platformLockNftWallet, addresses[5].toBase58());
  assert.equal(result.platformConfigDestinations.cpConfigId, addresses[6].toBase58());
  assert.equal(result.platformConfigDestinations.transferFeeExtensionAuth, addresses[7].toBase58());
  assert.equal(result.platformConfigDestinations.platformVestingWallet, addresses[8].toBase58());
  assert.ok(result.derivedPlatformFeeVault);
  assert.ok(result.derivedPlatformFeeVaultAuthority);
  assert.match(result.creatorFeeVaultDerivation.seedDescription, /creator_wallet_pubkey/);
});
test("rejects config destination decoding when byte lengths do not match pinned SDK layouts", () => {
  assert.throws(() => decodeConfigDestinations({
    globalData: Buffer.alloc(370), platformData: Buffer.alloc(944), PublicKey,
    programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
    mintB: "So11111111111111111111111111111111111111112",
  }), /byte lengths do not match/);
});

test("decodes post-upgrade LP migration scales as platform-locked plus burned shares", () => {
  const globalData = Buffer.alloc(371), platformData = Buffer.alloc(944);
  platformData.writeBigUInt64LE(0n, 80);
  platformData.writeBigUInt64LE(100000n, 88);
  platformData.writeBigUInt64LE(900000n, 96);
  const result = decodeConfigDestinations({ globalData, platformData, PublicKey, programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6", platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a", mintB: "So11111111111111111111111111111111111111112" });
  assert.equal(result.migrationLpDistribution.denominator, "1000000");
  assert.equal(result.migrationLpDistribution.effectivePlatformLockedScaleAfter2026_08_17, "100000");
  assert.equal(result.migrationLpDistribution.effectiveBurnScale, "900000");
  assert.equal(result.migrationLpDistribution.separateCreatorFeeKeyForPostUpgradeMigration, false);
});
test("fails closed when PlatformConfig migration scales do not sum to one million", () => {
  const globalData = Buffer.alloc(371), platformData = Buffer.alloc(944);
  platformData.writeBigUInt64LE(100000n, 80);
  platformData.writeBigUInt64LE(100000n, 88);
  platformData.writeBigUInt64LE(700000n, 96);
  assert.throws(() => decodeConfigDestinations({ globalData, platformData, PublicKey, programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6", platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a", mintB: "So11111111111111111111111111111111111111112" }), /sum exactly to 1,000,000/);
});
