const MAX_TRANSACTION_BYTES = 1232;
const MAX_SIGNATURES = 64;

function readShortVec(bytes, cursor, label) {
  let value = 0;
  let shift = 0;
  for (let i = 0; i < 3; i++) {
    if (cursor.offset >= bytes.length) throw new Error(`Truncated ${label}`);
    const byte = bytes[cursor.offset++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      if (i > 0 && (byte & 0x7f) === 0) throw new Error(`Non-canonical ${label}`);
      if (value > 65535) throw new Error(`Oversized ${label}`);
      return value;
    }
    shift += 7;
  }
  throw new Error(`Invalid ${label}`);
}
function take(bytes, cursor, length, label) {
  if (!Number.isSafeInteger(length) || length < 0 || cursor.offset + length > bytes.length) throw new Error(`Truncated ${label}`);
  const start = cursor.offset;
  cursor.offset += length;
  return bytes.subarray(start, cursor.offset);
}
function parseBase64Transaction(encoded) {
  if (typeof encoded !== "string" || !encoded.length || encoded.length > Math.ceil(MAX_TRANSACTION_BYTES / 3) * 4 ||
      encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("Invalid transaction base64");
  }
  let binary;
  try { binary = atob(encoded); } catch { throw new Error("Invalid transaction base64"); }
  if (btoa(binary) !== encoded || binary.length === 0 || binary.length > MAX_TRANSACTION_BYTES) throw new Error("Non-canonical or oversized transaction encoding");
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Strict structural decoder for Solana legacy and v0 wire transactions.
 * This does NOT resolve lookup tables, decode program instructions, or establish
 * that a transaction is safe. It must never be treated as an execution allowlist.
 */
export function decodeSolanaTransaction(encoded) {
  const bytes = parseBase64Transaction(encoded);
  const cursor = { offset: 0 };
  const signatureCount = readShortVec(bytes, cursor, "signature count");
  if (signatureCount === 0 || signatureCount > MAX_SIGNATURES) throw new Error("Invalid transaction signature count");
  const signatures = [];
  for (let i = 0; i < signatureCount; i++) signatures.push(take(bytes, cursor, 64, "signature"));

  const firstMessageByte = take(bytes, cursor, 1, "message header")[0];
  let version = "legacy";
  let header;
  if ((firstMessageByte & 0x80) !== 0) {
    const messageVersion = firstMessageByte & 0x7f;
    if (messageVersion !== 0) throw new Error("Unsupported Solana message version");
    version = 0;
    header = take(bytes, cursor, 3, "v0 message header");
  } else {
    const rest = take(bytes, cursor, 2, "legacy message header");
    header = Uint8Array.of(firstMessageByte, rest[0], rest[1]);
  }
  const requiredSignatures = header[0];
  const readonlySigned = header[1];
  const readonlyUnsigned = header[2];
  const staticKeyCount = readShortVec(bytes, cursor, "static account key count");
  if (staticKeyCount === 0 || staticKeyCount > 256) throw new Error("Invalid static account key count");
  const staticAccountKeys = [];
  for (let i = 0; i < staticKeyCount; i++) staticAccountKeys.push(take(bytes, cursor, 32, "static account key"));
  const recentBlockhash = take(bytes, cursor, 32, "recent blockhash");
  if (requiredSignatures > staticKeyCount || requiredSignatures !== signatureCount ||
      readonlySigned > requiredSignatures || readonlyUnsigned > staticKeyCount - requiredSignatures) {
    throw new Error("Inconsistent Solana message header");
  }

  const instructionCount = readShortVec(bytes, cursor, "instruction count");
  const instructions = [];
  for (let i = 0; i < instructionCount; i++) {
    const programIdIndex = take(bytes, cursor, 1, "instruction program index")[0];
    const accountCount = readShortVec(bytes, cursor, "instruction account count");
    const accountIndexes = [...take(bytes, cursor, accountCount, "instruction account indexes")];
    const dataLength = readShortVec(bytes, cursor, "instruction data length");
    const data = take(bytes, cursor, dataLength, "instruction data");
    if (programIdIndex >= staticKeyCount) throw new Error("Instruction program index is outside static account keys");
    instructions.push({ programIdIndex, accountIndexes, data });
  }

  const addressTableLookups = [];
  if (version === 0) {
    const lookupCount = readShortVec(bytes, cursor, "address table lookup count");
    for (let i = 0; i < lookupCount; i++) {
      const accountKey = take(bytes, cursor, 32, "address lookup table key");
      const writableCount = readShortVec(bytes, cursor, "writable lookup index count");
      const writableIndexes = [...take(bytes, cursor, writableCount, "writable lookup indexes")];
      const readonlyCount = readShortVec(bytes, cursor, "readonly lookup index count");
      const readonlyIndexes = [...take(bytes, cursor, readonlyCount, "readonly lookup indexes")];
      addressTableLookups.push({ accountKey, writableIndexes, readonlyIndexes });
    }
  }
  if (cursor.offset !== bytes.length) throw new Error("Unexpected trailing transaction bytes");
  const loadedKeyCount = addressTableLookups.reduce((sum, lookup) => sum + lookup.writableIndexes.length + lookup.readonlyIndexes.length, 0);
  const totalKeyCount = staticKeyCount + loadedKeyCount;
  if (totalKeyCount > 256) throw new Error("Too many resolved transaction account keys");
  for (const instruction of instructions) {
    if (instruction.accountIndexes.some(index => index >= totalKeyCount)) throw new Error("Instruction account index is outside resolved account-key range");
  }
  return { version, signatures, requiredSignatures, staticAccountKeys, recentBlockhash, instructions, addressTableLookups, totalKeyCount };
}

export async function hashSolanaMessage(encoded) {
  decodeSolanaTransaction(encoded);
  const bytes = parseBase64Transaction(encoded);
  const cursor = { offset: 0 };
  const signatureCount = readShortVec(bytes, cursor, "signature count");
  cursor.offset += signatureCount * 64;
  if (cursor.offset >= bytes.length) throw new Error("Missing Solana message");
  const digest = await crypto.subtle.digest("SHA-256", bytes.subarray(cursor.offset));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
