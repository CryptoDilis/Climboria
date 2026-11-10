/**
 * Devnet-only Raydium LaunchLab transaction preparation.
 *
 * This module prepares the pinned SDK's ordered transaction set only. It never
 * calls execute(), signs with the creator wallet, submits, or funds a launch.
 * The caller must supply the ephemeral mint Keypair and every economic amount;
 * provider defaults are deliberately never read as launch settings.
 */
import { createHash } from "node:crypto";

const DEVNET = Object.freeze({
  programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
  configId: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
  platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
  quoteMint: "So11111111111111111111111111111111111111112",
  quoteDecimals: 9,
});

const fail = message => { throw new Error(message); };
const isPublicKey = value => value && typeof value.toBase58 === "function";
const sameKey = (a, b) => isPublicKey(a) && isPublicKey(b) && a.toBase58() === b.toBase58();
const rawAmount = (value, label, { allowZero = false } = {}) => {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) fail(`${label} must be an explicit unsigned integer string in base units`);
  const amount = BigInt(value);
  if (!allowZero && amount === 0n) fail(`${label} must be greater than zero`);
  if (amount > 18_446_744_073_709_551_615n) fail(`${label} exceeds the protocol u64 limit`);
  return value;
};

export function validateDevnetLaunchInput(input, sdk) {
  if (!input || typeof input !== "object") fail("Launch input is required");
  if (input.cluster !== "devnet") fail("LaunchLab preparation is restricted to Solana Devnet");
  if (input.programId !== DEVNET.programId || input.configId !== DEVNET.configId || input.platformId !== DEVNET.platformId) {
    fail("LaunchLab program, GlobalConfig, and PlatformConfig must match the verified Devnet allowlist");
  }
  if (input.quoteMint !== DEVNET.quoteMint) fail("Only the verified Devnet WSOL quote mint is allowed");
  if (!Number.isInteger(input.decimals) || input.decimals < 0 || input.decimals > 9 || input.quoteDecimals !== DEVNET.quoteDecimals) {
    fail("Token decimals must be explicitly selected (0–9); WSOL quote decimals must be 9");
  }
  if (typeof input.creatorWallet !== "string" || !input.creatorWallet.trim()) fail("Creator wallet is required");
  if (typeof input.feePayer !== "string" || input.feePayer !== input.creatorWallet) fail("Fee payer must exactly match the creator wallet");
  if (!input.mintKeypair || !isPublicKey(input.mintKeypair.publicKey)) fail("Caller-supplied mint Keypair is required; this module never generates or stores keys");
  if (!input.metadata || typeof input.metadata !== "object") fail("Explicit token metadata is required");
  const { name, symbol, uri, contentHash } = input.metadata;
  if (typeof name !== "string" || !name.trim() || name.length > 32) fail("Token name must contain 1–32 characters");
  if (typeof symbol !== "string" || !/^[A-Za-z0-9]{1,10}$/.test(symbol)) fail("Token symbol must contain 1–10 ASCII letters or digits");
  let parsedUri;
  try { parsedUri = new URL(uri); } catch { fail("Metadata URI must be a valid HTTPS URL"); }
  if (parsedUri.protocol !== "https:") fail("Metadata URI must use HTTPS");
  if (typeof input.metadata.contentJson !== "string" || !input.metadata.contentJson.trim()) fail("Exact metadata JSON content is required for integrity verification");
  let metadataObject;
  try { metadataObject = JSON.parse(input.metadata.contentJson); } catch { fail("Metadata content must be valid JSON"); }
  const actualHash = createHash("sha256").update(input.metadata.contentJson, "utf8").digest("hex");
  if (typeof contentHash !== "string" || actualHash !== contentHash.toLowerCase()) fail("Metadata SHA-256 does not match the exact metadata JSON bytes");
  if (metadataObject.name !== name || metadataObject.symbol !== symbol) fail("Metadata JSON name/symbol must match the reviewed launch fields");
  if (input.migrateType !== "cpmm") fail("New LaunchLab launches must explicitly use CPMM migration");
  if (input.createOnly !== true) fail("Creator preparation must use create-only mode; no initial buy");
  if (input.token2022 === true || input.transferFeeExtensionParams) fail("Token-2022 transfer-fee launches are not enabled in this Devnet preparation path");
  if (input.creatorFeeOn !== 0 && input.creatorFeeOn !== 1) fail("Creator fee mode must be explicitly selected as 0 (OnlyTokenB) or 1 (BothToken)");
  if (!sdk?.PublicKey || !sdk?.BN || !sdk?.LaunchpadConfig || !sdk?.PlatformConfig || !sdk?.TxVersion) {
    fail("Pinned Raydium SDK primitives are required");
  }
  const amounts = {
    supply: rawAmount(input.supply, "supply"),
    totalSellA: rawAmount(input.totalSellA, "totalSellA"),
    totalFundRaisingB: rawAmount(input.totalFundRaisingB, "totalFundRaisingB"),
    totalLockedAmount: rawAmount(input.totalLockedAmount, "totalLockedAmount", { allowZero: true }),
  };
  const supply = BigInt(amounts.supply);
  if (BigInt(amounts.totalSellA) >= supply) fail("totalSellA must be less than total supply");
  if (BigInt(amounts.totalLockedAmount) >= supply - BigInt(amounts.totalSellA)) fail("Locked amount must leave a positive supply remainder after curve allocation");
  return { amounts };
}

export function validateConstantProductInitFormula({ supply, totalSellA, totalFundRaisingB, totalLockedAmount, migrateFee }) {
  const supplyRaw = BigInt(supply);
  const sellRaw = BigInt(totalSellA);
  const raiseRaw = BigInt(totalFundRaisingB);
  const lockedRaw = BigInt(totalLockedAmount);
  const migrateFeeRaw = BigInt(migrateFee);
  const remaining = supplyRaw - sellRaw - lockedRaw;
  const raiseAfterMigrationFee = raiseRaw - migrateFeeRaw;
  if (remaining <= 0n) fail("LaunchLab curve initialization requires positive supply remaining after sale and lock allocations");
  if (raiseAfterMigrationFee <= 0n) fail("LaunchLab curve initialization requires quote raise greater than migration fee");
  // Mirrors the pinned SDK's integer BN formula exactly. A zero/negative
  // denominator otherwise surfaces as an opaque BN.div assertion.
  const denominator = (raiseAfterMigrationFee * sellRaw) / remaining - raiseRaw;
  if (denominator <= 0n) fail("LaunchLab constant-product initialization denominator must be positive; adjust explicit supply, sale and quote-raise inputs");
  return { remaining: remaining.toString(), raiseAfterMigrationFee: raiseAfterMigrationFee.toString(), denominator: denominator.toString() };
}


const INITIALIZE_V2_DISCRIMINATOR = Buffer.from([67, 153, 175, 39, 218, 16, 38, 32]);
const METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const RENT_SYSVAR_ID = "SysvarRent111111111111111111111111111111111";

function decodeBase58(value) {
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value !== "string" || !value.length) fail("LaunchLab instruction data is missing or malformed");
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) fail("LaunchLab instruction data is not valid base58");
    number = number * 58n + BigInt(digit);
  }
  let hex = number.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const body = number === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex");
  let leading = 0;
  while (leading < value.length && value[leading] === "1") leading++;
  return Buffer.concat([Buffer.alloc(leading), body]);
}

export function expectedInitializeV2Accounts({ sdk, input, programId }) {
  const PublicKey = sdk.PublicKey;
  const creator = new PublicKey(input.creatorWallet);
  const mintA = input.mintKeypair.publicKey;
  const mintB = new PublicKey(DEVNET.quoteMint);
  const metadataProgram = new PublicKey(METADATA_PROGRAM_ID);
  const tokenProgram = new PublicKey(TOKEN_PROGRAM_ID);
  const systemProgram = new PublicKey(SYSTEM_PROGRAM_ID);
  const rentSysvar = new PublicKey(RENT_SYSVAR_ID);
  const [auth] = PublicKey.findProgramAddressSync([Buffer.from("vault_auth_seed")], programId);
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool"), mintA.toBuffer(), mintB.toBuffer()], programId);
  const [vaultA] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), pool.toBuffer(), mintA.toBuffer()], programId);
  const [vaultB] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), pool.toBuffer(), mintB.toBuffer()], programId);
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), metadataProgram.toBuffer(), mintA.toBuffer()],
    metadataProgram,
  );
  const [eventAuthority] = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId);

  // Ordered from the pinned official Anchor IDL initialize_v2 account list.
  // The final IDL "program" entry is the compiled instruction's programIdIndex,
  // not an entry in accountKeyIndexes.
  return [
    { name: "payer", pubkey: creator, isSigner: true, isWritable: true },
    { name: "creator", pubkey: creator, isSigner: false, isWritable: false },
    { name: "global_config", pubkey: new PublicKey(DEVNET.configId), isSigner: false, isWritable: false },
    { name: "platform_config", pubkey: new PublicKey(DEVNET.platformId), isSigner: false, isWritable: false },
    { name: "authority", pubkey: auth, isSigner: false, isWritable: false },
    { name: "pool_state", pubkey: pool, isSigner: false, isWritable: true },
    { name: "base_mint", pubkey: mintA, isSigner: true, isWritable: true },
    { name: "quote_mint", pubkey: mintB, isSigner: false, isWritable: false },
    { name: "base_vault", pubkey: vaultA, isSigner: false, isWritable: true },
    { name: "quote_vault", pubkey: vaultB, isSigner: false, isWritable: true },
    { name: "metadata_account", pubkey: metadata, isSigner: false, isWritable: true },
    { name: "base_token_program", pubkey: tokenProgram, isSigner: false, isWritable: false },
    { name: "quote_token_program", pubkey: tokenProgram, isSigner: false, isWritable: false },
    { name: "metadata_program", pubkey: metadataProgram, isSigner: false, isWritable: false },
    { name: "system_program", pubkey: systemProgram, isSigner: false, isWritable: false },
    { name: "rent_program", pubkey: rentSysvar, isSigner: false, isWritable: false },
    { name: "event_authority", pubkey: eventAuthority, isSigner: false, isWritable: false },
    { name: "program", pubkey: programId, isSigner: false, isWritable: false },
  ];
}

function decodeInitializeV2Data(data, index) {
  let offset = INITIALIZE_V2_DISCRIMINATOR.length;
  const need = size => {
    if (offset + size > data.length) fail("SDK transaction " + index + " initializeV2 data is truncated");
  };
  const readU8 = () => { need(1); return data.readUInt8(offset++); };
  const readU64 = () => { need(8); const value = data.readBigUInt64LE(offset); offset += 8; return value.toString(); };
  const readString = () => {
    need(4);
    const length = data.readUInt32LE(offset);
    offset += 4;
    need(length);
    const value = data.toString("utf8", offset, offset + length);
    offset += length;
    return value;
  };
  const decoded = {
    decimals: readU8(),
    name: readString(),
    symbol: readString(),
    uri: readString(),
    curveIndex: readU8(),
    supply: readU64(),
    totalSellA: readU64(),
    totalFundRaisingB: readU64(),
    migrateType: readU8(),
    totalLockedAmount: readU64(),
    cliffPeriod: readU64(),
    unlockPeriod: readU64(),
    creatorFeeOn: readU8(),
  };
  if (offset !== data.length) fail("SDK transaction " + index + " initializeV2 data contains unexpected trailing bytes");
  return decoded;
}

function validateInitializeV2Instruction({ instruction, allKeys, expectedAccounts, programId, input, index }) {
  const actualProgram = allKeys[instruction.programIdIndex];
  if (!sameKey(actualProgram, programId)) fail(`SDK transaction ${index} initializeV2 program ID mismatch`);
  const data = decodeBase58(instruction.data);
  if (data.length < INITIALIZE_V2_DISCRIMINATOR.length ||
      !data.subarray(0, INITIALIZE_V2_DISCRIMINATOR.length).equals(INITIALIZE_V2_DISCRIMINATOR)) {
    fail(`SDK transaction ${index} LaunchLab instruction is not the pinned initializeV2 discriminator`);
  }
  const decodedData = decodeInitializeV2Data(data, index);
  const expectedData = {
    decimals: input.decimals,
    name: input.metadata.name,
    symbol: input.metadata.symbol,
    uri: input.metadata.uri,
    curveIndex: 0,
    supply: input.supply,
    totalSellA: input.totalSellA,
    totalFundRaisingB: input.totalFundRaisingB,
    migrateType: 1,
    totalLockedAmount: input.totalLockedAmount,
    cliffPeriod: "0",
    unlockPeriod: "0",
    creatorFeeOn: input.creatorFeeOn,
  };
  for (const [field, expected] of Object.entries(expectedData)) {
    if (String(decodedData[field]) !== String(expected)) fail("SDK transaction " + index + " initializeV2 argument mismatch: " + field);
  }
  const indexes = Array.from(instruction.accountKeyIndexes ?? []);
  if (indexes.length !== expectedAccounts.length) {
    fail(`SDK transaction ${index} initializeV2 account count differs from the pinned 18-entry initializeV2 IDL`);
  }

  // Compiled-message privileges are global per key. Union the IDL privileges
  // where the creator and payer alias the same public key, then compare exactly.
  const effectivePrivileges = new Map();
  for (const account of expectedAccounts) {
    const key = account.pubkey.toBase58();
    const current = effectivePrivileges.get(key) ?? { isSigner: false, isWritable: false };
    effectivePrivileges.set(key, {
      isSigner: current.isSigner || account.isSigner,
      isWritable: current.isWritable || account.isWritable,
    });
  }
  const accountReview = indexes.map((keyIndex, accountIndex) => {
    const actual = allKeys[keyIndex];
    if (!actual) fail(`SDK transaction ${index} initializeV2 has unresolved account index at position ${accountIndex}`);
    const expected = expectedAccounts[accountIndex];
    const actualKey = actual.toBase58();
    const expectedKey = expected.pubkey.toBase58();
    if (actualKey !== expectedKey) {
      fail(`SDK transaction ${index} initializeV2 account mismatch at position ${accountIndex} (${expected.name})`);
    }
    return {
      position: accountIndex,
      name: expected.name,
      pubkey: actualKey,
      isSigner: effectivePrivileges.get(expectedKey).isSigner,
      isWritable: effectivePrivileges.get(expectedKey).isWritable,
    };
  });
  return { accounts: accountReview, data: decodedData };
}

export async function prepareDevnetLaunch({ raydium, sdk, input }) {
  const { amounts } = validateDevnetLaunchInput(input, sdk);
  if (!raydium?.connection || !raydium?.api || !raydium?.launchpad) fail("Initialized read-only Devnet Raydium SDK client is required");
  if (raydium.cluster !== "devnet") fail("Raydium SDK client must be explicitly initialized for Devnet");
  if (!sameKey(raydium.ownerPubKey, new sdk.PublicKey(input.creatorWallet))) fail("Connected SDK owner does not match the approved creator wallet");

  const programId = new sdk.PublicKey(DEVNET.programId);
  const configId = new sdk.PublicKey(DEVNET.configId);
  const platformId = new sdk.PublicKey(DEVNET.platformId);
  const [configAccount, platformAccount, apiConfigs] = await Promise.all([
    raydium.connection.getAccountInfo(configId, "finalized"),
    raydium.connection.getAccountInfo(platformId, "finalized"),
    raydium.api.fetchLaunchConfigs(),
  ]);
  if (!configAccount || !sameKey(configAccount.owner, programId)) fail("Finalized Devnet GlobalConfig is missing or has the wrong owner");
  if (!platformAccount || !sameKey(platformAccount.owner, programId)) fail("Finalized Devnet PlatformConfig is missing or has the wrong owner");
  const configInfo = sdk.LaunchpadConfig.decode(configAccount.data);
  const platformInfo = sdk.PlatformConfig.decode(platformAccount.data);
  if (!sameKey(configInfo.mintB, new sdk.PublicKey(DEVNET.quoteMint)) || Number(configInfo.curveType) !== 0 || Number(configInfo.index) !== 0) {
    fail("Finalized GlobalConfig is not the verified WSOL / constant-product / index-0 configuration");
  }
  const apiConfig = Array.isArray(apiConfigs) && apiConfigs.find(item => item.key?.pubKey === DEVNET.configId);
  if (!apiConfig) fail("Fresh Raydium Launch Config API did not return the verified Devnet GlobalConfig");
  for (const field of ["mintB", "curveType", "index", "epoch", "tradeFeeRate", "maxShareFeeRate", "minSupplyA", "maxLockRate", "minSellRateA", "minMigrateRateA", "minFundRaisingB", "migrateFee"]) {
    const onChain = field === "mintB" ? configInfo.mintB.toBase58() : String(configInfo[field]);
    if (String(apiConfig.key[field]) !== onChain) fail(`Fresh API / finalized GlobalConfig mismatch: ${field}`);
  }
  if (platformInfo.restrictCurveParam) {
    fail("Platform restricts curve parameters; this builder does not yet decode and verify PlatformCurveRule, so preparation is blocked");
  }
  const curveFormula = validateConstantProductInitFormula({ ...amounts, migrateFee: configInfo.migrateFee.toString() });

  // Important: do not read apiConfig.defaultParams. All curve economics are caller-supplied.
  const sdkInput = {
    programId,
    platformId,
    mintA: input.mintKeypair.publicKey,
    name: input.metadata.name,
    symbol: input.metadata.symbol,
    uri: input.metadata.uri,
    decimals: input.decimals,
    mintBDecimals: input.quoteDecimals,
    configId,
    configInfo,
    migrateType: "cpmm",
    supply: new sdk.BN(amounts.supply),
    totalSellA: new sdk.BN(amounts.totalSellA),
    totalFundRaisingB: new sdk.BN(amounts.totalFundRaisingB),
    totalLockedAmount: new sdk.BN(amounts.totalLockedAmount),
    creatorFeeOn: input.creatorFeeOn,
    buyAmount: new sdk.BN(0),
    createOnly: true,
    feePayer: new sdk.PublicKey(input.creatorWallet),
    extraSigners: [input.mintKeypair],
    txVersion: sdk.TxVersion.V0,
  };
  const prepared = await raydium.launchpad.createLaunchpad(sdkInput);
  if (!Array.isArray(prepared?.transactions) || prepared.transactions.length === 0) {
    fail("Pinned SDK did not return an ordered launch transaction set");
  }
  if (!Array.isArray(prepared.signers) || prepared.signers.length !== prepared.transactions.length) {
    fail("Pinned SDK signer groups are missing or do not match the ordered transaction set");
  }
  let mintSignerSeen = false;
  const signerRequirements = prepared.signers.map((group, index) => {
    if (!Array.isArray(group)) fail(`SDK signer group ${index} is malformed`);
    return group.map(signer => {
      if (!signer?.publicKey || !sameKey(signer.publicKey, input.mintKeypair.publicKey)) {
        fail("SDK requested an unexpected transaction signer");
      }
      mintSignerSeen = true;
      return signer.publicKey.toBase58();
    });
  });
  if (!mintSignerSeen) fail("Caller-supplied mint Keypair is not present in the SDK transaction signer requirements");

  const allowedPrograms = new Set([
    DEVNET.programId,
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    "ComputeBudget111111111111111111111111111111",
  ]);
  const expectedAccounts = expectedInitializeV2Accounts({ sdk, input, programId });
  const transactionReviews = await Promise.all(prepared.transactions.map(async (transaction, index) => {
    const message = transaction?.message;
    const keys = message?.staticAccountKeys;
    const header = message?.header;
    const requiredCount = header?.numRequiredSignatures;
    const readonlySigned = header?.numReadonlySignedAccounts;
    const readonlyUnsigned = header?.numReadonlyUnsignedAccounts;
    if (!Array.isArray(keys) || !Number.isInteger(requiredCount) || requiredCount < 2 ||
        !Number.isInteger(readonlySigned) || !Number.isInteger(readonlyUnsigned)) {
      fail(`SDK transaction ${index} is not a supported v0 message or lacks complete account-meta header data`);
    }
    if (!sameKey(keys[0], new sdk.PublicKey(input.creatorWallet))) {
      fail(`SDK transaction ${index} fee payer does not match the approved creator wallet`);
    }
    const required = keys.slice(0, requiredCount).map(key => key.toBase58());
    const expected = [input.creatorWallet, input.mintKeypair.publicKey.toBase58()];
    if (required.length !== 2 || !expected.every(key => required.includes(key))) {
      fail(`SDK transaction ${index} contains an unexpected required signer`);
    }
    const instructions = message.compiledInstructions;
    if (!Array.isArray(instructions) || instructions.length === 0) fail(`SDK transaction ${index} contains no compiled instructions`);
    const lookupTables = message.addressTableLookups ?? [];
    const loadedWritable = [];
    const loadedReadonly = [];
    const lookupTableReviews = [];
    for (const lookup of lookupTables) {
      const table = await raydium.connection.getAddressLookupTable(lookup.accountKey, { commitment: "finalized" });
      if (!table?.value) fail(`SDK transaction ${index} references a missing or unreadable Address Lookup Table: ${lookup.accountKey.toBase58()}`);
      const writableAddresses = [];
      const readonlyAddresses = [];
      for (const addressIndex of Array.from(lookup.writableIndexes ?? [])) {
        const address = table.value.state.addresses[addressIndex];
        if (!address) fail(`SDK transaction ${index} references an invalid writable lookup-table index`);
        loadedWritable.push(address);
        writableAddresses.push(address.toBase58());
      }
      for (const addressIndex of Array.from(lookup.readonlyIndexes ?? [])) {
        const address = table.value.state.addresses[addressIndex];
        if (!address) fail(`SDK transaction ${index} references an invalid readonly lookup-table index`);
        loadedReadonly.push(address);
        readonlyAddresses.push(address.toBase58());
      }
      lookupTableReviews.push({ address: lookup.accountKey.toBase58(), writableAddresses, readonlyAddresses });
    }
    // V0 message account order is static keys, all loaded writable keys, then all loaded readonly keys.
    const allKeys = [...keys, ...loadedWritable, ...loadedReadonly];
    const programIds = instructions.map(instruction => {
      const program = allKeys[instruction.programIdIndex];
      if (!program) fail(`SDK transaction ${index} references an unresolved program index`);
      const address = program.toBase58();
      if (!allowedPrograms.has(address)) fail(`SDK transaction ${index} references an unapproved program: ${address}`);
      return address;
    });
    const accountMetaDetails = instructions.map(instruction => Array.from(instruction.accountKeyIndexes ?? []).map(keyIndex => {
      const account = allKeys[keyIndex];
      if (!account) fail(`SDK transaction ${index} references an unresolved account index after Address Lookup Table resolution`);
      const isSigner = keyIndex < requiredCount;
      let isWritable = false;
      if (keyIndex < requiredCount) isWritable = keyIndex < requiredCount - readonlySigned;
      else if (keyIndex < keys.length) isWritable = keyIndex < keys.length - readonlyUnsigned;
      else if (keyIndex < keys.length + loadedWritable.length) isWritable = true;
      return { index: keyIndex, pubkey: account.toBase58(), isSigner, isWritable };
    }));
    const launchpadInstructions = instructions.filter(instruction => allKeys[instruction.programIdIndex]?.toBase58() === DEVNET.programId);
    if (launchpadInstructions.length !== 1) fail(`SDK transaction ${index} must contain exactly one LaunchLab initializeV2 instruction`);
    const launchpadReview = validateInitializeV2Instruction({
      instruction: launchpadInstructions[0],
      allKeys,
      expectedAccounts,
      programId,
      input,
      index,
    });
    if (!accountMetaDetails.flat().some(meta => meta.pubkey === input.mintKeypair.publicKey.toBase58() && meta.isSigner && meta.isWritable)) {
      fail(`SDK transaction ${index} does not mark the supplied mint Keypair as a writable signer account`);
    }
    const effectiveMessagePrivileges = new Map();
    for (let keyIndex = 0; keyIndex < allKeys.length; keyIndex++) {
      const isSigner = keyIndex < requiredCount;
      let isWritable = false;
      if (keyIndex < requiredCount) isWritable = keyIndex < requiredCount - readonlySigned;
      else if (keyIndex < keys.length) isWritable = keyIndex < keys.length - readonlyUnsigned;
      else if (keyIndex < keys.length + loadedWritable.length) isWritable = true;
      effectiveMessagePrivileges.set(allKeys[keyIndex].toBase58(), { isSigner, isWritable });
    }
    for (const account of expectedAccounts) {
      const expectedPrivilege = effectiveMessagePrivileges.get(account.pubkey.toBase58());
      const expectedEffective = expectedAccounts
        .filter(item => item.pubkey.toBase58() === account.pubkey.toBase58())
        .reduce((value, item) => ({ isSigner: value.isSigner || item.isSigner, isWritable: value.isWritable || item.isWritable }), { isSigner: false, isWritable: false });
      if (!expectedPrivilege || expectedPrivilege.isSigner !== expectedEffective.isSigner || expectedPrivilege.isWritable !== expectedEffective.isWritable) {
        fail(`SDK transaction ${index} initializeV2 signer/writable privilege mismatch at ${account.name}`);
      }
    }
    return {
      index,
      feePayer: keys[0].toBase58(),
      requiredSignerKeys: required,
      programIds: [...new Set(programIds)],
      instructionCount: instructions.length,
      accountMetaIndexes: instructions.map(instruction => Array.from(instruction.accountKeyIndexes ?? [])),
      accountMetaDetails,
      launchpadAccounts: launchpadReview.accounts,
      launchpadInstructionData: launchpadReview.data,
      lookupTables: lookupTableReviews,
    };
  }));
  return {
    cluster: "devnet",
    programId: DEVNET.programId,
    configId: DEVNET.configId,
    platformId: DEVNET.platformId,
    creatorWallet: input.creatorWallet,
    mintAddress: input.mintKeypair.publicKey.toBase58(),
    metadataHash: input.metadata.contentHash.toLowerCase(),
    amounts,
    curveFormula,
    creatorFeeOn: input.creatorFeeOn,
    migration: "cpmm",
    instructionPath: "initializeV2",
    createOnly: true,
    transactionCount: prepared.transactions.length,
    transactions: prepared.transactions,
    signerRequirements,
    transactionReviews,
    instructionTypes: prepared.instructionTypes ?? [],
    extInfo: prepared.extInfo,
    creatorWalletSignatureRequired: true,
    transactionSubmitted: false,
    executeCalled: false,
  };
}

export const LAUNCHLAB_DEVNET_ALLOWLIST = DEVNET;
