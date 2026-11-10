import test from "node:test";
import assert from "node:assert/strict";
import { prepareDevnetOwnerApprovalPacket } from "./launchlab-devnet-approval-packet.mjs";

class PublicKey {
  constructor(value) { this.value = value; }
  toBase58() { return this.value; }
}
const feePayer = "DedicatedFeePayer111111111111111111111111111";
const creator = "ClimboriaCreator111111111111111111111111111";
const mint = "ClimboriaMint111111111111111111111111111111";
const pool = "ClimboriaPool111111111111111111111111111111";
const baseVault = "ClimboriaBaseVault111111111111111111111111";
const quoteVault = "ClimboriaQuoteVault1111111111111111111111";
const metadata = "ClimboriaMetadata111111111111111111111111";
const bytes = Buffer.from("exact-unsigned-versioned-message");
function fixture({ cluster = "devnet", balance = 10_000_000, fee = 5000, existing = [feePayer], signed = false, count = 1 } = {}) {
  const calls = { account: [], rent: [], balance: 0, fee: 0, simulation: 0 };
  const transaction = {
    message: {
      staticAccountKeys: [new PublicKey(feePayer), new PublicKey(mint)],
      header: { numRequiredSignatures: 2 },
      serialize: () => bytes,
    },
    signatures: [new Uint8Array(64), new Uint8Array(64)],
  };
  if (signed) transaction.signatures[0][0] = 1;
  const prepared = {
    cluster: "devnet", createOnly: true, instructionPath: "initializeV2",
    transactionSubmitted: false, executeCalled: false,
    creatorWallet: creator, feePayer, mintAddress: mint,
    transactions: Array.from({ length: count }, () => transaction),
    transactionReviews: count === 1 ? [{
      feePayer, requiredSignerKeys: [feePayer, mint],
      programIds: ["LaunchLabProgram1111111111111111111111111"],
      launchpadInstructionData: { name: "Test", symbol: "TST" },
      launchpadAccounts: [
        { name: "payer", pubkey: feePayer, isWritable: true },
        { name: "base_mint", pubkey: mint, isWritable: true },
        { name: "pool_state", pubkey: pool, isWritable: true },
        { name: "base_vault", pubkey: baseVault, isWritable: true },
        { name: "quote_vault", pubkey: quoteVault, isWritable: true },
        { name: "metadata_account", pubkey: metadata, isWritable: true },
        { name: "global_config", pubkey: "GlobalConfig1111111111111111111111111111", isWritable: false },
      ],
    }] : [],
  };
  const raydium = {
    cluster,
    connection: {
      getAccountInfo: async key => {
        const address = key.toBase58(); calls.account.push(address);
        return existing.includes(address) ? { owner: new PublicKey("SystemProgram111111111111111111111111111"), data: Buffer.alloc(0) } : null;
      },
      getMinimumBalanceForRentExemption: async (space, commitment) => {
        calls.rent.push({ space, commitment }); return space * 1000;
      },
      getBalance: async key => { calls.balance++; assert.equal(key.toBase58(), feePayer); return balance; },
      getFeeForMessage: async (message, commitment) => { calls.fee++; assert.equal(message, transaction.message); assert.equal(commitment, "finalized"); return fee === null ? null : { value: fee }; },
      simulateTransaction: async () => { calls.simulation++; throw new Error("simulation must not run while preparing approval packet"); },
      sendRawTransaction: async () => { throw new Error("submission must never run"); },
    },
  };
  return { raydium, prepared, calls, transaction };
}
const sdk = { PublicKey };
const args = f => ({ raydium: f.raydium, sdk, prepared: f.prepared, feeBufferLamports: 100_000 });

test("builds an unapproved owner packet from source-backed rent layouts and finalized fee quotes", async () => {
  const f = fixture();
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "ready_for_owner_review");
  assert.equal(result.feePayer, feePayer);
  assert.notEqual(result.creatorWallet, result.feePayer);
  assert.equal(result.messageSha256.length, 64);
  assert.deepEqual(result.requiredSignerKeys, [feePayer, mint]);
  assert.deepEqual(result.rentAccounts.map(x => x.address), [mint, pool, baseVault, quoteVault, metadata]);
  assert.equal(result.rentReserveLamports, (82 + 421 + 165 + 165 + 607) * 1000);
  assert.equal(result.networkFeeLamports, 5000);
  assert.equal(result.requiredLamports, 1_545_000);
  assert.equal(result.finalizedFeePayerBalanceLamports, 10_000_000);
  assert.equal(result.ownerApproval.approved, false);
  assert.equal(result.ownerApproval.reference, null);
  assert.equal(result.ownerApproval.messageHashes[0], result.messageSha256);
  assert.equal(result.transactionSigned, false);
  assert.equal(result.transactionSimulated, false);
  assert.equal(result.transactionSubmitted, false);
  assert.equal(f.calls.simulation, 0);
  assert.deepEqual(f.calls.rent, [82, 421, 165, 165, 607].map(space => ({ space, commitment: "finalized" })));
  assert.ok(result.rentAccounts.every(x => x.sourceRef && x.verificationScope));
  assert.equal(result.rentAccounts[4].dataSpaceBytes, 607);
});
test("blocks unknown missing writable account names instead of guessing their size", async () => {
  const f = fixture();
  f.prepared.transactionReviews[0].launchpadAccounts.push({
    name: "future_unknown_account", pubkey: "UnknownWritable11111111111111111111111111", isWritable: true,
  });
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "blocked");
  assert.match(result.reason, /No source-backed rent layout/);
  assert.equal(result.ownerApprovalCreated, false);
  assert.equal(f.calls.rent.length, 0);
  assert.equal(f.calls.simulation, 0);
});
test("only requests rent for missing accounts and excludes already-created writable accounts", async () => {
  const f = fixture({ existing: [feePayer, mint, pool, baseVault] });
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "ready_for_owner_review");
  assert.deepEqual(result.rentAccounts.map(x => x.address), [quoteVault, metadata]);
  assert.deepEqual(f.calls.rent, [{ space: 165, commitment: "finalized" }, { space: 607, commitment: "finalized" }]);
});
test("blocks multi-transaction sets before RPC account reads", async () => {
  const f = fixture({ count: 2 });
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "blocked");
  assert.equal(result.transactionCount, 2);
  assert.equal(f.calls.account.length, 0);
});
test("rejects creator and fee payer aliasing", async () => {
  const f = fixture();
  f.prepared.creatorWallet = feePayer;
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /separate dedicated fee payer/);
});
test("rejects nonzero transaction signature slots", async () => {
  const f = fixture({ signed: true });
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /unsigned transactions only/);
});
test("fails closed when the dedicated fee payer lacks required rent, fee, and buffer headroom", async () => {
  const f = fixture({ balance: 100_000 });
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "blocked_insufficient_fee_payer_balance");
  assert.equal(result.enoughFunds, false);
  assert.equal(result.ownerApproval.approved, false);
  assert.equal(f.calls.simulation, 0);
});
test("fails closed when exact finalized network fee quote is unavailable", async () => {
  const f = fixture({ fee: null });
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /fee quote is unavailable/);
  assert.equal(f.calls.simulation, 0);
});
test("rejects Mainnet RPC", async () => {
  const f = fixture({ cluster: "mainnet" });
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /restricted to an explicitly initialized Devnet/);
});
