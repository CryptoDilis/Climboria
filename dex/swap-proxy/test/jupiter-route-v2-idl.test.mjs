import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { decodeLegacyAnchorIdlAccount, encodeBase58 } from "../tools/legacy-anchor-idl-account.mjs";
import { decodeJupiterRouteV2 } from "../tools/decode-jupiter-route-v2-candidate.mjs";

const programId = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const instructionDataBase58 = "2sDES9fHqoTppYzwZFtuwMPsJL1uwAj7C1WKpRv22o7xwLdcxsAo7oWEePwUpZ5eNY93NaNUqWmSkoDTyArfz1JtB2NYgMy";

function makeIdl() {
  const variants = Array.from({ length: 182 }, (_, index) => ({ name: `Reserved${index}` }));
  variants[47] = { name: "WhirlpoolSwapV2", fields: [
    { name: "a_to_b", type: "bool" },
    { name: "remaining_accounts_info", type: { option: { defined: { name: "RemainingAccountsInfo" } } } },
  ] };
  variants[75] = { name: "MeteoraDlmmSwapV2", fields: [
    { name: "remaining_accounts_info", type: { defined: { name: "RemainingAccountsInfo" } } },
  ] };
  variants[81] = { name: "RaydiumLaunchlabBuy", fields: [{ name: "share_fee_rate", type: "u64" }] };
  variants[181] = { name: "KipseliV3", fields: [{ name: "is_base_to_quote", type: "bool" }] };
  return {
    instructions: [{
      name: "route_v2",
      discriminator: [187, 100, 250, 204, 49, 196, 175, 20],
      args: [
        { name: "in_amount", type: "u64" },
        { name: "quoted_out_amount", type: "u64" },
        { name: "slippage_bps", type: "u16" },
        { name: "platform_fee_bps", type: "u16" },
        { name: "positive_slippage_bps", type: "u16" },
        { name: "route_plan", type: { vec: { defined: { name: "RoutePlanStepV2" } } } },
      ],
    }],
    types: [
      { name: "RoutePlanStepV2", type: { kind: "struct", fields: [
        { name: "swap", type: { defined: { name: "Swap" } } },
        { name: "bps", type: "u16" },
        { name: "input_index", type: "u8" },
        { name: "output_index", type: "u8" },
      ] } },
      { name: "Swap", type: { kind: "enum", variants } },
      { name: "RemainingAccountsInfo", type: { kind: "struct", fields: [
        { name: "slices", type: { vec: { defined: { name: "RemainingAccountsSlice" } } } },
      ] } },
      { name: "RemainingAccountsSlice", type: { kind: "struct", fields: [
        { name: "accounts_type", type: "u8" },
        { name: "length", type: "u8" },
      ] } },
    ],
  };
}

test("decodes the historical route_v2 payload with slot-matched IDL", () => {
  const idl = makeIdl();
  const content = JSON.stringify(idl);
  const history = {
    programId,
    anchorAddress: "C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa",
    anchor: [{
      type: "anchor",
      version: "0.1.0",
      slot: "467726546",
      time: "2026-11-10 12:49:47",
      activeFrom: { slot: "467726546", time: "2026-11-10 12:49:47" },
      activeTo: "current",
      content,
    }],
  };
  const trace = {
    signature: "2y3mpbA6dSdyv2DUufEgWBNV3cL7G4JfLzCoQ2sUNthJvKW7uHxzGZfBL2DcghqgfZZpmzUH4oS9nseibki3T7MX",
    slot: 468153382,
    jupiterRoutes: [{
      instructionDataBase58,
      innerInstructions: [
        { innerIndex: 0, programId: "3TK9D8aoBFYjYZtKCjciPrVrRStsnvo7KmpcJqDavpaU", stackHeight: 2 },
        { innerIndex: 3, programId: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", stackHeight: 2 },
        { innerIndex: 6, programId: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", stackHeight: 2 },
        { innerIndex: 11, programId: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj", stackHeight: 2 },
      ],
    }],
  };

  const report = decodeJupiterRouteV2({ trace, history });
  assert.equal(report.instruction.discriminator, "bb64facc31c4af14");
  assert.equal(report.instruction.args.in_amount, "99550000");
  assert.equal(report.instruction.args.quoted_out_amount, "2342002513618");
  assert.equal(report.routeSteps.length, 4);
  assert.deepEqual(report.routeSteps.map((step) => step.swap.variant), [
    "KipseliV3",
    "WhirlpoolSwapV2",
    "MeteoraDlmmSwapV2",
    "RaydiumLaunchlabBuy",
  ]);
  assert.deepEqual(report.routeSteps.map((step) => step.bps), [10000, 1014, 8986, 10000]);
  assert.equal(report.routeSteps[0].swap.fields.is_base_to_quote, true);
  assert.deepEqual(report.routeSteps[2].swap.fields.remaining_accounts_info, { slices: [] });
  assert.equal(report.idlRevision.slot, "467726546");
  assert.equal(report.transactionSlot, 468153382);
});

test("rejects an IDL revision that does not cover the candidate transaction slot", () => {
  const history = {
    programId,
    anchor: [{
      type: "anchor",
      slot: "467726546",
      activeFrom: { slot: "467726546" },
      activeTo: { slot: "468000000" },
      content: JSON.stringify(makeIdl()),
    }],
  };
  const trace = { slot: 468153382, jupiterRoutes: [{ instructionDataBase58 }] };
  assert.throws(() => decodeJupiterRouteV2({ trace, history }), /found 0/);
});


test("decodes legacy Anchor IDL account layout and verifies authority plus compressed payload hash", () => {
  const authorityBytes = Buffer.alloc(32, 7);
  const authority = encodeBase58(authorityBytes);
  const idlText = JSON.stringify({
    version: "0.1.0",
    name: "jupiter",
    instructions: [{
      name: "route_v2",
      discriminator: [187, 100, 250, 204, 49, 196, 175, 20],
      args: [],
    }],
  });
  const compressed = deflateSync(Buffer.from(idlText, "utf8"));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(compressed.length, 0);
  const accountData = Buffer.concat([authorityBytes, length, compressed]);

  const decoded = decodeLegacyAnchorIdlAccount(accountData);
  assert.match(decoded.layout, /authority\[32\].*data_len:u32le/);
  assert.equal(decoded.authority, authority);
  assert.equal(decoded.declaredPayloadLength, compressed.length);
  assert.equal(decoded.decompressedPayloadSha256,
    createHash("sha256").update(idlText).digest("hex"));
  assert.equal(decoded.routeV2Discriminator, "bb64facc31c4af14");
  assert.equal(decoded.idl.name, "jupiter");
});

test("rejects malformed legacy Anchor IDL account lengths and invalid JSON", () => {
  assert.throws(
    () => decodeLegacyAnchorIdlAccount(Buffer.alloc(35)),
    /too short/
  );

  const badLength = Buffer.alloc(36);
  badLength.writeUInt32LE(100, 32);
  assert.throws(
    () => decodeLegacyAnchorIdlAccount(badLength),
    /exceeds account data/
  );

  const compressed = deflateSync(Buffer.from("{not-json"));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(compressed.length, 0);
  assert.throws(
    () => decodeLegacyAnchorIdlAccount(Buffer.concat([Buffer.alloc(32, 1), length, compressed])),
    /not valid JSON/
  );
});
