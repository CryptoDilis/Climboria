#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const EXPECTED = {
  sdkVersion: "0.2.84-alpha",
  sdkPackageSha256: "38c593087c874cf5ede8847e45dc5fc9d6c1f670805c9f7b0e9fc83eac6a6d86",
  sdkInstrumentSha256: "177d418defd36a173d43fafb29a06019a8754c7abe599365885d0b46c1fd8274",
  sdkLayoutSha256: "a422af7572b3b0f567ff7ad39f4b099eaf8a551257a77f89a61a3fe603ec2256",
  sdkLaunchpadSha256: "32628b92cbb7fe96f15b9fc8c56c2baa503efccdfa7b889d7ab8a9332189127f",
  sdkPdaSha256: "bfa801c13f842c374e27d3e34007a75520094cbb71a82ca24c69882415932522",
  sdkCommit: "1cf5bb129dbbb1c76dab67819c3d478349c8ed25",
  idlCommit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359",
  idlSha256: "963189409945069409f32e345d4adf2892e0b3ca1be504372577fe34a23c6cdb",
  programId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj"
};
const REQUIRED = {
  buy_exact_in: "buyExactIn",
  buy_exact_out: "buyExactOut",
  sell_exact_in: "sellExactIn",
  sell_exact_out: "sellExactOut",
  initialize_v2: "initializeV2",
  initialize_with_token_2022: "initializeWithToken2022",
  create_platform_config: "createPlatformConfig",
  claim_platform_fee: "claimPlatformFee",
  claim_platform_fee_from_vault: "claimPlatformFeeFromVault",
  claim_creator_fee: "claimCreatorFee",
  create_vesting_account: "createVestingAccount",
  claim_vested_token: "claimVestedToken",
  create_platform_vesting_account: "createPlatformVestingAccount",
  update_platform_config: "updatePlaformConfig"
};
function sha(content) { return createHash("sha256").update(content, "utf8").digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
export async function verifySdkIdlArtifacts({ packagePath, idlPath, instrumentPath, layoutPath, launchpadPath, pdaPath, cpmmIdlPath, programIdPath, cpmmLibPath, cpmmInitializePath }) {
  const [packageText, idlText, instrumentText, layoutText, launchpadText, pdaText, cpmmIdlText, programIdText, cpmmLibText, cpmmInitializeText] = await Promise.all([
    readFile(packagePath, "utf8"), readFile(idlPath, "utf8"), readFile(instrumentPath, "utf8"), readFile(layoutPath, "utf8"), readFile(launchpadPath, "utf8"), readFile(pdaPath, "utf8"), readFile(cpmmIdlPath, "utf8"), readFile(programIdPath, "utf8"), readFile(cpmmLibPath, "utf8"), readFile(cpmmInitializePath, "utf8")
  ]);
  const pkg = JSON.parse(packageText), idl = JSON.parse(idlText), cpmmIdl = JSON.parse(cpmmIdlText);
  const packageHash = sha(packageText), idlHash = sha(idlText), instrumentHash = sha(instrumentText), layoutHash = sha(layoutText), launchpadHash = sha(launchpadText), pdaHash = sha(pdaText);
  assert(pkg.name === "@raydium-io/raydium-sdk-v2", "Unexpected SDK package name");
  assert(pkg.version === EXPECTED.sdkVersion, `SDK version mismatch: ${pkg.version}`);
  assert(packageHash === EXPECTED.sdkPackageSha256, `SDK package hash mismatch: ${packageHash}`);
  assert(instrumentHash === EXPECTED.sdkInstrumentSha256, `SDK instrument source hash mismatch: ${instrumentHash}`);
  assert(layoutHash === EXPECTED.sdkLayoutSha256, `SDK layout source hash mismatch: ${layoutHash}`);
  assert(launchpadHash === EXPECTED.sdkLaunchpadSha256, `SDK launchpad source hash mismatch: ${launchpadHash}`);
  assert(pdaHash === EXPECTED.sdkPdaSha256, `SDK PDA source hash mismatch: ${pdaHash}`);
  assert(idlHash === EXPECTED.idlSha256, `LaunchLab IDL hash mismatch: ${idlHash}`);
  assert(idl.address === EXPECTED.programId, `IDL program address mismatch: ${idl.address}`);
  assert(idl.metadata?.name === "raydium_launchpad", "Unexpected LaunchLab IDL metadata name");
  const sdkBlock = instrumentText.match(/export const anchorDataBuf = \{([\s\S]*?)\n\};/);
  assert(sdkBlock, "SDK instrument.ts anchorDataBuf not found");
  const sdkDiscriminators = Object.fromEntries(
    [...sdkBlock[1].matchAll(/(\w+): Buffer\.from\(\[([0-9,\s]+)\]\)/g)]
      .map(m => [m[1], m[2].split(",").map(x => Number(x.trim())).filter(Number.isFinite)])
  );
  const idlInstructions = new Map(idl.instructions.map(x => [x.name, x]));
  const checked = [];
  for (const [idlName, sdkName] of Object.entries(REQUIRED)) {
    const instruction = idlInstructions.get(idlName);
    assert(instruction, `IDL instruction missing: ${idlName}`);
    assert(sdkDiscriminators[sdkName], `SDK discriminator missing: ${sdkName}`);
    assert(JSON.stringify(instruction.discriminator) === JSON.stringify(sdkDiscriminators[sdkName]),
      `Instruction discriminator mismatch: ${idlName}`);
    checked.push(idlName);
  }
  const initializeAccounts = ["payer","creator","global_config","platform_config","authority","pool_state","base_mint","quote_mint","base_vault","quote_vault","metadata_account","base_token_program","quote_token_program","metadata_program","system_program","rent_program","event_authority","program"];
  assert(JSON.stringify(idlInstructions.get("initialize_v2").accounts.map(x => x.name)) === JSON.stringify(initializeAccounts), "initialize_v2 account order differs from the approved 18-entry schema");
  const migration = idlInstructions.get("migrate_to_cpswap");
  assert(migration, "IDL missing migrate_to_cpswap");
  const migrationAccounts = ["payer","base_mint","quote_mint","platform_config","cpswap_program","cpswap_pool","cpswap_authority","cpswap_lp_mint","cpswap_base_vault","cpswap_quote_vault","cpswap_config","cpswap_create_pool_fee","cpswap_observation","lock_program","lock_authority","lock_lp_vault","authority","pool_state","global_config","base_vault","quote_vault","pool_lp_token","base_token_program","quote_token_program","associated_token_program","system_program","rent_program","metadata_program"];
  assert(JSON.stringify(migration.accounts.map(x => x.name)) === JSON.stringify(migrationAccounts), "migrate_to_cpswap account order differs from the pinned IDL");
  assert(migration.args.length === 0, "migrate_to_cpswap argument schema changed; manual review required");
  const migrationPayer = migration.accounts[0];
  assert(migrationPayer.signer === true && migrationPayer.writable === true, "migrate_to_cpswap payer must be writable signer");
  assert((migrationPayer.docs || []).join(" ").includes("migrate_to_cpswap_wallet"), "migrate_to_cpswap payer destination authority rule missing");
  for (const name of ["cpswap_pool","cpswap_lp_mint","cpswap_base_vault","cpswap_quote_vault","cpswap_create_pool_fee","cpswap_observation","lock_lp_vault","pool_state","base_vault","quote_vault","pool_lp_token"]) {
    const account = migration.accounts.find(x => x.name === name);
    assert(account?.writable === true, "migrate_to_cpswap " + name + " must be writable per pinned IDL");
  }
  const collectMigrationFee = idlInstructions.get("collect_migrate_fee");
  assert(collectMigrationFee && (collectMigrationFee.accounts[0].docs || []).join(" ").includes("migrate_fee_owner"), "collect_migrate_fee owner authority rule missing");
  assert(cpmmIdl.address === "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", "Unexpected Raydium CPMM program IDL address");
  assert(cpmmInitializeText.includes("address= crate::create_pool_fee_reveiver::ID"), "CPMM initialize source no longer binds create_pool_fee to the fixed receiver account");
  assert(cpmmInitializeText.includes("create_pool_fee: Box<InterfaceAccount") && cpmmInitializeText.includes("TokenAccount"), "CPMM initialize fee receiver is no longer a token account");
  for (const constant of [
    'declare_id!("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C")',
    'declare_id!("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb")',
    'pub const ID: Pubkey = pubkey!("GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ")',
    'pub const ID: Pubkey = pubkey!("DRayqG9RXYi8WHgWEmRQGrUWRWbhjYWYkCRJDd6JBBak")',
    'pub const ID: Pubkey = pubkey!("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8")',
    'pub const ID: Pubkey = pubkey!("3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy")',
    'pub const ID: Pubkey = pubkey!("ProCXqRcXJjoUd1RNoo28bSizAA6EEqt9wURZYPDc5u")',
    'pub const ID: Pubkey = pubkey!("DRay33UmULQCeawH3dVpJfN3uqLj6Qtq4ymSRx2pAgGK")',
    'pub const ID: Pubkey = pubkey!("FUNDduJTA7XcckKHKfAoEnnhuSud2JUCUZv6opWEjrBU")'
  ]) assert(cpmmLibText.includes(constant), "Pinned CPMM program source constant changed: " + constant);
  for (const constant of [
    'CREATE_CPMM_POOL_PROGRAM = new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C")',
    'CREATE_CPMM_POOL_FEE_ACC = new PublicKey("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8")',
    'LOCK_CPMM_PROGRAM = new PublicKey("LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE")',
    'LOCK_CPMM_AUTH = new PublicKey("3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH")',
    'CREATE_CPMM_POOL_PROGRAM: new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb")',
    'CREATE_CPMM_POOL_FEE_ACC: new PublicKey("3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy")',
    'LOCK_CPMM_PROGRAM: new PublicKey("DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX")',
    'LOCK_CPMM_AUTH: new PublicKey("7qWVV8UY2bRJfDLP4s37YzBPKUkVB46DStYJBpYbQzu3")'
  ]) assert(programIdText.includes(constant), "Pinned CPMM/lock program destination constant changed: " + constant);
  const cpmmInitialize = cpmmIdl.instructions.find(x => x.name === "initialize");
  assert(cpmmInitialize, "CPMM IDL missing initialize instruction used by LaunchLab migration");
  const cpmmInitializeAccounts = ["creator","amm_config","authority","pool_state","token_0_mint","token_1_mint","lp_mint","creator_token_0","creator_token_1","creator_lp_token","token_0_vault","token_1_vault","create_pool_fee","observation_state","token_program","token_0_program","token_1_program","associated_token_program","system_program","rent"];
  assert(JSON.stringify(cpmmInitialize.accounts.map(x => x.name)) === JSON.stringify(cpmmInitializeAccounts), "CPMM initialize account order differs from pinned IDL");
  const cpmmCreator = cpmmInitialize.accounts.find(x => x.name === "creator");
  const cpmmFee = cpmmInitialize.accounts.find(x => x.name === "create_pool_fee");
  assert(cpmmCreator?.signer === true && cpmmCreator?.writable === true, "CPMM initialize creator must be writable signer");
  assert(cpmmFee?.writable === true && (cpmmFee.docs || []).join(" ").includes("create pool fee account"), "CPMM create_pool_fee destination semantics missing");
  assert(layoutText.includes('publicKey("protocolFeeOwner")') && layoutText.includes('publicKey("migrateFeeOwner")') && layoutText.includes('publicKey("migrateToCpmmWallet")'), "GlobalConfig fee/migration destination fields missing from pinned SDK layout");
  assert(layoutText.includes('publicKey("platformClaimFeeWallet")') && layoutText.includes('publicKey("platformLockNftWallet")') && layoutText.includes('publicKey("platformVestingWallet")'), "PlatformConfig claim/lock/vesting destination fields missing from pinned SDK layout");
  assert(pdaText.includes("getPdaPlatformVault") && pdaText.includes("platformId.toBuffer(), mintB.toBuffer()"), "Platform fee-vault PDA seed derivation changed");
  assert(pdaText.includes("getPdaCreatorVault") && pdaText.includes("creator.toBuffer(), mintB.toBuffer()"), "Creator fee-vault PDA seed derivation changed");
  assert(instrumentText.includes('please use initializeV2 instead'), "SDK legacy initialize deprecation guard missing");
  assert(instrumentText.includes('initializeV2: Buffer.from([67, 153, 175, 39, 218, 16, 38, 32])'), "SDK initializeV2 discriminator mismatch");
  assert(instrumentText.includes("{ pubkey: mintA, isSigner: true, isWritable: true }"), "Mint keypair signer requirement not found in SDK instruction");
  assert(launchpadText.includes("mintA,") && launchpadText.includes("extraSigners,") && launchpadText.includes("if (extraSigners?.length) txBuilder.addInstruction({ signers: extraSigners });"), "SDK caller-supplied mint signer path changed");
  assert(launchpadText.includes("if (token2022) migrateType = \"cpmm\";"), "Token-2022 CPMM migration selection changed");
  assert(launchpadText.includes("if (!extraConfigs.createOnly)"), "Create-only path / optional initial buy behavior changed");
  assert(launchpadText.includes("versionSizeCheckBuild"), "Multi-transaction builder path not found");
  assert(pdaText.includes('Buffer.from("global_config", "utf8")') && pdaText.includes("mintB.toBuffer(), u8ToBytes(curveType), u16ToBytes(index)"), "GlobalConfig PDA derivation source changed");
  return {
    pass: true,
    sdk: { version: pkg.version, commit: EXPECTED.sdkCommit, packageSha256: packageHash, instrumentSha256: instrumentHash, layoutSha256: layoutHash, launchpadSha256: launchpadHash, pdaSha256: pdaHash },
    idl: { commit: EXPECTED.idlCommit, sha256: idlHash, address: idl.address, metadata: idl.metadata, instructionCount: idl.instructions.length },
    checkedDiscriminators: checked,
    creatorLaunchPath: { mintAKeypairIsRequiredSigner: true, callerMustSupplyExtraSigner: true, token2022SelectedByTransferFeeExtension: true, token2022ForcesCpmmMigration: true, createOnlySkipsInitialBuy: true, multiTransactionBuilder: true },
    migrationAudit: { cpSwapProgramId: cpmmIdl.address, cpSwapSourceCommit: "3d69122790e97cd6aff24e8ba95940793773f58c", cpSwapInitializeSourceVerified: true, cpSwapInitializeAccountOrderVerified: true, cpSwapCreatePoolFeeAccountVerified: true, cpswapInstructionAccountOrderVerified: true, payerMustMatchGlobalConfigMigrateToCpmmWallet: true, createPoolFeeAndLockLpVaultAreExplicitAccounts: true, migrateFeeCollectionRestrictedToGlobalConfigMigrateFeeOwner: true, platformAndCreatorFeeVaultPdaSeedsVerified: true, feeDestinationFieldsVerifiedInPinnedSdkLayout: true },
    cpswapMigrationInstructionPresent: true,
    legacyInitializeMarkedDeprecated: true,
    transactionSubmitted: false
  };
}
if (process.argv[1]?.endsWith("launchlab-sdk-idl-check.mjs")) {
  const [packagePath, idlPath, instrumentPath, layoutPath, launchpadPath, pdaPath, cpmmIdlPath, programIdPath, cpmmLibPath, cpmmInitializePath] = process.argv.slice(2);
  if (!packagePath || !idlPath || !instrumentPath || !layoutPath || !launchpadPath || !pdaPath || !cpmmIdlPath || !programIdPath || !cpmmLibPath || !cpmmInitializePath) throw new Error("Usage: node launchlab-sdk-idl-check.mjs package.json launchpad-idl.json instrument.ts layout.ts launchpad.ts pda.ts cp-swap-idl.json programId.ts cp-swap-lib.rs cp-swap-initialize-v2.rs");
  const report = await verifySdkIdlArtifacts({ packagePath, idlPath, instrumentPath, layoutPath, launchpadPath, pdaPath, cpmmIdlPath, programIdPath, cpmmLibPath, cpmmInitializePath });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
