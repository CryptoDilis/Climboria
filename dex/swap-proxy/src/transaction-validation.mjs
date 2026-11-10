const MAX_TRANSACTION_BYTES = 1232;
const MAX_STATIC_KEYS = 256;
const MAX_INSTRUCTIONS = 64;

function fail(message) {
  throw new Error(message);
}

function decodeBase64(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 4096 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail("Transaction must be canonical base64");
  }
  let binary;
  try { binary = atob(value); } catch { fail("Transaction base64 decoding failed"); }
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (bytes.length > MAX_TRANSACTION_BYTES || btoa(binary) !== value) {
    fail("Transaction is oversized or non-canonical");
  }
  return bytes;
}

function decodeBase58(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) {
    fail("Invalid taker public key");
  }
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") zeros++;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) fail("Invalid taker public key");
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  const decoded = new Uint8Array(zeros + (bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length));
  for (let i = 0; i < bytes.length && i < decoded.length - zeros; i++) {
    decoded[decoded.length - 1 - i] = bytes[i];
  }
  if (decoded.length !== 32) fail("Taker public key must decode to 32 bytes");
  return decoded;
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function allZero(bytes) {
  let value = 0;
  for (const byte of bytes) value |= byte;
  return value === 0;
}

function readShortVec(bytes, cursor) {
  let value = 0;
  let shift = 0;
  let count = 0;
  while (count < 3) {
    if (cursor.offset >= bytes.length) fail("Truncated compact-u16 length");
    const byte = bytes[cursor.offset++];
    value |= (byte & 0x7f) << shift;
    count++;
    if ((byte & 0x80) === 0) {
      if (value > 65535 || (count > 1 && value < (1 << (7 * (count - 1))))) {
        fail("Non-canonical compact-u16 length");
      }
      return value;
    }
    shift += 7;
  }
  fail("Invalid compact-u16 length");
}

function take(bytes, cursor, length) {
  if (!Number.isSafeInteger(length) || length < 0 || cursor.offset + length > bytes.length) {
    fail("Truncated Solana transaction");
  }
  const result = bytes.subarray(cursor.offset, cursor.offset + length);
  cursor.offset += length;
  return result;
}

export function parseSolanaV0Transaction(base64) {
  const bytes = decodeBase64(base64);
  const cursor = { offset: 0 };
  const signatureCount = readShortVec(bytes, cursor);
  if (signatureCount < 1 || signatureCount > 64) fail("Invalid transaction signature count");
  const signatures = [];
  for (let i = 0; i < signatureCount; i++) signatures.push(take(bytes, cursor, 64));
  const messageStart = cursor.offset;
  const versionPrefix = take(bytes, cursor, 1)[0];
  if (versionPrefix !== 0x80) fail("Only Solana v0 transactions are supported");
  const header = take(bytes, cursor, 3);
  const requiredSignatures = header[0];
  const readonlySigned = header[1];
  const readonlyUnsigned = header[2];
  if (requiredSignatures !== signatureCount || requiredSignatures < 1 ||
      readonlySigned >= requiredSignatures) {
    fail("Transaction signature header is inconsistent");
  }
  const keyCount = readShortVec(bytes, cursor);
  if (keyCount < requiredSignatures || keyCount > MAX_STATIC_KEYS ||
      readonlyUnsigned > keyCount - requiredSignatures) {
    fail("Invalid static account key count or header");
  }
  const staticAccountKeys = [];
  for (let i = 0; i < keyCount; i++) staticAccountKeys.push(take(bytes, cursor, 32));
  take(bytes, cursor, 32); // recent blockhash; included in the exact message comparison
  const instructionCount = readShortVec(bytes, cursor);
  if (instructionCount > MAX_INSTRUCTIONS) fail("Too many compiled instructions");
  const instructions = [];
  for (let i = 0; i < instructionCount; i++) {
    const programIdIndex = take(bytes, cursor, 1)[0];
    const accountCount = readShortVec(bytes, cursor);
    const accountIndexes = take(bytes, cursor, accountCount);
    const dataLength = readShortVec(bytes, cursor);
    take(bytes, cursor, dataLength);
    instructions.push({ programIdIndex, accountIndexes });
  }
  const lookupCount = readShortVec(bytes, cursor);
  let loadedAddressCount = 0;
  for (let i = 0; i < lookupCount; i++) {
    take(bytes, cursor, 32); // address lookup table account key
    const writableCount = readShortVec(bytes, cursor);
    take(bytes, cursor, writableCount);
    const readonlyCount = readShortVec(bytes, cursor);
    take(bytes, cursor, readonlyCount);
    loadedAddressCount += writableCount + readonlyCount;
  }
  if (keyCount + loadedAddressCount > 256) fail("Transaction account index space exceeds 256 entries");
  for (const instruction of instructions) {
    if (instruction.programIdIndex >= keyCount + loadedAddressCount) {
      fail("Compiled instruction references an out-of-range program index");
    }
    for (const index of instruction.accountIndexes) {
      if (index >= keyCount + loadedAddressCount) {
        fail("Compiled instruction references an out-of-range account index");
      }
    }
  }
  if (cursor.offset !== bytes.length) fail("Unexpected trailing transaction bytes");
  return {
    bytes,
    signatures,
    message: bytes.subarray(messageStart),
    staticAccountKeys,
    requiredSignatures
  };
}

export async function validateSignedOrderTransaction({
  originalTransaction,
  signedTransaction,
  taker,
  cryptoApi = globalThis.crypto
}) {
  try {
    const original = parseSolanaV0Transaction(originalTransaction);
    const signed = parseSolanaV0Transaction(signedTransaction);
    if (!equalBytes(original.message, signed.message)) {
      return { ok: false, error: "Signed transaction message differs from the server-issued order" };
    }
    if (!equalBytes(original.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Order fee payer does not match the stored taker wallet" };
    }
    if (!allZero(original.signatures[0])) {
      return { ok: false, error: "Server-issued order unexpectedly contains a taker signature" };
    }
    if (allZero(signed.signatures[0])) {
      return { ok: false, error: "Taker signature is missing" };
    }
    for (let i = 1; i < original.signatures.length; i++) {
      if (!equalBytes(original.signatures[i], signed.signatures[i])) {
        return { ok: false, error: "Unexpected additional signer signature change; Jupiter partial-signing policy requires other slots to remain unchanged" };
      }
    }
    if (!cryptoApi?.subtle) return { ok: false, error: "Ed25519 verification is unavailable in this runtime" };
    const publicKey = await cryptoApi.subtle.importKey(
      "raw",
      signed.staticAccountKeys[0],
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const valid = await cryptoApi.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signed.signatures[0],
      signed.message
    );
    if (!valid) return { ok: false, error: "Taker Ed25519 signature is invalid" };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid Solana transaction" };
  }
}

export function validateUnsignedOrderTransaction({ transaction, taker }) {
  try {
    const parsed = parseSolanaV0Transaction(transaction);
    if (!equalBytes(parsed.staticAccountKeys[0], decodeBase58(taker))) {
      return { ok: false, error: "Jupiter order fee payer does not match the requested taker wallet" };
    }
    if (!allZero(parsed.signatures[0])) {
      return { ok: false, error: "Jupiter order unexpectedly contains a pre-existing taker signature" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid unsigned order transaction" };
  }
}
