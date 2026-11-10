#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const EXPECTED = {
  sdkVersion: "0.2.84-alpha",
  sdkPackageSha256: "9b86fdd40fe7c75ecdbe8c0e3f0984e072b9e67d70758d5a5322147fa7f279d5",
  sdkInstrumentSha256: "b45c0567b83b2a564407d6ddb1c64f59891d4679fbd011cf0407a205946ca1db",
  sdkCommit: "1cf5bb129dbbb1c76dab67819c3d478349c8ed25",
  idlCommit: "e7e0c96fe77bcf6a020b84a44c47a722aac8e359",
  idlSha256: "db84c4dd9901de640ab370c0b0c627f95d2d32e175a8caa21d82e56523d69a87",
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
export async function verifySdkIdlArtifacts({ packagePath, idlPath, instrumentPath }) {
  const [packageText, idlText, instrumentText] = await Promise.all([
    readFile(packagePath, "utf8"), readFile(idlPath, "utf8"), readFile(instrumentPath, "utf8")
  ]);
  const pkg = JSON.parse(packageText), idl = JSON.parse(idlText);
  const packageHash = sha(packageText), idlHash = sha(idlText), instrumentHash = sha(instrumentText);
  assert(pkg.name === "@raydium-io/raydium-sdk-v2", "Unexpected SDK package name");
  assert(pkg.version === EXPECTED.sdkVersion, `SDK version mismatch: ${pkg.version}`);
  assert(packageHash === EXPECTED.sdkPackageSha256, `SDK package hash mismatch: ${packageHash}`);
  assert(instrumentHash === EXPECTED.sdkInstrumentSha256, `SDK instrument source hash mismatch: ${instrumentHash}`);
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
  assert(idlInstructions.has("migrate_to_cpswap"), "IDL missing migrate_to_cpswap");
  assert(instrumentText.includes('please use initializeV2 instead'), "SDK legacy initialize deprecation guard missing");
  assert(instrumentText.includes('initializeV2: Buffer.from([67, 153, 175, 39, 218, 16, 38, 32])'), "SDK initializeV2 discriminator mismatch");
  return {
    pass: true,
    sdk: { version: pkg.version, commit: EXPECTED.sdkCommit, packageSha256: packageHash, instrumentSha256: instrumentHash },
    idl: { commit: EXPECTED.idlCommit, sha256: idlHash, address: idl.address, metadata: idl.metadata, instructionCount: idl.instructions.length },
    checkedDiscriminators: checked,
    cpswapMigrationInstructionPresent: true,
    legacyInitializeMarkedDeprecated: true,
    transactionSubmitted: false
  };
}
if (process.argv[1]?.endsWith("launchlab-sdk-idl-check.mjs")) {
  const [packagePath, idlPath, instrumentPath] = process.argv.slice(2);
  if (!packagePath || !idlPath || !instrumentPath) throw new Error("Usage: node launchlab-sdk-idl-check.mjs package.json launchpad-idl.json instrument.ts");
  const report = await verifySdkIdlArtifacts({ packagePath, idlPath, instrumentPath });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}
