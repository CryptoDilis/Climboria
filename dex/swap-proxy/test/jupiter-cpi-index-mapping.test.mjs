import test from "node:test";
import assert from "node:assert/strict";
import { buildJupiterV6TraceReport, JUPITER_V6_PROGRAM_ID } from "../tools/audit-jupiter-v6-rpc.mjs";

test("maps CPI account-key indexes to every duplicate position in the parent Jupiter instruction", () => {
  const keys = [
    "UserWallet111111111111111111111111111111111",
    JUPITER_V6_PROGRAM_ID,
    "TokenProgram111111111111111111111111111111",
    "PoolAccount11111111111111111111111111111111",
  ];
  const transaction = {
    slot: 123,
    transaction: {
      message: {
        accountKeys: keys,
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 1,
        },
        instructions: [{
          programIdIndex: 1,
          accounts: [0, 2, 3, 0, 1],
          data: "route-payload",
        }],
      },
    },
    meta: {
      err: null,
      loadedAddresses: { writable: [], readonly: [] },
      innerInstructions: [{
        index: 0,
        instructions: [{
          programIdIndex: 2,
          accounts: [0, 2, 3, 1],
          data: "cpi-payload",
          stackHeight: 2,
        }],
      }],
    },
  };

  const report = buildJupiterV6TraceReport("test-signature", transaction);
  const cpi = report.jupiterRoutes[0].innerInstructions[0];

  assert.deepEqual(
    cpi.accounts.map((account) => account.outerInstructionPositionsForSameTransactionKey),
    [[0, 3], [1], [2], [4]],
  );
  assert.deepEqual(cpi.accounts.map((account) => account.index), [0, 2, 3, 1]);
  assert.deepEqual(cpi.accounts[0].outerInstructionPositionsForSameTransactionKey, [0, 3]);
  assert.equal(
    report.evidenceLimitations.some((item) => item.includes("does not identify a handler cursor position")),
    true,
  );
});

test("keeps address lookup table keys distinct by transaction key index", () => {
  const transaction = {
    transaction: {
      message: {
        accountKeys: [JUPITER_V6_PROGRAM_ID, "StaticAccount111111111111111111111111111111"],
        header: {
          numRequiredSignatures: 0,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 1,
        },
        instructions: [{ programIdIndex: 0, accounts: [2, 1, 2], data: "route-payload" }],
      },
    },
    meta: {
      err: null,
      loadedAddresses: {
        writable: ["LookupWritable11111111111111111111111111111"],
        readonly: ["LookupReadonly1111111111111111111111111111"],
      },
      innerInstructions: [{
        index: 0,
        instructions: [{ programIdIndex: 0, accounts: [2, 1], data: "cpi", stackHeight: 2 }],
      }],
    },
  };

  const report = buildJupiterV6TraceReport("alt-test", transaction);
  const cpi = report.jupiterRoutes[0].innerInstructions[0];
  assert.deepEqual(cpi.accounts.map((account) => account.index), [2, 1]);
  assert.deepEqual(
    cpi.accounts.map((account) => account.outerInstructionPositionsForSameTransactionKey),
    [[0, 2], [1]],
  );
  assert.equal(cpi.accounts[0].address, "LookupWritable11111111111111111111111111111");
});


test("classifies exact contiguous CPI account-index sequence matches without claiming handler cursor proof", () => {
  const makeReport = (outerIndexes, cpiIndexes) => {
    const maxIndex = Math.max(0, ...outerIndexes, ...cpiIndexes);
    const keys = Array.from({ length: maxIndex + 1 }, (_, index) =>
      index === 0 ? JUPITER_V6_PROGRAM_ID : "Account" + index);
    const transaction = {
      transaction: {
        message: {
          accountKeys: keys,
          header: {
            numRequiredSignatures: 0,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: keys.length,
          },
          instructions: [{ programIdIndex: 0, accounts: outerIndexes, data: "route-payload" }],
        },
      },
      meta: {
        err: null,
        loadedAddresses: { writable: [], readonly: [] },
        innerInstructions: [{
          index: 0,
          instructions: [{ programIdIndex: 0, accounts: cpiIndexes, data: "cpi", stackHeight: 2 }],
        }],
      },
    };
    return buildJupiterV6TraceReport("sequence-test", transaction)
      .jupiterRoutes[0].innerInstructions[0].orderedParentAccountSequenceMatch;
  };

  assert.deepEqual(makeReport([1, 2, 3, 4], [2, 3]), {
    exactContiguousPositions: [1],
    status: "unique",
  });
  assert.deepEqual(makeReport([1, 2, 3, 1, 2, 3], [1, 2, 3]), {
    exactContiguousPositions: [0, 3],
    status: "ambiguous",
  });
  assert.deepEqual(makeReport([1, 2, 3, 1, 4], [1, 2, 4]), {
    exactContiguousPositions: [],
    status: "not-found",
  });
});
