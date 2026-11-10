import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { prepareDevnetLaunch, validateDevnetLaunchInput } from "./launchlab-prepare-devnet.mjs";

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
  LaunchpadConfig: { decode: () => ({ mintB: new PublicKey(ids.quoteMint), curveType: 0, index: 0, epoch: 7 }) },
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
    ownerPubKey: new PublicKey(ids.creator),
    connection: {
      getAccountInfo: async () => ({ owner: new PublicKey(ids.programId), data: Buffer.from("fixture") }),
    },
    api: { fetchLaunchConfigs: async () => [{ key: { pubKey: ids.configId, mintB: apiMint, curveType: 0, index: 0, epoch: apiEpoch }, defaultParams: { supplyInit: "1", totalSellA: "1", totalFundRaisingB: "1" } }] },
    launchpad: {
      createLaunchpad: async options => {
        captured = options;
        return { transactions: [{ transaction: { label: "init-1" } }, { transaction: { label: "init-2" } }], extInfo: { poolId: "fixture" }, execute: async () => { executeCalled = true; } };
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
test("rejects Mainnet and unapproved program/config/platform IDs", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ cluster: "mainnet" }), sdk), /restricted to Solana Devnet/);
  assert.throws(() => validateDevnetLaunchInput(input({ platformId: ids.configId }), sdk), /verified Devnet allowlist/);
});
test("requires creator and fee payer to be the same wallet", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ feePayer: "11111111111111111111111111111112" }), sdk), /match the creator wallet/);
});
test("rejects non-CPMM, non-create-only and Token-2022 paths", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ migrateType: "amm" }), sdk), /CPMM migration/);
  assert.throws(() => validateDevnetLaunchInput(input({ createOnly: false }), sdk), /create-only mode/);
  assert.throws(() => validateDevnetLaunchInput(input({ token2022: true }), sdk), /not enabled/);
});
test("validates raw u64 amounts and supply bounds", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ totalSellA: "1.5" }), sdk), /unsigned integer string/);
  assert.throws(() => validateDevnetLaunchInput(input({ totalSellA: "1000000000000001" }), sdk), /cannot exceed total supply/);
});
test("prepares ordered Devnet transactions with explicit settings and never executes", async () => {
  const mock = client();
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  assert.equal(result.cluster, "devnet");
  assert.equal(result.instructionPath, "initializeV2");
  assert.equal(result.migration, "cpmm");
  assert.equal(result.createOnly, true);
  assert.equal(result.transactionCount, 2);
  assert.deepEqual(result.transactions.map(x => x.transaction.label), ["init-1", "init-2"]);
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
test("fails closed on fresh API / finalized GlobalConfig mismatch", async () => {
  const mock = client({ apiEpoch: 8 });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /API \/ finalized GlobalConfig mismatch: epoch/);
});
test("fails closed when platform enforces curve rules without a verified rule", async () => {
  const mock = client({ restrict: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /Platform restricts curve parameters/);
});
test("rejects a creator wallet that differs from the connected SDK owner", async () => {
  const mock = client();
  const altered = input({ creatorWallet: "11111111111111111111111111111112", feePayer: "11111111111111111111111111111112" });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: altered }), /SDK owner does not match/);
});
