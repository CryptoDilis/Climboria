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

  assert.equal(calls, 3);
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

  assert.equal(transaction429Calls, 3);
  assert.equal(report.rateLimited, true);
  assert.equal(report.rateLimitedMethod, "getTransaction");
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.nextBefore, "sig-2");
  assert.deepEqual(fetchedTransactions, ["sig-2", "sig-1", "sig-1", "sig-1"]);
});
