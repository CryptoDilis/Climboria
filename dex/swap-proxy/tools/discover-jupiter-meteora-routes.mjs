import { pathToFileURL } from "node:url";
import {
  buildJupiterV6TraceReport,
  JUPITER_V6_PROGRAM_ID
} from "./audit-jupiter-v6-rpc.mjs";
import { METEORA_DLMM_PROGRAM_ID } from "./audit-meteora-bin-array.mjs";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const JUPITER_ROUTE_DISCRIMINATOR = "e517cb977ae3ad2a";
const JUPITER_ROUTE_V2_DISCRIMINATOR = "bb64facc31c4af14";
const METEORA_SWAP2_DISCRIMINATOR = "414b3f4ceb5b5b88";

export function decodeBase58(value) {
  if (typeof value !== "string" || value.length === 0) return new Uint8Array();
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) throw new Error("Invalid base58 instruction data");
    number = number * 58n + BigInt(digit);
  }
  const bytes = [];
  while (number > 0n) {
    bytes.push(Number(number & 255n));
    number >>= 8n;
  }
  bytes.reverse();
  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === "1") leadingZeros += 1;
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

export function decodeJupiterRoutePlanHeader(dataBase58) {
  const bytes = decodeBase58(dataBase58);
  if (bytes.length < 13) return null;
  const discriminatorHex = Buffer.from(bytes.subarray(0, 8)).toString("hex");
  const layout = discriminatorHex === JUPITER_ROUTE_DISCRIMINATOR
    ? { instructionName: "route", routePlanOffset: 8 }
    : discriminatorHex === JUPITER_ROUTE_V2_DISCRIMINATOR
      ? { instructionName: "route_v2", routePlanOffset: 30 }
      : null;
  if (!layout || bytes.length < layout.routePlanOffset + 5) return null;
  const routePlanCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getUint32(layout.routePlanOffset, true);
  return {
    instructionName: layout.instructionName,
    discriminatorHex,
    routePlanCount,
    firstStepVariant: bytes[layout.routePlanOffset + 4]
  };
}

export function isMeteoraSwap2Instruction(dataBase58) {
  const bytes = decodeBase58(dataBase58);
  return bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).toString("hex") === METEORA_SWAP2_DISCRIMINATOR;
}

async function rpcCall(rpcUrl, method, params, fetchImpl, retryBaseMs = 1000) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-meteora-discovery", method, params }),
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, retryBaseMs * (2 ** attempt)));
      continue;
    }
    if (!response.ok) {
      const error = new Error("Solana RPC HTTP error for " + method + ": " + response.status);
      error.status = response.status;
      error.method = method;
      throw error;
    }
    const payload = await response.json();
    if (payload.error) throw new Error("Solana RPC " + method + " error: " + JSON.stringify(payload.error));
    return payload.result;
  }
  throw new Error("Solana RPC rate limit persisted for " + method);
}

export async function discoverRecentJupiterMeteoraRoutes(rpcUrl, options = {}) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//i.test(rpcUrl)) {
    throw new Error("Set JUPITER_AUDIT_RPC_URL to an HTTPS Solana RPC endpoint");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number.isInteger(options.limit) ? Math.max(1, Math.min(options.limit, 50)) : 5;
  const maxTransactions = Number.isInteger(options.maxTransactions)
    ? Math.max(1, Math.min(options.maxTransactions, limit))
    : limit;
  const maxMatches = Number.isInteger(options.maxMatches) ? Math.max(1, options.maxMatches) : 3;
  const delayMs = Number.isInteger(options.delayMs) ? Math.max(0, options.delayMs) : 1000;
  const retryBaseMs = Number.isInteger(options.retryBaseMs) ? Math.max(0, options.retryBaseMs) : 1000;
  const before = typeof options.before === "string" && options.before.trim()
    ? options.before.trim()
    : null;

  let signatures;
  try {
    const signatureQuery = { commitment: "finalized", limit };
    if (before) signatureQuery.before = before;
    signatures = await rpcCall(rpcUrl, "getSignaturesForAddress", [
      METEORA_DLMM_PROGRAM_ID,
      signatureQuery
    ], fetchImpl, retryBaseMs);
  } catch (error) {
    if (error.status !== 429) throw error;
    return {
      searchedProgramId: METEORA_DLMM_PROGRAM_ID,
      jupiterProgramId: JUPITER_V6_PROGRAM_ID,
      commitment: "finalized",
      before,
      signaturesReturned: 0,
      transactionsScanned: 0,
      matchingRoutes: 0,
      matchingJupiterMeteoraInstructions: 0,
      rateLimited: true,
      rateLimitedMethod: error.method,
      results: [],
      evidenceLimitations: ["The public RPC rate-limited signature discovery; no route-level conclusion can be drawn from this empty sample."]
    };
  }
  if (!Array.isArray(signatures)) throw new Error("Solana RPC returned an invalid signature list");

  const results = [];
  let transactionsScanned = 0;
  let rateLimited = false;
  let rateLimitedMethod = null;
  for (const entry of signatures.slice(0, maxTransactions)) {
    if (typeof entry?.signature !== "string") continue;
    let transaction;
    try {
      transaction = await rpcCall(rpcUrl, "getTransaction", [
        entry.signature,
        { commitment: "finalized", encoding: "json", maxSupportedTransactionVersion: 1 }
      ], fetchImpl, retryBaseMs);
      transactionsScanned += 1;
    } catch (error) {
      if (error.status !== 429) throw error;
      rateLimited = true;
      rateLimitedMethod = error.method;
      break;
    }
    if (transaction) {
      const report = buildJupiterV6TraceReport(entry.signature, transaction);
      for (const route of report.jupiterRoutes) {
        const routeHeader = decodeJupiterRoutePlanHeader(route.instructionDataBase58);
        const swap2Cpis = route.innerInstructions.filter((ix) =>
          ix.programId === METEORA_DLMM_PROGRAM_ID && isMeteoraSwap2Instruction(ix.dataBase58)
        );
        if (swap2Cpis.length === 0) continue;
        const instructionBytes = decodeBase58(route.instructionDataBase58);
        results.push({
          signature: report.signature,
          slot: report.slot,
          outerInstructionIndex: route.outerIndex,
          instructionDataBase58: route.instructionDataBase58,
          instructionDiscriminatorHex: Buffer.from(instructionBytes.subarray(0, 8)).toString("hex"),
          routePlanHeader: routeHeader,
          routePlanHeaderRecognized: routeHeader !== null,
          transactionSucceeded: report.transactionSucceeded,
          meteoraSwap2Cpis: swap2Cpis.map((ix) => ({
            innerIndex: ix.innerIndex,
            stackHeight: ix.stackHeight,
            accountCount: ix.accounts.length,
            orderedAccounts: ix.accounts.map((account) => account.address)
          }))
        });
        if (results.length >= maxMatches) break;
      }
    }
    if (results.length >= maxMatches || rateLimited) break;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return {
    searchedProgramId: METEORA_DLMM_PROGRAM_ID,
    jupiterProgramId: JUPITER_V6_PROGRAM_ID,
    commitment: "finalized",
    before,
    signaturesReturned: signatures.length,
    transactionsScanned,
    matchingRoutes: results.filter((result) => result.routePlanHeaderRecognized).length,
    matchingJupiterMeteoraInstructions: results.length,
    rateLimited,
    rateLimitedMethod,
    results,
    evidenceLimitations: [
      "This bounded sample is not an exhaustive scan of Jupiter/Meteora routes.",
      "Route-plan variant and inner Swap2 CPI association is observational for each returned transaction.",
      "The report does not expose CPI-requested signer/writable AccountMeta flags.",
      "Do not generalize account cursor behavior from a small recent sample."
    ]
  };
}

async function main() {
  const rpcUrl = process.env.JUPITER_AUDIT_RPC_URL;
  const report = await discoverRecentJupiterMeteoraRoutes(rpcUrl, {
    before: process.env.JUPITER_AUDIT_BEFORE_SIGNATURE
  });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write("Jupiter/Meteora route discovery failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
