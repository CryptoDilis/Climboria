import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { prepareDevnetLaunch, validateConstantProductInitFormula, validateDevnetLaunchInput } from "./launchlab-prepare-devnet.mjs";

class PublicKey {
  constructor(value) { if (typeof value !== "string" || value.length < 32) throw new Error("invalid public key"); this.value = value; }
  toBase58() { return this.value; }
}
class BN { constructor(value) { this.value = String(value); } }
const ids = {
  programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
  configId: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
  platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
  quoteMint: "So11111111111111111111111111111111111111112",
  creator: "11111111111111111111111111111111",
};
const sdk = {
  PublicKey, BN, TxVersion: { V0: "v0" },
  LaunchpadConfig: { decode: () => ({ mintB: new PublicKey(ids.quoteMint), curveType: 0, index: 0, epoch: 7, tradeFeeRate: 2500, maxShareFeeRate: 10000, minSupplyA: 10000000, maxLockRate: 800000, minSellRateA: 200000, minMigrateRateA: 150000, minFundRaisingB: 24000000000, migrateFee: 100000000 }) },
  PlatformConfig: { decode: () => ({ restrictCurveParam: false }) },
};
const input = overrides => ({
  cluster: "devnet", ...ids, creatorWallet: ids.creator, feePayer: ids.creator,
  mintKeypair: { publicKey: new PublicKey("Mint111111111111111111111111111111111111111") },
  metadata: (() => { const contentJson = JSON.stringify({ name: "Climboria Test", symbol: "CLIMB", description: "Devnet fixture" }); return { name: "Climboria Test", symbol: "CLIMB", uri: "https://metadata.example/climboria.json", contentJson, contentHash: createHash("sha256").update(contentJson).digest("hex") }; })(),
  decimals: 6, quoteDecimals: 9, migrateType: "cpmm", createOnly: true,
  token2022: false, supply: "1000000000000000", totalSellA: "793100000000000",
  totalFundRaisingB: "85000000000", totalLockedAmount: "0",
  ...overrides,
});
function client({ apiEpoch = 7, apiMint = ids.quoteMint, restrict = false } = {}) {
  let captured, executeCalled = false;
  const raydium = {
    cluster: "devnet",
    ownerPubKey: new PublicKey(ids.creator),
    connection: {
      getAccountInfo: async () => ({ owner: new PublicKey(ids.programId), data: Buffer.from("fixture") }),
    },
    api: { fetchLaunchConfigs: async () => [{ key: { pubKey: ids.configId, mintB: apiMint, curveType: 0, index: 0, epoch: apiEpoch, tradeFeeRate: 2500, maxShareFeeRate: 10000, minSupplyA: 10000000, maxLockRate: 800000, minSellRateA: 200000, minMigrateRateA: 150000, minFundRaisingB: 24000000000, migrateFee: 100000000 }, defaultParams: { supplyInit: "1", totalSellA: "1", totalFundRaisingB: "1" } }] },
    launchpad: {
      createLaunchpad: async options => {
        captured = options;
        const makeTx = label => ({
          label,
          message: {
            staticAccountKeys: [options.feePayer, options.mintA, new PublicKey(ids.programId)],
            header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1 },
            compiledInstructions: [{ programIdIndex: 2, accountKeyIndexes: [0, 1] }],
          },
        });
        return {
          transactions: [makeTx("init-1"), makeTx("init-2")],
          signers: [[options.extraSigners[0]], [options.extraSigners[0]]],
          instructionTypes: ["initializeV2"],
          extInfo: { poolId: "fixture" },
          execute: async () => { executeCalled = true; },
        };
      },
    },
  };
  const testSdk = { ...sdk, PlatformConfig: { decode: () => ({ restrictCurveParam: restrict }) } };
  return { raydium, sdk: testSdk, captured: () => captured, executeCalled: () => executeCalled };
}

test("requires explicit economic values and refuses silent provider defaults", () => {
  const bad = input({ supply: undefined });
  assert.throws(() => validateDevnetLaunchInput(bad, sdk), /supply must be an explicit/);
});
test("preflights the pinned constant-product formula and rejects a zero denominator", () => {
  assert.throws(() => validateConstantProductInitFormula({
    supply: "100000000000000", totalSellA: "50000000000000",
    totalFundRaisingB: "30000000000", totalLockedAmount: "0", migrateFee: "0",
  }), /denominator must be positive/);
  const valid = validateConstantProductInitFormula({
    supply: "100000000000000", totalSellA: "60000000000000",
    totalFundRaisingB: "30000000000", totalLockedAmount: "0", migrateFee: "100000000",
  });
  assert.equal(valid.denominator, "14850000000");
});
test("rejects Mainnet and unapproved program/config/platform IDs", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ cluster: "mainnet" }), sdk), /restricted to Solana Devnet/);
  assert.throws(() => validateDevnetLaunchInput(input({ platformId: ids.configId }), sdk), /verified Devnet allowlist/);
});
test("requires explicit token decimals and the verified WSOL quote decimals", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ decimals: undefined }), sdk), /Token decimals must be explicitly selected/);
  assert.throws(() => validateDevnetLaunchInput(input({ quoteDecimals: 6 }), sdk), /Token decimals must be explicitly selected/);
});
test("requires creator and fee payer to be the same wallet", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ feePayer: "11111111111111111111111111111112" }), sdk), /match the creator wallet/);
});
test("rejects non-CPMM, non-create-only and Token-2022 paths", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ migrateType: "amm" }), sdk), /CPMM migration/);
  assert.throws(() => validateDevnetLaunchInput(input({ createOnly: false }), sdk), /create-only mode/);
  assert.throws(() => validateDevnetLaunchInput(input({ token2022: true }), sdk), /not enabled/);
});
test("rejects metadata bytes whose declared hash does not match", () => {
  const validMetadata = input({}).metadata;
  assert.throws(() => validateDevnetLaunchInput(input({ metadata: { ...validMetadata, contentHash: "0".repeat(64) } }), sdk), /SHA-256 does not match/);
});
test("validates raw u64 amounts and supply bounds", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ totalSellA: "1.5" }), sdk), /unsigned integer string/);
  assert.throws(() => validateDevnetLaunchInput(input({ totalSellA: "1000000000000001" }), sdk), /must be less than total supply/);
});
test("prepares ordered Devnet transactions with explicit settings and never executes", async () => {
  const mock = client();
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  assert.equal(result.cluster, "devnet");
  assert.equal(result.instructionPath, "initializeV2");
  assert.equal(result.migration, "cpmm");
  assert.equal(result.createOnly, true);
  assert.equal(result.transactionCount, 2);
  assert.deepEqual(result.transactions.map(x => x.label), ["init-1", "init-2"]);
  assert.equal(result.transactionReviews.length, 2);
  assert.deepEqual(result.transactionReviews[0].programIds, [ids.programId]);
  assert.equal(result.transactionReviews[0].accountMetaDetails[0][1].isSigner, true);
  assert.equal(result.transactionReviews[0].accountMetaDetails[0][1].isWritable, true);
  assert.equal(result.transactionReviews[0].requiredSignerKeys.length, 2);
  assert.equal(result.signerRequirements[0][0], input({}).mintKeypair.publicKey.toBase58());
  assert.equal(result.transactionSubmitted, false);
  assert.equal(result.executeCalled, false);
  assert.equal(mock.executeCalled(), false);
  const built = mock.captured();
  assert.equal(built.programId.toBase58(), ids.programId);
  assert.equal(built.platformId.toBase58(), ids.platformId);
  assert.equal(built.configId.toBase58(), ids.configId);
  assert.equal(built.supply.value, "1000000000000000");
  assert.equal(built.totalSellA.value, "793100000000000");
  assert.equal(built.totalFundRaisingB.value, "85000000000");
  assert.equal(built.buyAmount.value, "0");
  assert.equal(built.createOnly, true);
  assert.deepEqual(built.extraSigners, [input({}).mintKeypair]);
});
test("rejects an SDK client not initialized for Devnet", async () => {
  const mock = client();
  mock.raydium.cluster = "mainnet";
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /initialized for Devnet/);
});
test("rejects an unexpected SDK transaction signer", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => ({
    transactions: [{
      message: {
        staticAccountKeys: [options.feePayer, options.mintA, new PublicKey(ids.programId)],
        header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1 },
        compiledInstructions: [{ programIdIndex: 2, accountKeyIndexes: [0, 1] }],
      },
    }],
    signers: [[{ publicKey: new PublicKey("11111111111111111111111111111112") }]],
  });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /unexpected transaction signer/);
});
test("rejects an unapproved program in a prepared SDK transaction", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => ({
    transactions: [{
      message: {
        staticAccountKeys: [options.feePayer, options.mintA, new PublicKey("Unknown111111111111111111111111111111111")],
        header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1 },
        compiledInstructions: [{ programIdIndex: 2, accountKeyIndexes: [0, 1] }],
      },
    }],
    signers: [[options.extraSigners[0]]],
  });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /unapproved program/);
});
test("rejects a transaction fee payer that differs from the creator", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => ({
    transactions: [{
      message: {
        staticAccountKeys: [new PublicKey("11111111111111111111111111111112"), options.mintA, new PublicKey(ids.programId)],
        header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1 },
        compiledInstructions: [{ programIdIndex: 2, accountKeyIndexes: [0, 1] }],
      },
    }],
    signers: [[options.extraSigners[0]]],
  });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /fee payer does not match/);
});
test("resolves and reports V0 Address Lookup Table account metas", async () => {
  const mock = client();
  const lookupKey = new PublicKey("Lookup111111111111111111111111111111111");
  const loadedWritable = new PublicKey("LoadedWritable11111111111111111111111111");
  mock.raydium.connection.getAddressLookupTable = async () => ({
    value: { state: { addresses: [loadedWritable] } },
  });
  mock.raydium.launchpad.createLaunchpad = async options => ({
    transactions: [{
      message: {
        staticAccountKeys: [options.feePayer, options.mintA, new PublicKey(ids.programId)],
        header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 1 },
        addressTableLookups: [{ accountKey: lookupKey, writableIndexes: [0], readonlyIndexes: [] }],
        compiledInstructions: [{ programIdIndex: 2, accountKeyIndexes: [0, 1, 3] }],
      },
    }],
    signers: [[options.extraSigners[0]]],
  });
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  const review = result.transactionReviews[0];
  assert.equal(review.accountMetaDetails[0][2].pubkey, loadedWritable.toBase58());
  assert.equal(review.accountMetaDetails[0][2].isWritable, true);
  assert.equal(review.lookupTables[0].address, lookupKey.toBase58());
  assert.deepEqual(review.lookupTables[0].writableAddresses, [loadedWritable.toBase58()]);
});
test("fails closed on fresh API / finalized GlobalConfig mismatch", async () => {
  const mock = client({ apiEpoch: 8 });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /API \/ finalized GlobalConfig mismatch: epoch/);
});
test("fails closed when platform enforces curve rules; caller flags cannot bypass verification", async () => {
  const mock = client({ restrict: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({ platformCurveRuleVerified: true }) }), /Platform restricts curve parameters/);
});
test("rejects a creator wallet that differs from the connected SDK owner", async () => {
  const mock = client();
  const altered = input({ creatorWallet: "11111111111111111111111111111112", feePayer: "11111111111111111111111111111112" });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: altered }), /SDK owner does not match/);
});
