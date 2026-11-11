import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(buffer) {
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

export function decodeLegacyAnchorIdlAccount(accountData) {
  const bytes = Buffer.isBuffer(accountData) ? accountData : Buffer.from(accountData);
  if (bytes.length < 36) {
    throw new Error(`Legacy Anchor IDL account is too short: ${bytes.length} bytes`);
  }

  // Legacy Anchor IdlAccount layout is authority:Pubkey (32 bytes),
  // data_len:u32 LE, then zlib-compressed IDL bytes. It has no
  // Anchor account discriminator prefix.
  const authorityBytes = bytes.subarray(0, 32);
  const declaredPayloadLength = bytes.readUInt32LE(32);
  const payloadStart = 36;
  const payloadEnd = payloadStart + declaredPayloadLength;
  if (declaredPayloadLength === 0 || payloadEnd > bytes.length) {
    throw new Error(
      `Legacy Anchor IDL payload length ${declaredPayloadLength} exceeds account data (${bytes.length} bytes)`
    );
  }

  const compressedPayload = bytes.subarray(payloadStart, payloadEnd);
  const jsonBytes = inflateSync(compressedPayload);
  const jsonText = jsonBytes.toString("utf8");
  let idl;
  try {
    idl = JSON.parse(jsonText);
  } catch {
    throw new Error("Legacy Anchor IDL payload is not valid JSON");
  }
  if (!idl || typeof idl !== "object" || !Array.isArray(idl.instructions)) {
    throw new Error("Legacy Anchor IDL payload does not contain an instructions array");
  }

  const route = idl.instructions.find((instruction) => instruction.name === "route_v2");
  const routeV2Discriminator = Array.isArray(route?.discriminator)
    ? Buffer.from(route.discriminator).toString("hex")
    : null;

  return {
    layout: "legacy Anchor IdlAccount: authority[32] + data_len:u32le + zlib payload",
    authority: encodeBase58(authorityBytes),
    declaredPayloadLength,
    compressedPayloadLength: compressedPayload.length,
    decompressedPayloadLength: jsonBytes.length,
    decompressedPayloadSha256: createHash("sha256").update(jsonText).digest("hex"),
    routeV2Discriminator,
    idl,
  };
}
