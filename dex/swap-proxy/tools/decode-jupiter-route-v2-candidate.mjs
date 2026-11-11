import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const EXPECTED_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const EXPECTED_ROUTE_V2_DISCRIMINATOR = "bb64facc31c4af14";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeBase58(value) {
  let number = 0n;
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error("Invalid base58 instruction data");
    number = number * 58n + BigInt(digit);
  }
  const bytes = [];
  while (number > 0n) {
    bytes.push(Number(number & 255n));
    number >>= 8n;
  }
  bytes.reverse();
  let leadingZeroes = 0;
  while (leadingZeroes < value.length && value[leadingZeroes] === "1") leadingZeroes += 1;
  return Buffer.from([...Array(leadingZeroes).fill(0), ...bytes]);
}

function readValue(type, buffer, offset, types, depth = 0) {
  if (depth > 32) throw new Error("IDL decode recursion limit exceeded");
  const readPrimitive = (name) => {
    const sizes = { u8: 1, bool: 1, u16: 2, u32: 4, u64: 8, i8: 1, i16: 2, i32: 4, i64: 8 };
    const size = sizes[name];
    if (!size || offset + size > buffer.length) throw new Error(`Invalid/truncated Borsh primitive ${name} at ${offset}`);
    const raw = buffer.subarray(offset, offset + size);
    offset += size;
    if (name === "bool") {
      if (raw[0] > 1) throw new Error(`Invalid Borsh bool ${raw[0]} at ${offset - 1}`);
      return Boolean(raw[0]);
    }
    if (name === "u64" || name === "i64") {
      return name === "u64" ? raw.readBigUInt64LE().toString() : raw.readBigInt64LE().toString();
    }
    if (name === "u32") return raw.readUInt32LE();
    if (name === "u16") return raw.readUInt16LE();
    if (name === "i32") return raw.readInt32LE();
    if (name === "i16") return raw.readInt16LE();
    if (name === "i8") return raw.readInt8();
    return raw.readUInt8();
  };

  if (typeof type === "string") return [readPrimitive(type), offset];
  if (type.option) {
    const [tag, next] = readValue("u8", buffer, offset, types, depth + 1);
    if (tag === 0) return [null, next];
    if (tag !== 1) throw new Error(`Invalid Borsh option tag ${tag} at ${offset}`);
    return readValue(type.option, buffer, next, types, depth + 1);
  }
  if (type.vec) {
    let [length, next] = readValue("u32", buffer, offset, types, depth + 1);
    if (length > 4096) throw new Error(`Unreasonable Borsh vector length ${length}`);
    const values = [];
    for (let index = 0; index < length; index += 1) {
      let value;
      [value, next] = readValue(type.vec, buffer, next, types, depth + 1);
      values.push(value);
    }
    return [values, next];
  }
  if (type.defined?.name) {
    const name = type.defined.name;
    const definition = types.get(name);
    if (!definition) throw new Error(`IDL type definition missing: ${name}`);
    if (definition.kind === "struct") {
      const value = {};
      for (const field of definition.fields ?? []) {
        [value[field.name], offset] = readValue(field.type, buffer, offset, types, depth + 1);
      }
      return [value, offset];
    }
    if (definition.kind === "enum") {
      const [variantIndex, next] = readValue("u8", buffer, offset, types, depth + 1);
      const variant = definition.variants?.[variantIndex];
      if (!variant) throw new Error(`IDL enum ${name} has no variant ${variantIndex}`);
      offset = next;
      const fields = {};
      for (const field of variant.fields ?? []) {
        [fields[field.name], offset] = readValue(field.type, buffer, offset, types, depth + 1);
      }
      return [{ variant_index: variantIndex, variant: variant.name, fields }, offset];
    }
    throw new Error(`Unsupported IDL type kind ${definition.kind} for ${name}`);
  }
  throw new Error(`Unsupported Borsh type: ${JSON.stringify(type)}`);
}

function findActiveIdl(history, candidateSlot, expectedProgramId) {
  if (history.programId !== expectedProgramId) throw new Error("IDL history program ID mismatch");
  const slot = BigInt(candidateSlot);
  const candidates = (history.anchor ?? []).filter((record) => {
    if (record.type !== "anchor" || typeof record.content !== "string") return false;
    const start = BigInt(record.activeFrom?.slot ?? record.slot ?? 0);
    const endValue = record.activeTo?.slot ?? record.activeTo;
    const end = endValue && endValue !== "current" ? BigInt(endValue) : null;
    if (start > slot || (end !== null && slot >= end)) return false;
    let idl;
    try { idl = JSON.parse(record.content); } catch { return false; }
    const route = idl.instructions?.find((instruction) => instruction.name === "route_v2");
    return Array.isArray(route?.discriminator) &&
      Buffer.from(route.discriminator).toString("hex") === EXPECTED_ROUTE_V2_DISCRIMINATOR;
  });
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one active route_v2 IDL revision for slot ${candidateSlot}; found ${candidates.length}`);
  }
  return candidates[0];
}

export function decodeJupiterRouteV2({ trace, history, expectedProgramId = EXPECTED_PROGRAM_ID }) {
  const routeTrace = trace.jupiterRoutes?.find((item) => item.instructionDataBase58);
  if (!routeTrace) throw new Error("Trace does not contain a Jupiter instruction payload");
  const candidateSlot = trace.slot;
  const record = findActiveIdl(history, candidateSlot, expectedProgramId);
  const idl = JSON.parse(record.content);
  const routeInstruction = idl.instructions.find((instruction) => instruction.name === "route_v2");
  const buffer = decodeBase58(routeTrace.instructionDataBase58);
  const actualDiscriminator = buffer.subarray(0, 8).toString("hex");
  const expectedDiscriminator = Buffer.from(routeInstruction.discriminator).toString("hex");
  if (actualDiscriminator !== expectedDiscriminator) {
    throw new Error(`Instruction discriminator mismatch: ${actualDiscriminator} != ${expectedDiscriminator}`);
  }

  const types = new Map((idl.types ?? []).map((type) => [type.name, type.type]));
  let offset = 8;
  const args = {};
  for (const argument of routeInstruction.args ?? []) {
    [args[argument.name], offset] = readValue(argument.type, buffer, offset, types);
  }
  if (offset !== buffer.length) {
    throw new Error(`Unconsumed instruction bytes: decoded ${offset} of ${buffer.length}`);
  }

  const directCpis = (routeTrace.innerInstructions ?? [])
    .filter((instruction) => instruction.stackHeight === 2)
    .map((instruction) => ({
      innerIndex: instruction.innerIndex,
      programId: instruction.programId,
    }));

  return {
    programId: expectedProgramId,
    signature: trace.signature,
    transactionSlot: candidateSlot,
    idlSource: "Solana IDL Explorer Anchor history",
    idlMetadataAccount: history.anchorAddress ?? null,
    idlRevision: {
      type: record.type,
      version: record.version ?? idl.metadata?.version ?? null,
      slot: record.slot,
      time: record.time,
      activeFrom: record.activeFrom,
      activeTo: record.activeTo,
      contentSha256: sha256(record.content),
    },
    instruction: {
      name: routeInstruction.name,
      discriminator: actualDiscriminator,
      payloadBytes: buffer.length,
      args,
    },
    routeSteps: args.route_plan,
    observedDirectCpiProgramOrder: directCpis,
    interpretationLimit: "The decoded enum values are schema-grounded for this slot. Direct CPI order is transaction-specific correlation only; this report does not prove universal adapter dispatch, remaining-account slicing, or CPI-requested privileges.",
  };
}

async function main() {
  const [tracePath, historyPath] = process.argv.slice(2);
  if (!tracePath || !historyPath) {
    throw new Error("Usage: node decode-jupiter-route-v2-candidate.mjs <candidate-trace.json> <idl-history-response.json>");
  }
  const [traceText, historyText] = await Promise.all([
    readFile(tracePath, "utf8"),
    readFile(historyPath, "utf8"),
  ]);
  const report = decodeJupiterRouteV2({
    trace: JSON.parse(traceText),
    history: JSON.parse(historyText),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
