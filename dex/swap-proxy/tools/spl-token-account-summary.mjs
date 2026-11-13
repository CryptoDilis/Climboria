const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(buffer) {
  let number = BigInt(`0x${buffer.toString("hex") || "0"}`);
  let encoded = "";
  while (number > 0n) {
    const remainder = Number(number % 58n);
    encoded = BASE58[remainder] + encoded;
    number /= 58n;
  }
  let zeroes = 0;
  while (zeroes < buffer.length && buffer[zeroes] === 0) zeroes += 1;
  return "1".repeat(zeroes) + encoded;
}

function readOptionTag(bytes, offset, label) {
  const tag = bytes.readUInt32LE(offset);
  if (tag !== 0 && tag !== 1) {
    throw new Error(`Invalid SPL Token ${label} COption tag: ${tag}`);
  }
  return tag;
}

export function decodeSplTokenAccountSummary(accountData) {
  const bytes = Buffer.isBuffer(accountData) ? accountData : Buffer.from(accountData);
  if (bytes.length !== 165) return null;

  const delegateOption = readOptionTag(bytes, 72, "delegate");
  const isNativeOption = readOptionTag(bytes, 109, "is_native");
  const closeAuthorityOption = readOptionTag(bytes, 129, "close_authority");
  const state = bytes[108];
  if (![0, 1, 2].includes(state)) {
    throw new Error(`Invalid SPL Token account state: ${state}`);
  }

  return {
    mint: encodeBase58(bytes.subarray(0, 32)),
    tokenAuthority: encodeBase58(bytes.subarray(32, 64)),
    amount: bytes.readBigUInt64LE(64).toString(),
    delegate: delegateOption === 1 ? encodeBase58(bytes.subarray(76, 108)) : null,
    state: ["uninitialized", "initialized", "frozen"][state],
    isNative: isNativeOption === 1 ? bytes.readBigUInt64LE(113).toString() : null,
    delegatedAmount: bytes.readBigUInt64LE(121).toString(),
    closeAuthority: closeAuthorityOption === 1 ? encodeBase58(bytes.subarray(133, 165)) : null,
  };
}
