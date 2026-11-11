import { createHash } from "node:crypto";
import { encodeBase58 } from "./legacy-anchor-idl-account.mjs";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const FIELD_P = (1n << 255n) - 19n;
const PDA_MARKER = Buffer.from("ProgramDerivedAddress", "utf8");

function modPow(base, exponent, modulus) {
  let value = base % modulus;
  let power = exponent;
  let result = 1n;
  while (power > 0n) {
    if (power & 1n) result = (result * value) % modulus;
    value = (value * value) % modulus;
    power >>= 1n;
  }
  return result;
}

const FIELD_D = ((-121665n * modPow(121666n, FIELD_P - 2n, FIELD_P)) % FIELD_P + FIELD_P) % FIELD_P;
const SQRT_M1 = modPow(2n, (FIELD_P - 1n) / 4n, FIELD_P);

function littleEndianToBigInt(bytes) {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) result = (result << 8n) | BigInt(bytes[i]);
  return result;
}

function decodeBase58(value) {
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) throw new Error(`Invalid base58 character: ${character}`);
    number = number * 58n + BigInt(digit);
  }
  const hexValue = number.toString(16);
  const hex = hexValue.padStart(Math.ceil(hexValue.length / 2) * 2, "0");
  const decoded = number === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex");
  let zeroes = 0;
  while (zeroes < value.length && value[zeroes] === "1") zeroes += 1;
  const result = Buffer.concat([Buffer.alloc(zeroes), decoded]);
  if (result.length !== 32) throw new Error(`Expected a 32-byte public key, got ${result.length} bytes`);
  return result;
}

function isEd25519Point(compressed) {
  if (!Buffer.isBuffer(compressed) || compressed.length !== 32) return false;
  const copy = Buffer.from(compressed);
  const sign = copy[31] >> 7;
  copy[31] &= 0x7f;
  const y = littleEndianToBigInt(copy);
  if (y >= FIELD_P) return false;
  const y2 = (y * y) % FIELD_P;
  const numerator = (y2 - 1n + FIELD_P) % FIELD_P;
  const denominator = (FIELD_D * y2 + 1n) % FIELD_P;
  const x2 = (numerator * modPow(denominator, FIELD_P - 2n, FIELD_P)) % FIELD_P;
  let x = modPow(x2, (FIELD_P + 3n) / 8n, FIELD_P);
  if ((x * x) % FIELD_P !== x2) x = (x * SQRT_M1) % FIELD_P;
  if ((x * x) % FIELD_P !== x2) return false;
  if (x === 0n && sign === 1) return false;
  return true;
}

export function deriveProgramAddress(seeds, programId) {
  if (!Array.isArray(seeds) || seeds.length > 16) throw new Error("PDA derivation requires at most 16 seeds");
  const normalized = seeds.map((seed) => Buffer.from(seed));
  if (normalized.some((seed) => seed.length > 32)) throw new Error("PDA seeds must not exceed 32 bytes");
  const programBytes = decodeBase58(programId);
  for (let bump = 255; bump >= 0; bump -= 1) {
    const digest = createHash("sha256").update(Buffer.concat([
      ...normalized,
      Buffer.from([bump]),
      programBytes,
      PDA_MARKER,
    ])).digest();
    if (!isEd25519Point(digest)) return { address: encodeBase58(digest), bump };
  }
  throw new Error("Unable to find a viable program-derived address");
}

function borshTypeSize(type, typeDefinitions, stack = []) {
  const primitiveSizes = {
    bool: 1, u8: 1, i8: 1,
    u16: 2, i16: 2,
    u32: 4, i32: 4, f32: 4,
    u64: 8, i64: 8, f64: 8,
    u128: 16, i128: 16,
    pubkey: 32,
  };
  if (typeof type === "string") {
    if (Object.hasOwn(primitiveSizes, type)) return primitiveSizes[type];
    throw new Error(`Unsupported fixed-size Borsh primitive: ${type}`);
  }
  if (type?.array) {
    const [elementType, length] = type.array;
    if (!Number.isInteger(length) || length < 0) throw new Error("Invalid Borsh array length");
    return borshTypeSize(elementType, typeDefinitions, stack) * length;
  }
  if (type?.defined) {
    const name = typeof type.defined === "string" ? type.defined : type.defined.name;
    if (!name || stack.includes(name)) throw new Error(`Invalid or recursive Borsh type: ${name}`);
    const definition = typeDefinitions.find((item) => item.name === name);
    if (!definition?.type) throw new Error(`Missing Borsh type definition: ${name}`);
    const nextStack = [...stack, name];
    if (definition.type.kind === "struct") {
      return (definition.type.fields ?? []).reduce(
        (sum, field) => sum + borshTypeSize(field.type, typeDefinitions, nextStack), 0,
      );
    }
    if (definition.type.kind === "enum") {
      const payloadSizes = (definition.type.variants ?? []).map((variant) =>
        (variant.fields ?? []).reduce((sum, field) => {
          const fieldType = field.type ?? field;
          return sum + borshTypeSize(fieldType, typeDefinitions, nextStack);
        }, 0),
      );
      if (new Set(payloadSizes).size > 1) {
        throw new Error(`Variable-size enum cannot be used in fixed account layout: ${name}`);
      }
      return 1 + (payloadSizes[0] ?? 0);
    }
    throw new Error(`Unsupported Borsh type kind: ${definition.type.kind}`);
  }
  throw new Error("Dynamic or unsupported Borsh type in fixed account layout");
}

export function decodeLaunchpadPoolState(accountData, idl) {
  const bytes = Buffer.isBuffer(accountData) ? accountData : Buffer.from(accountData);
  const accountDefinition = idl?.accounts?.find((item) => item.name === "PoolState");
  const typeDefinition = idl?.types?.find((item) => item.name === "PoolState");
  if (!Array.isArray(accountDefinition?.discriminator) || !typeDefinition?.type?.fields) {
    throw new Error("IDL does not contain the PoolState discriminator and struct definition");
  }
  if (bytes.length < 8) throw new Error("PoolState account data is shorter than its discriminator");
  const expectedDiscriminator = Buffer.from(accountDefinition.discriminator);
  const actualDiscriminator = bytes.subarray(0, 8);
  if (!actualDiscriminator.equals(expectedDiscriminator)) {
    throw new Error("PoolState account discriminator does not match the supplied IDL");
  }

  const fieldOffsets = {};
  let offset = 8;
  for (const field of typeDefinition.type.fields) {
    fieldOffsets[field.name] = offset;
    offset += borshTypeSize(field.type, idl.types ?? []);
  }

  const readPubkey = (fieldName) => {
    const field = typeDefinition.type.fields.find((item) => item.name === fieldName);
    const fieldOffset = fieldOffsets[fieldName];
    if (!field || field.type !== "pubkey" || !Number.isInteger(fieldOffset)) {
      throw new Error(`PoolState field is missing or is not a pubkey: ${fieldName}`);
    }
    if (fieldOffset + 32 > bytes.length) throw new Error(`PoolState account is truncated before ${fieldName}`);
    return encodeBase58(bytes.subarray(fieldOffset, fieldOffset + 32));
  };

  return {
    discriminatorHex: actualDiscriminator.toString("hex"),
    dataLength: bytes.length,
    fieldOffsets,
    globalConfig: readPubkey("global_config"),
    platformConfig: readPubkey("platform_config"),
    baseMint: readPubkey("base_mint"),
    quoteMint: readPubkey("quote_mint"),
    creator: readPubkey("creator"),
  };
}

export function decodeTokenAccountBaseLayout(accountData) {
  const bytes = Buffer.isBuffer(accountData) ? accountData : Buffer.from(accountData);
  if (bytes.length < 165) throw new Error(`Token account is shorter than the 165-byte base layout: ${bytes.length}`);
  const optionTag = (offset, label) => {
    const tag = bytes.readUInt32LE(offset);
    if (tag !== 0 && tag !== 1) throw new Error(`Invalid token-account ${label} COption tag: ${tag}`);
    return tag;
  };
  const delegateOption = optionTag(72, "delegate");
  const nativeOption = optionTag(109, "is_native");
  const closeAuthorityOption = optionTag(129, "close_authority");
  const state = bytes[108];
  if (![0, 1, 2].includes(state)) throw new Error(`Invalid token-account state: ${state}`);
  return {
    dataLength: bytes.length,
    mint: encodeBase58(bytes.subarray(0, 32)),
    tokenAuthority: encodeBase58(bytes.subarray(32, 64)),
    amount: bytes.readBigUInt64LE(64).toString(),
    delegate: delegateOption === 1 ? encodeBase58(bytes.subarray(76, 108)) : null,
    state: ["uninitialized", "initialized", "frozen"][state],
    isNative: nativeOption === 1 ? bytes.readBigUInt64LE(113).toString() : null,
    delegatedAmount: bytes.readBigUInt64LE(121).toString(),
    closeAuthority: closeAuthorityOption === 1 ? encodeBase58(bytes.subarray(133, 165)) : null,
  };
}

export function auditRaydiumLaunchlabCandidateAccounts({ accounts, idl, expected }) {
  const report = {
    status: "incomplete",
    commitment: "finalized",
    contextSlot: accounts?.contextSlot ?? null,
    expected,
    accountObservations: {},
    poolState: null,
    platformFeeVault: null,
    creatorFeeVault: null,
    derivedAddresses: {},
    checks: {},
    error: null,
  };
  try {
    const poolValue = accounts?.poolState?.value ?? null;
    const platformValue = accounts?.platformFeeVault?.value ?? null;
    const creatorValue = accounts?.creatorFeeVault?.value ?? null;
    const systemValue = accounts?.systemProgram?.value ?? null;
    report.accountObservations = {
      poolState: poolValue ? { owner: poolValue.owner, executable: poolValue.executable, lamports: poolValue.lamports } : null,
      platformFeeVault: platformValue ? { owner: platformValue.owner, executable: platformValue.executable, lamports: platformValue.lamports } : null,
      creatorFeeVault: creatorValue ? { owner: creatorValue.owner, executable: creatorValue.executable, lamports: creatorValue.lamports } : null,
      systemProgram: systemValue ? { owner: systemValue.owner, executable: systemValue.executable, lamports: systemValue.lamports } : null,
    };
    if (!poolValue || !platformValue || !creatorValue || !systemValue) {
      report.error = "One or more candidate LaunchLab accounts were not found at finalized commitment";
      return report;
    }

    const poolBytes = Buffer.from(poolValue.data?.[0] ?? "", "base64");
    const platformBytes = Buffer.from(platformValue.data?.[0] ?? "", "base64");
    const creatorVaultBytes = Buffer.from(creatorValue.data?.[0] ?? "", "base64");
    report.poolState = decodeLaunchpadPoolState(poolBytes, idl);
    report.platformFeeVault = decodeTokenAccountBaseLayout(platformBytes);
    report.creatorFeeVault = decodeTokenAccountBaseLayout(creatorVaultBytes);

    const programId = expected.programId;
    const baseMintBytes = decodeBase58(report.poolState.baseMint);
    const quoteMintBytes = decodeBase58(report.poolState.quoteMint);
    const platformConfigBytes = decodeBase58(report.poolState.platformConfig);
    const creatorBytes = decodeBase58(report.poolState.creator);
    const pda = (seeds) => deriveProgramAddress(seeds, programId);
    report.derivedAddresses = {
      poolState: pda([Buffer.from("pool", "utf8"), baseMintBytes, quoteMintBytes]),
      authority: pda([Buffer.from("vault_auth_seed", "utf8")]),
      eventAuthority: pda([Buffer.from("__event_authority", "utf8")]),
      platformFeeVault: pda([platformConfigBytes, quoteMintBytes]),
      creatorFeeVault: pda([creatorBytes, quoteMintBytes]),
      platformFeeVaultAuthority: pda([Buffer.from("platform_fee_vault_auth_seed", "utf8")]),
      creatorFeeVaultAuthority: pda([Buffer.from("creator_fee_vault_auth_seed", "utf8")]),
    };

    report.checks = {
      poolStateOwnerMatchesProgram: poolValue.owner === programId,
      poolStateGlobalConfigMatchesCandidate: report.poolState.globalConfig === expected.globalConfig,
      poolStatePlatformConfigMatchesCandidate: report.poolState.platformConfig === expected.platformConfig,
      poolStateBaseMintMatchesCandidate: report.poolState.baseMint === expected.baseMint,
      poolStateQuoteMintMatchesCandidate: report.poolState.quoteMint === expected.quoteMint,
      poolStatePdaMatchesCandidate: report.derivedAddresses.poolState.address === expected.poolState,
      vaultAuthorityPdaMatchesCandidate: report.derivedAddresses.authority.address === expected.authority,
      eventAuthorityPdaMatchesCandidate: report.derivedAddresses.eventAuthority.address === expected.eventAuthority,
      platformFeeVaultPdaMatchesCandidate: report.derivedAddresses.platformFeeVault.address === expected.platformFeeVault,
      creatorFeeVaultPdaMatchesCandidate: report.derivedAddresses.creatorFeeVault.address === expected.creatorFeeVault,
      platformFeeVaultOwnerMatchesQuoteTokenProgram: platformValue.owner === expected.quoteTokenProgram,
      creatorFeeVaultOwnerMatchesQuoteTokenProgram: creatorValue.owner === expected.quoteTokenProgram,
      platformFeeVaultMintMatchesQuoteMint: report.platformFeeVault.mint === expected.quoteMint,
      creatorFeeVaultMintMatchesQuoteMint: report.creatorFeeVault.mint === expected.quoteMint,
      platformFeeVaultAuthorityMatchesProgramPda:
        report.platformFeeVault.tokenAuthority === report.derivedAddresses.platformFeeVaultAuthority.address,
      creatorFeeVaultAuthorityMatchesProgramPda:
        report.creatorFeeVault.tokenAuthority === report.derivedAddresses.creatorFeeVaultAuthority.address,
      platformFeeVaultInitialized: report.platformFeeVault.state === "initialized",
      creatorFeeVaultInitialized: report.creatorFeeVault.state === "initialized",
      systemProgramIsExecutable: systemValue.executable === true,
    };
    const outcomes = Object.values(report.checks);
    report.status = outcomes.every((value) => value === true)
      ? "matched"
      : outcomes.some((value) => value === false) ? "mismatch" : "incomplete";
  } catch (error) {
    report.status = "incomplete";
    report.error = error instanceof Error ? error.message : String(error);
  }
  return report;
}
