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

function parseCandidate(bytes, authorityOffset, lengthOffset, payloadOffset, layout) {
  if (bytes.length < payloadOffset) {
    throw new Error(`${layout}: account is too short (${bytes.length} bytes)`);
  }
  const declaredPayloadLength = bytes.readUInt32LE(lengthOffset);
  const payloadEnd = payloadOffset + declaredPayloadLength;
  if (declaredPayloadLength === 0 || payloadEnd > bytes.length) {
    throw new Error(
      `${layout}: declared payload length ${declaredPayloadLength} exceeds account data (${bytes.length} bytes)`
    );
  }

  const compressedPayload = bytes.subarray(payloadOffset, payloadEnd);
  const jsonBytes = inflateSync(compressedPayload);
  const jsonText = jsonBytes.toString("utf8");
  let idl;
  try {
    idl = JSON.parse(jsonText);
  } catch {
    throw new Error(`${layout}: decompressed payload is not valid JSON`);
  }
  if (!idl || typeof idl !== "object" || !Array.isArray(idl.instructions)) {
    throw new Error(`${layout}: payload does not contain an instructions array`);
  }

  const route = idl.instructions.find((instruction) => instruction.name === "route_v2");
  const routeV2Discriminator = Array.isArray(route?.discriminator)
    ? Buffer.from(route.discriminator).toString("hex")
    : null;
  const prefix = bytes.subarray(0, authorityOffset);

  return {
    layout,
    prefixHex: prefix.toString("hex"),
    prefixMatchesAnchorAccountDiscriminator: prefix.length === 8 &&
      prefix.equals(createHash("sha256").update("internal:IdlAccount").digest().subarray(0, 8)),
    authority: encodeBase58(bytes.subarray(authorityOffset, authorityOffset + 32)),
    declaredPayloadLength,
    compressedPayloadLength: compressedPayload.length,
    decompressedPayloadLength: jsonBytes.length,
    decompressedPayloadSha256: createHash("sha256").update(jsonText).digest("hex"),
    routeV2Discriminator,
    idl,
  };
}

export function decodeAnchorIdlAccount(accountData) {
  const bytes = Buffer.isBuffer(accountData) ? accountData : Buffer.from(accountData);
  if (bytes.length < 36) {
    throw new Error(`Anchor IDL account is too short: ${bytes.length} bytes`);
  }

  const attempts = [
    () => parseCandidate(
      bytes, 8, 40, 44,
      "8-byte prefix + authority[32] + data_len:u32le + zlib payload"
    ),
    () => parseCandidate(
      bytes, 0, 32, 36,
      "authority[32] + data_len:u32le + zlib payload"
    ),
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Unable to decode Anchor IDL account: ${errors.join(" | ")}`);
}

export const decodeLegacyAnchorIdlAccount = decodeAnchorIdlAccount;
