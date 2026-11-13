import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  inspectRaydiumV4DirectSwapBaseInEvidence,
  RAYDIUM_V4_PROGRAM_IDS,
  RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM,
  RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES
} from "../src/raydium-v4-direct-evidence.mjs";

function rawSwap(amountIn = 1_000_000n, minimumOut = 950_000n) {
  const bytes = new Uint8Array(17);
  bytes[0] = 9;
  const view = new DataView(bytes.buffer);
  view.setBigUint64(1, amountIn, true);
  view.setBigUint64(9, minimumOut, true);
  return bytes;
}
function specimen(network = "mainnet-beta") {
  const accounts = RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES.map((role, index) => ({
    pubkey: index === 0
      ? RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM
      : encodeBase58(new Uint8Array(32).fill(index + 11)),
    writable: role.writable,
    signer: role.signer
  }));
  return {
    network,
    programId: RAYDIUM_V4_PROGRAM_IDS[network],
    data: rawSwap(),
    accounts,
    expectedAddresses: Object.fromEntries(
      RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES.map((role, index) => [role.name, accounts[index].pubkey])
    )
  };
}
function failWith(changer, expected) {
  const evidence = specimen();
  changer(evidence);
  assert.throws(() => inspectRaydiumV4DirectSwapBaseInEvidence(evidence), expected);
}

test("pinned direct Raydium V4 builder has exactly 17 explicit roles; never grants Jupiter CPI approval", () => {
  const roles = RAYDIUM_V4_DIRECT_SWAP_BASE_IN_ROLES;
  assert.equal(roles.length, 17);
  assert.deepEqual(roles.map(x => x.name), [
    "tokenProgram", "ammPool", "ammAuthority", "ammOpenOrders",
    "ammCoinVault", "ammPcVault", "marketProgram", "market", "marketBids",
    "marketAsks", "marketEventQueue", "marketCoinVault", "marketPcVault",
    "marketVaultSigner", "userTokenSource", "userTokenDestination", "userSourceOwner"
  ]);
  assert.deepEqual(roles.map(x => x.writable), [
    false, true, false, true, true, true, false, true, true, true, true,
    true, true, false, true, true, false
  ]);
  assert.deepEqual(roles.map(x => x.signer).filter(Boolean), [true]);
  const verdict = inspectRaydiumV4DirectSwapBaseInEvidence(specimen());
  assert.equal(verdict.network, "mainnet-beta");
  assert.equal(verdict.amountIn, "1000000");
  assert.equal(verdict.minimumAmountOut, "950000");
  assert.equal(verdict.directAccountCount, 17);
  assert.equal(verdict.approvedForJupiterCpi, false);
  assert.equal(verdict.deployedProgramBytecodeVerified, false);
  assert.equal(verdict.onChainOwnersMintsVaultsAndFeesVerified, false);
  assert.equal(verdict.balanceChangesVerified, false);
});

test("Raydium mainnet and Devnet IDs are distinct, and cross-network substitution fails closed", () => {
  assert.equal(RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"], "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
  assert.equal(RAYDIUM_V4_PROGRAM_IDS.devnet, "DRaya7Kj3aMWQSy19kSjvmuwq9docCHofyP9kanQGaav");
  const devnet = inspectRaydiumV4DirectSwapBaseInEvidence(specimen("devnet"));
  assert.equal(devnet.network, "devnet");
  failWith(e => { e.network = "devnet"; }, /program ID does not match/i);
  failWith(e => { e.programId = RAYDIUM_V4_PROGRAM_IDS.devnet; }, /program ID does not match/i);
  failWith(e => { e.network = "testnet"; }, /program ID does not match/i);
});

test("only exact raw Raydium V4 direct SwapBaseIn opcode 9 plus two little-endian u64s passes", () => {
  failWith(e => { e.data = new Uint8Array([9]); }, /canonical 17-byte.*opcode 9/i);
  failWith(e => { e.data[0] = 11; }, /canonical 17-byte.*opcode 9/i);
  failWith(e => { e.data = new Uint8Array(18); e.data[0] = 9; }, /canonical 17-byte.*opcode 9/i);
  failWith(e => { e.data = rawSwap(0n, 100n); }, /must be positive/i);
  failWith(e => { e.data = rawSwap(100n, 0n); }, /must be positive/i);
});

test("account-role swaps, inserted legacy target orders, missing and extra roles fail closed", () => {
  failWith(e => { [e.accounts[4], e.accounts[5]] = [e.accounts[5], e.accounts[4]]; }, /binding mismatch.*ammCoinVault/i);
  failWith(e => { e.accounts.splice(4, 0, { ...e.accounts[3] }); }, /exactly 17 ordered account metas/i);
  failWith(e => { e.accounts.pop(); }, /exactly 17 ordered account metas/i);
  failWith(e => { e.accounts[13].pubkey = e.accounts[12].pubkey; }, /binding mismatch.*marketVaultSigner/i);
});

test("no writable/signer privilege escalation on direct program, pool owner, or market signer", () => {
  failWith(e => { e.accounts[0].writable = true; }, /privileges.*tokenProgram/i);
  failWith(e => { e.accounts[2].writable = true; }, /privileges.*ammAuthority/i);
  failWith(e => { e.accounts[6].signer = true; }, /privileges.*marketProgram/i);
  failWith(e => { e.accounts[13].writable = true; }, /privileges.*marketVaultSigner/i);
  failWith(e => { e.accounts[16].signer = false; }, /privileges.*userSourceOwner/i);
});

test("explicit expected account binding catches wrong token program, source, destination, authority and market", () => {
  failWith(e => { e.accounts[0].pubkey = encodeBase58(new Uint8Array(32).fill(31)); e.expectedAddresses.tokenProgram = e.accounts[0].pubkey; }, /not classic SPL Token/i);
  failWith(e => { e.accounts[14].pubkey = encodeBase58(new Uint8Array(32).fill(32)); }, /binding mismatch.*userTokenSource/i);
  failWith(e => { e.accounts[15].pubkey = encodeBase58(new Uint8Array(32).fill(33)); }, /binding mismatch.*userTokenDestination/i);
  failWith(e => { e.accounts[16].pubkey = encodeBase58(new Uint8Array(32).fill(34)); }, /binding mismatch.*userSourceOwner/i);
  failWith(e => { e.accounts[6].pubkey = encodeBase58(new Uint8Array(32).fill(35)); }, /binding mismatch.*marketProgram/i);
  failWith(e => { e.expectedAddresses.ammPool = "11111111111111111111111111111111"; }, /binding mismatch.*ammPool/i);
  failWith(e => { delete e.expectedAddresses.ammPcVault; }, /binding mismatch.*ammPcVault/i);
});

test("invalid and duplicate direct account pubkeys cannot be accepted as on-chain evidence", () => {
  failWith(e => { e.accounts[5].pubkey = "not-a-base58-key"; e.expectedAddresses.ammPcVault = e.accounts[5].pubkey; }, /invalid (?:32-byte )?pubkey/i);
  failWith(e => { e.accounts[5].pubkey = "1"; e.expectedAddresses.ammPcVault = "1"; }, /invalid pubkey|32-byte pubkey/i);
  failWith(e => { e.accounts[12].pubkey = e.accounts[11].pubkey; e.expectedAddresses.marketPcVault = e.accounts[11].pubkey; }, /duplicate direct account keys/i);
});

test("forensic parser remains stand-alone and not wired to order authorization", async () => {
  // Structural evidence alone must NOT make the Jupiter CPI review permit a trade.
  const { requireReviewedJupiterV6CpiSemantics } = await import("../src/jupiter-v6-cpi-review.mjs");
  assert.throws(
    () => requireReviewedJupiterV6CpiSemantics({ steps: [{ variant: 7 }] }),
    /not independently verified.*wallet-signable orders remain disabled/i
  );
});
