import { encodeBase58 } from "./transaction-validation.mjs";

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
export const JUPITER_V6_EVENT_AUTHORITY = "D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf";

const ROUTE_DISCRIMINATOR = [229, 23, 203, 151, 122, 227, 173, 42];
const SUPPORTED_SWAP_VARIANTS = new Map([
  [7, { name: "Raydium", payloadBytes: 0, programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" }],
  [17, { name: "Whirlpool", payloadBytes: 1, programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" }],
  [26, { name: "RaydiumClmm", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [38, { name: "MeteoraDlmm", payloadBytes: 0, programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo" }],
  [40, { name: "RaydiumClmmV2", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [46, { name: "RaydiumCP", payloadBytes: 0, programId: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C" }],
]);

function fail(message) { throw new Error(message); }
function readU32(bytes, offset) {
  if (offset + 4 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}
function readU64(bytes, offset) {
  if (offset + 8 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(offset, true);
}
function readU16(bytes, offset) {
  if (offset + 2 > bytes.length) fail("Truncated Jupiter route instruction");
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}
function equalPrefix(bytes, expected) {
  return bytes.length >= expected.length && expected.every((value, i) => bytes[i] === value);
}

export function decodeJupiterV6Route(data) {
  if (!(data instanceof Uint8Array) || !equalPrefix(data, ROUTE_DISCRIMINATOR)) {
    fail("Only the Jupiter V6 route instruction is supported");
  }
  let offset = 8;
  const count = readU32(data, offset); offset += 4;
  if (count < 1 || count > 16) fail("Jupiter route plan step count is outside the supported range");
  const steps = [];
  const percentByInput = new Map();
  const producedTokenIndexes = new Set();
  const dexProgramIds = new Set();
  for (let i = 0; i < count; i++) {
    if (offset >= data.length) fail("Truncated Jupiter route step");
    const variant = data[offset++];
    const support = SUPPORTED_SWAP_VARIANTS.get(variant);
    if (!support) fail("Jupiter route contains an unsupported DEX variant: " + variant);
    if (offset + support.payloadBytes + 3 > data.length) fail("Truncated Jupiter route step payload");
    const payload = data.slice(offset, offset + support.payloadBytes);
    if (payload.some(value => value > 1) && variant === 17) {
      fail("Jupiter route contains an invalid boolean variant payload");
    }
    offset += support.payloadBytes;
    const percent = data[offset++];
    const inputIndex = data[offset++];
    const outputIndex = data[offset++];
    if (percent < 1 || percent > 100 || inputIndex >= outputIndex || outputIndex > count) {
      fail("Jupiter route contains an invalid split percentage or token index");
    }
    if (inputIndex !== 0 && !producedTokenIndexes.has(inputIndex)) {
      fail("Jupiter route input token index must be produced by an earlier topologically ordered step");
    }
    percentByInput.set(inputIndex, (percentByInput.get(inputIndex) || 0) + percent);
    producedTokenIndexes.add(outputIndex);
    steps.push({ variant, dex: support.name, percent, inputIndex, outputIndex });
    dexProgramIds.add(support.programId);
  }
  const inAmount = readU64(data, offset); offset += 8;
  const quotedOutAmount = readU64(data, offset); offset += 8;
  const slippageBps = readU16(data, offset); offset += 2;
  const platformFeeBps = data[offset++];
  if (offset !== data.length) fail("Unexpected trailing Jupiter route instruction bytes");
  if (!percentByInput.has(0) || steps.every(step => step.outputIndex !== count)) {
    fail("Jupiter route plan does not connect input to final output");
  }
  // Jupiter defines routePlan as a topologically sorted trade DAG. Walk it
  // backwards from the final output to reject dead-end swaps that do not
  // contribute to the user-visible output amount.
  const outputReachableIndexes = new Set([count]);
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (!outputReachableIndexes.has(step.outputIndex)) {
      fail("Jupiter route plan contains a dead-end branch disconnected from the final output");
    }
    outputReachableIndexes.add(step.inputIndex);
  }
  if (!outputReachableIndexes.has(0)) fail("Jupiter route plan has no path from the input token to the final output");
  for (const [inputIndex, percent] of percentByInput) {
    if (percent !== 100) fail("Jupiter route split percentages must total 100 for each input index");
  }
  if (slippageBps > 500) fail("Jupiter route slippage exceeds the 5% safety cap");
  if (platformFeeBps !== 0) fail("Jupiter platform fees are not configured for Climboria");
  return { steps, inAmount, quotedOutAmount, slippageBps, platformFeeBps, dexProgramIds: [...dexProgramIds] };
}

function buildAccountKeys(parsed, loadedWritable = [], loadedReadonly = []) {
  const staticKeys = parsed.staticAccountKeys.map(encodeBase58);
  return [...staticKeys, ...loadedWritable, ...loadedReadonly];
}
function metaFor(parsed, index, loadedWritable = [], loadedReadonly = []) {
  const staticCount = parsed.staticAccountKeys.length;
  if (index < 0 || index >= staticCount + loadedWritable.length + loadedReadonly.length) {
    fail("Instruction account index is outside the resolved key list");
  }
  if (index < staticCount) {
    const signer = index < parsed.requiredSignatures;
    const writable = signer
      ? index < parsed.requiredSignatures - parsed.readonlySignedAccounts
      : index < staticCount - parsed.readonlyUnsignedAccounts;
    return { signer, writable };
  }
  return { signer: false, writable: index < staticCount + loadedWritable.length };
}

export function validateJupiterV6Transaction({
  parsed,
  loadedWritable = [],
  loadedReadonly = [],
  taker,
  outputMint,
  amount,
  outAmount,
  otherAmountThreshold
}) {
  if (!parsed || parsed.requiredSignatures !== 1) fail("Only single-taker-signature transactions are supported");
  const keys = buildAccountKeys(parsed, loadedWritable, loadedReadonly);
  const routeInstructions = [];
  for (const instruction of parsed.instructions) {
    const programId = keys[instruction.programIdIndex];
    if (programId === COMPUTE_BUDGET_PROGRAM_ID) {
      if (instruction.accountIndexes.length !== 0) fail("Compute Budget instructions must not reference accounts");
      const data = instruction.data;
      if (data.length === 5 && (data[0] === 2 || data[0] === 4)) {
        const limit = readU32(data, 1);
        if (data[0] === 2 && (limit < 1 || limit > 1_400_000)) fail("Compute unit limit is outside the allowed range");
        if (data[0] === 4 && (limit < 1 || limit > 64 * 1024 * 1024)) fail("Loaded account data limit is outside the allowed range");
      } else if (data.length === 9 && data[0] === 3) {
        const microLamports = readU64(data, 1);
        if (microLamports > 100_000n) fail("Compute unit price exceeds the priority fee cap");
      } else {
        fail("Unsupported Compute Budget instruction");
      }
      continue;
    }
    if (programId !== JUPITER_V6_PROGRAM_ID) fail("Transaction contains an unsupported top-level program: " + programId);
    routeInstructions.push(instruction);
  }
  if (routeInstructions.length !== 1) fail("Transaction must contain exactly one Jupiter route instruction");
  const instruction = routeInstructions[0];
  const route = decodeJupiterV6Route(instruction.data);
  if (route.inAmount !== BigInt(amount) || route.quotedOutAmount !== BigInt(outAmount)) {
    fail("Jupiter route instruction amounts do not match the validated order metadata");
  }
  if (typeof otherAmountThreshold !== "string" || !/^[1-9][0-9]*$/.test(otherAmountThreshold)) {
    fail("Jupiter minimum-output threshold must be a positive integer string");
  }
  const minimumFromInstruction = route.quotedOutAmount * BigInt(10_000 - route.slippageBps) / 10_000n;
  const suppliedMinimum = BigInt(otherAmountThreshold);
  if (suppliedMinimum < minimumFromInstruction || suppliedMinimum > route.quotedOutAmount) {
    fail("Jupiter minimum-output threshold is weaker than the route slippage limit or exceeds quoted output");
  }
  const accountKeys = instruction.accountIndexes.map(index => keys[index]);
  const accountMetas = instruction.accountIndexes.map(index => metaFor(parsed, index, loadedWritable, loadedReadonly));
  if (accountKeys.length < 10) fail("Jupiter route instruction is missing required fixed or DEX accounts");
  // For the supported no-fee/no-extra-destination-account route shape, Anchor encodes
  // both absent optional accounts (destinationTokenAccount and platformFeeAccount)
  // as the Jupiter program ID sentinel. The top-level program ID is instruction.programIdIndex,
  // not an account meta in this fixed account list.
  if (accountKeys[0] !== TOKEN_PROGRAM_ID || accountKeys[1] !== taker ||
      accountKeys[5] !== outputMint || accountKeys[4] !== JUPITER_V6_PROGRAM_ID ||
      accountKeys[6] !== JUPITER_V6_PROGRAM_ID ||
      accountKeys[7] !== JUPITER_V6_EVENT_AUTHORITY ||
      accountKeys[8] !== JUPITER_V6_PROGRAM_ID) {
    fail("Jupiter route fixed account roles do not match the taker, token program, output mint, event authority and program");
  }
  if (!accountMetas[1].signer || accountMetas[2].signer || accountMetas[3].signer || !accountMetas[2].writable || !accountMetas[3].writable ||
      accountMetas[0].signer || accountMetas[0].writable || accountMetas[5].writable ||
      accountMetas[4].writable || accountMetas[6].writable ||
      accountMetas[7].signer || accountMetas[7].writable ||
      accountMetas[8].signer || accountMetas[8].writable) {
    fail("Jupiter route account signer/writable privileges are unexpected");
  }
  for (let i = 9; i < accountMetas.length; i++) {
    if (accountMetas[i].signer) fail("DEX remaining accounts must not introduce additional signers");
  }
  const remainingAccountKeys = instruction.accountIndexes.slice(9).map(index => keys[index]);
  for (const dexProgramId of route.dexProgramIds) {
    const matchingIndexes = remainingAccountKeys
      .map((key, index) => key === dexProgramId ? index : -1)
      .filter(index => index >= 0);
    if (matchingIndexes.length === 0) fail("Jupiter route is missing its approved DEX program account: " + dexProgramId);
    // Check every occurrence, not only the first. A duplicate program key can
    // otherwise hide a writable alias later in the remaining-account list.
    for (const relativeIndex of matchingIndexes) {
      if (accountMetas[9 + relativeIndex].writable) fail("DEX program accounts must be readonly");
    }
  }
  return { ok: true, route, sourceTokenAccount: accountKeys[2], destinationTokenAccount: accountKeys[3] };
}
