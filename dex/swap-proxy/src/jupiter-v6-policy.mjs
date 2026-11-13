import { encodeBase58 } from "./transaction-validation.mjs";

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
// Classic SPL Token is the only supported token program in the signable
// transaction policy. A Token-2022 CPI requires its executable program key,
// so reject that key anywhere in the resolved message, including ALTs.
export const UNSUPPORTED_TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";

const ROUTE_DISCRIMINATOR = [229, 23, 203, 151, 122, 227, 173, 42];
const SUPPORTED_SWAP_VARIANTS = new Map([
  [7, { name: "Raydium", payloadBytes: 0, programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8" }],
  [17, { name: "Whirlpool", payloadBytes: 1, programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" }],
  [26, { name: "RaydiumClmm", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [38, { name: "MeteoraDlmm", payloadBytes: 0, programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo" }],
  [40, { name: "RaydiumClmmV2", payloadBytes: 0, programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK" }],
  [46, { name: "RaydiumCP", payloadBytes: 0, programId: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C" }],
  [61, { name: "SolFi", payloadBytes: 1, programId: "SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe" }]
]);

// Known executable programs must never receive writable or signer privileges
// from either static keys or resolved ALT entries. Checking only the first
// matching remaining account is insufficient when an upstream transaction
// supplies duplicate aliases.
const APPROVED_READONLY_PROGRAM_IDS = new Set([
  TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  JUPITER_V6_PROGRAM_ID,
  ...[...SUPPORTED_SWAP_VARIANTS.values()].map(variant => variant.programId)
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
  const dexProgramIds = new Set();
  // Jupiter's pinned V6 route IDL explicitly calls routePlan a
  // "Topologically sorted trade DAG" (jup-ag/instruction-parser at
  // e6f77951377847c579112e6a16d8c17c5c092485, src/idl/jupiter.ts).
  // The existing graph connectivity checks are necessary but insufficient:
  // a fully connected graph may still consume an intermediate token before
  // any preceding step produced it. Reject non-topological ordering.
  const previouslyProducedOutputs = new Set([0]);
  for (let i = 0; i < count; i++) {
    if (offset >= data.length) fail("Truncated Jupiter route step");
    const variant = data[offset++];
    const support = SUPPORTED_SWAP_VARIANTS.get(variant);
    if (!support) fail("Jupiter route contains an unsupported DEX variant: " + variant);
    if (offset + support.payloadBytes + 3 > data.length) fail("Truncated Jupiter route step payload");
    const payload = data.slice(offset, offset + support.payloadBytes);
    if (payload.some(value => value > 1) && (variant === 17 || variant === 61)) {
      fail("Jupiter route contains an invalid boolean variant payload");
    }
    offset += support.payloadBytes;
    const percent = data[offset++];
    const inputIndex = data[offset++];
    const outputIndex = data[offset++];
    if (percent < 1 || percent > 100 || inputIndex >= outputIndex || outputIndex > count) {
      fail("Jupiter route contains an invalid split percentage or token index");
    }
    if (!previouslyProducedOutputs.has(inputIndex)) {
      fail("Jupiter route plan steps must be topologically sorted before consuming intermediate tokens");
    }
    previouslyProducedOutputs.add(outputIndex);
    percentByInput.set(inputIndex, (percentByInput.get(inputIndex) || 0) + percent);
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
  for (const [inputIndex, percent] of percentByInput) {
    if (percent !== 100) fail("Jupiter route split percentages must total 100 for each input index");
  }
  // A per-index percentage total does not prove that the route is actually
  // connected. A malicious plan could start a disconnected secondary route
  // at an intermediate input that is never produced, or leave intermediate
  // output stranded while also referencing the final output elsewhere.
  //
  // Every non-source input must come from a producer step, and every
  // non-final output must feed a consumer step. The separate topological
  // ordering check above additionally requires producers to appear first.
  // Increasing token indexes ensure an acyclic route to the terminal.
  const produced = new Set(steps.map(step => step.outputIndex));
  const consumed = new Set(percentByInput.keys());
  for (const step of steps) {
    if (step.inputIndex !== 0 && !produced.has(step.inputIndex)) {
      fail("Jupiter route plan has an unreachable intermediate input token index");
    }
    if (step.outputIndex !== count && !consumed.has(step.outputIndex)) {
      fail("Jupiter route plan has an unconsumed intermediate output token index");
    }
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
  // Defense in depth: the stored order independently verifies this again,
  // but a policy result must never accept an upstream-paid transaction.
  if (!Array.isArray(parsed.staticAccountKeys) || !parsed.staticAccountKeys.length ||
      encodeBase58(parsed.staticAccountKeys[0]) !== taker) {
    fail("Jupiter transaction fee payer must match the requested taker");
  }
  const keys = buildAccountKeys(parsed, loadedWritable, loadedReadonly);
  // Solana v0 address lookups and static account references share one resolved
  // key space. Reject duplicate pubkey aliases rather than relying on
  // accountIndexes.indexOf(), which can inspect only the first occurrence.
  if (new Set(keys).size !== keys.length) {
    fail("Jupiter transaction contains duplicate resolved account pubkeys");
  }
  // Source/destination RPC evidence only proves the outer token accounts.
  // Unsupported intermediate Token-2022 CPI must also be fail-closed, even
  // when the token program appears as an unused or ALT-loaded account key.
  if (keys.includes(UNSUPPORTED_TOKEN_2022_PROGRAM_ID)) {
    fail("Token-2022 program accounts are unsupported in Jupiter route transactions");
  }
  for (let index = 0; index < keys.length; index++) {
    if (!APPROVED_READONLY_PROGRAM_IDS.has(keys[index])) continue;
    const privilege = metaFor(parsed, index, loadedWritable, loadedReadonly);
    if (privilege.signer || privilege.writable) {
      fail("Jupiter transaction grants signer or writable privileges to a known executable program");
    }
  }
  const routeInstructions = [];
  const seenComputeBudgetTypes = new Set();
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
      // Solana rejects duplicate settings for the same Compute Budget field.
      // Detect ambiguous duplicate fee/limit requests before signing, while
      // preserving distinct limit + price + loaded-data settings.
      if (seenComputeBudgetTypes.has(data[0])) {
        fail("Duplicate Compute Budget instruction type is unsupported");
      }
      seenComputeBudgetTypes.add(data[0]);
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
  if (accountKeys.length < 8) fail("Jupiter route instruction is missing required accounts");
  // For the supported no-fee/no-extra-destination-account route shape, Anchor encodes
  // both absent optional accounts (destinationTokenAccount and platformFeeAccount)
  // as the Jupiter program ID sentinel. The top-level program ID is instruction.programIdIndex,
  // not an account meta in this fixed account list.
  if (accountKeys[0] !== TOKEN_PROGRAM_ID || accountKeys[1] !== taker ||
      accountKeys[5] !== outputMint || accountKeys[4] !== JUPITER_V6_PROGRAM_ID ||
      accountKeys[6] !== JUPITER_V6_PROGRAM_ID) {
    fail("Jupiter route account roles do not match the taker, token program and output mint");
  }
  if (!accountMetas[1].signer || accountMetas[2].signer || accountMetas[3].signer || !accountMetas[2].writable || !accountMetas[3].writable ||
      accountMetas[0].signer || accountMetas[0].writable || accountMetas[5].writable ||
      accountMetas[4].writable || accountMetas[6].writable) {
    fail("Jupiter route account signer/writable privileges are unexpected");
  }
  for (let i = 7; i < accountMetas.length; i++) {
    if (accountMetas[i].signer) fail("DEX remaining accounts must not introduce additional signers");
  }
  const remainingAccountKeys = instruction.accountIndexes.slice(7).map(index => keys[index]);
  for (const dexProgramId of route.dexProgramIds) {
    const relativeIndex = remainingAccountKeys.indexOf(dexProgramId);
    if (relativeIndex < 0) fail("Jupiter route is missing its approved DEX program account: " + dexProgramId);
    if (accountMetas[7 + relativeIndex].writable) fail("DEX program accounts must be readonly");
  }
  return { ok: true, route, sourceTokenAccount: accountKeys[2], destinationTokenAccount: accountKeys[3] };
}
