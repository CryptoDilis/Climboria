import test from "node:test";
import assert from "node:assert/strict";
import { discoverRecentJupiterMeteoraRoutes } from "../tools/discover-jupiter-meteora-routes.mjs";
import { METEORA_DLMM_PROGRAM_ID } from "../tools/audit-meteora-bin-array.mjs";

function rpcResponse(result, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ result }),
  };
}

function emptyTransaction() {
  return {
    slot: 123,
    transaction: {
      message: {
        accountKeys: ["11111111111111111111111111111111"],
        header: {
          numRequiredSignatures: 0,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 1,
        },
        instructions: [],
      },
    },
    meta: {
      err: null,
      loadedAddresses: { writable: [], readonly: [] },
      innerInstructions: [],
    },
  };
}

test("scans multiple finalized signature pages and returns the exact continuation cursor", async () => {
  const signatureQueries = [];
  const fetchedTransactions = [];
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      assert.equal(body.params[0], METEORA_DLMM_PROGRAM_ID);
      signatureQueries.push(body.params[1]);
      if (signatureQueries.length === 1) {
        return rpcResponse([{ signature: "sig-3" }, { signature: "sig-2" }]);
      }
      return rpcResponse([{ signature: "sig-1" }]);
    }
    if (body.method === "getTransaction") {
      fetchedTransactions.push(body.params[0]);
      return rpcResponse(emptyTransaction());
    }
    throw new Error("Unexpected RPC method: " + body.method);
  };

  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    before: "initial-cursor",
    limit: 2,
    maxTransactions: 3,
    delayMs: 0,
    fetchImpl,
  });

  assert.equal(report.before, "initial-cursor");
  assert.equal(report.signatureLimit, 2);
  assert.equal(report.pagesScanned, 2);
  assert.equal(report.signaturesReturned, 3);
  assert.equal(report.transactionsScanned, 3);
  assert.equal(report.nextBefore, "sig-1");
  assert.equal(report.rateLimited, false);
  assert.equal(report.reachedEnd, false);
  assert.deepEqual(fetchedTransactions, ["sig-3", "sig-2", "sig-1"]);
  assert.deepEqual(signatureQueries, [
    { commitment: "finalized", limit: 2, before: "initial-cursor" },
    { commitment: "finalized", limit: 1, before: "sig-2" },
  ]);
});

test("retries transient finalized RPC 429 responses before continuing the scan", async () => {
  let signatureCalls = 0;
  let transactionCalls = 0;
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      signatureCalls += 1;
      if (signatureCalls < 3) return rpcResponse(null, 429);
      return rpcResponse([{ signature: "sig-recovered" }]);
    }
    if (body.method === "getTransaction") {
      transactionCalls += 1;
      return rpcResponse(emptyTransaction());
    }
    throw new Error("Unexpected RPC method: " + body.method);
  };

  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 1,
    maxTransactions: 1,
    delayMs: 0,
    retryBaseMs: 0,
    fetchImpl,
  });

  assert.equal(signatureCalls, 3);
  assert.equal(transactionCalls, 1);
  assert.equal(report.rateLimited, false);
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-recovered");
});

test("reports a persistent signature-page 429 as incomplete and preserves retry metadata", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return rpcResponse(null, 429);
  };

  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 2,
    maxTransactions: 2,
    delayMs: 0,
    retryBaseMs: 0,
    fetchImpl,
  });

  assert.equal(calls, 5);
  assert.equal(report.rateLimited, true);
  assert.equal(report.rateLimitedMethod, "getSignaturesForAddress");
  assert.equal(report.pagesScanned, 0);
  assert.equal(report.transactionsScanned, 0);
  assert.equal(report.nextBefore, null);
  assert.equal(report.reachedEnd, false);
});

test("preserves the last fully scanned signature when a transaction page is rate-limited", async () => {
  const fetchedTransactions = [];
  let transaction429Calls = 0;
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      return rpcResponse([{ signature: "sig-2" }, { signature: "sig-1" }]);
    }
    if (body.method === "getTransaction") {
      const signature = body.params[0];
      fetchedTransactions.push(signature);
      if (signature === "sig-1") {
        transaction429Calls += 1;
        return rpcResponse(null, 429);
      }
      return rpcResponse(emptyTransaction());
    }
    throw new Error("Unexpected RPC method: " + body.method);
  };

  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 2,
    maxTransactions: 2,
    delayMs: 0,
    retryBaseMs: 0,
    fetchImpl,
  });

  assert.equal(transaction429Calls, 5);
  assert.equal(report.rateLimited, true);
  assert.equal(report.rateLimitedMethod, "getTransaction");
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-2");
  assert.deepEqual(fetchedTransactions, ["sig-2", "sig-1", "sig-1", "sig-1", "sig-1", "sig-1"]);
});



test("retries a transient RPC transport timeout and resumes discovery", async () => {
  let signatureCalls = 0;
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      signatureCalls += 1;
      if (signatureCalls === 1) {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      }
      return rpcResponse([{ signature: "sig-after-timeout" }]);
    }
    if (body.method === "getTransaction") return rpcResponse(emptyTransaction());
    throw new Error("Unexpected RPC method: " + body.method);
  };
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 1, maxTransactions: 1, delayMs: 0, retryBaseMs: 0, fetchImpl,
  });
  assert.equal(signatureCalls, 2);
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-after-timeout");
  assert.equal(report.rpcFailureMethod, null);
  assert.equal(report.transactionFetchComplete, true);
});


test("retries a transient fetch network TypeError before continuing the finalized scan", async () => {
  let signatureCalls = 0;
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      signatureCalls += 1;
      if (signatureCalls === 1) throw new TypeError("fetch failed");
      return rpcResponse([{ signature: "sig-after-network-error" }]);
    }
    if (body.method === "getTransaction") return rpcResponse(emptyTransaction());
    throw new Error("Unexpected RPC method: " + body.method);
  };
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 1, maxTransactions: 1, delayMs: 0, retryBaseMs: 0, fetchImpl,
  });
  assert.equal(signatureCalls, 2);
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-after-network-error");
  assert.equal(report.rpcFailureMethod, null);
  assert.equal(report.transactionFetchComplete, true);
});

test("returns an incomplete report and preserves the last fetched cursor after exhausted transaction timeouts", async () => {
  const requested = [];
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      return rpcResponse([{ signature: "sig-2" }, { signature: "sig-1" }]);
    }
    if (body.method === "getTransaction") {
      requested.push(body.params[0]);
      if (body.params[0] === "sig-1") {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      }
      return rpcResponse(emptyTransaction());
    }
    throw new Error("Unexpected RPC method: " + body.method);
  };
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 2, maxTransactions: 2, delayMs: 0, retryBaseMs: 0, fetchImpl,
  });
  assert.deepEqual(requested, ["sig-2", "sig-1", "sig-1", "sig-1"]);
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-2");
  assert.equal(report.rpcFailureMethod, "getTransaction");
  assert.match(report.rpcFailureMessage, /transport failure.*getTransaction/i);
  assert.equal(report.transactionFetchComplete, false);
  assert.equal(report.reachedEnd, false);
});

test("returns an incomplete report with the incoming cursor after exhausted signature-page timeouts", async () => {
  let calls = 0;
  const incomingCursor = "resume-from-this-signature";
  const fetchImpl = async () => {
    calls += 1;
    const error = new Error("The operation was aborted due to timeout");
    error.name = "TimeoutError";
    throw error;
  };
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    before: incomingCursor, limit: 1, maxTransactions: 1, delayMs: 0, retryBaseMs: 0, fetchImpl,
  });
  assert.equal(calls, 3);
  assert.equal(report.pagesScanned, 0);
  assert.equal(report.transactionsScanned, 0);
  assert.equal(report.nextBefore, incomingCursor);
  assert.equal(report.rpcFailureMethod, "getSignaturesForAddress");
  assert.equal(report.transactionFetchComplete, false);
  assert.equal(report.reachedEnd, false);
});

test("preserves the 18-account Meteora CPI order and parent-sequence correlation", async () => {
  const cpiIndexes = [7, 9, 21, 13, 16, 18, 47, 39, 25, 45, 0, 51, 50, 46, 37, 45, 6, 22];
  const keys = Array.from({ length: 54 }, (_, index) => "Account" + index);
  keys[52] = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
  keys[53] = METEORA_DLMM_PROGRAM_ID;
  const outerIndexes = [...Array.from({ length: 44 }, (_, index) => index), ...cpiIndexes, 1, 2];
  const transaction = {
    slot: 468153382,
    version: 1,
    transaction: {
      message: {
        accountKeys: keys,
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 53,
        },
        instructions: [{
          programIdIndex: 52,
          accounts: outerIndexes,
          data: "2sDES9fHqoTppYzwZFtuwMPsJL1uwAj7C1WKpRv22o7xwLdcxsAo7oWEePwUpZ5eNY93NaNUqWmSkoDTyArfz1JtB2NYgMy",
        }],
      },
    },
    meta: {
      err: null,
      loadedAddresses: { writable: [], readonly: [] },
      innerInstructions: [{
        index: 0,
        instructions: [{
          programIdIndex: 53,
          accounts: cpiIndexes,
          data: "fx9RHbGFfZ7Sw9c4BaQiLdbuZhcv5hAgYh5vbR",
          stackHeight: 2,
        }],
      }],
    },
  };
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    if (body.method === "getSignaturesForAddress") {
      return rpcResponse([{ signature: "candidate-route-signature" }]);
    }
    if (body.method === "getTransaction") return rpcResponse(transaction);
    throw new Error("Unexpected RPC method: " + body.method);
  };

  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 1,
    maxTransactions: 1,
    delayMs: 0,
    fetchImpl,
  });

  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.matchingRoutes, 1);
  assert.equal(report.matchingJupiterMeteoraInstructions, 1);
  const cpi = report.results[0].meteoraSwap2Cpis[0];
  assert.equal(cpi.accountCount, 18);
  assert.deepEqual(cpi.orderedAccountIndexes, cpiIndexes);
  assert.equal(cpi.outerAccountCount, outerIndexes.length);
  assert.deepEqual(cpi.parentAccountSequenceMatch, {
    exactContiguousPositions: [44],
    status: "unique",
  });
  assert.deepEqual(cpi.accountParentPositions[10], [0, 54]);
  assert.equal(
    report.evidenceLimitations.some((item) => item.includes("do not prove which runtime handler cursor")),
    true,
  );
});


test("stops at unavailable transactions and resumes from the last fully fetched signature", async () => {
  const firstPassTransactions = [];
  const firstPass = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    limit: 3,
    maxTransactions: 3,
    delayMs: 0,
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      if (body.method === "getSignaturesForAddress") {
        return rpcResponse([{ signature: "sig-3" }, { signature: "sig-2" }, { signature: "sig-1" }]);
      }
      if (body.method === "getTransaction") {
        firstPassTransactions.push(body.params[0]);
        return body.params[0] === "sig-2" ? rpcResponse(null) : rpcResponse(emptyTransaction());
      }
      throw new Error("Unexpected RPC method: " + body.method);
    },
  });

  assert.deepEqual(firstPassTransactions, ["sig-3", "sig-2"]);
  assert.equal(firstPass.transactionsScanned, 1);
  assert.deepEqual(firstPass.unavailableSignatures, ["sig-2"]);
  assert.equal(firstPass.transactionFetchComplete, false);
  assert.equal(firstPass.nextBefore, "sig-3");
  assert.equal(firstPass.reachedEnd, false);

  const resumedQueries = [];
  const resumedTransactions = [];
  const resumed = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    before: firstPass.nextBefore,
    limit: 2,
    maxTransactions: 2,
    delayMs: 0,
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      if (body.method === "getSignaturesForAddress") {
        resumedQueries.push(body.params[1]);
        return rpcResponse([{ signature: "sig-2" }, { signature: "sig-1" }]);
      }
      if (body.method === "getTransaction") {
        resumedTransactions.push(body.params[0]);
        return rpcResponse(emptyTransaction());
      }
      throw new Error("Unexpected RPC method: " + body.method);
    },
  });

  assert.deepEqual(resumedQueries, [{ commitment: "finalized", limit: 2, before: "sig-3" }]);
  assert.deepEqual(resumedTransactions, ["sig-2", "sig-1"]);
  assert.equal(resumed.transactionsScanned, 2);
  assert.deepEqual(resumed.unavailableSignatures, []);
  assert.equal(resumed.transactionFetchComplete, true);
  assert.equal(resumed.nextBefore, "sig-1");
});


test("retains the incoming cursor when the first transaction is unavailable", async () => {
  const incomingCursor = "caller-owned-cursor";
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example", {
    before: incomingCursor,
    limit: 1,
    maxTransactions: 1,
    delayMs: 0,
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      if (body.method === "getSignaturesForAddress") {
        assert.deepEqual(body.params[1], {
          commitment: "finalized",
          limit: 1,
          before: incomingCursor,
        });
        return rpcResponse([{ signature: "unavailable-first-signature" }]);
      }
      if (body.method === "getTransaction") return rpcResponse(null);
      throw new Error("Unexpected RPC method: " + body.method);
    },
  });

  assert.equal(report.transactionsScanned, 0);
  assert.deepEqual(report.unavailableSignatures, ["unavailable-first-signature"]);
  assert.equal(report.transactionFetchComplete, false);
  assert.equal(report.nextBefore, incomingCursor);
  assert.equal(report.reachedEnd, false);
});
