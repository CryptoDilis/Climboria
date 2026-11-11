import test from "node:test";
import assert from "node:assert/strict";
import { hashUnsignedMessage, runUnsignedDevnetSimulationPreflight } from "./launchlab-devnet-simulation-preflight.mjs";

const feePayer = "DevnetFeePayer111111111111111111111111111";
function fixture({ cluster = "devnet", balance = 10_000_000, fee = 5_000, simulationErr = null } = {}) {
  const messageBytes = Buffer.from("unsigned-v0-message-fixture");
  const message = {
    staticAccountKeys: [{ toBase58: () => feePayer }],
    header: { numRequiredSignatures: 1 },
    serialize: () => messageBytes,
  };
  const transaction = { message, signatures: [new Uint8Array(64)] };
  const calls = { balance: 0, fee: 0, simulation: 0, options: null };
  const raydium = {
    cluster,
    connection: {
      getBalance: async (key, commitment) => { calls.balance++; assert.equal(key.toBase58(), feePayer); assert.equal(commitment, "finalized"); return balance; },
      getFeeForMessage: async (msg, commitment) => { calls.fee++; assert.equal(msg, message); assert.equal(commitment, "finalized"); return fee === null ? null : { value: fee }; },
      simulateTransaction: async (tx, options) => { calls.simulation++; assert.equal(tx, transaction); calls.options = options; return { value: { err: simulationErr, unitsConsumed: 12345, logs: ["simulation-only"] } }; },
      sendRawTransaction: async () => { throw new Error("submission must never be called"); },
    },
  };
  return { raydium, transaction, calls, message };
}
function approvalFor(message, overrides = {}) {
  return {
    approved: true,
    reference: "owner-approval-ticket-2026-11-10-001",
    confirmation: "I_APPROVE_UNSIGNED_DEVNET_SIMULATION",
    feePayer,
    messageHashes: [hashUnsignedMessage(message)],
    approvedAt: "2026-11-10T03:00:00.000Z",
    expiresAt: "2026-11-10T03:20:00.000Z",
    ...overrides,
  };
}
const common = { minimumRentReserveLamports: 1_000_000, feeBufferLamports: 100_000, now: Date.parse("2026-11-10T03:05:00.000Z") };

test("blocks unless an explicit operator approval is supplied", async () => {
  const f = fixture();
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction] }), /Explicit operator approval/);
  assert.equal(f.calls.simulation, 0);
});
test("rejects approval for another fee payer or changed message", async () => {
  const f = fixture();
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message, { feePayer: "Other111111111111111111111111111111111" }) }), /does not match/);
  const changed = { ...f.transaction, message: { ...f.message, serialize: () => Buffer.from("tampered") } };
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [changed], approval: approvalFor(f.message) }), /message SHA-256/);
  assert.equal(f.calls.simulation, 0);
});
test("rejects expired, future and overlong approvals", async () => {
  const f = fixture();
  for (const patch of [
    { expiresAt: "2026-11-10T03:04:00.000Z" },
    { approvedAt: "2026-11-10T03:06:00.000Z" },
    { expiresAt: "2026-11-10T04:00:00.000Z" },
  ]) {
    await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message, patch) }), /Approval timestamp|lifetime/);
  }
  assert.equal(f.calls.simulation, 0);
});
test("rejects any nonzero signature slot", async () => {
  const f = fixture();
  f.transaction.signatures[0][0] = 1;
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) }), /unsigned transactions only/);
  assert.equal(f.calls.simulation, 0);
});
test("blocks multi-transaction SDK sets before RPC calls", async () => {
  const f = fixture();
  const result = await runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction, f.transaction], approval: approvalFor(f.message) });
  assert.equal(result.status, "blocked");
  assert.equal(result.simulated, false);
  assert.match(result.reason, /multi-transaction set/);
  assert.equal(f.calls.balance, 0);
  assert.equal(f.calls.fee, 0);
  assert.equal(f.calls.simulation, 0);
});
test("requires explicit rent reserve and fee buffer", async () => {
  const f = fixture();
  const approval = approvalFor(f.message);
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, minimumRentReserveLamports: 0, raydium: f.raydium, transactions: [f.transaction], approval }), /rent reserve/);
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, feeBufferLamports: 0, raydium: f.raydium, transactions: [f.transaction], approval }), /fee safety buffer/);
  assert.equal(f.calls.simulation, 0);
});
test("fails closed when fee payer lacks fee and rent headroom", async () => {
  const f = fixture({ balance: 1_000_000 });
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) }), /lacks required fee\/rent headroom/);
  assert.equal(f.calls.simulation, 0);
});
test("fails closed when RPC cannot provide an exact finalized fee quote", async () => {
  const f = fixture({ fee: null });
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) }), /fee quote is unavailable/);
  assert.equal(f.calls.simulation, 0);
});
test("runs one explicitly approved unsigned Devnet simulation with sigVerify disabled", async () => {
  const f = fixture();
  const result = await runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) });
  assert.equal(result.status, "simulated");
  assert.equal(result.signatureVerification, false);
  assert.equal(result.transactionSigned, false);
  assert.equal(result.transactionSubmitted, false);
  assert.equal(result.networkFeeLamports, 5_000);
  assert.equal(result.requiredLamports, 1_105_000);
  assert.equal(result.remainingHeadroomLamports, 8_895_000);
  assert.equal(f.calls.balance, 1);
  assert.equal(f.calls.fee, 1);
  assert.equal(f.calls.simulation, 1);
  assert.deepEqual(f.calls.options, { commitment: "finalized", sigVerify: false, replaceRecentBlockhash: true });
});
test("does not report success when the RPC simulation returns an error", async () => {
  const f = fixture({ simulationErr: { InstructionError: [0, "Custom"] } });
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) }), /Unsigned Devnet simulation failed/);
});
test("rejects Mainnet clients", async () => {
  const f = fixture({ cluster: "mainnet" });
  await assert.rejects(() => runUnsignedDevnetSimulationPreflight({ ...common, raydium: f.raydium, transactions: [f.transaction], approval: approvalFor(f.message) }), /restricted to an explicitly initialized Devnet/);
});
