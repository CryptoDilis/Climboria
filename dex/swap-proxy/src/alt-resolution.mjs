const ALT_PROGRAM_ID = "AddressLookupTab1e1111111111111111111111111";
const META_SIZE = 56;
const ADDRESS_SIZE = 32;
const MAX_ADDRESSES = 256;
const ACTIVE_DEACTIVATION_SLOT = (1n << 64n) - 1n;

function fail(message) { throw new Error(message); }

function bytesFromAccountData(data) {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data) && typeof data[0] === "string") {
    const binary = atob(data[0]);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  if (typeof data === "string") {
    const binary = atob(data);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  fail("Address lookup table account data is missing or unsupported");
}

function encodeBase58(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let encoded = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    if (zeros && i === 0 && digits[i] === 0) continue;
    encoded += alphabet[digits[i]];
  }
  return encoded;
}

function decodeLookupTable(account, address) {
  if (!account || account.owner !== ALT_PROGRAM_ID || account.executable === true) {
    fail(`Address lookup table ${address} is missing or not owned by the canonical ALT program`);
  }
  const data = bytesFromAccountData(account.data);
  if (data.length < META_SIZE || (data.length - META_SIZE) % ADDRESS_SIZE !== 0) {
    fail(`Address lookup table ${address} has an invalid metadata/address layout`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0, true) !== 1) fail(`Address lookup table ${address} has an unsupported state discriminator`);
  const deactivationSlot = view.getBigUint64(4, true);
  const lastExtendedSlot = view.getBigUint64(12, true);
  const lastExtendedSlotStartIndex = data[20];
  if (data[21] !== 0 && data[21] !== 1) fail(`Address lookup table ${address} has an invalid authority option`);
  const count = (data.length - META_SIZE) / ADDRESS_SIZE;
  if (count > MAX_ADDRESSES || lastExtendedSlotStartIndex > count) {
    fail(`Address lookup table ${address} exceeds the canonical address bounds`);
  }
  const addresses = [];
  for (let offset = META_SIZE; offset < data.length; offset += ADDRESS_SIZE) {
    addresses.push(encodeBase58(data.subarray(offset, offset + ADDRESS_SIZE)));
  }
  return { deactivationSlot, lastExtendedSlot, lastExtendedSlotStartIndex, addresses };
}

/**
 * Resolve v0 address table lookups from finalized RPC account data.
 * The caller must supply a trusted RPC fetcher and a finalized current slot.
 * Deactivated tables are rejected conservatively, including cooldown-window tables.
 */
export async function resolveAddressLookupTables({ lookups, fetchAccount, currentSlot }) {
  if (!Array.isArray(lookups)) fail("Address lookup table references must be an array");
  if (typeof fetchAccount !== "function") fail("A trusted address lookup table account fetcher is required");
  if (!Number.isSafeInteger(currentSlot) || currentSlot < 0) fail("A finalized current slot is required");
  if (lookups.length > 32) fail("Too many address lookup tables");
  const writable = [], readonly = [], resolved = [];
  const seenTables = new Set();

  for (const lookup of lookups) {
    const address = lookup?.accountKey;
    if (typeof address !== "string" || address.length < 32 || address.length > 44 || seenTables.has(address)) {
      fail("Invalid or duplicate address lookup table account key");
    }
    seenTables.add(address);
    const writableIndexes = lookup.writableIndexes, readonlyIndexes = lookup.readonlyIndexes;
    if (!Array.isArray(writableIndexes) || !Array.isArray(readonlyIndexes) ||
        writableIndexes.length + readonlyIndexes.length === 0 ||
        writableIndexes.length + readonlyIndexes.length > MAX_ADDRESSES ||
        [...writableIndexes, ...readonlyIndexes].some(index => !Number.isInteger(index) || index < 0 || index > 255)) {
      fail(`Address lookup table ${address} has invalid index lists`);
    }
    if (new Set(writableIndexes).size !== writableIndexes.length ||
        new Set(readonlyIndexes).size !== readonlyIndexes.length ||
        writableIndexes.some(index => readonlyIndexes.includes(index))) {
      fail(`Address lookup table ${address} contains duplicate loaded indexes`);
    }
    const table = decodeLookupTable(await fetchAccount(address), address);
    if (table.deactivationSlot !== ACTIVE_DEACTIVATION_SLOT) fail(`Address lookup table ${address} is deactivated or pending deactivation`);
    if (table.lastExtendedSlot > BigInt(currentSlot)) fail(`Address lookup table ${address} has a future extension slot`);
    const resolveIndexes = indexes => indexes.map(index => {
      if (index >= table.addresses.length) fail(`Address lookup table ${address} index ${index} is out of range`);
      if (BigInt(currentSlot) === table.lastExtendedSlot && index >= table.lastExtendedSlotStartIndex) {
        fail(`Address lookup table ${address} index ${index} was extended in the current slot and is not yet usable`);
      }
      return table.addresses[index];
    });
    const tableWritable = resolveIndexes(writableIndexes), tableReadonly = resolveIndexes(readonlyIndexes);
    writable.push(...tableWritable); readonly.push(...tableReadonly);
    resolved.push({ accountKey: address, writable: tableWritable, readonly: tableReadonly });
  }
  return { writable, readonly, all: [...writable, ...readonly], tables: resolved };
}

export const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = ALT_PROGRAM_ID;
