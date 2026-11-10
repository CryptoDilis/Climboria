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
const specs = [
  { address: mint, space: 82, purpose: "SPL Token mint account", sourceRef: "pinned SPL Token account layout: Mint::LEN=82" },
  { address: pool, space: 512, purpose: "LaunchLab pool state", sourceRef: "reviewed pinned LaunchLab IDL account layout" },
];
const args = f => ({ raydium: f.raydium, sdk, prepared: f.prepared, rentAccountSpecs: specs, feeBufferLamports: 100_000 });

test("builds an unapproved owner packet from exact unsigned message and finalized fee/rent quotes", async () => {
  const f = fixture();
  const result = await prepareDevnetOwnerApprovalPacket(args(f));
  assert.equal(result.status, "ready_for_owner_review");
  assert.equal(result.feePayer, feePayer);
  assert.notEqual(result.creatorWallet, result.feePayer);
  assert.equal(result.messageSha256.length, 64);
  assert.deepEqual(result.requiredSignerKeys, [feePayer, mint]);
  assert.deepEqual(result.rentAccounts.map(x => x.address), [mint, pool]);
  assert.equal(result.rentReserveLamports, (82 + 512) * 1000);
  assert.equal(result.networkFeeLamports, 5000);
  assert.equal(result.requiredLamports, 697000);
  assert.equal(result.finalizedFeePayerBalanceLamports, 10_000_000);
  assert.equal(result.ownerApproval.approved, false);
  assert.equal(result.ownerApproval.reference, null);
  assert.equal(result.ownerApproval.messageHashes[0], result.messageSha256);
  assert.equal(result.transactionSigned, false);
  assert.equal(result.transactionSimulated, false);
  assert.equal(result.transactionSubmitted, false);
  assert.equal(f.calls.simulation, 0);
  assert.deepEqual(f.calls.rent, [{ space: 82, commitment: "finalized" }, { space: 512, commitment: "finalized" }]);
});
test("blocks when rent-account size/source evidence is missing instead of guessing", async () => {
  const f = fixture();
  const result = await prepareDevnetOwnerApprovalPacket({ ...args(f), rentAccountSpecs: [specs[0]] });
  assert.equal(result.status, "blocked");
  assert.equal(result.ownerApprovalCreated, false);
  assert.deepEqual(result.missingRentSpecs.map(x => x.address), [pool]);
  assert.equal(f.calls.rent.length, 0);
  assert.equal(f.calls.simulation, 0);
});
test("rejects a rent spec for an account that already exists", async () => {
  const f = fixture({ existing: [feePayer, mint, pool] });
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /does not match a currently missing writable account/);
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
test("rejects Mainnet RPC and malformed rent evidence", async () => {
  const f = fixture({ cluster: "mainnet" });
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket(args(f)), /restricted to an explicitly initialized Devnet/);
  const g = fixture();
  await assert.rejects(() => prepareDevnetOwnerApprovalPacket({ ...args(g), rentAccountSpecs: [{ address: mint, space: 82, purpose: "mint" }] }), /source reference/);
});
