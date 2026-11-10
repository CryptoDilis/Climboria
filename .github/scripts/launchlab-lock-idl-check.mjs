#!/usr/bin/env node
/**
 * Read-only verification of Raydium's published on-chain Burn & Earn / LP Lock IDL.
 * Fetches the legacy Anchor IDL account on Mainnet and Devnet; never signs or submits.
 */
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(`${process.env.LAUNCHLAB_TOOLS_PREFIX || "/tmp/launchlab-tools"}/package.json`);
const { PublicKey } = require("@solana/web3.js");
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const LOCK_PROGRAMS = {
  mainnet: {
    id: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE",
    rpc: "https://api.mainnet-beta.solana.com",
    authority: "3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH",
  },
  devnet: {
    id: "DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX",
    rpc: "https://api.devnet.solana.com",
    authority: null,
  },
};
const RAYDIUM_CPI_SOURCE_COMMIT = "115df2779d53bacc7db9d0be2773a4b48a6d372b";
const LOCK_AUTH_SEED = "lock_cp_authority_seed";
const LOCK_LIQUIDITY_SEED = "locked_liquidity";
const LOCK_CP_LIQUIDITY_DISCRIMINATOR = [216, 157, 29, 78, 38, 51, 31, 26];
const COLLECT_CP_FEES_DISCRIMINATOR = [8, 30, 51, 199, 209, 184, 247, 133];

const fail = message => { throw new Error(message); };
const normalizeName = value => String(value).replaceAll("_", "").toLowerCase();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const anchorDiscriminator = name => [...createHash("sha256").update("global:" + name).digest().subarray(0, 8)];
const expectedLockAccounts = [
  ["authority", false, false], ["payer", true, true], ["liquidityOwner", true, false],
  ["feeNftOwner", false, false], ["feeNftMint", true, true], ["feeNftAccount", false, true],
  ["poolState", false, false], ["lockedLiquidity", false, true], ["lpMint", false, false],
  ["liquidityOwnerLp", false, true], ["lockedLpVault", false, true],
  ["token0Vault", false, true], ["token1Vault", false, true],
  ["metadataAccount", false, true], ["rent", false, false], ["systemProgram", false, false],
  ["tokenProgram", false, false], ["associatedTokenProgram", false, false],
  ["metadataProgram", false, false],
];
const expectedCollectAccounts = [
  ["authority", false, false], ["feeNftOwner", true, false], ["feeNftAccount", false, true],
  ["lockedLiquidity", false, true], ["cpSwapProgram", false, false], ["cpAuthority", false, false],
  ["poolState", false, true], ["lpMint", false, true], ["recipientToken0Account", false, true],
  ["recipientToken1Account", false, true], ["token0Vault", false, true], ["token1Vault", false, true],
  ["vault0Mint", false, false], ["vault1Mint", false, false],
  ["lockedLpVault", false, true], ["tokenProgram", false, false],
  ["tokenProgram2022", false, false], ["memoProgram", false, false],
];
export function validateLockProgramSource({ libSource, statesSource, contextSource }, target, Key = PublicKey) {
  const mainnetId = libSource.match(/#\\[cfg\\(not\\(feature = "devnet"\\)\\)\\]\\s*declare_id!\\("([^"]+)"\\)/)?.[1];
  const devnetId = libSource.match(/#\\[cfg\\(feature = "devnet"\\)\\]\\s*declare_id!\\("([^"]+)"\\)/)?.[1];
  if (mainnetId !== LOCK_PROGRAMS.mainnet.id || devnetId !== LOCK_PROGRAMS.devnet.id) fail("Pinned Raydium locking source program IDs differ from the configured Mainnet/Devnet programs");
  const authSeed = libSource.match(/pub const LOCK_CP_AUTH_SEED: &str = "([^"]+)"/)?.[1];
  const liquiditySeed = statesSource.match(/pub const LOCKED_LIQUIDITY_SEED: &str = "([^"]+)"/)?.[1];
  if (authSeed !== LOCK_AUTH_SEED) fail("Pinned Raydium locking source authority seed differs from the SDK seed");
  if (liquiditySeed !== LOCK_LIQUIDITY_SEED) fail("Pinned Raydium locking source locked-liquidity seed differs from the SDK seed");
  const lockContext = contextSource.split("pub struct LockCpLiquidity")[1]?.split("pub struct CollectCpFee")[0] ?? "";
  const collectContext = contextSource.split("pub struct CollectCpFee")[1] ?? "";
  if (!lockContext.includes("crate::LOCK_CP_AUTH_SEED.as_bytes()") || !lockContext.includes("LOCKED_LIQUIDITY_SEED.as_bytes()") || !lockContext.includes("fee_nft_mint.key().as_ref()")) fail("Pinned LockCpLiquidity source does not derive authority/locked-liquidity PDAs with expected seeds");
  if (!lockContext.includes("associated_token::mint = lp_mint") || !lockContext.includes("associated_token::authority = authority")) fail("Pinned LockCpLiquidity source does not bind locked LP vault to authority and LP mint");
  if (!collectContext.includes("associated_token::mint = lp_mint") || !collectContext.includes("associated_token::authority = authority")) fail("Pinned CollectCpFee source does not bind locked LP vault to authority and LP mint");
  const feeNftAccountAttribute = collectContext.match(/#\\[account\\(([\\s\\S]*?)\\)\\]\\s*pub fee_nft_account/)?.[1] ?? "";
  if (!feeNftAccountAttribute || /\\bmut\\b/.test(feeNftAccountAttribute)) fail("Pinned CollectCpFee source unexpectedly marks the Fee NFT account mutable");
  if (!collectContext.includes("fee_nft_owner: Signer") || !collectContext.includes("fee_nft_account.amount == 1")) fail("Pinned CollectCpFee source lacks Fee NFT owner/signature ownership constraints");
  const [mainnetAuthority] = Key.findProgramAddressSync([Buffer.from(authSeed, "utf8")], new Key(mainnetId));
  const [devnetAuthority] = Key.findProgramAddressSync([Buffer.from(authSeed, "utf8")], new Key(devnetId));
  if (mainnetAuthority.toBase58() !== LOCK_PROGRAMS.mainnet.authority) fail("Pinned source-derived Mainnet LP Lock authority differs from SDK constant");
  return {
    sourceCommit: RAYDIUM_CPI_SOURCE_COMMIT,
    mainnetProgramId: mainnetId,
    devnetProgramId: devnetId,
    lockAuthoritySeed: authSeed,
    lockedLiquiditySeed: liquiditySeed,
    mainnetLockAuthority: mainnetAuthority.toBase58(),
    devnetLockAuthority: devnetAuthority.toBase58(),
    lockedLiquidityPdaSeeds: ["locked_liquidity", "fee_nft_mint"],
    lockedLpVault: "ATA([authority, SPL Token program, CPMM LP mint])",
    collectCpFeeFeeNftAccountIsReadonly: true,
    feeNftOwnerMustSignToCollect: true,
  };
}
async function fetchLockProgramSource() {
  const base = "https://raw.githubusercontent.com/raydium-io/raydium-cpi/" + RAYDIUM_CPI_SOURCE_COMMIT + "/programs/locking-cpi/src/";
  const paths = ["lib.rs", "states.rs", "context.rs"];
  const contents = await Promise.all(paths.map(async path => {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) fail("Pinned Raydium locking source fetch failed for " + path + ": HTTP " + response.status);
    return response.text();
  }));
  return { libSource: contents[0], statesSource: contents[1], contextSource: contents[2], sha256: Object.fromEntries(paths.map((path, i) => [path, sha(contents[i])])) };
}
function checkAccounts(instruction, expected, name, options = {}) {
  const actual = instruction?.accounts ?? [];
  if (actual.length !== expected.length) fail(name + " account count differs from pinned SDK lock instruction account list");
  const sdkOverprivileges = [];
  for (let i = 0; i < expected.length; i++) {
    const [expectedName, signer, writable] = expected[i];
    const item = actual[i];
    if (normalizeName(item.name) !== normalizeName(expectedName)) fail(name + " account order mismatch at " + i + ": expected " + expectedName + ", got " + item.name);
    const actualSigner = Boolean(item.signer ?? item.isSigner ?? false);
    const actualWritable = Boolean(item.writable ?? item.isMut ?? false);
    if (actualSigner !== signer) fail(name + " signer privilege mismatch for " + expectedName + "; live=" + actualSigner + "; SDK=" + signer);
    if (actualWritable !== writable) {
      const isSdkOverprivilege = writable && !actualWritable && (options.allowSdkWritableOvergrant ?? []).some(value => normalizeName(value) === normalizeName(expectedName));
      if (isSdkOverprivilege) {
        sdkOverprivileges.push({ account: expectedName, liveIdlWritable: false, sdkBuilderWritable: true, severity: "unnecessary-writable-privilege" });
      } else {
        fail(name + " writable privilege mismatch for " + expectedName + "; live=" + actualWritable + "; SDK=" + writable);
      }
    }
  }
  return sdkOverprivileges;
}
export function deriveLockProgramAddresses({ programId, lpMint, PublicKey: Key = PublicKey }) {
  const lockProgram = new Key(programId);
  const [authority] = Key.findProgramAddressSync([Buffer.from(LOCK_AUTH_SEED, "utf8")], lockProgram);
  const [lockedLiquidity] = Key.findProgramAddressSync([Buffer.from(LOCK_LIQUIDITY_SEED, "utf8"), new Key(lpMint).toBuffer()], lockProgram);
  const [lockLpVault] = Key.findProgramAddressSync(
    [authority.toBuffer(), new Key(TOKEN_PROGRAM).toBuffer(), new Key(lpMint).toBuffer()],
    new Key(ASSOCIATED_TOKEN_PROGRAM),
  );
  return { authority: authority.toBase58(), lockedLiquidity: lockedLiquidity.toBase58(), lockLpVault: lockLpVault.toBase58() };
}
export function validateLockProgramIdl(idl, target, Key = PublicKey, source = { lockAuthoritySeed: LOCK_AUTH_SEED, lockedLiquiditySeed: LOCK_LIQUIDITY_SEED }) {
  if (idl.address && idl.address !== target.id) fail("LP Lock IDL address differs from the expected cluster program ID");
  const idlName = idl.name ?? idl.metadata?.name ?? null;
  if (idlName !== "raydium_liquidity_locking") fail("LP Lock IDL name is not raydium_liquidity_locking");
  const instructions = new Map((idl.instructions ?? []).map(item => [normalizeName(item.name), item]));
  const lock = instructions.get("lockcpliquidity");
  const collect = instructions.get("collectcpfees");
  if (!lock || !collect) fail("LP Lock IDL is missing lockCpLiquidity/collectCpFees; IDL name=" + idlName + "; available=" + (idl.instructions ?? []).map(item => item.name).join(", "));
  const lockDiscriminator = lock.discriminator ?? anchorDiscriminator("lock_cp_liquidity");
  const collectDiscriminator = collect.discriminator ?? anchorDiscriminator("collect_cp_fees");
  if (JSON.stringify(lockDiscriminator) !== JSON.stringify(LOCK_CP_LIQUIDITY_DISCRIMINATOR)) fail("LP Lock lock_cp_liquidity discriminator differs from the pinned SDK; live/derived=" + JSON.stringify(lockDiscriminator) + "; SDK=" + JSON.stringify(LOCK_CP_LIQUIDITY_DISCRIMINATOR));
  if (JSON.stringify(collectDiscriminator) !== JSON.stringify(COLLECT_CP_FEES_DISCRIMINATOR)) fail("LP Lock collect_cp_fees discriminator differs from the pinned SDK; live/derived=" + JSON.stringify(collectDiscriminator) + "; SDK=" + JSON.stringify(COLLECT_CP_FEES_DISCRIMINATOR));
  const lockPrivilegeDivergences = checkAccounts(lock, expectedLockAccounts, "lockCpLiquidity");
  const collectPrivilegeDivergences = checkAccounts(collect, expectedCollectAccounts, "collectCpFees", { allowSdkWritableOvergrant: ["feeNftAccount"] });
  const lockArgs = (lock.args ?? []).map(arg => [arg.name, arg.type]);
  const collectArgs = (collect.args ?? []).map(arg => [arg.name, arg.type]);
  if (JSON.stringify(lockArgs.map(([name, type]) => [normalizeName(name), type])) !== JSON.stringify([["lpamount", "u64"], ["withmetadata", "bool"]])) fail("LP Lock lockCpLiquidity arguments differ from pinned SDK encoding");
  const normalizedCollectArgs = collectArgs.map(([name, type]) => [normalizeName(name), type]);
  const collectArgumentWireCompatible = normalizedCollectArgs.length === 1 &&
    ["lpfeeamount", "feelpamount"].includes(normalizedCollectArgs[0][0]) && normalizedCollectArgs[0][1] === "u64";
  if (!collectArgumentWireCompatible) fail("LP Lock collectCpFees argument wire layout differs from pinned SDK; live=" + JSON.stringify(collectArgs) + "; expected one u64 fee amount");

  const authSeed = source.lockAuthoritySeed;
  const liquiditySeed = source.lockedLiquiditySeed;
  if (authSeed !== LOCK_AUTH_SEED) fail("LP Lock authority PDA seed differs from pinned source/SDK");
  if (liquiditySeed !== LOCK_LIQUIDITY_SEED) fail("LP Lock locked-liquidity PDA seed differs from pinned source/SDK");
  const [derivedAuthority] = Key.findProgramAddressSync([Buffer.from(authSeed, "utf8")], new Key(target.id));
  if (target.authority && derivedAuthority.toBase58() !== target.authority) fail("LP Lock authority PDA does not match the pinned SDK program constant");
  return {
    programId: target.id,
    metadataName: idlName,
    instructionCount: idl.instructions.length,
    lockCpLiquidity: { discriminator: lockDiscriminator, discriminatorSource: lock.discriminator ? "live IDL field" : "Anchor global:lock_cp_liquidity derived because legacy IDL omits discriminators", accounts: expectedLockAccounts.map(([name, signer, writable]) => ({ name, signer, writable })), args: lockArgs, authoritySeed: authSeed, lockedLiquiditySeed: liquiditySeed, sdkPrivilegeDivergences: lockPrivilegeDivergences },
    collectCpFees: { discriminator: collectDiscriminator, discriminatorSource: collect.discriminator ? "live IDL field" : "Anchor global:collect_cp_fees derived because legacy IDL omits discriminators", accounts: expectedCollectAccounts.map(([name, signer, writable]) => ({ name, signer, writable })), args: collectArgs, argumentWireCompatible: collectArgumentWireCompatible, sdkArgumentName: "lpFeeAmount", sdkPrivilegeDivergences: collectPrivilegeDivergences, safeToUsePinnedSdkBuilder: collectPrivilegeDivergences.length === 0 },
    lockAuthority: derivedAuthority.toBase58(),
    lockLpVaultDerivation: "Associated Token Account PDA [lock_authority, SPL Token program, CPMM LP mint] under Associated Token Program",
    sourceAvailability: "LP Lock program source is not publicly available; live on-chain Anchor IDL and pinned SDK interface are compared, but IDL does not prove deployed bytecode behavior.",
  };
}
async function getAccount(rpc, address) {
  const response = await fetch(rpc, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-lock-idl-readonly", method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "finalized" }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) fail("LP Lock RPC HTTP " + response.status);
  const json = await response.json();
  if (json.error) fail(json.error.message || "LP Lock RPC error");
  return json.result?.value ?? null;
}
export async function fetchLockIdl(cluster, target = LOCK_PROGRAMS[cluster]) {
  if (!target) fail("Unsupported LP Lock cluster");
  const programId = new PublicKey(target.id);
  const [base] = PublicKey.findProgramAddressSync([], programId);
  const idlAddress = await PublicKey.createWithSeed(base, "anchor:idl", programId);
  const account = await getAccount(target.rpc, idlAddress.toBase58());
  if (!account) fail(cluster + " LP Lock Anchor IDL account is missing");
  if (account.owner !== target.id || account.executable) fail(cluster + " LP Lock Anchor IDL account has an unexpected owner or executable flag");
  const raw = Buffer.from(account.data[0], "base64");
  const discriminator = createHash("sha256").update("internal:IdlAccount").digest().subarray(0, 8);
  if (raw.length < 44 || !raw.subarray(0, 8).equals(discriminator)) fail(cluster + " LP Lock Anchor IDL account header is invalid");
  const compressedLength = raw.readUInt32LE(40);
  if (compressedLength < 1 || 44 + compressedLength > raw.length) fail(cluster + " LP Lock Anchor IDL compressed payload length is invalid");
  const compressed = raw.subarray(44, 44 + compressedLength);
  const bytes = inflateSync(compressed);
  const idl = JSON.parse(bytes.toString("utf8"));
  if (idl.address && idl.address !== target.id) fail(cluster + " LP Lock IDL payload address mismatch");
  return { idl, idlAddress: idlAddress.toBase58(), idlSha256: sha(bytes), authority: new PublicKey(raw.subarray(8, 40)).toBase58(), trailingAllocatedBytes: raw.length - 44 - compressedLength };
}
export async function runLockProgramAudit() {
  const results = [];
  let sourceReview;
  try {
    const source = await fetchLockProgramSource();
    sourceReview = validateLockProgramSource(source, LOCK_PROGRAMS.mainnet);
  } catch (error) {
    return { checkedAt: new Date().toISOString(), readOnly: true, transactionSubmitted: false, results: [], pass: false, sourceError: String(error.message || error) };
  }
  for (const cluster of ["mainnet", "devnet"]) {
    const target = LOCK_PROGRAMS[cluster];
    try {
      const fetched = await fetchLockIdl(cluster, target);
      const schema = validateLockProgramIdl(fetched.idl, target, PublicKey, { lockAuthoritySeed: sourceReview.lockAuthoritySeed, lockedLiquiditySeed: sourceReview.lockedLiquiditySeed });
      results.push({ cluster, pass: true, idlAddress: fetched.idlAddress, idlSha256: fetched.idlSha256, idlAuthority: fetched.authority, trailingAllocatedBytes: fetched.trailingAllocatedBytes, ...schema });
    } catch (error) {
      results.push({ cluster, pass: false, error: String(error.message || error) });
    }
  }
  const mainnetPass = results.find(item => item.cluster === "mainnet")?.pass === true;
  const devnetResult = results.find(item => item.cluster === "devnet");
  const devnetIdlUnavailable = devnetResult?.pass === false && /Anchor IDL account is missing/.test(devnetResult.error ?? "");
  return {
    checkedAt: new Date().toISOString(),
    readOnly: true,
    transactionSubmitted: false,
    results,
    pinnedProgramSource: sourceReview,
    mainnetIdlVerified: mainnetPass,
    devnetIdlPublishedAndVerified: devnetResult?.pass === true,
    devnetIdlPublicationMissing: devnetIdlUnavailable,
    pass: mainnetPass && (devnetResult?.pass === true || devnetIdlUnavailable),
    limitations: devnetIdlUnavailable ? ["Devnet LP Lock program is executable, but its legacy Anchor IDL account is not published at the canonical address; Devnet LP-lock instruction semantics remain verified against pinned SDK only, not a live Devnet IDL. No migration transaction may be submitted until this gap is resolved."] : [],
  };
}
if (process.argv[1]?.endsWith("launchlab-lock-idl-check.mjs")) {
  const report = await runLockProgramAudit();
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.pass) process.exitCode = 1;
}
