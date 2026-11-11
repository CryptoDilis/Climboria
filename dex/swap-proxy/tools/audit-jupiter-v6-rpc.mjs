import { pathToFileURL } from "node:url";

export const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error("Invalid Solana RPC response: " + label + " must be an array");
  return value;
}

function resolveIndex(index, addresses, label) {
  if (!Number.isInteger(index) || index < 0 || index >= addresses.length) {
    throw new Error("Invalid Solana RPC response: " + label + " index " + index + " is out of range");
  }
  return addresses[index];
}

function transactionPrivilege(index, header, staticKeyCount, loadedWritableCount) {
  if (index >= staticKeyCount) {
    return {
      signer: false,
      writable: index < staticKeyCount + loadedWritableCount,
      source: "address-lookup-table transaction message privilege (not the CPI-requested meta)",
    };
  }

  const required = header.numRequiredSignatures;
  const readonlySigned = header.numReadonlySignedAccounts;
  const readonlyUnsigned = header.numReadonlyUnsignedAccounts;
  if (![required, readonlySigned, readonlyUnsigned].every(Number.isInteger)
      || required < 0 || readonlySigned < 0 || readonlyUnsigned < 0
      || required > staticKeyCount || readonlySigned > required
      || readonlyUnsigned > staticKeyCount - required) {
    throw new Error("Invalid Solana RPC response: malformed message header");
  }

  const signer = index < required;
  const writable = signer
    ? index < required - readonlySigned
    : index < staticKeyCount - readonlyUnsigned;
  return {
    signer,
    writable,
    source: "outer transaction message privilege (not the CPI-requested meta)",
  };
}

function resolveInstruction(ix, accountKeys, header, staticKeyCount, loadedWritableCount, label) {
  const programId = resolveIndex(ix.programIdIndex, accountKeys, label + ".programIdIndex");
  const accountIndexes = requireArray(ix.accounts, label + ".accounts");
  const accounts = accountIndexes.map((index, position) => {
    const address = resolveIndex(index, accountKeys, label + ".accounts[" + position + "]");
    return {
      index,
      address,
      transactionPrivilege: transactionPrivilege(index, header, staticKeyCount, loadedWritableCount),
    };
  });
  return {
    programIdIndex: ix.programIdIndex,
    programId,
    dataBase58: typeof ix.data === "string" ? ix.data : null,
    accounts,
    stackHeight: Number.isInteger(ix.stackHeight) ? ix.stackHeight : null,
  };
}

function addOuterKeyOccurrences(innerInstruction, outerAccounts) {
  const positionsByTransactionKeyIndex = new Map();
  outerAccounts.forEach((account, position) => {
    const positions = positionsByTransactionKeyIndex.get(account.index) ?? [];
    positions.push(position);
    positionsByTransactionKeyIndex.set(account.index, positions);
  });

  const parentIndexes = outerAccounts.map((account) => account.index);
  const cpiIndexes = innerInstruction.accounts.map((account) => account.index);
  const exactContiguousPositions = [];
  for (let start = 0; start <= parentIndexes.length - cpiIndexes.length; start += 1) {
    if (cpiIndexes.every((index, offset) => parentIndexes[start + offset] === index)) {
      exactContiguousPositions.push(start);
    }
  }

  return {
    ...innerInstruction,
    accounts: innerInstruction.accounts.map((account) => ({
      ...account,
      // This lists every occurrence of the same transaction account-key index
      // in the parent instruction. It does NOT identify which occurrence a
      // deployed handler consumed while slicing remaining accounts.
      outerInstructionPositionsForSameTransactionKey:
        positionsByTransactionKeyIndex.get(account.index) ?? [],
    })),
    orderedParentAccountSequenceMatch: {
      exactContiguousPositions,
      status: exactContiguousPositions.length === 1
        ? "unique"
        : exactContiguousPositions.length > 1 ? "ambiguous" : "not-found",
      // Even a unique exact sequence is observational correlation, not proof
      // of the deployed handler's runtime remaining-account cursor.
    },
  };
}

/**
 * Build a read-only trace from a raw getTransaction response using encoding=json.
 *
 * Important: innerInstructions exposes account indexes, not the CPI's requested
 * signer/writable flags. The privilege values below are the maximum privileges
 * granted by the outer transaction message and MUST NOT be mistaken for the
 * inner CPI AccountMeta flags or a proof of Jupiter's remaining-account slicing.
 */
export function buildJupiterV6TraceReport(signature, rpcTransaction) {
  if (typeof signature !== "string" || !signature.trim()) {
    throw new Error("A transaction signature is required");
  }
  if (!rpcTransaction || typeof rpcTransaction !== "object") {
    throw new Error("Invalid Solana RPC response: transaction result is missing");
  }
  const message = rpcTransaction.transaction?.message;
  const meta = rpcTransaction.meta;
  if (!message || !meta) throw new Error("Invalid Solana RPC response: message or metadata is missing");

  const staticKeys = requireArray(message.accountKeys, "transaction.message.accountKeys")
    .map((key) => typeof key === "string" ? key : key?.pubkey);
  if (staticKeys.some((key) => typeof key !== "string")) {
    throw new Error("Invalid Solana RPC response: expected encoding=json static account keys");
  }
  const loaded = meta.loadedAddresses ?? { writable: [], readonly: [] };
  const loadedWritable = requireArray(loaded.writable ?? [], "meta.loadedAddresses.writable");
  const loadedReadonly = requireArray(loaded.readonly ?? [], "meta.loadedAddresses.readonly");
  const accountKeys = [...staticKeys, ...loadedWritable, ...loadedReadonly];
  const header = message.header;
  if (!header || typeof header !== "object") throw new Error("Invalid Solana RPC response: message.header is missing");

  const outerInstructions = requireArray(message.instructions, "transaction.message.instructions");
  const innerGroups = requireArray(meta.innerInstructions ?? [], "meta.innerInstructions");
  const jupiterRoutes = [];

  outerInstructions.forEach((outer, outerIndex) => {
    const programId = resolveIndex(outer.programIdIndex, accountKeys, "outer[" + outerIndex + "].programIdIndex");
    if (programId !== JUPITER_V6_PROGRAM_ID) return;
    const resolvedOuter = resolveInstruction(
      outer, accountKeys, header, staticKeys.length, loadedWritable.length, "outer[" + outerIndex + "]",
    );
    const group = innerGroups.find((entry) => entry.index === outerIndex);
    const innerInstructions = requireArray(group?.instructions ?? [], "innerInstructions[outer=" + outerIndex + "]");
    jupiterRoutes.push({
      outerIndex,
      instructionDataBase58: resolvedOuter.dataBase58,
      outerAccounts: resolvedOuter.accounts,
      innerInstructions: innerInstructions.map((ix, innerIndex) => addOuterKeyOccurrences({
        innerIndex,
        ...resolveInstruction(
          ix, accountKeys, header, staticKeys.length, loadedWritable.length,
          "inner[outer=" + outerIndex + ",index=" + innerIndex + "]",
        ),
      }, resolvedOuter.accounts)),
    });
  });

  return {
    signature,
    slot: rpcTransaction.slot ?? null,
    blockTime: rpcTransaction.blockTime ?? null,
    transactionVersion: rpcTransaction.version ?? "legacy-or-unspecified",
    transactionSucceeded: meta.err === null,
    transactionError: meta.err ?? null,
    outerInstructions: outerInstructions.map((instruction, outerIndex) => ({
      outerIndex,
      ...resolveInstruction(
        instruction, accountKeys, header, staticKeys.length, loadedWritable.length,
        "outer[" + outerIndex + "]",
      ),
    })),
    staticAccountKeyCount: staticKeys.length,
    loadedWritableAccountCount: loadedWritable.length,
    loadedReadonlyAccountCount: loadedReadonly.length,
    jupiterRoutes,
    logs: Array.isArray(meta.logMessages) ? meta.logMessages : [],
    preTokenBalances: Array.isArray(meta.preTokenBalances) ? meta.preTokenBalances : [],
    postTokenBalances: Array.isArray(meta.postTokenBalances) ? meta.postTokenBalances : [],
    evidenceLimitations: [
      "RPC innerInstructions provides ordered account indexes and optional stackHeight, but not each CPI AccountMeta's requested signer/writable flags.",
      "transactionPrivilege is the outer message's maximum privilege for an account, not the CPI's requested privilege.",
      "outerInstructionPositionsForSameTransactionKey lists duplicate parent-instruction occurrences for the same transaction account-key index; it does not identify a handler cursor position.",
      "orderedParentAccountSequenceMatch reports exact contiguous index-sequence correlation only; even a unique match does not prove which runtime handler cursor consumed the accounts.",
      "Do not infer routePlan-step-to-CPI association or Jupiter remaining-account slice boundaries from this report alone.",
      "A transaction trace is observational evidence for this transaction and slot; it does not establish deployed-program source/binary equivalence or universal adapter behavior.",
    ],
  };
}

export async function fetchJupiterV6Trace(signature, rpcUrl, fetchImpl = fetch) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//i.test(rpcUrl)) {
    throw new Error("Set JUPITER_AUDIT_RPC_URL to an HTTPS Solana RPC endpoint");
  }
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "climboria-jupiter-audit",
      method: "getTransaction",
      params: [signature, {
        commitment: "finalized",
        encoding: "json",
        maxSupportedTransactionVersion: 1,
      }],
    }),
  });
  if (!response.ok) throw new Error("Solana RPC HTTP error: " + response.status);
  const payload = await response.json();
  if (payload.error) throw new Error("Solana RPC error: " + JSON.stringify(payload.error));
  if (!payload.result) throw new Error("Solana RPC returned no transaction at finalized commitment");
  return buildJupiterV6TraceReport(signature, payload.result);
}

async function main() {
  const signature = process.argv[2];
  if (!signature) throw new Error("Usage: JUPITER_AUDIT_RPC_URL=https://... node dex/swap-proxy/tools/audit-jupiter-v6-rpc.mjs <signature>");
  const report = await fetchJupiterV6Trace(signature, process.env.JUPITER_AUDIT_RPC_URL);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write("Jupiter CPI trace failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}
