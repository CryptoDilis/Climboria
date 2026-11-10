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
    if (instruction.programIdIndex >= totalKeyCount) throw new Error("Instruction program index is outside resolved account-key range");
    if (instruction.accountIndexes.some(index => index >= totalKeyCount)) throw new Error("Instruction account index is outside resolved account-key range");
  }
  return { version, signatures, requiredSignatures, readonlySigned, readonlyUnsigned, staticAccountKeys, recentBlockhash, instructions, addressTableLookups, totalKeyCount };
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


/**
 * Reconstruct Solana's canonical account order from externally supplied,
 * already-authenticated ALT account contents. The caller MUST independently
 * verify the lookup-table account owner, state, slot validity, and provenance
 * from trusted RPC before supplying tables. This helper performs no RPC.
 *
 * Solana appends ALL loaded writable keys across tables, then ALL loaded
 * readonly keys, rather than interleaving writable/readonly per table.
 */
export function reconstructAccountMetas(parsed, resolvedTables = []) {
  if (!parsed || !Array.isArray(parsed.staticAccountKeys) || !Array.isArray(parsed.addressTableLookups)) {
    throw new Error("Invalid parsed Solana transaction");
  }
  if (!Array.isArray(resolvedTables) || resolvedTables.length !== parsed.addressTableLookups.length) {
    throw new Error("Every lookup table requires a trusted resolution");
  }
  const key = (value, label) => {
    if (!(value instanceof Uint8Array) || value.length !== 32) throw new Error(`Invalid ${label} public key`);
    return [...value].map(byte => byte.toString(16).padStart(2, "0")).join("");
  };
  const staticKeys = parsed.staticAccountKeys.map((value, i) => ({ key: key(value, "static"), signer: i < parsed.requiredSignatures, writable: i < parsed.requiredSignatures - parsed.readonlySigned || (i >= parsed.requiredSignatures && i < parsed.staticAccountKeys.length - parsed.readonlyUnsigned), source: "static" }));
  const writable = [];
  const readonly = [];
  parsed.addressTableLookups.forEach((lookup, i) => {
    const table = resolvedTables[i];
    if (!table || key(table.accountKey, "table") !== key(lookup.accountKey, "lookup table") || !Array.isArray(table.addresses)) {
      throw new Error("Lookup table identity mismatch or missing trusted addresses");
    }
    const seen = new Set();
    for (const [indexes, target, isWritable] of [[lookup.writableIndexes, writable, true], [lookup.readonlyIndexes, readonly, false]]) {
      for (const index of indexes) {
        if (!Number.isInteger(index) || index < 0 || index >= table.addresses.length || seen.has(index)) throw new Error("Invalid or duplicated lookup table index");
        seen.add(index);
        target.push({ key: key(table.addresses[index], "lookup address"), signer: false, writable: isWritable, source: "lookup" });
      }
    }
  });
  const metas = [...staticKeys, ...writable, ...readonly];
  if (metas.length !== parsed.totalKeyCount) throw new Error("Resolved account key count mismatch");
  const seenKeys = new Set();
  for (const meta of metas) {
    if (seenKeys.has(meta.key)) throw new Error("Duplicate resolved account public key");
    seenKeys.add(meta.key);
  }
  const instructions = parsed.instructions.map(ix => {
    const program = metas[ix.programIdIndex];
    if (!program || program.writable || program.signer) throw new Error("Instruction program account must be readonly and non-signer");
    return { program, accounts: ix.accountIndexes.map(index => metas[index]), data: ix.data };
  });
  return { metas, instructions };
}


const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";
const LOOKUP_TABLE_META_SIZE = 56;
const U64_MAX = 0xffffffffffffffffn;

/**
 * Decode the canonical Solana Address Lookup Table account layout.
 * The caller must fetch this account from a trusted RPC, pass the RPC-reported
 * owner/executable/context slot, and bind this result to that exact response.
 * This parser alone is not proof that RPC data is trustworthy.
 */
export function decodeAddressLookupTableAccount({ data, owner, executable = false, contextSlot }) {
  if (owner !== ADDRESS_LOOKUP_TABLE_PROGRAM_ID) throw new Error("Address lookup table has an unexpected owner program");
  if (executable !== false) throw new Error("Address lookup table account must not be executable");
  if (!Number.isSafeInteger(contextSlot) || contextSlot < 0) throw new Error("Missing trusted RPC context slot");
  if (!(data instanceof Uint8Array) || data.length < LOOKUP_TABLE_META_SIZE ||
      data.length > LOOKUP_TABLE_META_SIZE + 256 * 32 || (data.length - LOOKUP_TABLE_META_SIZE) % 32 !== 0) {
    throw new Error("Invalid address lookup table account data length");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 1) throw new Error("Address lookup table account is not initialized");
  const deactivationSlot = view.getBigUint64(4, true);
  const lastExtendedSlot = view.getBigUint64(12, true);
  const lastExtendedSlotStartIndex = data[20];
  const authorityOption = data[21];
  if (authorityOption !== 0 && authorityOption !== 1) throw new Error("Invalid lookup table authority option");
  const authorityBytes = data.slice(22, 54);
  if (authorityOption === 0 && authorityBytes.some(byte => byte !== 0)) throw new Error("Non-zero bytes for absent lookup table authority");
  if (data[54] !== 0 || data[55] !== 0) throw new Error("Invalid lookup table metadata padding");
  const addresses = [];
  for (let offset = LOOKUP_TABLE_META_SIZE; offset < data.length; offset += 32) addresses.push(data.slice(offset, offset + 32));
  if (lastExtendedSlotStartIndex > addresses.length) throw new Error("Lookup table extension index exceeds address count");
  if (deactivationSlot !== U64_MAX) throw new Error("Deactivated lookup tables are not accepted");
  if (BigInt(contextSlot) <= lastExtendedSlot && lastExtendedSlotStartIndex < addresses.length) {
    throw new Error("Lookup table contains addresses that are not active until a later slot");
  }
  return {
    accountKey: null,
    addresses,
    authority: authorityOption === 1 ? authorityBytes : null,
    deactivationSlot: deactivationSlot.toString(),
    lastExtendedSlot: lastExtendedSlot.toString(),
    lastExtendedSlotStartIndex,
    contextSlot
  };
}
