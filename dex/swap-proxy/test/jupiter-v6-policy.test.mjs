import test from "node:test";
import { decodeBase58 as decodeDiscoveryBase58, decodeJupiterRoutePlanHeader, discoverRecentJupiterMeteoraRoutes, isMeteoraSwap2Instruction } from "../tools/discover-jupiter-meteora-routes.mjs";
import { fetchMeteoraAccountInfo, inspectMeteoraAccount, METEORA_DLMM_PROGRAM_ID, METEORA_BIN_ARRAY_DISCRIMINATOR, METEORA_BITMAP_EXTENSION_DISCRIMINATOR } from "../tools/audit-meteora-bin-array.mjs";
import { buildJupiterV6TraceReport, fetchJupiterV6Trace, JUPITER_V6_PROGRAM_ID as TRACE_JUPITER_PROGRAM_ID } from "../tools/audit-jupiter-v6-rpc.mjs";
import assert from "node:assert/strict";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { validateJupiterV6Transaction, decodeJupiterV6Route, JUPITER_V6_PROGRAM_ID, JUPITER_V6_EVENT_AUTHORITY, TOKEN_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";

const taker = "11111111111111111111111111111111";
const inputMint = "So11111111111111111111111111111111111111112";
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const source = encodeBase58(new Uint8Array(32).fill(21));
const destination = encodeBase58(new Uint8Array(32).fill(22));
const raydium = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const compute = "ComputeBudget111111111111111111111111111111";

function u16(n) { return [n & 255, n >>> 8]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function u64(n) { const x = BigInt(n); return Array.from({ length: 8 }, (_, i) => Number((x >> BigInt(8 * i)) & 255n)); }
function routeData({ variant = 7, percent = 100, inputIndex = 0, outputIndex = 1, inAmount = 1000, outAmount = 950, slippage = 50, fee = 0 } = {}) {
  const discriminator = [229, 23, 203, 151, 122, 227, 173, 42];
  const payload = variant === 17 ? [1] : [];
  return new Uint8Array([...discriminator, ...u32(1), variant, ...payload, percent, inputIndex, outputIndex, ...u64(inAmount), ...u64(outAmount), ...u16(slippage), fee]);
}
function parsed({ data = routeData(), extraProgram = false, takerKey = taker, outMint = outputMint, requiredSignatures = 1 } = {}) {
  const unknownProgram = encodeBase58(new Uint8Array(32).fill(23));
  const keys = [takerKey, source, destination, TOKEN_PROGRAM_ID, outMint, JUPITER_V6_PROGRAM_ID, JUPITER_V6_EVENT_AUTHORITY, raydium, compute, unknownProgram];
  const instructions = [{ programIdIndex: 5, accountIndexes: [3, 0, 1, 2, 5, 4, 5, 6, 5, 7], data }];
  if (extraProgram) instructions.push({ programIdIndex: 9, accountIndexes: [], data: new Uint8Array([99]) });
  return {
    staticAccountKeys: keys.map(decodeBase58),
    requiredSignatures,
    readonlySignedAccounts: 0,
    readonlyUnsignedAccounts: 7,
    instructions
  };
}
function validate(p = parsed(), extra = {}) {
  return validateJupiterV6Transaction({ parsed: p, taker, outputMint, amount: "1000", outAmount: "950", otherAmountThreshold: "945", ...extra });
}

test("fails closed until the route's DEX account schema is independently verified", () => {
  assert.throws(() => validate(), /no verified per-DEX semantic account schema: Raydium/i);
});

test("rejects unknown top-level programs, route_v2, extra signers and unsupported route variants", () => {
  assert.throws(() => validate(parsed({ extraProgram: true })), /unsupported top-level program/i);
  const routeV2Data = routeData();
  routeV2Data.set([187, 100, 250, 204, 49, 196, 175, 20], 0);
  assert.throws(() => decodeJupiterV6Route(routeV2Data), /Only the Jupiter V6 route instruction is supported/);
  assert.throws(() => validate(parsed({ requiredSignatures: 2 })), /single-taker-signature/);
  assert.throws(() => decodeJupiterV6Route(routeData({ variant: 8 })), /unsupported DEX variant/);
  // SolFi enum 61 has no matching CPI instruction/account schema in the pinned Jupiter CPI interface.
  assert.throws(() => decodeJupiterV6Route(routeData({ variant: 61 })), /unsupported DEX variant/);
  const invalidWhirlpoolDirection = routeData({ variant: 17 });
  invalidWhirlpoolDirection[13] = 2;
  assert.throws(() => decodeJupiterV6Route(invalidWhirlpoolDirection), /invalid boolean variant payload/);
});

test("rejects wrong taker, output mint, amounts, fee and excessive slippage", () => {
  assert.throws(() => validate(parsed({ takerKey: source })), /account roles/);
  assert.throws(() => validate(parsed({ outMint: source })), /account roles/);
  assert.throws(() => validate(parsed({ data: routeData({ inAmount: 1001 }) })), /amounts do not match/);
  assert.throws(() => validate(parsed({ data: routeData({ fee: 1 }) })), /platform fees/);
  assert.throws(() => validate(parsed({ data: routeData({ slippage: 501 }) })), /5% safety cap/);
});


test("accepts a connected topologically ordered split route DAG", () => {
  const splitRoute = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(4),
    7, 50, 0, 1,
    7, 50, 0, 2,
    7, 100, 1, 4,
    7, 100, 2, 4,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  const decoded = decodeJupiterV6Route(splitRoute);
  assert.equal(decoded.steps.length, 4);
  assert.equal(decoded.steps.at(-1).outputIndex, 4);
});

test("rejects route DAG inputs without an earlier producer and dead-end branches", () => {
  const phantomIntermediate = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(2),
    7, 100, 0, 2,
    7, 100, 1, 2,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  assert.throws(() => decodeJupiterV6Route(phantomIntermediate), /produced by an earlier/i);

  const deadEnd = new Uint8Array([
    229, 23, 203, 151, 122, 227, 173, 42,
    ...u32(2),
    7, 50, 0, 1,
    7, 50, 0, 2,
    ...u64(1000), ...u64(950), ...u16(50), 0
  ]);
  assert.throws(() => decodeJupiterV6Route(deadEnd), /dead-end branch/i);
});

test("rejects invalid split percentages, route indexes and missing DEX program accounts", () => {
  assert.throws(() => decodeJupiterV6Route(routeData({ percent: 99 })), /total 100/);
  assert.throws(() => decodeJupiterV6Route(routeData({ inputIndex: 1, outputIndex: 1 })), /token index/);
  const p = parsed();
  p.staticAccountKeys[7] = decodeBase58(compute);
  assert.throws(() => validate(p), /missing its approved DEX program/);
});


test("requires the canonical Jupiter event authority and program fixed accounts before DEX remaining accounts", () => {
  const wrongEventAuthority = parsed();
  wrongEventAuthority.staticAccountKeys[6] = decodeBase58(source);
  assert.throws(() => validate(wrongEventAuthority), /event authority and program/i);

  const wrongProgram = parsed();
  wrongProgram.instructions[0].accountIndexes[8] = 8;
  assert.throws(() => validate(wrongProgram), /event authority and program/i);

  const missingFixedAccounts = parsed();
  missingFixedAccounts.instructions[0].accountIndexes = missingFixedAccounts.instructions[0].accountIndexes.slice(0, 8);
  assert.throws(() => validate(missingFixedAccounts), /missing required fixed or DEX accounts/i);

  const writableEventAuthority = parsed();
  writableEventAuthority.readonlyUnsignedAccounts = 6;
  assert.throws(() => validate(writableEventAuthority), /signer\/writable privileges/i);
});

test("rejects a writable duplicate alias of an approved DEX program account", () => {
  const p = parsed();
  p.instructions[0].accountIndexes.push(10);
  assert.throws(() => validate(p, { loadedWritable: [raydium] }), /DEX program accounts must be readonly/);
});

test("rejects unexpected writable privileges on route authority and fee placeholders", () => {
  const p = parsed();
  p.readonlyUnsignedAccounts = 4;
  assert.throws(() => validate(p), /signer\/writable privileges/);
});

test("rejects Compute Budget instructions that carry account metas or unsupported opcodes", () => {
  const withAccounts = parsed();
  withAccounts.instructions.unshift({
    programIdIndex: 8,
    accountIndexes: [1],
    data: new Uint8Array([2, 1, 0, 0, 0])
  });
  assert.throws(() => validate(withAccounts), /must not reference accounts/i);

  const unsupported = parsed();
  unsupported.instructions.unshift({
    programIdIndex: 8,
    accountIndexes: [],
    data: new Uint8Array([99])
  });
  assert.throws(() => validate(unsupported), /unsupported Compute Budget instruction/i);
});

test("binds Jupiter minimum output to the route instruction slippage floor", () => {
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "945" }), /no verified per-DEX semantic account schema: Raydium/i);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "944" }), /weaker than the route slippage limit/i);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "951" }), /weaker than the route slippage limit/i);
  assert.throws(() => validate(parsed(), { otherAmountThreshold: "0" }), /positive integer string/i);
});


function rpcTraceFixture() {
  return {
    slot: 464856414,
    blockTime: 1793699807,
    version: 0,
    transaction: {
      message: {
        accountKeys: [
          "payer", "writable-source", TRACE_JUPITER_PROGRAM_ID,
          "jupiter-event-authority", "meteora-dlmm-program", "readonly-account"
        ],
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 4
        },
        instructions: [
          { programIdIndex: 2, accounts: [0, 1, 3, 4, 5, 6, 7], data: "route-data" }
        ]
      }
    },
    meta: {
      err: null,
      loadedAddresses: {
        writable: ["lookup-writable"],
        readonly: ["lookup-readonly"]
      },
      innerInstructions: [{
        index: 0,
        instructions: [{
          programIdIndex: 4,
          accounts: [1, 4, 6, 7],
          data: "meteora-cpi-data",
          stackHeight: 2
        }]
      }],
      logMessages: ["Program Jupiter invoke [1]", "Program Meteora invoke [2]"],
      preTokenBalances: [{ mint: "input-mint", uiTokenAmount: { amount: "100" } }],
      postTokenBalances: [{ mint: "output-mint", uiTokenAmount: { amount: "95" } }]
    }
  };
}

test("builds a Jupiter V6 raw-RPC trace with resolved ALT account order and stack height", () => {
  const report = buildJupiterV6TraceReport("trace-signature", rpcTraceFixture());
  assert.equal(report.transactionSucceeded, true);
  assert.equal(report.slot, 464856414);
  assert.equal(report.jupiterRoutes.length, 1);
  const route = report.jupiterRoutes[0];
  assert.equal(route.outerIndex, 0);
  assert.equal(route.innerInstructions.length, 1);
  const cpi = route.innerInstructions[0];
  assert.equal(cpi.programId, "meteora-dlmm-program");
  assert.equal(cpi.stackHeight, 2);
  assert.deepEqual(cpi.accounts.map((account) => account.address), [
    "writable-source", "meteora-dlmm-program", "lookup-writable", "lookup-readonly"
  ]);
  assert.equal(cpi.accounts[2].transactionPrivilege.writable, true);
  assert.equal(cpi.accounts[3].transactionPrivilege.writable, false);
  assert.match(cpi.accounts[0].transactionPrivilege.source, /not the CPI-requested meta/);
  assert.match(cpi.accounts[2].transactionPrivilege.source, /address-lookup-table transaction message privilege/);
  assert.match(report.evidenceLimitations.join(" "), /Do not infer routePlan-step-to-CPI association/);
});

test("rejects malformed RPC instruction account indexes instead of emitting partial evidence", () => {
  const fixture = rpcTraceFixture();
  fixture.meta.innerInstructions[0].instructions[0].accounts.push(999);
  assert.throws(
    () => buildJupiterV6TraceReport("trace-signature", fixture),
    /accounts\[4\] index 999 is out of range/
  );
});

test("fetches only finalized raw JSON transaction metadata and supports version 1", async () => {
  let requestUrl;
  let request;
  const report = await fetchJupiterV6Trace(
    "trace-signature",
    "https://rpc.example.invalid",
    async (url, options) => {
      requestUrl = url;
      request = JSON.parse(options.body);
      return { ok: true, json: async () => ({ result: rpcTraceFixture() }) };
    }
  );
  assert.equal(requestUrl, "https://rpc.example.invalid");
  assert.equal(request.method, "getTransaction");
  assert.equal(request.params[1].commitment, "finalized");
  assert.equal(request.params[1].encoding, "json");
  assert.equal(request.params[1].maxSupportedTransactionVersion, 1);
  assert.equal(report.signature, "trace-signature");
  await assert.rejects(
    () => fetchJupiterV6Trace("trace-signature", "http://insecure.example.invalid", async () => ({ ok: true, json: async () => ({}) })),
    /HTTPS Solana RPC endpoint/
  );
});


test("decodes a Meteora BinArray header only when owner and Anchor discriminator match", () => {
  const parentPool = encodeBase58(new Uint8Array(32).fill(44));
  const bytes = Buffer.alloc(56);
  Buffer.from(METEORA_BIN_ARRAY_DISCRIMINATOR).copy(bytes, 0);
  bytes.writeBigInt64LE(-3n, 8);
  bytes[16] = 2;
  Buffer.from(decodeBase58(parentPool)).copy(bytes, 24);
  const report = inspectMeteoraAccount("bin-array-account", {
    owner: METEORA_DLMM_PROGRAM_ID,
    executable: false,
    lamports: 1234,
    space: bytes.length,
    data: [bytes.toString("base64"), "base64"]
  });
  assert.equal(report.found, true);
  assert.equal(report.matchesBinArray, true);
  assert.equal(report.matchesBitmapExtension, false);
  assert.equal(report.dataLength, bytes.length);
  assert.equal(report.binArrayIndex, "-3");
  assert.equal(report.binArrayVersion, 2);
  assert.equal(report.binArrayPool, parentPool);
});


test("decodes the Meteora bitmap extension parent pool", () => {
  const parentPool = encodeBase58(new Uint8Array(32).fill(45));
  const bytes = Buffer.alloc(40);
  Buffer.from(METEORA_BITMAP_EXTENSION_DISCRIMINATOR).copy(bytes, 0);
  Buffer.from(decodeBase58(parentPool)).copy(bytes, 8);
  const report = inspectMeteoraAccount("bitmap-extension-account", {
    owner: METEORA_DLMM_PROGRAM_ID,
    executable: false,
    lamports: 1234,
    space: bytes.length,
    data: [bytes.toString("base64"), "base64"]
  });
  assert.equal(report.matchesBinArray, false);
  assert.equal(report.matchesBitmapExtension, true);
  assert.equal(report.bitmapExtensionPool, parentPool);
});

test("does not classify a matching discriminator owned by another program as a Meteora BinArray", () => {
  const bytes = Buffer.from([...METEORA_BIN_ARRAY_DISCRIMINATOR, 1, 2, 3, 4]);
  const report = inspectMeteoraAccount("spoofed-account", {
    owner: "NotMeteoraProgram",
    executable: false,
    lamports: 1234,
    space: bytes.length,
    data: [bytes.toString("base64"), "base64"]
  });
  assert.equal(report.matchesBinArray, false);
});

test("fetches finalized account data and rejects insecure RPC URLs", async () => {
  let request;
  const bytes = Buffer.alloc(56);
  Buffer.from(METEORA_BIN_ARRAY_DISCRIMINATOR).copy(bytes, 0);
  bytes.writeBigInt64LE(1n, 8);
  bytes[16] = 2;
  Buffer.from(decodeBase58(encodeBase58(new Uint8Array(32).fill(9)))).copy(bytes, 24);
  const report = await fetchMeteoraAccountInfo(
    "bin-array-account",
    "https://rpc.example.invalid",
    async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          result: {
            value: {
              owner: METEORA_DLMM_PROGRAM_ID,
              executable: false,
              lamports: 1234,
              space: bytes.length,
              data: [bytes.toString("base64"), "base64"]
            }
          }
        })
      };
    }
  );
  assert.equal(request.method, "getAccountInfo");
  assert.equal(request.params[1].commitment, "finalized");
  assert.equal(request.params[1].encoding, "base64");
  assert.equal(report.matchesBinArray, true);
  await assert.rejects(
    () => fetchMeteoraAccountInfo("bin-array-account", "http://insecure.example.invalid"),
    /HTTPS Solana RPC endpoint/
  );
});


test("decodes legacy route and route_v2 headers without assuming route-step support", () => {
  const routeHeader = decodeJupiterRoutePlanHeader("3aafXU8vKpJ2D842B5MTALCjKB1F1BGiBP5qtxuc8MPgax9MqNpUCF");
  assert.equal(routeHeader.instructionName, "route");
  assert.equal(routeHeader.routePlanCount, 1);
  assert.equal(routeHeader.firstStepVariant, 75);
  const routeV2Header = decodeJupiterRoutePlanHeader("2sDES9fHqoTppYzwZFtuwMPsJL1uwAj7C1WKpRv22o7xwLdcxsAo7oWEePwUpZ5eNY93NaNUqWmSkoDTyArfz1JtB2NYgMy");
  assert.equal(routeV2Header.instructionName, "route_v2");
  assert.equal(routeV2Header.routePlanCount, 4);
  assert.equal(routeV2Header.firstStepVariant, 181);
  assert.equal(isMeteoraSwap2Instruction("fx9RHbGFfZ8iTJuYwRGeuH4KNM2sVKVMPh6Cib"), true);
  assert.equal(isMeteoraSwap2Instruction("11111111111111111111111111111111"), false);
  assert.equal(decodeDiscoveryBase58("1")[0], 0);
});

test("discovers bounded finalized Jupiter-to-Meteora Swap2 traces without live network access", async () => {
  const fixture = rpcTraceFixture();
  fixture.transaction.message.accountKeys[4] = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
  fixture.transaction.message.instructions[0].data = "3aafXU8vKpJ2D842B5MTALCjKB1F1BGiBP5qtxuc8MPgax9MqNpUCF";
  fixture.meta.innerInstructions[0].instructions[0].data = "fx9RHbGFfZ8iTJuYwRGeuH4KNM2sVKVMPh6Cib";
  const methods = [];
  const beforeSignature = "older-finalized-cursor";
  let signatureQuery;
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example.invalid", {
    limit: 1,
    maxTransactions: 1,
    maxMatches: 1,
    delayMs: 0,
    before: beforeSignature,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      methods.push(request.method);
      if (request.method === "getSignaturesForAddress") signatureQuery = request.params[1];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: request.method === "getSignaturesForAddress"
            ? [{ signature: "trace-signature" }]
            : fixture
        })
      };
    }
  });
  assert.deepEqual(methods, ["getSignaturesForAddress", "getTransaction"]);
  assert.deepEqual(signatureQuery, {
    commitment: "finalized",
    limit: 1,
    before: beforeSignature
  });
  assert.equal(report.before, beforeSignature);
  assert.equal(report.transactionsScanned, 1);
  assert.equal(report.matchingRoutes, 1);
  assert.equal(report.results[0].routePlanHeader.firstStepVariant, 75);
  assert.equal(report.results[0].routePlanHeaderRecognized, true);
  assert.equal(report.results[0].instructionDiscriminatorHex, "e517cb977ae3ad2a");
  assert.equal(report.results[0].meteoraSwap2Cpis[0].accountCount, 4);
});


test("recognizes route_v2 in a Jupiter-to-Meteora CPI discovery result", async () => {
  const fixture = rpcTraceFixture();
  fixture.transaction.message.accountKeys[4] = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
  fixture.transaction.message.instructions[0].data = "2sDES9fHqoTppYzwZFtuwMPsJL1uwAj7C1WKpRv22o7xwLdcxsAo7oWEePwUpZ5eNY93NaNUqWmSkoDTyArfz1JtB2NYgMy";
  fixture.meta.innerInstructions[0].instructions[0].data = "fx9RHbGFfZ8iTJuYwRGeuH4KNM2sVKVMPh6Cib";
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example.invalid", {
    limit: 1,
    maxTransactions: 1,
    maxMatches: 1,
    delayMs: 0,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: request.method === "getSignaturesForAddress"
            ? [{ signature: "route-v2-candidate" }]
            : fixture
        })
      };
    }
  });
  assert.equal(report.matchingRoutes, 1);
  assert.equal(report.matchingJupiterMeteoraInstructions, 1);
  assert.equal(report.results[0].routePlanHeader.instructionName, "route_v2");
  assert.equal(report.results[0].routePlanHeader.routePlanCount, 4);
  assert.equal(report.results[0].routePlanHeader.firstStepVariant, 181);
  assert.equal(report.results[0].routePlanHeaderRecognized, true);
});


test("preserves unknown Jupiter instruction discriminators instead of misclassifying them as route plans", async () => {
  const fixture = rpcTraceFixture();
  fixture.transaction.message.accountKeys[4] = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
  fixture.transaction.message.instructions[0].data = encodeBase58(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  fixture.meta.innerInstructions[0].instructions[0].data = "fx9RHbGFfZ8iTJuYwRGeuH4KNM2sVKVMPh6Cib";
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example.invalid", {
    limit: 1,
    maxTransactions: 1,
    maxMatches: 1,
    delayMs: 0,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: request.method === "getSignaturesForAddress"
            ? [{ signature: "unknown-jupiter-instruction" }]
            : fixture
        })
      };
    }
  });
  assert.equal(report.matchingRoutes, 0);
  assert.equal(report.matchingJupiterMeteoraInstructions, 1);
  assert.equal(report.results[0].instructionDiscriminatorHex, "0102030405060708");
  assert.equal(report.results[0].routePlanHeader, null);
  assert.equal(report.results[0].routePlanHeaderRecognized, false);
});


test("records public RPC rate limiting as an incomplete sample instead of failing the audit", async () => {
  const methods = [];
  const report = await discoverRecentJupiterMeteoraRoutes("https://rpc.example.invalid", {
    limit: 1,
    maxTransactions: 1,
    maxMatches: 1,
    delayMs: 0,
    retryBaseMs: 0,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      methods.push(request.method);
      if (request.method === "getSignaturesForAddress") {
        return { ok: true, status: 200, json: async () => ({ result: [{ signature: "rate-limited-signature" }] }) };
      }
      return { ok: false, status: 429, json: async () => ({}) };
    }
  });
  assert.deepEqual(methods, [
    "getSignaturesForAddress",
    "getTransaction",
    "getTransaction",
    "getTransaction"
  ]);
  assert.equal(report.rateLimited, true);
  assert.equal(report.rateLimitedMethod, "getTransaction");
  assert.equal(report.transactionsScanned, 0);
  assert.equal(report.matchingRoutes, 0);
  assert.equal(report.matchingJupiterMeteoraInstructions, 0);
});


test("preserves every outer instruction for transaction-wide fee and transfer attribution", () => {
  const fixture = rpcTraceFixture();
  fixture.transaction.message.accountKeys.push("outer-token-program");
  fixture.transaction.message.instructions.push({
    programIdIndex: 6,
    accounts: [0, 1],
    data: "outer-transfer-data",
  });

  const report = buildJupiterV6TraceReport("trace-with-other-outer-instruction", fixture);
  assert.equal(report.outerInstructions.length, 2);
  assert.equal(report.outerInstructions[0].programId, TRACE_JUPITER_PROGRAM_ID);
  assert.equal(report.outerInstructions[1].outerIndex, 1);
  assert.equal(report.outerInstructions[1].programId, "outer-token-program");
  assert.deepEqual(report.outerInstructions[1].accounts.map((account) => account.address), [
    "payer",
    "writable-source",
  ]);
  assert.equal(report.outerInstructions[1].dataBase58, "outer-transfer-data");
});
