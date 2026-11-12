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
  let transportFailures = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "climboria-meteora-discovery", method, params }),
        signal: AbortSignal.timeout(15000)
      });
    } catch (cause) {
      const transientTransportFailure = cause?.name === "TimeoutError"
        || cause?.name === "AbortError"
        || cause?.name === "TypeError";
      if (!transientTransportFailure) throw cause;
      transportFailures += 1;
      if (transportFailures >= 3) {
        const error = new Error("Solana RPC transport failure for " + method + " after " + transportFailures + " attempts: " + cause.message);
        error.retryable = true;
        error.method = method;
        error.cause = cause;
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryBaseMs * (2 ** (transportFailures - 1))));
      continue;
    }
    if (response.status === 429 && attempt < 4) {
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
  const error = new Error("Solana RPC rate limit persisted for " + method);
  error.status = 429;
  error.method = method;
  throw error;
}

export async function discoverRecentJupiterMeteoraRoutes(rpcUrl, options = {}) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//i.test(rpcUrl)) {
    throw new Error("Set JUPITER_AUDIT_RPC_URL to an HTTPS Solana RPC endpoint");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number.isInteger(options.limit) ? Math.max(1, Math.min(options.limit, 50)) : 25;
  const maxTransactions = Number.isInteger(options.maxTransactions)
    ? Math.max(1, Math.min(options.maxTransactions, 250))
    : 25;
  const maxMatches = Number.isInteger(options.maxMatches) ? Math.max(1, Math.min(options.maxMatches, 20)) : 3;
  const delayMs = Number.isInteger(options.delayMs) ? Math.max(0, options.delayMs) : 1000;
  const retryBaseMs = Number.isInteger(options.retryBaseMs) ? Math.max(0, options.retryBaseMs) : 1500;
  const initialBefore = typeof options.before === "string" && options.before.trim()
    ? options.before.trim()
    : null;

  const results = [];
  let cursor = initialBefore;
  let lastScannedSignature = null;
  let signaturesReturned = 0;
  let transactionsScanned = 0;
  let pagesScanned = 0;
  let rateLimited = false;
  let rateLimitedMethod = null;
  let rpcFailureMethod = null;
  let rpcFailureMessage = null;
  let reachedEnd = false;
  const unavailableSignatures = [];

  while (transactionsScanned < maxTransactions && results.length < maxMatches && !rateLimited && !rpcFailureMethod && unavailableSignatures.length === 0) {
    const pageLimit = Math.min(limit, maxTransactions - transactionsScanned);
    const signatureQuery = { commitment: "finalized", limit: pageLimit };
    if (cursor) signatureQuery.before = cursor;

    let signatures;
    try {
      signatures = await rpcCall(rpcUrl, "getSignaturesForAddress", [
        METEORA_DLMM_PROGRAM_ID,
        signatureQuery
      ], fetchImpl, retryBaseMs);
    } catch (error) {
      if (error.status === 429) {
        rateLimited = true;
        rateLimitedMethod = error.method ?? "getSignaturesForAddress";
      } else if (error.retryable) {
        rpcFailureMethod = error.method ?? "getSignaturesForAddress";
        rpcFailureMessage = error.message;
      } else {
        throw error;
      }
      break;
    }
    if (!Array.isArray(signatures)) throw new Error("Solana RPC returned an invalid signature list");
    pagesScanned += 1;
    signaturesReturned += signatures.length;
    if (signatures.length === 0) {
      reachedEnd = true;
      break;
    }

    let pageScanned = 0;
    for (const entry of signatures) {
      if (typeof entry?.signature !== "string" || !entry.signature.trim()) continue;
      let transaction;
      try {
        transaction = await rpcCall(rpcUrl, "getTransaction", [
          entry.signature,
          { commitment: "finalized", encoding: "json", maxSupportedTransactionVersion: 1 }
        ], fetchImpl, retryBaseMs);
      } catch (error) {
        if (error.status === 429) {
          rateLimited = true;
          rateLimitedMethod = error.method ?? "getTransaction";
        } else if (error.retryable) {
          rpcFailureMethod = error.method ?? "getTransaction";
          rpcFailureMessage = error.message;
        } else {
          throw error;
        }
        break;
      }

      if (!transaction) {
        // Stop before advancing beyond an unavailable/pruned transaction. The
        // continuation cursor remains the last fully fetched signature so a
        // resumed scan will request this signature again.
        unavailableSignatures.push(entry.signature);
        break;
      }

      transactionsScanned += 1;
      pageScanned += 1;
      lastScannedSignature = entry.signature;
      {
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
              orderedAccountIndexes: ix.accounts.map((account) => account.index),
              orderedAccounts: ix.accounts.map((account) => account.address),
              outerAccountCount: route.outerAccounts.length,
              accountParentPositions: ix.accounts.map((account) => account.outerInstructionPositionsForSameTransactionKey),
              parentAccountSequenceMatch: ix.orderedParentAccountSequenceMatch
            }))
          });
          if (results.length >= maxMatches) break;
        }
      }
      if (transactionsScanned >= maxTransactions || results.length >= maxMatches) break;
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (rateLimited || rpcFailureMethod || unavailableSignatures.length > 0 || transactionsScanned >= maxTransactions || results.length >= maxMatches) break;
    if (pageScanned === 0) {
      reachedEnd = true;
      break;
    }
    cursor = lastScannedSignature;
    if (signatures.length < pageLimit) {
      reachedEnd = true;
      break;
    }
  }

  return {
    searchedProgramId: METEORA_DLMM_PROGRAM_ID,
    jupiterProgramId: JUPITER_V6_PROGRAM_ID,
    commitment: "finalized",
    before: initialBefore,
    nextBefore: lastScannedSignature ?? initialBefore,
    signatureLimit: limit,
    maxTransactions,
    pagesScanned,
    signaturesReturned,
    transactionsScanned,
    matchingRoutes: results.filter((result) => result.routePlanHeaderRecognized).length,
    matchingJupiterMeteoraInstructions: results.length,
    rateLimited,
    rateLimitedMethod,
    rpcFailureMethod,
    rpcFailureMessage,
    unavailableSignatures,
    transactionFetchComplete: !rateLimited && !rpcFailureMethod && unavailableSignatures.length === 0,
    reachedEnd,
    results,
    evidenceLimitations: [
      "This bounded sample is not an exhaustive scan of Jupiter/Meteora routes.",
      "A rate-limited page is incomplete; its unscanned signatures must be retried from nextBefore.",
      "A transport timeout/network failure is retried a bounded number of times; if exhausted, the report is incomplete and nextBefore remains the last fully fetched signature.",
      "A null getTransaction result is unavailable/pruned evidence, not a route-free transaction; the scan stops before it and preserves the last fully fetched continuation cursor.",
      "Route-plan variant and inner Swap2 CPI association is observational for each returned transaction.",
      "The report does not expose CPI-requested signer/writable AccountMeta flags.",
      "Parent account sequence correlation and duplicate parent positions are observational only; they do not prove which runtime handler cursor consumed the accounts.",
      "Do not generalize account cursor behavior from a bounded sample."
    ]
  };
}

async function main() {
  const rpcUrl = process.env.JUPITER_AUDIT_RPC_URL;
  const integerEnv = (name) => {
    const value = process.env[name];
    if (value == null || value.trim() === "") return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new Error(name + " must be a positive integer");
    return parsed;
  };
  const delayEnv = process.env.JUPITER_AUDIT_DELAY_MS;
  const delayMs = delayEnv == null || delayEnv.trim() === "" ? undefined : Number(delayEnv);
  if (delayMs !== undefined && (!Number.isInteger(delayMs) || delayMs < 0)) {
    throw new Error("JUPITER_AUDIT_DELAY_MS must be a non-negative integer");
  }
  const report = await discoverRecentJupiterMeteoraRoutes(rpcUrl, {
    before: process.env.JUPITER_AUDIT_BEFORE_SIGNATURE,
    limit: integerEnv("JUPITER_AUDIT_SIGNATURE_LIMIT"),
    maxTransactions: integerEnv("JUPITER_AUDIT_MAX_TRANSACTIONS"),
    retryBaseMs: integerEnv("JUPITER_AUDIT_RETRY_BASE_MS"),
    delayMs
  });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write("Jupiter/Meteora route discovery failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
