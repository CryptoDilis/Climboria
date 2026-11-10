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
    platformConfig: "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4",
    cpmmProgram: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    cpmmFeeAccount: "DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8",
    cpmmAdmin: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ",
    cpmmProtocolOwner: "ProCXqRcXJjoUd1RNoo28bSizAA6EEqt9wURZYPDc5u",
    cpmmFundOwner: "FUNDduJTA7XcckKHKfAoEnnhuSud2JUCUZv6opWEjrBU",
    lockProgram: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
    lockAuthority: "3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH"
  },
  devnet: {
    api: "https://launch-mint-v1-devnet.raydium.io/main/configs",
    rpc: "https://api.devnet.solana.com",
    program: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    globalConfig: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
    platformConfig: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
    cpmmProgram: "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb",
    cpmmFeeAccount: "3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy",
    cpmmAdmin: "DRayqG9RXYi8WHgWEmRQGrUWRWbhjYWYkCRJDd6JBBak",
    cpmmProtocolOwner: "DRay33UmULQCeawH3dVpJfN3uqLj6Qtq4ymSRx2pAgGK",
    cpmmFundOwner: "DRay33UmULQCeawH3dVpJfN3uqLj6Qtq4ymSRx2pAgGK",
    lockProgram: "DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX",
    lockAuthority: "7qWVV8UY2bRJfDLP4s37YzBPKUkVB46DStYJBpYbQzu3"
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
async function rpcCall(rpc, method, params) {
  const res = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: `climboria-${method}`, method, params }), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status} for ${method}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || `Solana RPC error for ${method}`);
  return json.result;
}
function transactionDetails(tx) {
  const message = tx?.transaction?.message;
  if (!message) return null;
  const accountKeys = (message.accountKeys ?? []).map(key => typeof key === "string"
    ? { pubkey: key, signer: null, writable: null, source: null }
    : { pubkey: key.pubkey, signer: key.signer ?? null, writable: key.writable ?? null, source: key.source ?? null });
  return {
    version: tx.version ?? null,
    recentBlockhash: message.recentBlockhash ?? null,
    accountKeys,
    instructions: message.instructions ?? [],
    innerInstructions: tx.meta?.innerInstructions ?? [],
    loadedAddresses: tx.meta?.loadedAddresses ?? null,
    preBalances: tx.meta?.preBalances ?? [],
    postBalances: tx.meta?.postBalances ?? [],
    preTokenBalances: tx.meta?.preTokenBalances ?? [],
    postTokenBalances: tx.meta?.postTokenBalances ?? [],
    feeLamports: tx.meta?.fee ?? null,
    executionError: tx.meta?.err ?? null,
    logMessages: tx.meta?.logMessages ?? []
  };
}
export async function inspectAuthorityHistory({ rpc, authority, limit = 12, getAccount = async (url, address) => rpcCall(url, "getAccountInfo", [address, { encoding: "base64", commitment: "finalized" }]), getSignatures = async (url, address, count) => rpcCall(url, "getSignaturesForAddress", [address, { limit: count, commitment: "finalized" }]), getTransaction = async (url, signature) => rpcCall(url, "getTransaction", [signature, { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 }]) }) {
  const accountResult = await getAccount(rpc, authority);
  // Preserve explicit RPC value:null (account missing); nullish coalescing would
  // incorrectly fall back to the wrapper object and classify it as an account.
  const account = accountResult && Object.prototype.hasOwnProperty.call(accountResult, "value")
    ? accountResult.value
    : accountResult;
  if (!account) return { authority, accountExists: false, recentSignatures: [], historyComplete: false, note: "Authority account is not present at finalized commitment." };
  const signatures = await getSignatures(rpc, authority, limit);
  const transactions = [];
  for (const item of (Array.isArray(signatures) ? signatures : []).slice(0, limit)) {
    let tx = null, fetchError = null;
    try { tx = await getTransaction(rpc, item.signature); } catch (error) { fetchError = String(error?.message || error); }
    const message = tx?.transaction?.message, keys = message?.accountKeys ?? [];
    transactions.push({ signature: item.signature, slot: item.slot, blockTime: item.blockTime ?? null, confirmationStatus: item.confirmationStatus ?? null, err: item.err ?? null, transactionFetched: Boolean(tx), transactionFetchError: fetchError, feeLamports: tx?.meta?.fee ?? null, signers: keys.filter(key => typeof key === "object" && key.signer).map(key => key.pubkey), programIds: [...new Set((message?.instructions ?? []).map(ix => ix.programId ?? ix.program ?? "unknown"))], instructionCount: message?.instructions?.length ?? null, transactionDetails: transactionDetails(tx) });
  }
  return { authority, accountExists: true, accountOwner: account.owner, accountExecutable: Boolean(account.executable), accountDataLength: Array.isArray(account.data) ? Buffer.from(account.data[0] ?? "", "base64").length : null, accountLamports: String(account.lamports ?? "0"), recentSignatureCount: Array.isArray(signatures) ? signatures.length : 0, recentSignatures: transactions, historyLimit: limit, historyComplete: Array.isArray(signatures) && signatures.length < limit, classification: "unclassified", note: "System-owned, zero-data accounts may still be PDA-controlled; ownership/executable/data shape and recent signatures alone do not prove beneficial ownership or governance." };
}
export function validateCpmmMigrationAccounts({ cpmmProgramAccount, lockProgramAccount, cpmmFeeAccount, cpmmConfigAccount, target, PublicKey }) {
  if (!cpmmProgramAccount?.executable) throw new Error("CPMM migration program is missing or not executable");
  if (!lockProgramAccount?.executable) throw new Error("CPMM LP lock program is missing or not executable");
  if (!cpmmFeeAccount) throw new Error("CPMM create-pool fee destination account is missing");
  if (cpmmFeeAccount.owner !== "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") throw new Error("CPMM create-pool fee destination is not owned by the standard SPL Token program");
  const feeData = Buffer.from(cpmmFeeAccount.data?.[0] ?? "", "base64");
  if (feeData.length !== 165) throw new Error("CPMM create-pool fee destination is not a valid 165-byte SPL Token account");
  if (!cpmmConfigAccount || cpmmConfigAccount.owner !== target.cpmmProgram) throw new Error("CPMM AMM config account is missing or has the wrong program owner");
  const configData = Buffer.from(cpmmConfigAccount.data?.[0] ?? "", "base64");
  if (configData.length !== 236) throw new Error("CPMM AMM config byte length does not match the pinned SDK layout");
  const cpmmConfig = {
    disableCreatePool: configData.readUInt8(9) === 1,
    index: configData.readUInt16LE(10),
    tradeFeeRate: configData.readBigUInt64LE(12).toString(),
    protocolFeeRate: configData.readBigUInt64LE(20).toString(),
    fundFeeRate: configData.readBigUInt64LE(28).toString(),
    createPoolFee: configData.readBigUInt64LE(36).toString(),
    protocolOwner: new PublicKey(configData.subarray(44, 76)).toBase58(),
    fundOwner: new PublicKey(configData.subarray(76, 108)).toBase58(),
    creatorFeeRate: configData.readBigUInt64LE(108).toString(),
    creatorFeeShareRate: configData.readBigUInt64LE(116).toString(),
  };
  const feeMint = new PublicKey(feeData.subarray(0, 32));
  const feeTokenAuthority = new PublicKey(feeData.subarray(32, 64));
  const feeAmount = feeData.readBigUInt64LE(64).toString();
  const state = feeData.readUInt8(108);
  if (cpmmConfig.protocolOwner !== target.cpmmProtocolOwner || cpmmConfig.fundOwner !== target.cpmmFundOwner) throw new Error("CPMM config protocol/fund owners differ from the pinned CPMM source constants");
  if (state !== 1) throw new Error("CPMM create-pool fee token account is not initialized");
  const feeAuthorityMatchesProgramAdmin = feeTokenAuthority.toBase58() === target.cpmmAdmin;
  const feeMintIsWsol = feeMint.toBase58() === "So11111111111111111111111111111111111111112";
  // CPMM source constrains this to the program's fixed create_pool_fee_reveiver::ID.
  // It is a fixed SPL token account, not an ATA; do not apply ATA seed derivation here.
  // The pinned CPMM source constrains the fixed receiver address and token-account type,
  // but does not require the token-account owner to equal the program admin. Report it
  // as observed state rather than inventing an authority invariant.
  if (!feeMintIsWsol) throw new Error("CPMM fixed create-pool fee receiver must hold WSOL");
  if (cpmmConfig.disableCreatePool) throw new Error("CPMM AMM config currently disables pool creation");
  return {
    cpmmProgramId: target.cpmmProgram, cpmmProgramExecutable: true,
    cpmmCreatePoolFeeAccount: target.cpmmFeeAccount, cpmmCreatePoolFeeAccountOwner: cpmmFeeAccount.owner,
    cpmmCreatePoolFeeMint: feeMint.toBase58(), cpmmCreatePoolFeeTokenAuthority: feeTokenAuthority.toBase58(),
    cpmmCreatePoolFeeTokenAmount: feeAmount, cpmmCreatePoolFeeTokenAuthorityMatchesProgramAdmin: feeAuthorityMatchesProgramAdmin,
    cpmmCreatePoolFeeMintIsWsol: feeMintIsWsol, cpmmCreatePoolFeeIsPinnedProgramReceiver: true,
    cpmmCreatePoolFeeIsAssociatedTokenAccount: false,
    cpmmCreatePoolFeeAuthorityMatchesConfigProtocolOwner: feeTokenAuthority.toBase58() === cpmmConfig.protocolOwner,
    cpmmCreatePoolFeeAuthorityMatchesConfigFundOwner: feeTokenAuthority.toBase58() === cpmmConfig.fundOwner,
    cpmmConfigId: target.cpmmConfigId, cpmmConfig,
    cpmmCreatePoolFeeAccountLamports: String(cpmmFeeAccount.lamports),
    lockProgramId: target.lockProgram, lockProgramExecutable: true, lockAuthority: target.lockAuthority
  };
}
export function decodeConfigDestinations({ globalData, platformData, PublicKey, programId, platformId, mintB }) {
  if (!Buffer.isBuffer(globalData) || globalData.length !== 371 || !Buffer.isBuffer(platformData) || platformData.length !== 944) {
    throw new Error("GlobalConfig/PlatformConfig byte lengths do not match the pinned SDK layouts");
  }
  const key = (data, offset) => new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  const global = { migrateFee: u64(globalData, 19).toString(), protocolFeeOwner: key(globalData, 115), migrateFeeOwner: key(globalData, 147), migrateToAmmWallet: key(globalData, 179), migrateToCpmmWallet: key(globalData, 211) };
  const platform = {
    platformClaimFeeWallet: key(platformData, 16),
    platformLockNftWallet: key(platformData, 48),
    platformScale: u64(platformData, 80).toString(), creatorScale: u64(platformData, 88).toString(), burnScale: u64(platformData, 96).toString(), feeRate: u64(platformData, 104).toString(),
    cpConfigId: key(platformData, 688), creatorFeeRate: u64(platformData, 720).toString(),
    transferFeeExtensionAuth: key(platformData, 728), platformVestingWallet: key(platformData, 760).toString(), platformVestingScale: u64(platformData, 792).toString(),
    platformCpCreator: key(platformData, 800), restrictGlobalConfig: platformData.readUInt8(832), restrictCurveParam: platformData.readUInt8(833), curveRuleManager: key(platformData, 834),
  };
  const pid = new PublicKey(programId);
  const [platformFeeVault] = PublicKey.findProgramAddressSync([new PublicKey(platformId).toBuffer(), new PublicKey(mintB).toBuffer()], pid);
  const [platformFeeVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("platform_fee_vault_auth_seed", "utf8")], pid);
  const platformScale = BigInt(platform.platformScale), creatorScale = BigInt(platform.creatorScale), burnScale = BigInt(platform.burnScale);
  const migrationScaleDenominator = 1_000_000n;
  const migrationScalesValid = platformScale >= 0n && creatorScale >= 0n && burnScale >= 0n &&
    platformScale + creatorScale + burnScale === migrationScaleDenominator;
  if (!migrationScalesValid) throw new Error("PlatformConfig migration scales must be non-negative and sum exactly to 1,000,000");
  return {
    globalConfigDestinations: global,
    platformConfigDestinations: platform,
    migrationLpDistribution: {
      denominator: migrationScaleDenominator.toString(),
      platformScale: platformScale.toString(),
      legacyCreatorScale: creatorScale.toString(),
      burnScale: burnScale.toString(),
      effectivePlatformLockedScaleAfter2026_08_17: (platformScale + creatorScale).toString(),
      effectiveBurnScale: burnScale.toString(),
      platformNftRecipient: platform.platformLockNftWallet,
      separateCreatorFeeKeyForPostUpgradeMigration: false,
      scaleApplicationVerifiedAgainstDeployedBytecode: false,
      interpretation: "After the 2026-08-17 LaunchLab migration update, legacy creatorScale is treated as part of the platform Fee Key share; burnScale remains the burn share.",
      note: "This reports the configured scale split and documented post-upgrade interpretation only. Exact LP token rounding, NFT mint count and custody must be checked against the deployed LaunchLab bytecode or a separately approved migration preview; do not promise creator-owned LP fee entitlement."
    },
    derivedPlatformFeeVault: platformFeeVault.toBase58(),
    derivedPlatformFeeVaultAuthority: platformFeeVaultAuthority.toBase58(),
    creatorFeeVaultDerivation: { seedDescription: "[creator_wallet_pubkey, quote_mint_pubkey]", authoritySeed: "creator_fee_vault_auth_seed", note: "Creator vault is creator-specific and requires an approved creator wallet." }
  };
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
    quoteRaiseExceedsMigrationFee: totalRaise > BigInt(global.migrateFee ?? 0),
    quoteMintIsWsol: global.mintB === WSOL,
    curveTypeIsConstantProduct: Number(global.curveType) === 0,
    totalFeeRateWithinDenominator: BigInt(global.tradeFeeRate) + BigInt(platform.feeRate) + BigInt(platform.creatorFeeRate) + shareFeeRate <= DENOMINATOR
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    amounts: { supply: supply.toString(), totalSellA: totalSell.toString(), totalFundRaisingB: totalRaise.toString(), totalLockedAmount: totalLockedAmount.toString(), migrateFee: String(global.migrateFee ?? "0"), minSupplyUnits: minSupply.toString(), minSellUnits: minSell.toString(), minMigrateUnits: minMigrate.toString(), migrateAmount: migrateAmount.toString(), maxLockedUnits: maxLocked.toString() },
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
  const [globalAccount, platformAccount, cpmmProgramAccount, lockProgramAccount, cpmmFeeAccount] = await Promise.all([
    getAccount(target.rpc, target.globalConfig), getAccount(target.rpc, target.platformConfig),
    getAccount(target.rpc, target.cpmmProgram), getAccount(target.rpc, target.lockProgram), getAccount(target.rpc, target.cpmmFeeAccount)
  ]);
  if (!globalAccount || globalAccount.owner !== target.program || !platformAccount || platformAccount.owner !== target.program) throw new Error(`${cluster}: GlobalConfig/PlatformConfig missing or wrong owner`);
  const gd = Buffer.from(globalAccount.data[0], "base64"), pd = Buffer.from(platformAccount.data[0], "base64");
  if (gd.length !== 371 || pd.length !== 944) throw new Error(`${cluster}: unexpected config account lengths`);
  const global = {
    epoch: u64(gd, 8).toString(), migrateFee: u64(gd, 19).toString(), curveType: gd.readUInt8(16), index: gd.readUInt16LE(17),
    tradeFeeRate: u64(gd, 27).toString(), maxShareFeeRate: u64(gd, 35).toString(),
    minSupplyA: u64(gd, 43).toString(), maxLockRate: u64(gd, 51).toString(),
    minSellRateA: u64(gd, 59).toString(), minMigrateRateA: u64(gd, 67).toString(),
    minFundRaisingB: u64(gd, 75).toString(), mintB: new PublicKey(gd.subarray(83,115)).toBase58(), requiresPlatformAuth: gd.readUInt8(243) === 1
  };
  const platform = { platformScale: u64(pd,80).toString(), creatorScale: u64(pd,88).toString(), burnScale: u64(pd,96).toString(), feeRate: u64(pd,104).toString(), creatorFeeRate: u64(pd,720).toString() };
  const destinations = decodeConfigDestinations({ globalData: gd, platformData: pd, PublicKey, programId: target.program, platformId: target.platformConfig, mintB: global.mintB });
  const cpmmConfigId = destinations.platformConfigDestinations.cpConfigId;
  const cpmmConfigAccount = await getAccount(target.rpc, cpmmConfigId);
  const cpmmMigrationAccounts = validateCpmmMigrationAccounts({ cpmmProgramAccount, lockProgramAccount, cpmmFeeAccount, cpmmConfigAccount, target: { ...target, cpmmConfigId }, PublicKey });
  const feeAuthorityHistory = await inspectAuthorityHistory({ rpc: target.rpc, authority: cpmmMigrationAccounts.cpmmCreatePoolFeeTokenAuthority });
  for (const key of ["epoch","migrateFee","curveType","index","tradeFeeRate","maxShareFeeRate","minSupplyA","maxLockRate","minSellRateA","minMigrateRateA","minFundRaisingB","mintB","requiresPlatformAuth"]) {
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
    ...destinations,
    cpmmMigrationAccounts,
    cpmmFeeAuthorityHistory: feeAuthorityHistory,
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
