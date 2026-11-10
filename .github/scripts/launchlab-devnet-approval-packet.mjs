/**
 * Read-only Devnet owner-approval packet builder.
 *
 * Inspects a prepared, unsigned single-transaction LaunchLab result; resolves
 * writable account existence; obtains exact finalized rent-exemption, message
 * fee, and fee-payer balance data; and emits an unapproved review packet.
 * It never signs, simulates, submits, broadcasts, or invokes SDK execute().
 */
import { createHash } from "node:crypto";

const fail = message => { throw new Error(message); };
const keyString = value => value && typeof value.toBase58 === "function" ? value.toBase58() : "";
const isZeroSignature = signature =>
  (signature instanceof Uint8Array || Buffer.isBuffer(signature)) &&
  signature.length === 64 &&
  signature.every(byte => byte === 0);

export async function prepareDevnetOwnerApprovalPacket({
  raydium,
  sdk,
  prepared,
  rentAccountSpecs,
  feeBufferLamports,
}) {
  if (raydium?.cluster !== "devnet") fail("Owner-approval packets are restricted to an explicitly initialized Devnet client");
  if (!raydium?.connection || !sdk?.PublicKey ||
      typeof raydium.connection.getAccountInfo !== "function" ||
      typeof raydium.connection.getBalance !== "function" ||
      typeof raydium.connection.getFeeForMessage !== "function" ||
      typeof raydium.connection.getMinimumBalanceForRentExemption !== "function") {
    fail("Read-only finalized Devnet RPC account, balance, fee, and rent methods are required");
  }
  if (!prepared || prepared.cluster !== "devnet" || prepared.createOnly !== true ||
      prepared.instructionPath !== "initializeV2" || prepared.transactionSubmitted !== false ||
      prepared.executeCalled !== false) {
    fail("A verified create-only Devnet initializeV2 preparation result is required");
  }
  if (prepared.creatorWallet === prepared.feePayer) fail("A separate dedicated fee payer is required for the owner-approval packet");
  if (!Array.isArray(prepared.transactions) || prepared.transactions.length !== 1 ||
      !Array.isArray(prepared.transactionReviews) || prepared.transactionReviews.length !== 1) {
    return {
      status: "blocked",
      reason: "Only one ordered transaction can be reviewed; multi-transaction sets remain blocked pending dependency analysis",
      transactionCount: prepared.transactions?.length ?? 0,
      ownerApprovalCreated: false,
      transactionSubmitted: false,
    };
  }
  if (!Number.isSafeInteger(feeBufferLamports) || feeBufferLamports < 1) {
    fail("An explicit positive fee safety buffer in lamports is required");
  }
  const transaction = prepared.transactions[0];
  const message = transaction?.message;
  const feePayer = keyString(message?.staticAccountKeys?.[0]);
  if (!feePayer || feePayer !== prepared.feePayer) fail("Prepared transaction fee payer does not match the reviewed dedicated fee payer");
  if (!Number.isInteger(message?.header?.numRequiredSignatures) ||
      !Array.isArray(transaction.signatures) ||
      transaction.signatures.length !== message.header.numRequiredSignatures ||
      !transaction.signatures.every(isZeroSignature)) {
    fail("Approval packet accepts unsigned transactions only; every signature slot must be exactly zeroed");
  }
  if (typeof message.serialize !== "function") fail("Versioned transaction message serialization is required for exact hash binding");
  const messageHash = createHash("sha256").update(message.serialize()).digest("hex");
  const review = prepared.transactionReviews[0];
  if (review.feePayer !== feePayer ||
      !Array.isArray(review.requiredSignerKeys) ||
      review.requiredSignerKeys[0] !== feePayer) {
    fail("Reviewed transaction signer requirements do not bind the dedicated fee payer");
  }
  if (!Array.isArray(review.launchpadAccounts)) fail("Verified LaunchLab account review is required");

  const writable = new Map();
  for (const account of review.launchpadAccounts) {
    if (!account?.isWritable) continue;
    if (typeof account.pubkey !== "string" || !account.pubkey.trim()) fail("Writable account review contains an invalid public key");
    const prior = writable.get(account.pubkey) ?? { address: account.pubkey, names: [] };
    if (typeof account.name === "string" && !prior.names.includes(account.name)) prior.names.push(account.name);
    writable.set(account.pubkey, prior);
  }
  if (!writable.has(feePayer)) fail("Dedicated fee payer is missing from the verified writable account review");

  const accountRows = [...writable.values()];
  const accountInfos = await Promise.all(accountRows.map(async account => ({
    ...account,
    info: await raydium.connection.getAccountInfo(new sdk.PublicKey(account.address), "finalized"),
  })));
  const missing = accountInfos.filter(account => !account.info);
  const specs = Array.isArray(rentAccountSpecs) ? rentAccountSpecs : [];
  const specMap = new Map();
  for (const spec of specs) {
    if (!spec || typeof spec.address !== "string" || !Number.isSafeInteger(spec.space) || spec.space < 1 ||
        typeof spec.purpose !== "string" || !spec.purpose.trim() ||
        typeof spec.sourceRef !== "string" || !spec.sourceRef.trim()) {
      fail("Every rent account spec must include address, positive verified data space, purpose, and source reference");
    }
    if (specMap.has(spec.address)) fail("Duplicate rent account specification: " + spec.address);
    specMap.set(spec.address, spec);
  }
  const missingAddresses = new Set(missing.map(account => account.address));
  for (const spec of specs) {
    if (!missingAddresses.has(spec.address)) fail("Rent account spec does not match a currently missing writable account: " + spec.address);
  }
  const unresolved = missing.filter(account => !specMap.has(account.address));
  if (unresolved.length) {
    return {
      status: "blocked",
      reason: "Verified data-space/source specifications are required for every missing writable account; no rent reserve will be guessed",
      cluster: "devnet",
      creatorWallet: prepared.creatorWallet,
      feePayer,
      messageSha256: messageHash,
      missingRentSpecs: unresolved.map(({ address, names }) => ({ address, names })),
      ownerApprovalCreated: false,
      transactionSubmitted: false,
    };
  }

  const rentAccounts = await Promise.all(missing.map(async account => {
    const spec = specMap.get(account.address);
    const minimumBalanceLamports = await raydium.connection.getMinimumBalanceForRentExemption(spec.space, "finalized");
    if (!Number.isSafeInteger(minimumBalanceLamports) || minimumBalanceLamports < 0) {
      fail("Finalized rent-exemption quote is unavailable or invalid for " + account.address);
    }
    return {
      address: account.address,
      names: account.names,
      dataSpaceBytes: spec.space,
      purpose: spec.purpose,
      sourceRef: spec.sourceRef,
      minimumBalanceLamports,
    };
  }));
  const [balanceLamports, feeQuote] = await Promise.all([
    raydium.connection.getBalance(new sdk.PublicKey(feePayer), "finalized"),
    raydium.connection.getFeeForMessage(message, "finalized"),
  ]);
  if (!Number.isSafeInteger(balanceLamports) || balanceLamports < 0) fail("Finalized dedicated fee-payer balance is unavailable or invalid");
  if (!feeQuote || !Number.isSafeInteger(feeQuote.value) || feeQuote.value < 0) {
    fail("Finalized network fee quote is unavailable; refusing to estimate or guess");
  }
  const rentReserveLamports = rentAccounts.reduce((sum, account) => sum + account.minimumBalanceLamports, 0);
  const requiredLamports = rentReserveLamports + feeQuote.value + feeBufferLamports;
  if (!Number.isSafeInteger(requiredLamports)) fail("Combined rent, network fee, and safety buffer exceeds safe integer bounds");
  const enoughFunds = balanceLamports >= requiredLamports;
  return {
    status: enoughFunds ? "ready_for_owner_review" : "blocked_insufficient_fee_payer_balance",
    cluster: "devnet",
    sdkVersion: "0.2.84-alpha",
    instructionPath: "initializeV2",
    migration: "cpmm",
    creatorWallet: prepared.creatorWallet,
    feePayer,
    mintAddress: prepared.mintAddress,
    messageSha256: messageHash,
    requiredSignerKeys: review.requiredSignerKeys,
    programIds: review.programIds,
    instructionData: review.launchpadInstructionData,
    writableAccounts: accountInfos.map(({ address, names, info }) => ({
      address, names, existsAtFinalized: Boolean(info),
      owner: info?.owner?.toBase58?.() ?? null,
      dataLength: info?.data?.length ?? null,
    })),
    rentAccounts,
    rentReserveLamports,
    networkFeeLamports: feeQuote.value,
    feeBufferLamports,
    requiredLamports,
    finalizedFeePayerBalanceLamports: balanceLamports,
    remainingHeadroomLamports: balanceLamports - requiredLamports,
    enoughFunds,
    ownerApproval: {
      approved: false,
      reference: null,
      confirmation: "I_APPROVE_UNSIGNED_DEVNET_SIMULATION",
      feePayer,
      messageHashes: [messageHash],
      approvedAt: null,
      expiresAt: null,
    },
    ownerApprovalCreated: false,
    transactionSigned: false,
    transactionSimulated: false,
    transactionSubmitted: false,
    executeCalled: false,
  };
}
