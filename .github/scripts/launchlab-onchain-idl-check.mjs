#!/usr/bin/env node
/**
 * Read-only fetch of Anchor's legacy on-chain LaunchLab IDL for Mainnet/Devnet.
 * Compares transaction-critical SDK instruction discriminators and account schemas.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { createRequire } from "node:module";
const require = createRequire(`${process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools"}/package.json`);
const { PublicKey } = require("@solana/web3.js");

const PROGRAMS = {
  mainnet: { id: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj", rpc: "https://api.mainnet-beta.solana.com", globalConfig: "6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX", platformConfig: "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4" },
  devnet: { id: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6", rpc: "https://api.devnet.solana.com", globalConfig: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt", platformConfig: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a" }
};
const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const CRITICAL_INSTRUCTIONS = [
  "initialize_v2", "initialize_with_token_2022", "buy_exact_in", "buy_exact_out",
  "sell_exact_in", "sell_exact_out", "migrate_to_cpswap", "create_platform_config",
  "claim_platform_fee", "claim_platform_fee_from_vault", "claim_creator_fee",
  "create_vesting_account", "claim_vested_token", "create_platform_vesting_account"
];
export const CRITICAL_ACCOUNTS = ["GlobalConfig", "PlatformConfig", "PoolState"];
export const CRITICAL_TYPES = ["GlobalConfig", "PlatformConfig", "PoolState", "BondingCurveParam", "CurveParams", "PlatformConfigParam", "PlatformCurveParam"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const SDK_LAYOUT_SHA256 = "a422af7572b3b0f567ff7ad39f4b099eaf8a551257a77f89a61a3fe603ec2256";
const IDL_SHA256 = "963189409945069409f32e345d4adf2892e0b3ca1be504372577fe34a23c6cdb";
const SDK_INSTRUMENT_SHA256 = "177d418defd36a173d43fafb29a06019a8754c7abe599365885d0b46c1fd8274";
const readU64 = (data, offset) => data.readBigUInt64LE(offset).toString();
const fixedText = (data, start, length) => { const value = data.subarray(start, start + length).toString("utf8"); const end = value.indexOf(String.fromCharCode(0)); return (end < 0 ? value : value.slice(0, end)).trim(); };
function decodeSdkGlobalConfig(data) {
  if (data.length !== 371) throw new Error(`GlobalConfig size mismatch for pinned SDK layout: ${data.length} != 371`);
  const requiresPlatformAuth = data.readUInt8(243);
  if (requiresPlatformAuth > 1) throw new Error(`GlobalConfig requires_platform_auth invalid enum: ${requiresPlatformAuth}`);
  return {
    epoch: readU64(data, 8), curveType: data.readUInt8(16), index: data.readUInt16LE(17),
    migrateFee: readU64(data, 19), tradeFeeRate: readU64(data, 27), maxShareFeeRate: readU64(data, 35),
    minSupplyA: readU64(data, 43), maxLockRate: readU64(data, 51), minSellRateA: readU64(data, 59),
    minMigrateRateA: readU64(data, 67), minFundRaisingB: readU64(data, 75),
    quoteMint: new PublicKey(data.subarray(83, 115)).toBase58(),
    protocolFeeOwner: new PublicKey(data.subarray(115, 147)).toBase58(),
    migrateFeeOwner: new PublicKey(data.subarray(147, 179)).toBase58(),
    migrateToAmmWallet: new PublicKey(data.subarray(179, 211)).toBase58(),
    migrateToCpmmWallet: new PublicKey(data.subarray(211, 243)).toBase58(),
    requiresPlatformAuth, alignmentPaddingHex: data.subarray(244, 251).toString("hex")
  };
}
function decodeSdkPlatformConfig(data) {
  if (data.length !== 944) throw new Error(`PlatformConfig size mismatch for pinned SDK layout: ${data.length} != 944`);
  const restrictGlobalConfig = data.readUInt8(832), restrictCurveParam = data.readUInt8(833);
  if (restrictGlobalConfig > 1 || restrictCurveParam > 1) throw new Error("PlatformConfig restriction flags are outside boolean range");
  return {
    epoch: readU64(data, 8), platformClaimFeeWallet: new PublicKey(data.subarray(16, 48)).toBase58(),
    platformLockNftWallet: new PublicKey(data.subarray(48, 80)).toBase58(),
    platformScale: readU64(data, 80), creatorScale: readU64(data, 88), burnScale: readU64(data, 96), feeRate: readU64(data, 104),
    name: fixedText(data, 112, 64), web: fixedText(data, 176, 256), image: fixedText(data, 432, 256),
    cpConfigId: new PublicKey(data.subarray(688, 720)).toBase58(), creatorFeeRate: readU64(data, 720),
    transferFeeExtensionAuth: new PublicKey(data.subarray(728, 760)).toBase58(),
    platformVestingWallet: new PublicKey(data.subarray(760, 792)).toBase58(), platformVestingScale: readU64(data, 792),
    platformCpCreator: new PublicKey(data.subarray(800, 832)).toBase58(), restrictGlobalConfig, restrictCurveParam,
    curveRuleManager: new PublicKey(data.subarray(834, 866)).toBase58(),
    legacyIdlCurveParamsVectorLength: data.readUInt32LE(940)
  };
}
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
};
const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/**
 * Ignore ONLY human-readable IDL "docs" for diagnostic classification.
 * All account order, signer/writable/optional, addresses, nested PDA seeds,
 * program constraints, relations and unknown fields remain security-relevant.
 * The original exact comparison AND fail-closed verdict are unchanged.
 */
export function stripAccountDocs(value) {
  if (Array.isArray(value)) return value.map(stripAccountDocs);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== "docs")
      .map(([key, child]) => [key, stripAccountDocs(child)]));
  return value;
}



/**
 * Anchor IDL name tables must be unambiguous. Last-write-wins Map lookup
 * silently discards duplicate instruction, account and type declarations.
 * Flag any duplicate or malformed name before schema comparison; errors
 * intentionally avoid including untrusted provider-provided strings.
 */
export function inspectIdlDefinitionNames(idl, label = "IDL") {
  const problems = [];
  if (!idl || typeof idl !== "object" || Array.isArray(idl)) {
    return [label + ": IDL root must be an object"];
  }
  for (const group of ["instructions", "accounts", "types"]) {
    const entries = idl[group];
    if (entries === undefined && group !== "instructions") continue;
    if (!Array.isArray(entries)) {
      problems.push(label + ": " + group + " must be an array");
      continue;
    }
    const seen = new Map();
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i], name = entry?.name;
      if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
          typeof name !== "string" || name.length === 0 || name.length > 128 ||
          !/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) {
        problems.push(label + ": " + group + " malformed name at index " + i);
        continue;
      }
      if (seen.has(name)) {
        problems.push(label + ": duplicate " + group + " name at indices " +
          seen.get(name) + " and " + i);
      } else seen.set(name, i);
    }
  }
  return problems;
}

/** Pure, fail-closed comparison of transaction-critical Anchor instruction and type layouts. */
export function compareCriticalIdls(repoIdl, liveIdl) {
  const idlNamespaceMismatches = [
    ...inspectIdlDefinitionNames(repoIdl, "pinned official IDL"),
    ...inspectIdlDefinitionNames(liveIdl, "live on-chain IDL")
  ];
  const definitions = (idl, group) => Array.isArray(idl?.[group])
    ? idl[group].filter(x => x && typeof x === "object" &&
      !Array.isArray(x) && typeof x.name === "string")
    : [];
  // Even a matching last duplicate does NOT clear an ambiguous namespace.
  const repoInstructions = new Map(definitions(repoIdl, "instructions").map(x => [x.name, x]));
  const liveInstructions = new Map(definitions(liveIdl, "instructions").map(x => [x.name, x]));
  const criticalDiscriminatorMismatches = [];
  const criticalAccountMetaMismatches = [], criticalAccountConstraintMismatches = [],
    documentationOnlyAccountMismatches = [], criticalArgumentMismatches = [], criticalInstructionSchemaDetails = [];
  for (const name of CRITICAL_INSTRUCTIONS) {
    const a = repoInstructions.get(name), b = liveInstructions.get(name);
    if (!a || !b) {
      criticalDiscriminatorMismatches.push(`${name}: missing from ${!a ? "pinned repo IDL" : "live on-chain IDL"}`);
      criticalAccountMetaMismatches.push(`${name}: instruction missing`);
      criticalAccountConstraintMismatches.push(`${name}: instruction missing`);
      criticalArgumentMismatches.push(`${name}: instruction missing`);
      continue;
    }
    if (!same(a.discriminator, b.discriminator)) criticalDiscriminatorMismatches.push(`${name}: discriminator differs`);
    // Anchor account order, signer/writable bits, PDA seeds, optional accounts,
    // nested account groups and instruction argument order/types affect what a
    // wallet would authorize. Matching 8-byte discriminators does NOT prove these.
    const accountsMatch = Array.isArray(a.accounts) && Array.isArray(b.accounts) && same(a.accounts, b.accounts);
    const constraintsMatch = Array.isArray(a.accounts) && Array.isArray(b.accounts) &&
      same(stripAccountDocs(a.accounts), stripAccountDocs(b.accounts));
    const argsMatch = Array.isArray(a.args) && Array.isArray(b.args) && same(a.args, b.args);
    if (!accountsMatch) {
      criticalAccountMetaMismatches.push(`${name}: ordered account metas / constraints differ or are missing`);
      if (constraintsMatch) documentationOnlyAccountMismatches.push(`${name}: account docs only; raw schema still differs`);
      else criticalAccountConstraintMismatches.push(`${name}: account order, signer/writable, address, PDA or other constraint differs`);
    }
    if (!argsMatch) criticalArgumentMismatches.push(`${name}: ordered instruction args / types differ or are missing`);
    if (!accountsMatch || !argsMatch) {
      const firstChanged = (left, right) => {
        if (!Array.isArray(left) || !Array.isArray(right)) return { index: null, pinnedCount: left?.length ?? null, liveCount: right?.length ?? null, missingArray: true };
        const index = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => i)
          .find(i => !same(left[i], right[i]));
        return { index: index ?? null, pinnedCount: left.length, liveCount: right.length,
          pinned: index === undefined ? null : left[index] ?? null, live: index === undefined ? null : right[index] ?? null };
      };
      criticalInstructionSchemaDetails.push({
        name, accountConstraintDifference: !constraintsMatch, accountDocumentationOnly: !accountsMatch && constraintsMatch,
        // The raw first difference can be prose-only. Include the first
        // non-documentation mismatch so release reviewers see the actual
        // permission/address/PDA/constraint evidence, not just edited docs.
        firstSecurityConstraintDifference: constraintsMatch ? null :
          firstChanged(stripAccountDocs(a.accounts), stripAccountDocs(b.accounts)),
        accountMetaDifference: accountsMatch ? null : firstChanged(a.accounts, b.accounts),
        argumentDifference: argsMatch ? null : firstChanged(a.args, b.args)
      });
    }
  }
  const repoAccounts = new Map(definitions(repoIdl, "accounts").map(x => [x.name, x]));
  const liveAccounts = new Map(definitions(liveIdl, "accounts").map(x => [x.name, x]));
  const criticalSchemaMismatches = [], criticalSchemaDetails = [];
  for (const name of CRITICAL_ACCOUNTS) {
    const a = repoAccounts.get(name), b = liveAccounts.get(name);
    if (!a || !b) criticalSchemaMismatches.push(`${name}: account definition missing from ${!a ? "pinned repo IDL" : "live on-chain IDL"}`);
    else if (!same(a, b)) criticalSchemaMismatches.push(`${name}: account discriminator definition differs`);
  }
  const repoTypes = new Map(definitions(repoIdl, "types").map(x => [x.name, x]));
  const liveTypes = new Map(definitions(liveIdl, "types").map(x => [x.name, x]));
  for (const name of CRITICAL_TYPES) {
    const a = repoTypes.get(name), b = liveTypes.get(name);
    if (!a && !b) continue;
    if (!a || !b) criticalSchemaMismatches.push(`${name}: type missing from ${!a ? "pinned repo IDL" : "live on-chain IDL"}`);
    else if (!same(a, b)) {
      criticalSchemaMismatches.push(`${name}: type layout differs`);
      const fields = entry => entry?.type?.fields?.map(field => ({ name: field.name, type: field.type })) ?? null;
      criticalSchemaDetails.push({ name, repositoryFields: fields(a), liveFields: fields(b) });
    }
  }
  const repoOnlyInstructions = [...repoInstructions.keys()].filter(x => !liveInstructions.has(x));
  const liveOnlyInstructions = [...liveInstructions.keys()].filter(x => !repoInstructions.has(x));
  return { criticalDiscriminatorMismatches, criticalAccountMetaMismatches, criticalAccountConstraintMismatches,
    documentationOnlyAccountMismatches, criticalArgumentMismatches,
    criticalInstructionSchemaDetails, criticalSchemaMismatches, criticalSchemaDetails,
    idlNamespaceMismatches, repoOnlyInstructions, liveOnlyInstructions };
}
const SDK_INSTRUCTION_NAMES = Object.freeze({
  buy_exact_in: "buyExactIn", buy_exact_out: "buyExactOut",
  sell_exact_in: "sellExactIn", sell_exact_out: "sellExactOut",
  initialize_v2: "initializeV2", initialize_with_token_2022: "initializeWithToken2022",
  create_platform_config: "createPlatformConfig", claim_platform_fee: "claimPlatformFee",
  claim_platform_fee_from_vault: "claimPlatformFeeFromVault", claim_creator_fee: "claimCreatorFee",
  create_vesting_account: "createVestingAccount", claim_vested_token: "claimVestedToken",
  create_platform_vesting_account: "createPlatformVestingAccount"
});
/** Compare trusted pinned Raydium SDK transaction builders against pinned official IDL. */
export function verifySdkInstructionDiscriminators(repoIdl, instrumentText) {
  const block = instrumentText.match(/export const anchorDataBuf = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error("Pinned Raydium SDK anchorDataBuf block missing");
  const sdk = new Map([...block[1].matchAll(/(\w+): Buffer\.from\(\[([0-9,\s]+)\]\)/g)]
    .map(match => [match[1], match[2].split(",").map(x=>Number(x.trim())).filter(Number.isFinite)]));
  const instructions = new Map(repoIdl.instructions.map(x=>[x.name,x]));
  for (const [idlName,sdkName] of Object.entries(SDK_INSTRUCTION_NAMES)) {
    const expected = instructions.get(idlName)?.discriminator;
    const observed = sdk.get(sdkName);
    if (!Array.isArray(expected) || expected.length !== 8 || !Array.isArray(observed) || observed.length !== 8 ||
      !same(expected, observed))
      throw new Error("Pinned SDK instruction discriminator mismatch: " + idlName + "/" + sdkName);
  }
  return { pass:true, comparedInstructionCount:Object.keys(SDK_INSTRUCTION_NAMES).length };
}
async function readAccount(rpc, address) {
  const response = await fetch(rpc, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-anchor-idl-readonly", method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }] }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "Solana RPC error");
  return json.result?.value ?? null;
}
async function fetchCluster(cluster, repoIdl) {
  const target = PROGRAMS[cluster];
  if (!target) throw new Error("Unsupported cluster");
  const programId = new PublicKey(target.id);
  const [derivedWsolCurve0Config] = PublicKey.findProgramAddressSync([Buffer.from("global_config"), new PublicKey(WSOL_MINT).toBuffer(), Buffer.from([0]), Buffer.from([0, 0])], programId);
  const [base] = PublicKey.findProgramAddressSync([], programId);
  const idlAddress = await PublicKey.createWithSeed(base, "anchor:idl", programId);
  const account = await readAccount(target.rpc, idlAddress.toBase58());
  if (!account) throw new Error(`${cluster}: Anchor IDL account ${idlAddress.toBase58()} not found`);
  if (account.owner !== target.id) throw new Error(`${cluster}: IDL account owner mismatch: ${account.owner}`);
  if (account.executable) throw new Error(`${cluster}: IDL metadata account unexpectedly executable`);
  if (!Array.isArray(account.data) || account.data[1] !== "base64" || typeof account.data[0] !== "string") throw new Error(`${cluster}: IDL account was not base64`);
  const raw = Buffer.from(account.data[0], "base64");
  if (raw.toString("base64") !== account.data[0]) throw new Error(`${cluster}: IDL account non-canonical base64`);
  if (raw.length < 44) throw new Error(`${cluster}: IDL account shorter than Anchor header`);
  const expectedDiscriminator = createHash("sha256").update("internal:IdlAccount").digest().subarray(0, 8);
  if (!raw.subarray(0, 8).equals(expectedDiscriminator)) throw new Error(`${cluster}: Anchor IDL account discriminator mismatch`);
  const authority = new PublicKey(raw.subarray(8, 40)).toBase58();
  const declaredCompressedLength = raw.readUInt32LE(40);
  if (declaredCompressedLength <= 0 || 44 + declaredCompressedLength > raw.length) throw new Error(`${cluster}: IDL compressed payload length exceeds account data`);
  const compressed = raw.subarray(44, 44 + declaredCompressedLength);
  const trailingAllocatedBytes = raw.length - 44 - declaredCompressedLength;
  const inflated = inflateSync(compressed, { maxOutputLength: 4 * 1024 * 1024 }), liveIdl = JSON.parse(inflated.toString("utf8"));
  if (liveIdl.address !== target.id) throw new Error(`${cluster}: live IDL address mismatch: ${liveIdl.address}`);

  const liveAccountsByName = new Map((liveIdl.accounts || []).map(x => [x.name, x]));
  const configAccountChecks = {};
  for (const [kind, address] of [["GlobalConfig", target.globalConfig], ["PlatformConfig", target.platformConfig]]) {
    const configAccount = await readAccount(target.rpc, address);
    const accountDef = liveAccountsByName.get(kind);
    const actualData = configAccount ? Buffer.from(configAccount.data[0], "base64") : null;
    const expectedDisc = accountDef?.discriminator ? Buffer.from(accountDef.discriminator) : null;
    configAccountChecks[kind] = {
      address, exists: Boolean(configAccount), owner: configAccount?.owner ?? null,
      ownerMatchesLaunchpad: configAccount?.owner === target.id,
      dataLength: actualData?.length ?? null, lamports: configAccount?.lamports ?? null,
      expectedDiscriminator: expectedDisc?.toString("hex") ?? null,
      actualDiscriminator: actualData?.subarray(0, 8).toString("hex") ?? null,
      discriminatorMatches: Boolean(expectedDisc && actualData && actualData.subarray(0, 8).equals(expectedDisc))
    };
    if (configAccountChecks[kind].exists && configAccountChecks[kind].ownerMatchesLaunchpad && configAccountChecks[kind].discriminatorMatches) {
      configAccountChecks[kind].sdkLayoutDecoded = kind === "GlobalConfig" ? decodeSdkGlobalConfig(actualData) : decodeSdkPlatformConfig(actualData);
      configAccountChecks[kind].sdkLayoutSizeMatches = true;
      configAccountChecks[kind].schemaSemanticsIndependentlyVerified = false;
    }
  }
  const { criticalDiscriminatorMismatches, criticalAccountMetaMismatches, criticalAccountConstraintMismatches,
    documentationOnlyAccountMismatches, criticalArgumentMismatches,
    criticalInstructionSchemaDetails, criticalSchemaMismatches, criticalSchemaDetails,
    idlNamespaceMismatches, repoOnlyInstructions, liveOnlyInstructions } = compareCriticalIdls(repoIdl, liveIdl);
  const idlNamespaceValid = idlNamespaceMismatches.length === 0;
  const selectedDiscriminatorsMatch = criticalDiscriminatorMismatches.length === 0;
  const criticalInstructionSchemasMatch = criticalAccountMetaMismatches.length === 0 && criticalArgumentMismatches.length === 0;
  const repoIdlTypeDefinitionsExactlyMatch = criticalSchemaMismatches.length === 0;
  const globalDecoded = configAccountChecks.GlobalConfig.sdkLayoutDecoded;
  const platformDecoded = configAccountChecks.PlatformConfig.sdkLayoutDecoded;
  const sdkLayoutBinaryCompatible =
    derivedWsolCurve0Config.toBase58() === target.globalConfig &&
    configAccountChecks.GlobalConfig.dataLength === 371 &&
    configAccountChecks.PlatformConfig.dataLength === 944 &&
    configAccountChecks.GlobalConfig.discriminatorMatches &&
    configAccountChecks.PlatformConfig.discriminatorMatches &&
    globalDecoded?.requiresPlatformAuth <= 1 &&
    globalDecoded?.alignmentPaddingHex === "00000000000000" &&
    platformDecoded?.restrictGlobalConfig <= 1 &&
    platformDecoded?.restrictCurveParam <= 1 &&
    platformDecoded?.legacyIdlCurveParamsVectorLength === 0;
  return {
    cluster, rpc: target.rpc, programId: target.id, idlAddress: idlAddress.toBase58(),
    derivedWsolCurve0Config: derivedWsolCurve0Config.toBase58(), wsolCurve0ConfigPdaMatchesObservedDefault: derivedWsolCurve0Config.toBase58() === target.globalConfig,
    accountOwner: account.owner, idlAuthority: authority, configAccountChecks,
    declaredCompressedLength, compressedBytes: compressed.length, trailingAllocatedBytes,
    liveIdlSha256: sha(inflated), repositoryIdlSha256: sha(Buffer.from(JSON.stringify(repoIdl))),
    liveIdlName: liveIdl.metadata?.name, liveIdlVersion: liveIdl.metadata?.version,
    liveInstructionCount: liveIdl.instructions?.length ?? 0, repositoryInstructionCount: repoIdl.instructions.length,
    selectedDiscriminatorsMatch, criticalInstructionSchemasMatch, repoIdlTypeDefinitionsExactlyMatch, sdkLayoutBinaryCompatible,
    criticalDiscriminatorMismatches, criticalAccountMetaMismatches, criticalAccountConstraintMismatches,
    documentationOnlyAccountMismatches, criticalArgumentMismatches, criticalInstructionSchemaDetails,
    criticalSchemaMismatches, criticalSchemaDetails,
    idlNamespaceMismatches, idlNamespaceValid,
    repoOnlyInstructions, liveOnlyInstructions,
    pass: idlNamespaceValid && selectedDiscriminatorsMatch && criticalInstructionSchemasMatch && repoIdlTypeDefinitionsExactlyMatch && sdkLayoutBinaryCompatible
  };
}
export async function verifyOnchainLaunchpadIdl(repoIdlPath, sdkLayoutPath, sdkInstrumentPath) {
  const repoIdlRaw = await readFile(repoIdlPath, "utf8");
  const idlSha256 = sha(Buffer.from(repoIdlRaw));
  if (idlSha256 !== IDL_SHA256) throw new Error(`Pinned official LaunchLab IDL hash mismatch: ${idlSha256}`);
  const repoIdl = JSON.parse(repoIdlRaw);  if (!sdkInstrumentPath) throw new Error("Pinned SDK instrument source path is required");
  const sdkInstrument = await readFile(sdkInstrumentPath,"utf8");
  const sdkInstrumentSha256 = sha(Buffer.from(sdkInstrument));
  if (sdkInstrumentSha256 !== SDK_INSTRUMENT_SHA256) throw new Error("Pinned SDK transaction builder SHA-256 mismatch: " + sdkInstrumentSha256);
  const sdkDiscriminators = verifySdkInstructionDiscriminators(repoIdl, sdkInstrument);
  const sdkLayout = await readFile(sdkLayoutPath, "utf8");
  const sdkLayoutSha256 = sha(Buffer.from(sdkLayout));
  if (sdkLayoutSha256 !== SDK_LAYOUT_SHA256) throw new Error(`Pinned SDK layout source hash mismatch: ${sdkLayoutSha256}`);
  for (const marker of ["export const LaunchpadConfig = struct([", "export const PlatformConfig = struct([", 'u8("restrictGlobalConfig")', 'u8("restrictCurveParam")']) {
    if (!sdkLayout.includes(marker)) throw new Error(`Pinned SDK layout source missing expected marker: ${marker}`);
  }
  const results = [];
  for (const cluster of ["mainnet", "devnet"]) {
    try { results.push(await fetchCluster(cluster, repoIdl)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error.message || error)] }); }
  }
  return { checkedAt: new Date().toISOString(), readOnly: true, transactionSubmitted: false, pinnedIdl: { sha256: idlSha256, commit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359" }, approvalToLaunch: false, sdkInstrument: { sha256:sdkInstrumentSha256, comparedInstructionCount:sdkDiscriminators.comparedInstructionCount }, sdkLayout: { sha256: sdkLayoutSha256, commit: "1cf5bb129dbbb1c76dab67819c3d478349c8ed25", layoutSizeChecks: "GlobalConfig=371;PlatformConfig=944" }, pass: results.every(x => x.pass), results };
}
if (process.argv[1]?.endsWith("launchlab-onchain-idl-check.mjs")) {
  const [idlPath, sdkLayoutPath, sdkInstrumentPath] = process.argv.slice(2);
  if (!idlPath || !sdkLayoutPath || !sdkInstrumentPath) throw new Error("Usage: node launchlab-onchain-idl-check.mjs launchpad-idl.json layout.ts instrument.ts");
  const report = await verifyOnchainLaunchpadIdl(idlPath, sdkLayoutPath, sdkInstrumentPath);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
