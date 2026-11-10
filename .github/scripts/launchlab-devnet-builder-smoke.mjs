#!/usr/bin/env node
/**
 * Real pinned-SDK Devnet builder smoke. Uses a deterministic throwaway test mint
 * and a public test fee-payer key. It builds and inspects only; never signs with
 * the creator, simulates, submits, or calls the SDK execute function.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { prepareDevnetLaunch } from "./launchlab-prepare-devnet.mjs";

const prefix = process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools";
const require = createRequire(`${prefix}/package.json`);
const sdkPackage = require("@raydium-io/raydium-sdk-v2");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const BN = require("bn.js");
const {
  Raydium,
  LaunchpadConfig,
  PlatformConfig,
  PlatformCurveRule,
  PLATFORM_CURVE_RULE_DISCRIMINATOR,
  getPdaPlatformCurveRule,
  getPdaPlatformAllowConfig,
  checkLaunchAgainstCurveRule,
  TxVersion,
} = sdkPackage;

if (!Raydium || !LaunchpadConfig || !PlatformConfig || !PlatformCurveRule ||
    !Buffer.isBuffer(PLATFORM_CURVE_RULE_DISCRIMINATOR) ||
    typeof getPdaPlatformCurveRule !== "function" ||
    typeof getPdaPlatformAllowConfig !== "function" ||
    typeof checkLaunchAgainstCurveRule !== "function" || !TxVersion || !BN) {
  throw new Error("Pinned Raydium SDK exports required by the Devnet builder are missing");
}
const pkg = require("@raydium-io/raydium-sdk-v2/package.json");
if (pkg.version !== "0.2.84-alpha") throw new Error(`Unexpected Raydium SDK version: ${pkg.version}`);

const rpcUrl = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, { commitment: "finalized" });
// Deterministic ephemeral test keys only. No secret is persisted or used to submit.
const creator = Keypair.fromSeed(Buffer.alloc(32, 0x31));
const mint = Keypair.fromSeed(Buffer.alloc(32, 0x42));
const contentJson = JSON.stringify({
  name: "Climboria Devnet Builder Check",
  symbol: "CLIMBTEST",
  description: "Non-submitted CI transaction-builder fixture",
});
const metadata = {
  name: "Climboria Devnet Builder Check",
  symbol: "CLIMBTEST",
  uri: "https://example.com/climboria-devnet-builder-check.json",
  contentJson,
  contentHash: createHash("sha256").update(contentJson, "utf8").digest("hex"),
};

const raydium = await Raydium.load({
  connection,
  owner: creator.publicKey,
  cluster: "devnet",
  disableFeatureCheck: true,
  disableLoadToken: true,
  blockhashCommitment: "finalized",
  apiRequestInterval: 0,
  apiRequestTimeout: 20000,
});
if (raydium.cluster !== "devnet") throw new Error("Raydium SDK did not retain the Devnet cluster");

const originalCreate = raydium.launchpad.createLaunchpad.bind(raydium.launchpad);
let executeCalled = false;
raydium.launchpad.createLaunchpad = async params => {
  const prepared = await originalCreate(params);
  prepared.execute = async () => {
    executeCalled = true;
    throw new Error("Execution is forbidden in the Devnet builder smoke");
  };
  return prepared;
};

const result = await prepareDevnetLaunch({
  raydium,
  sdk: { PublicKey, BN, LaunchpadConfig, PlatformConfig, PlatformCurveRule, PLATFORM_CURVE_RULE_DISCRIMINATOR, getPdaPlatformCurveRule, getPdaPlatformAllowConfig, checkLaunchAgainstCurveRule, TxVersion },
  input: {
    cluster: "devnet",
    programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
    configId: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
    platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
    quoteMint: "So11111111111111111111111111111111111111112",
    creatorWallet: creator.publicKey.toBase58(),
    feePayer: creator.publicKey.toBase58(),
    mintKeypair: mint,
    metadata,
    decimals: 6,
    quoteDecimals: 9,
    migrateType: "cpmm",
    createOnly: true,
    token2022: false,
    // Explicit SDK fee-mode fixture: 0 = OnlyTokenB; not a production fee-policy approval.
    creatorFeeOn: 0,
    // Explicit CI-only curve parameters; these are not Climboria launch settings.
    supply: "100000000000000",
    totalSellA: "60000000000000",
    totalFundRaisingB: "30000000000",
    totalLockedAmount: "0",
  },
});
if (executeCalled || result.executeCalled || result.transactionSubmitted) {
  throw new Error("Devnet builder smoke unexpectedly reached an execution path");
}
if (result.transactionReviews.length !== result.transactionCount) {
  throw new Error("Transaction review count does not match the ordered SDK transaction set");
}
process.stdout.write(JSON.stringify({
  pass: true,
  sdkVersion: pkg.version,
  cluster: result.cluster,
  mintAddress: result.mintAddress,
  transactionCount: result.transactionCount,
  instructionPath: result.instructionPath,
  migration: result.migration,
  signerRequirements: result.signerRequirements,
  feeVaults: result.feeVaults,
  platformAllowConfig: result.platformAllowConfig,
  platformCurveRule: result.platformCurveRule,
  feeAndMigrationDestinations: result.feeAndMigrationDestinations,
  transactionReviews: result.transactionReviews,
  transactionSubmitted: false,
  creatorWalletSigned: false,
  executeCalled,
  note: "CI-only explicit test parameters; no Climboria production launch settings or wallet approval implied.",
}, null, 2) + "\n");
