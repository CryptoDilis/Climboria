/**
 * Devnet-only Raydium LaunchLab transaction preparation.
 *
 * This module prepares the pinned SDK's ordered transaction set only. It never
 * calls execute(), signs with the creator wallet, submits, or funds a launch.
 * The caller must supply the ephemeral mint Keypair and every economic amount;
 * provider defaults are deliberately never read as launch settings.
 */
const DEVNET = Object.freeze({
  programId: "DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6",
  configId: "7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt",
  platformId: "2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a",
  quoteMint: "So11111111111111111111111111111111111111112",
  decimals: 6,
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
  if (input.decimals !== DEVNET.decimals || input.quoteDecimals !== DEVNET.quoteDecimals) {
    fail("Token and quote decimals must be explicitly set to the verified Devnet configuration (6 / 9)");
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
  if (typeof contentHash !== "string" || !/^[a-f0-9]{64}$/i.test(contentHash)) fail("Metadata SHA-256 content hash is required");
  if (input.migrateType !== "cpmm") fail("New LaunchLab launches must explicitly use CPMM migration");
  if (input.createOnly !== true) fail("Creator preparation must use create-only mode; no initial buy");
  if (input.token2022 === true || input.transferFeeExtensionParams) fail("Token-2022 transfer-fee launches are not enabled in this Devnet preparation path");
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
  if (BigInt(amounts.totalSellA) > supply) fail("totalSellA cannot exceed total supply");
  if (BigInt(amounts.totalLockedAmount) > supply - BigInt(amounts.totalSellA)) fail("Locked amount cannot exceed the supply remaining after curve allocation");
  return { amounts };
}

export async function prepareDevnetLaunch({ raydium, sdk, input }) {
  const { amounts } = validateDevnetLaunchInput(input, sdk);
  if (!raydium?.connection || !raydium?.api || !raydium?.launchpad) fail("Initialized read-only Devnet Raydium SDK client is required");
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
  for (const field of ["mintB", "curveType", "index", "epoch"]) {
    const onChain = field === "mintB" ? configInfo.mintB.toBase58() : String(configInfo[field]);
    if (String(apiConfig.key[field]) !== onChain) fail(`Fresh API / finalized GlobalConfig mismatch: ${field}`);
  }
  if (platformInfo.restrictCurveParam && !input.platformCurveRuleVerified) {
    fail("Platform restricts curve parameters; a separately verified matching PlatformCurveRule is required");
  }

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
  return {
    cluster: "devnet",
    programId: DEVNET.programId,
    configId: DEVNET.configId,
    platformId: DEVNET.platformId,
    creatorWallet: input.creatorWallet,
    mintAddress: input.mintKeypair.publicKey.toBase58(),
    metadataHash: input.metadata.contentHash.toLowerCase(),
    amounts,
    migration: "cpmm",
    instructionPath: "initializeV2",
    createOnly: true,
    transactionCount: prepared.transactions.length,
    transactions: prepared.transactions,
    extInfo: prepared.extInfo,
    creatorWalletSignatureRequired: true,
    transactionSubmitted: false,
    executeCalled: false,
  };
}

export const LAUNCHLAB_DEVNET_ALLOWLIST = DEVNET;
