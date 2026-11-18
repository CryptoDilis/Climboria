// OFFLINE SIMULATION ONLY. Not a bridge contract, relayer, proof validator or wallet client.
// All transitions are fake test transitions: the "approval" string is deliberately NOT a real attestation.
import {rawAmount} from './supply-audit.mjs';

export const TEST_ONLY_ATTESTATION = 'MOCK_PROOF_NOT_VALID_FOR_ONCHAIN_TRANSFERS';
const NONCE_RE = /^[a-zA-Z0-9:_-]{1,120}$/;

function positive(value) {
  const amount = rawAmount(value);
  if (amount === 0n) throw new Error('NO_GO: zero-value transition');
  return amount;
}

function nonce(value) {
  if (typeof value !== 'string' || !NONCE_RE.test(value)) throw new Error('NO_GO: invalid message identifier');
  return value;
}

function sumPending(map) {
  let amount = 0n;
  for (const value of map.values()) amount += value;
  return amount;
}

export class BridgeTransferSimulator {
  #original;
  #locked = 0n;
  #wrapped = 0n;
  #pendingDeposits = new Map();
  #pendingWithdrawals = new Map();
  #seen = new Set();

  constructor(originalSupplyRaw) {
    this.#original = rawAmount(originalSupplyRaw);
    if (this.#original === 0n) throw new Error('NO_GO: original supply cannot be zero');
  }

  #ensureUnused(messageId) {
    const id = nonce(messageId);
    if (this.#seen.has(id)) throw new Error('NO_GO: duplicate or replayed message');
    return id;
  }

  #approval(evidence) {
    if (evidence !== TEST_ONLY_ATTESTATION) {
      throw new Error('NO_GO: simulation attestation missing');
    }
  }

  #assertInvariants() {
    if (this.#locked < 0n || this.#wrapped < 0n || this.#wrapped > this.#locked ||
        this.#locked > this.#original) {
      throw new Error('NO_GO: insufficient bridge backing');
    }
    const deposits = sumPending(this.#pendingDeposits);
    const withdrawals = sumPending(this.#pendingWithdrawals);
    if (this.#locked - this.#wrapped !== deposits + withdrawals) {
      throw new Error('NO_GO: in-flight escrow reconciliation mismatch');
    }
  }

  // Simulate owner token transfer into bridge escrow; no real SPL token transfer.
  lock(messageId, amountRaw) {
    const id = this.#ensureUnused(messageId);
    const amount = positive(amountRaw);
    if (this.#locked + amount > this.#original) throw new Error('NO_GO: lock exceeds original supply');
    this.#seen.add(id);
    this.#locked += amount;
    this.#pendingDeposits.set(id, amount);
    this.#assertInvariants();
    return this.snapshot();
  }

  // Simulate verified cross-chain message consumption; NOT real verification.
  mint(messageId, evidence) {
    const id = nonce(messageId);
    this.#approval(evidence);
    const amount = this.#pendingDeposits.get(id);
    if (amount === undefined) throw new Error('NO_GO: unknown or already minted deposit');
    this.#pendingDeposits.delete(id);
    this.#wrapped += amount;
    this.#assertInvariants();
    return this.snapshot();
  }

  // Simulate a Base burn before release on Solana; no actual Base token is burned.
  burn(messageId, amountRaw) {
    const id = this.#ensureUnused(messageId);
    const amount = positive(amountRaw);
    if (amount > this.#wrapped) throw new Error('NO_GO: burn exceeds wrapped supply');
    this.#seen.add(id);
    this.#wrapped -= amount;
    this.#pendingWithdrawals.set(id, amount);
    this.#assertInvariants();
    return this.snapshot();
  }

  // Simulate consuming a verified burn proof before unlocking original Solana tokens.
  release(messageId, evidence) {
    const id = nonce(messageId);
    this.#approval(evidence);
    const amount = this.#pendingWithdrawals.get(id);
    if (amount === undefined) throw new Error('NO_GO: unknown or already released withdrawal');
    if (amount > this.#locked) throw new Error('NO_GO: release exceeds escrow');
    this.#pendingWithdrawals.delete(id);
    this.#locked -= amount;
    this.#assertInvariants();
    return this.snapshot();
  }

  snapshot() {
    this.#assertInvariants();
    const pendingDepositRaw = sumPending(this.#pendingDeposits);
    const pendingWithdrawalRaw = sumPending(this.#pendingWithdrawals);
    return Object.freeze({
      status: 'OFFLINE_SIMULATION_ONLY_NO_LIVE_FUNDS',
      originalSupplyRaw: this.#original.toString(),
      escrowLockedRaw: this.#locked.toString(),
      wrappedBaseRaw: this.#wrapped.toString(),
      pendingDepositRaw: pendingDepositRaw.toString(),
      pendingWithdrawalRaw: pendingWithdrawalRaw.toString(),
      originalUnlockedRaw: (this.#original - this.#locked).toString(),
      economicallyClaimableRaw: (this.#original - this.#locked + this.#wrapped).toString(),
      uniqueMessageCount: this.#seen.size
    });
  }
}
