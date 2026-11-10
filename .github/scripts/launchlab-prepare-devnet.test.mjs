import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { deriveDevnetFeeVaults, expectedInitializeV2Accounts, prepareDevnetLaunch, validateConstantProductInitFormula, validateDevnetLaunchInput } from "./launchlab-prepare-devnet.mjs";

class PublicKey {
  static buffers = new Map();
  constructor(value) {
    if (value instanceof Uint8Array) {
      const hex = Buffer.from(value).toString("hex");
      this.value = PublicKey.buffers.get(hex) ?? "bytes:" + hex;
    } else {
      if (typeof value !== "string" || value.length < 32) throw new Error("invalid public key");
      this.value = value;
    }
  }
  toBase58() { return this.value; }
  toBuffer() {
    const bytes = createHash("sha256").update(this.value, "utf8").digest().subarray(0, 32);
    PublicKey.buffers.set(bytes.toString("hex"), this.value);
    return bytes;
  }
  static findProgramAddressSync(seeds, programId) {
    const digest = createHash("sha256").update(Buffer.concat([...seeds, programId.toBuffer()])).digest("hex");
    return [new PublicKey("PDA" + digest), 255];
  }
}
class BN { constructor(value) { this.value = String(value); } toString() { return this.value; } }
const ids = {
  programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
  configId: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
  platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
  quoteMint: "So11111111111111111111111111111111111111112",
  creator: "Creator1111111111111111111111111111111111",
  feePayer: "FeePayer1111111111111111111111111111111111",
};
const sdk = {
  PublicKey, BN, TxVersion: { V0: "v0" },
  LaunchpadConfig: { decode: () => ({ mintB: new PublicKey(ids.quoteMint), curveType: 0, index: 0, epoch: 7, tradeFeeRate: 2500, maxShareFeeRate: 10000, minSupplyA: 10000000, maxLockRate: 800000, minSellRateA: 200000, minMigrateRateA: 150000, minFundRaisingB: 24000000000, migrateFee: 100000000, protocolFeeOwner: new PublicKey(ids.creator), migrateFeeOwner: new PublicKey(ids.creator), migrateToCpmmWallet: new PublicKey("11111111111111111111111111111112"), migrateToAmmWallet: new PublicKey(ids.creator) }) },
  PlatformConfig: { decode: () => ({ restrictCurveParam: false, platformClaimFeeWallet: new PublicKey(ids.creator), platformLockNftWallet: new PublicKey(ids.creator), feeRate: 2500, creatorFeeRate: 2500, cpConfigId: new PublicKey(ids.configId) }) },
};
function makeInitializeV2Transaction(options, label = "init", overrides = {}, platformAllowConfigId, platformCurveRuleId) {
  const launchInput = { creatorWallet: ids.creator, feePayer: options.feePayer.toBase58(), mintKeypair: { publicKey: options.mintA } };
  const expected = expectedInitializeV2Accounts({ sdk, input: launchInput, programId: new PublicKey(ids.programId), platformAllowConfigId, platformCurveRuleId });
  const privileges = new Map();
  for (const item of expected) {
    const key = item.pubkey.toBase58();
    const prior = privileges.get(key) || { isWritable: false };
    privileges.set(key, { isWritable: prior.isWritable || item.isWritable });
  }
  const payer = options.feePayer, mint = options.mintA;
  const signerKeys = [payer, mint];
  const signerSet = new Set(signerKeys.map(key => key.toBase58()));
  const writableUnsigned = [...privileges.entries()].filter(([key, value]) => !signerSet.has(key) && value.isWritable).map(([key]) => new PublicKey(key));
  const readonlyUnsigned = [...privileges.entries()].filter(([key, value]) => !signerSet.has(key) && !value.isWritable).map(([key]) => new PublicKey(key));
  const program = new PublicKey(ids.programId);
  const staticAccountKeys = [...signerKeys, ...writableUnsigned, ...readonlyUnsigned];
  const keyIndex = new Map(staticAccountKeys.map((key, index) => [key.toBase58(), index]));
  const encodeString = value => {
    const bytes = Buffer.from(value, "utf8");
    const length = Buffer.alloc(4);
    length.writeUInt32LE(bytes.length);
    return Buffer.concat([length, bytes]);
  };
  const encodeU64 = value => {
    const bytes = Buffer.alloc(8);
    bytes.writeBigUInt64LE(BigInt(value));
    return bytes;
  };
  const data = Buffer.concat([
    Buffer.from([67, 153, 175, 39, 218, 16, 38, 32]),
    Buffer.from([options.decimals]),
    encodeString(options.name),
    encodeString(options.symbol),
    encodeString(options.uri),
    Buffer.from([0]),
    encodeU64(options.supply.value),
    encodeU64(overrides.totalSellA ?? options.totalSellA.value),
    encodeU64(options.totalFundRaisingB.value),
    Buffer.from([1]),
    encodeU64(options.totalLockedAmount.value),
    encodeU64("0"),
    encodeU64("0"),
    Buffer.from([options.creatorFeeOn]),
  ]);
  return {
    label,
    message: {
      staticAccountKeys,
      header: { numRequiredSignatures: 2, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: readonlyUnsigned.length },
      compiledInstructions: [{
        programIdIndex: keyIndex.get(ids.programId),
        accountKeyIndexes: expected.map(item => keyIndex.get(item.pubkey.toBase58())),
        data,
      }],
    },
  };
}

const input = overrides => ({
  cluster: "devnet", ...ids, creatorWallet: ids.creator, feePayer: ids.feePayer,
  mintKeypair: { publicKey: new PublicKey("Mint111111111111111111111111111111111111111") },
  metadata: (() => { const contentJson = JSON.stringify({ name: "Climboria Test", symbol: "CLIMB", description: "Devnet fixture" }); return { name: "Climboria Test", symbol: "CLIMB", uri: "https://metadata.example/climboria.json", contentJson, contentHash: createHash("sha256").update(contentJson).digest("hex") }; })(),
  decimals: 6, quoteDecimals: 9, migrateType: "cpmm", createOnly: true,
  token2022: false, creatorFeeOn: 0, supply: "1000000000000000", totalSellA: "793100000000000",
  totalFundRaisingB: "85000000000", totalLockedAmount: "0",
  ...overrides,
});
function client({ apiEpoch = 7, apiMint = ids.quoteMint, restrict = false, restrictGlobalConfig = false, missingAllow = false, allowIdentityMismatch = false, wrongAllowDiscriminator = false, wrongAllowBump = false, missingRule = false, ruleIdentityMismatch = false, wrongRuleDiscriminator = false, wrongRuleBump = false, missingBlockTime = false } = {}) {
  let captured, executeCalled = false;
  const rulePda = new PublicKey("Rule111111111111111111111111111111111111");
  const allowPda = new PublicKey("Allow11111111111111111111111111111111111");
  const allowDiscriminator = Buffer.from([174,147,132,240,137,219,243,16]);
  const allowBump = wrongAllowBump ? 6 : 7;
  const allowData = Buffer.concat([
    wrongAllowDiscriminator ? Buffer.from([1,2,3,4,5,6,7,8]) : allowDiscriminator,
    Buffer.from([allowBump]),
    new PublicKey(ids.configId).toBuffer(),
    new PublicKey(allowIdentityMismatch ? ids.creator : ids.platformId).toBuffer(),
    Buffer.alloc(64),
  ]);
  const ruleDiscriminator = Buffer.from([1,2,3,4,5,6,7,8]);
  const ruleData = {
    platformId: new PublicKey(ruleIdentityMismatch ? ids.creator : ids.platformId),
    configId: new PublicKey(ids.configId),
    bump: wrongRuleBump ? 8 : 9,
    epoch: new BN("4"),
    groups: [{ groupId: 0, constraints: [{ field: 3, op: 1, value: new BN("1") }] }],
  };
  const raydium = {
    cluster: "devnet",
    ownerPubKey: new PublicKey(ids.creator),
    connection: {
      getAccountInfo: async key => {
        if (key?.toBase58?.() === allowPda.toBase58()) {
          return missingAllow ? null : { owner: new PublicKey(ids.programId), data: allowData };
        }
        if (key?.toBase58?.() === rulePda.toBase58()) {
          return missingRule ? null : { owner: new PublicKey(ids.programId), data: Buffer.concat([wrongRuleDiscriminator ? Buffer.from([8,7,6,5,4,3,2,1]) : ruleDiscriminator, Buffer.alloc(32)]) };
        }
        return { owner: new PublicKey(ids.programId), data: Buffer.from("fixture") };
      },
      getSlot: async commitment => { assert.equal(commitment, "finalized"); return 123; },
      getBlockTime: async slot => { assert.equal(slot, 123); return missingBlockTime ? null : 1700000000; },
    },
    api: { fetchLaunchConfigs: async () => [{ key: { pubKey: ids.configId, mintB: apiMint, curveType: 0, index: 0, epoch: apiEpoch, tradeFeeRate: 2500, maxShareFeeRate: 10000, minSupplyA: 10000000, maxLockRate: 800000, minSellRateA: 200000, minMigrateRateA: 150000, minFundRaisingB: 24000000000, migrateFee: 100000000 }, defaultParams: { supplyInit: "1", totalSellA: "1", totalFundRaisingB: "1" } }] },
    launchpad: {
      createLaunchpad: async options => {
        captured = options;
        return {
          transactions: [makeInitializeV2Transaction(options, "init-1", {}, restrictGlobalConfig ? allowPda : undefined, restrict ? rulePda : undefined), makeInitializeV2Transaction(options, "init-2", {}, restrictGlobalConfig ? allowPda : undefined, restrict ? rulePda : undefined)],
          signers: [[options.extraSigners[0]], [options.extraSigners[0]]],
          instructionTypes: ["initializeV2"],
          extInfo: { poolId: "fixture" },
          execute: async () => { executeCalled = true; },
        };
      },
    },
  };
  const testSdk = {
    ...sdk,
    PlatformConfig: { decode: () => ({ restrictCurveParam: restrict, restrictGlobalConfig }) },
    PlatformCurveRule: { decode: () => ruleData },
    PLATFORM_CURVE_RULE_DISCRIMINATOR: ruleDiscriminator,
    getPdaPlatformCurveRule: () => ({ publicKey: rulePda, bump: 9 }),
    getPdaPlatformAllowConfig: () => ({ publicKey: allowPda, bump: 7 }),
    checkLaunchAgainstCurveRule: ({ rule, context }) => ({
      ok: rule.groups.length === 1 && context.curveType === 0 && context.migrateType === 1,
      matchedGroupId: 0,
      groupFailures: [],
    }),
  };
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
test("requires a valid dedicated fee payer distinct from creator when supplied", () => {
  assert.equal(validateDevnetLaunchInput(input({ feePayer: ids.feePayer }), sdk).amounts.supply, "1000000000000000");
  assert.throws(() => validateDevnetLaunchInput(input({ feePayer: "not-a-public-key" }), sdk), /valid public key/);
  assert.throws(() => validateDevnetLaunchInput(input({ feePayer: "" }), sdk), /fee-payer public key is required/);
});
test("requires an explicit CPMM creator fee mode", () => {
  assert.throws(() => validateDevnetLaunchInput(input({ creatorFeeOn: undefined }), sdk), /Creator fee mode must be explicitly selected/);
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
  assert.equal(result.transactionReviews[0].accountMetaDetails[0][0].isSigner, true);
  assert.equal(result.transactionReviews[0].accountMetaDetails[0][0].isWritable, true);
  assert.equal(result.transactionReviews[0].accountMetaDetails[0][1].isSigner, false);
  assert.equal(result.transactionReviews[0].requiredSignerKeys.length, 2);
  assert.equal(result.transactionReviews[0].feePayer, ids.feePayer);
  assert.deepEqual(result.transactionReviews[0].requiredSignerKeys, [ids.feePayer, input({}).mintKeypair.publicKey.toBase58()]);
  assert.equal(result.transactionReviews[0].launchpadAccounts.length, 18);
  assert.equal(result.transactionReviews[0].launchpadAccounts[0].name, "payer");
  assert.equal(result.transactionReviews[0].launchpadAccounts[0].pubkey, ids.feePayer);
  assert.equal(result.transactionReviews[0].launchpadAccounts[1].pubkey, ids.creator);
  assert.equal(result.transactionReviews[0].launchpadAccounts[1].name, "creator");
  assert.equal(result.transactionReviews[0].launchpadAccounts[1].isSigner, false);
  assert.equal(result.transactionReviews[0].launchpadAccounts[5].name, "pool_state");
  assert.equal(result.transactionReviews[0].launchpadAccounts[17].name, "program");
  assert.equal(result.signerRequirements[0][0], input({}).mintKeypair.publicKey.toBase58());
  assert.equal(result.transactionSubmitted, false);
  assert.equal(result.executeCalled, false);
  assert.equal(result.feeAndMigrationDestinations.cpmmMigrationPayer, "11111111111111111111111111111112");
  assert.equal(result.feeAndMigrationDestinations.creatorMatchesCpmmMigrationAuthority, false);
  assert.equal(result.feeAndMigrationDestinations.migrationIncludedInCreateOnlyTransaction, false);
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
  assert.equal(built.feePayer.toBase58(), ids.feePayer);
  assert.deepEqual(built.extraSigners, [input({}).mintKeypair]);
});
test("rejects any extra top-level instruction in create-only preparation", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    tx.message.compiledInstructions.push({
      programIdIndex: tx.message.staticAccountKeys.findIndex(key => key.toBase58() === "11111111111111111111111111111111"),
      accountKeyIndexes: [],
      data: Uint8Array.from([1]),
    });
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /exactly one initializeV2 instruction/);
});
test("derives future fee vaults from approved creator/platform and WSOL without adding them to create-only transaction", () => {
  const result = deriveDevnetFeeVaults({
    sdk, programId: ids.programId, platformId: ids.platformId,
    creatorWallet: ids.creator, quoteMint: ids.quoteMint,
  });
  assert.ok(result.platformFeeVault);
  assert.ok(result.platformFeeVaultAuthority);
  assert.ok(result.creatorFeeVault);
  assert.ok(result.creatorFeeVaultAuthority);
  assert.match(result.scope, /not accounts in the create-only/);
});
test("rejects a tampered initializeV2 pool PDA or account order", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    const indexes = tx.message.compiledInstructions[0].accountKeyIndexes;
    [indexes[5], indexes[8]] = [indexes[8], indexes[5]];
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /account mismatch at position 5/);
});
test("rejects a substituted initializeV2 account public key even when account order is unchanged", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    const instruction = tx.message.compiledInstructions[0];
    const index = instruction.accountKeyIndexes[2];
    tx.message.staticAccountKeys[index] = new PublicKey("11111111111111111111111111111112");
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /account mismatch at position 2 \(global_config\)/);
});
test("rejects an initializeV2 readonly config account promoted to writable in the compiled message", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    const keys = tx.message.staticAccountKeys;
    const targetIndex = keys.findIndex(key => key.toBase58() === ids.configId);
    const readonlyStart = keys.length - tx.message.header.numReadonlyUnsignedAccounts;
    const swapIndex = readonlyStart;
    assert.ok(targetIndex >= readonlyStart);
    [keys[targetIndex], keys[swapIndex]] = [keys[swapIndex], keys[targetIndex]];
    tx.message.compiledInstructions[0].accountKeyIndexes = tx.message.compiledInstructions[0].accountKeyIndexes.map(index =>
      index === targetIndex ? swapIndex : index === swapIndex ? targetIndex : index
    );
    tx.message.header.numReadonlyUnsignedAccounts -= 1;
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /signer\/writable privilege mismatch at global_config/);
});
test("rejects a serialized initializeV2 curve amount that differs from reviewed input", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => ({
    transactions: [makeInitializeV2Transaction(options, "init", { totalSellA: "1" })],
    signers: [[options.extraSigners[0]]],
  });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /initializeV2 argument mismatch: totalSellA/);
});
test("rejects a LaunchLab instruction with a non-initializeV2 discriminator", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    tx.message.compiledInstructions[0].data = Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0]);
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /not the pinned initializeV2 discriminator/);
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
test("rejects a transaction fee payer that differs from the dedicated fee payer", async () => {
  const mock = client();
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    tx.message.staticAccountKeys[0] = new PublicKey(ids.creator);
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /fee payer does not match the approved dedicated Devnet fee payer/);
});
test("resolves and reports V0 Address Lookup Table account metas", async () => {
  const mock = client();
  const lookupKey = new PublicKey("Lookup111111111111111111111111111111111");
  const loadedWritable = new PublicKey("LoadedWritable11111111111111111111111111");
  mock.raydium.connection.getAddressLookupTable = async () => ({
    value: { state: { addresses: [loadedWritable] } },
  });
  mock.raydium.connection.getAddressLookupTable = async () => ({
    value: { state: { addresses: [new PublicKey(ids.configId)] } },
  });
  mock.raydium.launchpad.createLaunchpad = async options => {
    const tx = makeInitializeV2Transaction(options);
    const keys = tx.message.staticAccountKeys;
    const configIndex = keys.findIndex(key => key.toBase58() === ids.configId);
    const instruction = tx.message.compiledInstructions[0];
    instruction.accountKeyIndexes = instruction.accountKeyIndexes.map(index =>
      index === configIndex ? keys.length - 1 : index > configIndex ? index - 1 : index
    );
    if (instruction.programIdIndex > configIndex) instruction.programIdIndex -= 1;
    keys.splice(configIndex, 1);
    tx.message.header.numReadonlyUnsignedAccounts -= 1;
    tx.message.addressTableLookups = [{ accountKey: lookupKey, writableIndexes: [], readonlyIndexes: [0] }];
    return { transactions: [tx], signers: [[options.extraSigners[0]]] };
  };
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  const review = result.transactionReviews[0];
  assert.equal(review.accountMetaDetails[0][2].pubkey, ids.configId);
  assert.equal(review.accountMetaDetails[0][2].isWritable, false);
  assert.equal(review.lookupTables[0].address, lookupKey.toBase58());
  assert.deepEqual(review.lookupTables[0].readonlyAddresses, [ids.configId]);
});
test("fails closed on fresh API / finalized GlobalConfig mismatch", async () => {
  const mock = client({ apiEpoch: 8 });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /API \/ finalized GlobalConfig mismatch: epoch/);
});
test("validates the finalized PlatformCurveRule PDA and matching launch constraints", async () => {
  const mock = client({ restrict: true });
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  assert.equal(result.platformCurveRule.enforced, true);
  assert.equal(result.platformCurveRule.bump, 9);
  assert.equal(result.platformCurveRule.epoch, "4");
  assert.equal(result.platformCurveRule.matchedGroupId, 0);
  assert.equal(result.platformCurveRule.finalizedSlot, 123);
  assert.equal(result.platformCurveRule.finalizedBlockTime, 1700000000);
  assert.equal(result.transactionReviews[0].launchpadAccounts.length, 19);
  assert.equal(result.transactionReviews[0].launchpadAccounts[18].name, "platform_curve_rule");
});
test("validates PlatformAllowConfig PDA identity and appends the optional readonly account", async () => {
  const mock = client({ restrictGlobalConfig: true });
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  assert.equal(result.platformAllowConfig.enforced, true);
  assert.equal(result.platformAllowConfig.bump, 7);
  assert.equal(result.platformAllowConfig.globalConfig, ids.configId);
  assert.equal(result.platformAllowConfig.platformConfig, ids.platformId);
  assert.equal(result.transactionReviews[0].launchpadAccounts.length, 19);
  assert.equal(result.transactionReviews[0].launchpadAccounts[18].name, "platform_allow_config");
  assert.equal(result.transactionReviews[0].launchpadAccounts[18].isWritable, false);
});
test("fails closed on missing, wrong-owner, wrong-identity, wrong-discriminator, or wrong-bump PlatformAllowConfig", async () => {
  const missing = client({ restrictGlobalConfig: true, missingAllow: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...missing, input: input({}) }), /PlatformAllowConfig account is missing/);
  const wrongIdentity = client({ restrictGlobalConfig: true, allowIdentityMismatch: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...wrongIdentity, input: input({}) }), /identity does not match/);
  const wrongDiscriminator = client({ restrictGlobalConfig: true, wrongAllowDiscriminator: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...wrongDiscriminator, input: input({}) }), /discriminator does not match/);
  const wrongBump = client({ restrictGlobalConfig: true, wrongAllowBump: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...wrongBump, input: input({}) }), /bump does not match/);
  const wrongOwner = client({ restrictGlobalConfig: true });
  const original = wrongOwner.raydium.connection.getAccountInfo;
  wrongOwner.raydium.connection.getAccountInfo = async key => {
    if (key?.toBase58?.() === "Allow11111111111111111111111111111111111") return { owner: new PublicKey(ids.creator), data: Buffer.concat([Buffer.from([174,147,132,240,137,219,243,16]), Buffer.from([7]), new PublicKey(ids.configId).toBuffer(), new PublicKey(ids.platformId).toBuffer(), Buffer.alloc(64)]) };
    return original(key);
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...wrongOwner, input: input({}) }), /wrong owner/);
});
test("includes both optional allow-config and curve-rule accounts in SDK order", async () => {
  const mock = client({ restrictGlobalConfig: true, restrict: true });
  const result = await prepareDevnetLaunch({ ...mock, input: input({}) });
  assert.equal(result.transactionReviews[0].launchpadAccounts.length, 20);
  assert.equal(result.transactionReviews[0].launchpadAccounts[18].name, "platform_allow_config");
  assert.equal(result.transactionReviews[0].launchpadAccounts[19].name, "platform_curve_rule");
});
test("fails closed when the restricted PlatformCurveRule account is missing", async () => {
  const mock = client({ restrict: true, missingRule: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /PlatformCurveRule account is missing/);
});
test("fails closed when the PlatformCurveRule identity does not match the verified platform/config", async () => {
  const mock = client({ restrict: true, ruleIdentityMismatch: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /identity does not match/);
});
test("fails closed when PlatformCurveRule discriminator or PDA bump is invalid", async () => {
  const badDiscriminator = client({ restrict: true, wrongRuleDiscriminator: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...badDiscriminator, input: input({}) }), /discriminator does not match/);
  const badBump = client({ restrict: true, wrongRuleBump: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...badBump, input: input({}) }), /bump does not match/);
});
test("fails closed when finalized block time is unavailable for PlatformCurveRule evaluation", async () => {
  const mock = client({ restrict: true, missingBlockTime: true });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /finalized Solana block time/);
});
test("fails closed when explicit launch parameters do not satisfy any PlatformCurveRule group", async () => {
  const mock = client({ restrict: true });
  mock.sdk.checkLaunchAgainstCurveRule = () => ({
    ok: false,
    groupFailures: [{ groupId: 2, unsatisfied: [{ field: 3, op: 1, value: new BN("900"), actual: new BN("100") }] }],
  });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /do not satisfy any active PlatformCurveRule group: group 2/);
});
test("fails closed when the finalized PlatformCurveRule account has the wrong owner", async () => {
  const mock = client({ restrict: true });
  const original = mock.raydium.connection.getAccountInfo;
  mock.raydium.connection.getAccountInfo = async key => {
    if (key?.toBase58?.() === "Rule111111111111111111111111111111111111") return {
      owner: new PublicKey(ids.creator),
      data: Buffer.concat([Buffer.from([1,2,3,4,5,6,7,8]), Buffer.alloc(32)]),
    };
    return original(key);
  };
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: input({}) }), /wrong owner/);
});
test("rejects a creator wallet that differs from the connected SDK owner", async () => {
  const mock = client();
  const altered = input({ creatorWallet: "11111111111111111111111111111112", feePayer: "11111111111111111111111111111112" });
  await assert.rejects(() => prepareDevnetLaunch({ ...mock, input: altered }), /SDK owner does not match/);
});
