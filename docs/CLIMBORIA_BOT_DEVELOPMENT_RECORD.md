# Climboria Signature Bot — Development Record & Handoff

**Last updated:** 2026-11-13  
**Status:** DESIGN / SPECIFICATION ONLY — no bot implementation, tests, live trading, or deployment verified.  
**Repository:** CryptoDilis/Climboria  
**Scope:** Climboria DEX integrated Solana autonomous trading bot. This document is the continuity record for future developers and chat sessions.

> IMPORTANT: Existing DEX swap execution is currently quote-only and intentionally disabled. See `dex/EXECUTION_READINESS.md` and `dex/swap-proxy/wrangler.toml` (`EXECUTION_ENABLED = "false"`). Do not enable live bot execution or represent it as working until the required proofs and security review are complete. Do not modify DEX readiness, deployments, or other active workstreams as part of this documentation task.

## 1. Product decisions — agreed

- Product: **Climboria Signature Bot**, tagline **"You Dictate. It Climbs. It Learns."** Embedded in Climboria DEX only, free to start, no subscription.
- Five independent strategy slots immediately available: **Sniper, Safe, Whale, Scalper, Custom/Learner**. Independent filters, buy amounts, TP/SL/time exit, learning, and speed mode. One active token position per slot for V1; partial exits keep slot occupied. Shared wallet, coordinator, executor and profit ledger.
- **Auto re-entry enabled** after a slot's position is fully closed and confirmed, while authorization and risk checks remain valid. No duplicate token positions across slots in V1.
- **24-hour authorization**, manual renewal only. Stop new entries 30 minutes before expiry. After expiry, no unattended new buys or exits; owner may need to renew or manually close holdings. Never silently extend permissions. Pause stops new entries; revocation must not be blocked by fees.
- User chooses trading capital and per-slot amounts. **No Climboria-imposed fixed 1 SOL daily budget or arbitrary product min/max.** Still require finite owner-approved aggregate spending scope, per-order restrictions, gas/priority-fee limits, sufficient balance, and provider technical minimums.
- User pays network/transaction fees. **10% performance fee on eligible cumulative net profit across all five slots**, not each profitable trade; net losses and costs offset gains; high-water-mark/loss carryforward prevent double charging. No eligible profit = no fee.
- Fee collection preference: session-based settlement, separate narrowly scoped fee authorization; if no secure unattended settlement mechanism is proven, require an explicit wallet-signed fee payment. **Do not claim guaranteed collection on revocation or withdrawals in a non-custodial wallet.** Owner can revoke regardless of unpaid fee.
- Target 10x means **+900% gain** relative to entry, not +1000%; TP controls must accommodate this.
- Learning records trades and suggests changes after ~20 completed trades; **never automatically change strategy without explicit owner YES/NO approval**.
- UI English, controls/chips/sliders/toggles rather than chatbot or typed commands. Normal/Fast/Turbo are execution preferences, not guaranteed fill speeds.

## 2. Strategy configuration reference

Original requested filters: liquidity bands (5k/10k/50k/100k+), 1h volume states, token age (<1h, <24h, 1 week+, any), token security heuristics, whale buys (e.g. 5 SOL+ in 1h), buy-size presets (0.05/0.1/0.5/1 SOL) plus custom amount, trades/day, speed mode, TP1/TP2/TP3, partial sell fractions, SL (-5/-10/-20/-30%), trailing stop, and time-based exits. Presets are suggestions, not mandatory minimums.

Security heuristics are **not guarantees**; EVM concepts such as 'contract renounced' do not map directly to Solana. Solana-specific security checks and data provenance must be designed and validated. No fabricated whale data or unsupported guarantees.

## 3. Architecture

```text
Climboria Bot Dashboard (controls only; browser may close)
      |
Authenticated Bot API + wallet ownership verification
      |
24h Authorization Gateway / scope / expiry / revocation
      |
Live Market Listener --> 5 parallel Strategy Evaluators
      |                        |
      +------ Signal Queue ----+
                    |
          Wallet-scoped Fund Manager
          (durable atomic reservations)
                    |
       Risk Gate / Authorized Route Check
                    |
           Shared Turbo Executor
                    |
      Tx Reconciliation / Position Manager
                    |
       PnL Ledger / Fee Settlement / Learning
```

Backend must run independently of the browser. Market events via streaming where supported, precompiled strategy settings, fresh quotes, bounded priority fees, priority exits, durable idempotency, and reconciliation before retries. Do not promise <50ms or end-to-end latency without measured tests.

## 4. Solana security feasibility — BLOCKER

Owner wants **non-custodial, offline autonomous trading** with restricted delegated authority, not seed/private key collection or unrestricted signing.

A normal wallet-reviewed Jupiter swap requires a fresh owner signature. Standard SPL token delegation **does not generically authorize arbitrary Jupiter swaps or native SOL spending**. An unreviewed backend signer, broad wallet session, or signature on terms is not adequate. Need to prove a reviewed Solana program/smart-account/permission mechanism enforcing:
1. Owner-approved finite aggregate spend, supported assets and approved programs/routes.
2. 24h on-chain or equivalent independently enforceable expiry; owner-controlled revocation.
3. No arbitrary transfer or bypass through CPI/remaining accounts.
4. Native SOL, fees, token account rent, WSOL handling, transaction signers, and route compatibility.
5. Concurrency safety and no execution beyond approved scope.
6. Verifiable actual settlement, failure behavior, and recovery.

**Paper trading only until this is proven on a controlled validator/devnet with supported routes and independently reviewed.** Do not deploy a new custom Solana contract before comparing reviewed existing permission solutions.

## 5. Smart Fund Manager — agreed design

One owner wallet -> one wallet-scoped allocation coordinator -> five independent slots.

```text
spendable = max(0,
  fresh_confirmed_SOL
  - durable_active_buy_reservations
  - pending_transaction_exposure
  - dynamic_fee_and_rent_reserve
)
```

Account for finite remaining delegated allowance, exact quote requirements, fees and slippage. All amounts stored as integer lamports/raw units; no floating point accounting.

- **Atomic wallet-scoped reservations** with durable storage/serializable transactions. In-memory mutex alone is insufficient across workers/restarts.
- Exits and reconciliation have priority over new buys. At equal buy priority, fair/rotating scheduling; optional owner priority later.
- If configured buy amount cannot be covered, **skip buy and keep scanning**; do not silently reduce size.
- Short-lived opportunity queue: initial proposed TTL 5s Sniper/Scalper, 30s others, to be tuned with data; every queued signal requires full revalidation.
- Do not reuse expected sell proceeds before confirmation and reconciliation.
- Do not treat database reservation as on-chain fund lock: owner/other apps can move wallet funds. Fresh on-chain checks and permission enforcement remain mandatory.
- Prevent duplicate token positions across slots and multiple pending orders for the same slot. Pending/partial sells keep slot occupied.
- Reservation lifecycle: CREATED -> RESERVED -> SUBMITTED -> CONFIRMED -> RECONCILED; explicit FAILED/EXPIRED/UNKNOWN branches. UNKNOWN must reconcile before retry; never blindly create duplicate buys.

## 6. Authorization adapter contract — proposed

Provider-independent TypeScript service with methods:
- `verifyAuthorization(wallet)`
- `validateSwapIntent(intent, scope)`
- `prepareAuthorizedSwap(intent)`
- `submitAuthorizedSwap(orderId)`
- `reconcileTransaction(orderId)`
- `revokeAuthorization(wallet)` (may return owner-signature-required instructions)

Scope includes wallet, expiry, finite total spend, permitted input/output mints, permitted programs/routes, and maximum priority fee. Owner must control on-chain revocation. Fail closed if status, permission, balance, quote, or transaction safety is unknown.

Implement **Paper Adapter first**, then a Solana Adapter only after permission feasibility and route compatibility are proven. Do not assume current Jupiter Order & Execute API can sign under delegated authority.

## 7. Profit / fee accounting

- Per-wallet portfolio ledger across all five slots; use confirmed actual fills, lot cost basis, realized gains/losses, slippage, network/priority fees, and token-account/rent effects as applicable.
- Normalize PnL into a clearly defined denomination (initial SOL-based strategies), with explicit conversion methodology for multi-asset flows; avoid mixing token units.
- Cumulative high-water mark and loss carryforward: no fees until prior losses recovered and new eligible profits exceed prior assessed profit.
- Session settlement when eligible, not per winning trade. Defer fee assessment if unresolved fills or material open losses/unreliable valuations could overstate profit. Keep fee authorization separate from trading authorization.
- Owner withdrawal from an existing non-custodial wallet is not a bot 'withdraw' event; do not falsely promise forced fee capture on withdrawal or revoke.
- Idempotent fee assessment and settlement; no double charges on restarts or retries.

## 8. Suggested backend schema / APIs (not yet implemented)

Tables: `bot_wallets`, `bot_authorizations`, `bot_slots`, `bot_positions`, `bot_orders`, `bot_fills`, `bot_reservations`, `bot_fee_ledger`, `bot_fee_authorizations`, `bot_fee_settlements`, `bot_learning`, `bot_events`. Use immutable audit/event history and unique order/fill/fee keys.

Proposed API routes: `POST /bot/auth/challenge`, `POST /bot/auth/verify`, `POST /bot/authorization`, `PUT /bot/slots/:id`, `POST /bot/slots/:id/start`, `POST /bot/slots/:id/pause`, `GET /bot/positions`, `GET /bot/performance`, `POST /bot/fee/settle`. All privileged operations must verify wallet ownership and current authorization server-side.

## 9. Test acceptance matrix — NOT YET RUN

- Five simultaneous buys never exceed confirmed available and authorized funds.
- Duplicate signal produces one logical order; duplicate chain events produce one fill and one fee assessment.
- Manual wallet spending causes invalid pending new buys to be rejected.
- Pending sell proceeds unavailable until confirmed; partial fills/partial exits reconcile correctly.
- RPC timeout/unknown submission reconciled before retry; crash recovery does not duplicate trades.
- Authorization expiry and owner revocation prevent future delegated actions; no silent renewal.
- Priority-fee spike, stale quote, insufficient SOL for fees/rent, unsupported route, unexpected instruction all fail closed.
- Two slots targeting same token cannot open duplicate wallet positions.
- Equal-priority slots do not starve indefinitely.
- Profit accounting handles losses across slots, high-water marks, open/unresolved positions, failed trades and restart recovery.
- Security tests include route/instruction tampering, CPI bypass, token-account authority, session key compromise and over-budget attempts.

## 10. Development sequence / status

| Milestone | Status | Next evidence |
| --- | --- | --- |
| Product requirements and architecture | DOCUMENTED | Review this record |
| Fund Manager design | DOCUMENTED | Implement atomic reservations and tests |
| Authorization adapter design | DOCUMENTED | Implement paper adapter |
| Paper trading engine | NOT STARTED | Simulated fills, exits, re-entry, concurrent slots |
| Solana delegation feasibility | BLOCKED / UNPROVEN | Controlled proof of offline buy/sell, expiry, revoke, caps |
| Turbo Executor | NOT STARTED | Submission/reconciliation tests |
| Fee settlement authorization | UNPROVEN | Narrow permission or wallet-signed fallback |
| Independent security review | NOT STARTED | Written review and remediation |
| Mainnet enablement | DISABLED | All security and acceptance gates |

### NEXT ACTION FOR ANY DEVELOPER OR FUTURE CHAT

1. Read this entire file **first**, then `dex/EXECUTION_READINESS.md`, `dex/swap-proxy/wrangler.toml`, and current DEX readiness docs.
2. Confirm current repo state before modifying anything; other workstreams may be active.
3. **Start Phase 10: implement a standalone Paper Trading Engine V1 and tests** with five slots, wallet-scoped atomic Fund Manager, fake authorization adapter, simulated market events/fills, TP/SL/time exit, re-entry, PnL ledger, and restart/idempotency tests.
4. In parallel, conduct a **read-only comparison of existing Solana restricted delegation solutions** against offline Jupiter-compatible swaps, SOL fees, expiry, revocation, spend caps, and instruction restrictions. Record evidence, limitations and proof requirements.
5. Do not switch on real-money trading, alter production deployment flags, commit executable changes, merge, or deploy without explicit user authorization for that work. This record's creation authorizes **documentation only**.
6. Update this record after each milestone with dated completed work, evidence (tests/commits), blockers, and the next action. Never mark planned work as completed.

## Scope boundaries

Other chat/developer work owns Climboria DEX live swap, launchpad, authentication, game, whitepaper, and deployment readiness. Bot development should avoid interfering with those tasks. 'Climboria-only' currently means Climboria's interface/backend; Jupiter may route through third-party liquidity pools. Restricting to Climboria-owned pools would be a different requirement and needs an explicit decision.

---
**Handoff rule:** This file is the canonical Climboria Signature Bot continuity record. When a chat ends, resume from the latest dated milestone and verified repository state, not assumptions or previous chat claims.

## 2026-11-13 — Phase 10 local prototype checkpoint

**Verified local work (NOT committed to this repository):** Created a standalone Node.js paper engine (`engine.mjs`), tests (`engine.test.mjs`), and README. Ran `node --test engine.test.mjs`: **8 passed, 0 failed**. Cases: five sequential simultaneous-intent buy allocations against one simulated balance, duplicate signal, duplicate token across slots, partial/final exits, expiry/revocation, JSON snapshot/restart idempotency, manual balance reduction, and paused slot.

**Limits:** This is a local deterministic simulation, NOT a real concurrent multi-worker test or production backend. No real RPC, Jupiter, wallet delegation, fee ledger, TP/SL triggers, auto re-entry, or live trading. No executable code has been committed or deployed. Local prototype was delivered as a ZIP attachment in the chat; to adopt into repo, explicitly authorize a separate code review/commit.

**Next:** Extend paper engine with durable asynchronous wallet-scoped reservations, pending order states and reconciliation, TP/SL/time exit, auto re-entry, and high-water-mark fee accounting. Add adversarial concurrent-worker and crash-recovery tests. Separately validate Solana restricted delegation before any real-fund work.


## Phase 11 checkpoint — 2026-11-13 (local paper prototype V2)

**Verified locally:** Node.js test run passed **16/16 tests** (8 V1 regression + 8 new V2 tests). The paper-only V2 ZIP was generated as a conversation artifact; **the executable source is not committed to this repository**. No live trading, real Solana authorization, or deployment was performed.

Added in local V2: wallet-scoped *simulated* pending buy reservations, duplicate pending signal/mint protection, TTL expiry, 30-minute pre-expiry entry cutoff, full-position take-profit and stop-loss price-event triggers, and JSON file snapshots via temporary file + rename. New tests cover fund contention, reservation idempotency, expiry/release, confirmation once, TP, SL authorization expiry, restart restore, and entry cutoff.

**Limitations/blockers:** The manager is synchronous and file-backed, **not multi-process serializable or crash-safe journaling**. It does not model live on-chain transaction uncertainty, actual fees/rent/slippage, verified price feeds, partial TP ladders, trailing stops, automatic re-entry scheduling, fee high-water mark, or delegated Solana execution. Paper price triggers are not executable quotes. No real-funds safety claim.

**Next action:** Phase 12: design/implement transactional persistent reservation and order journal (SQLite/Postgres or suitable Durable Object per-wallet coordination), model SUBMITTED/UNKNOWN/CONFIRMED states, reconcile-before-retry, add crash/fault-injection tests and explicit cost/fee model. Keep all live execution flags disabled until independent security validation. Other DEX workstreams remain out of scope.


## Phase 12 checkpoint — 2026-11-13 (local SQLite paper journal V3)

**Verified locally:** 10/10 Python unittest cases passed. A separate offline SQLite-backed prototype was created as a conversation ZIP, **not committed to GitHub** and **not yet integrated with the JavaScript V2 engine**. It uses WAL, FULL synchronous, BEGIN IMMEDIATE, unique active slot/mint constraints, idempotent order IDs, append-only state events, and simulated RESERVED -> SUBMITTED -> UNKNOWN -> CONFIRMED/FAILED transitions. Expiration only releases unsubmitted reservations; unknown/submitted reservations survive restart and cannot be released by TTL alone. Tests cover five-slot contention, duplicate order IDs, duplicate slot/mint, expiration, UNKNOWN retention, idempotent confirmation, failure release, restart recovery, two SQLite connections, and prevention of confirming an unsubmitted order.

**Still unproven:** real chain signature verification, externally validated reconciliation, wallet activity outside the bot, multi-host serialization, authorization scope enforcement, crash-safe intent-before-send outbox, transaction expiry/finality checks, native SOL/rent/fees/slippage, automated TP/SL integration, full position/fee ledger, and independent security review. No real trading enabled.

**Next:** Phase 13 should integrate the paper journal with the existing JS engine or select one coherent runtime, implement a durable intent-before-submit outbox and reconciler state machine with injected crashes, add owner-authorization expiry/fee-reserve constraints and complete end-to-end paper trades. Do not deploy or enable live execution without proof and approval.


## Phase 13 checkpoint — 2026-11-13 (local integrated paper executor V4)

**Verified locally:** 20/20 Python unittest cases passed (10 V3 journal regression + 10 new integrated paper-engine tests). A ZIP containing `journal.py`, `integrated.py`, both test files and README was generated locally. **Executable V4 source has not been committed to GitHub.** No deployment or live trading flags changed.

V4 integrates the SQLite journal with persistent paper positions and wallet balance: reserve -> simulated submit -> simulated confirmation -> position creation, full-position TP/SL on supplied price events, atomic simulated exit proceeds and realized PnL, restart recovery, duplicate mint/slot protection, authorization expiry/revocation checks, and 30-minute pre-expiry new-entry cutoff. Reconciliation of an already-submitted order is allowed after authorization expiry/revocation, since recording a historical confirmed outcome is not a new delegated trade. The tests caught and corrected an arithmetic expectation: 1,080 available simulated units after buying 100 at price 1, selling 100 at price 2, and retaining a 20-unit reserve from 1,000 starting units.

**Known blockers:** no actual outbox or external reconciliation, exit orders are not journaled as pending, no live RPC/signing/Jupiter, no fees/rent/slippage or partial fills, no TP ladder/trailing/time exits, no automatic re-entry scheduler, no multi-host concurrency guarantees, no fee high-water-mark ledger, no verified Solana delegated authority. Caller-supplied simulated outcomes/prices are not trusted chain evidence. This prototype is NOT production-safe.

**Next Phase 14:** model durable exit order lifecycle and position locking, reconcile UNKNOWN exits before releasing/re-entering, implement a deterministic simulated quote/fee model and partial exits, and fault-injection tests for crash boundaries. Keep mainnet execution disabled.
