# Climboria Signature Launchpad — Implementation Specification & Devnet Security Plan

**Status:** Architecture/specification only — NOT IMPLEMENTED, NOT APPROVED FOR MAINNET  
**Date:** 2026-11-10  
**Scope:** Dedicated Climboria Launchpad, initially Solana. Base is out of scope until a separate chain design and audit are approved.

## 1. Executive decision

The current dedicated Launchpad is an informational preview. Do not add a working Create Token / Launch button or imply that a token, pool, sale, bonding curve, liquidity position, or fee has been created until the complete transaction lifecycle below is implemented and independently verified.

Build in isolated phases. First establish product decisions and threat model; then implement a devnet-only vertical slice; then obtain independent security review; only then consider a separate mainnet release decision. Devnet success is not mainnet authorization.

## 2. Verified source map (current repository)

| Surface | Verified current role | Missing / boundary |
|---|---|---|
| `launchpad/index.html` | Static HTML/CSS page with Normal Launchpad, Developer Launchpad, and Signature Launchpad information cards; says launch services are not open | Full-file inspection found no script tags or forms. No submission, wallet, metadata, mint, pool, LP, fee, or confirmation implementation |
| Root `index.html` | Homepage `launchpadBtn`, `launchpadNavLink`, and `mobileLaunchpadBtn` navigate to `/launchpad/`; homepage contains a styled `launchpadModal` region | Navigation is not a launch backend. No verified mint or sale transaction flow was found through these entry points |
| `docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md` | Separate audit of user-provided bundled HTML | That separate artifact's Create Token handler is alert-only; findings must not be attributed to the dedicated page without source evidence |
| `dex/swap-proxy/src/index.mjs` | Existing Cloudflare Worker is for DEX/Swap proxy functions | No Launchpad create/mint/pool API route has been verified; do not reuse Swap order endpoints as a launch backend |
| `docs/TREASURY-FEE-COLLECTION-POLICY.md` | Pre-release design document; proposed Launchpad fee is 100 bps | Explicitly DESIGN ONLY; collection disabled; fee base and settlement timing unresolved |
| `docs/WHITEPAPER.md`, `docs/ROADMAP.md` | Product intent and future roadmap | Documentation is not executable code or proof of deployed contracts |

**Audit boundary:** this is a repository source/path audit, not a wallet test, chain simulation, transaction test, legal review, or security audit. No devnet or mainnet transaction has been submitted.

## 3. Proposed end-to-end product flow

1. **Discover and select launch path**
   - Explain Normal, Developer, and Signature eligibility, review, and service differences.
   - Signature path is curated/approval-based; no automatic approval or guaranteed listing.
   - Do not collect funds until terms, eligibility, refund rules, and launch mechanics are approved.

2. **Project intake**
   - Project name, symbol, description, category, website/social links, team contact, jurisdiction/eligibility attestations, and risk disclosures.
   - Validate lengths, URL schemes, Unicode/control characters, prohibited impersonation, duplicate submissions, and content policy.
   - Require authenticated creator identity and wallet ownership proof using a unique, expiring, domain-bound nonce. Never ask for seed phrases/private keys.

3. **Token configuration**
   - Solana network must be explicitly shown (Devnet in development; Mainnet only after release approval).
   - Mint decimals, total supply, initial allocation, creator allocation, treasury allocation, sale allocation, vesting/lockups, mint authority, freeze authority, and metadata mutability must be explicit before signing.
   - Preview exact raw integer amounts and decimal conversions. Enforce supply conservation: all allocations sum exactly to total supply; no hidden reserve.
   - Display irreversible authority actions prominently. No silent authority revocation or hidden admin privilege.

4. **Metadata and image**
   - Validate MIME by file signature, size, dimensions, and content; do not trust filename or browser MIME alone.
   - Sanitize text and URLs; block script/data/javascript schemes and dangerous redirects.
   - Store immutable content-addressed metadata where feasible; record metadata URI and content hash. Disclose whether metadata can later change.
   - Scan uploads and apply abuse/impersonation review. Avoid rendering untrusted SVG/HTML directly.

5. **Eligibility and human review**
   - Server-side policy checks and manual approval for Signature launches.
   - Record reviewer, timestamp, decision, reason code, and policy version.
   - Revalidate approval at transaction preparation and submission; revoke stale approvals.
   - Do not claim legal/compliance clearance merely because a form passed technical validation.

6. **Fee and liquidity disclosure**
   - Before any wallet prompt, show fee rate, exact fee base, asset, recipient, rounding, timing, third-party/network fees, refund treatment, and a sample calculation.
   - Existing proposed 100 bps is not approved for collection. Owner must finalize fee base and settlement mechanics; independent review required.
   - Show the exact liquidity model: protocol/pool, initial liquidity source, creator contribution, token/SOL ratio, LP position owner, lock/vesting duration, unlock authority, withdrawal conditions, and proof link.
   - No hidden custody. If Climboria controls funds or LP positions, disclose custody model and obtain legal/security review. Prefer non-custodial creator-controlled flow unless a different model is explicitly approved.

7. **Transaction preparation**
   - Server constructs or validates an allowlisted transaction plan from approved immutable launch configuration.
   - Client independently displays network, fee payer, mint/program IDs, accounts, instruction summary, token quantities, rent/network costs, and authority changes.
   - Reject unexpected programs, accounts, signers, writable privileges, excessive compute/fees, wrong cluster, stale config, or unapproved instruction sequences.
   - Simulate on Devnet; record simulation logs and expected account-state changes. Simulation is not proof of execution.

8. **Wallet approval and submission**
   - Verify wallet public key and selected cluster immediately before signing.
   - Bind the prepared transaction to creator, launch ID, config hash, nonce, expiry, cluster, and expected signer.
   - Re-check all bindings after wallet approval and before submission. Invalidate if wallet, cluster, config, fee, supply, or allocation changes.
   - Use idempotency keys and a durable state machine. Retries must look up the original signature/launch record; never create a second mint or sale due to a timeout.

9. **Confirmation and reconciliation**
   - Wait for finalized Devnet confirmation; parse transaction metadata and fetch resulting accounts independently from a trusted RPC.
   - Verify mint address, decimals, supply, metadata pointer/hash, authorities, creator allocation, treasury allocation, pool address, liquidity amounts, LP owner/lock state, and fee receipts.
   - Reconcile expected vs actual state; if any mismatch, mark failed/needs-review and do not publish as launched.
   - Explorer links must use the correct cluster. Never display a success badge based only on a wallet callback or signature string.

10. **Token profile, listing, history**
    - Publish only after finalized chain state and server reconciliation.
    - Bind profile to exact mint and verified metadata; symbol/name alone are never identity.
    - Show chain, mint, transaction signature, pool, liquidity evidence, authority status, LP owner/lock details, fees, and timestamp.
    - Keep an immutable audit trail of state transitions and failure/retry events.

## 4. Required launch state machine

`DRAFT → SUBMITTED → REVIEW_PENDING → APPROVED / REJECTED → CONFIG_LOCKED → TX_PREPARED → WALLET_APPROVED → SUBMITTED_ON_CHAIN → CONFIRMING → RECONCILING → LIVE_VERIFIED`

Terminal/exception states: `REJECTED`, `EXPIRED`, `CANCELLED`, `FAILED`, `NEEDS_MANUAL_REVIEW`.

- Every transition is server-authorized and append-only logged.
- `LIVE_VERIFIED` is reachable only after finalized chain confirmation plus account-state reconciliation.
- A timeout after submission is `CONFIRMING`, not `FAILED` and never a reason to blindly resubmit.
- A rejected or failed transaction cannot be shown as launched.
- State changes are idempotent and protected by creator/launch ownership checks.

## 5. Threat model and required mitigations

| Threat | Required mitigation / test |
|---|---|
| Wrong network / wallet substitution | Cluster allowlist; wallet + cluster binding; recheck before/after approval; mismatch tests |
| Malicious or altered transaction | Allowlisted programs/instructions/accounts; decode and display; reject unknown writable accounts/signers; simulation and independent instruction review |
| Replay / duplicate launch | Nonce, expiry, config hash, idempotency key, unique launch constraint; concurrent retry tests |
| Supply/allocation manipulation | Immutable approved config; integer arithmetic; conservation checks; server-side validation; post-mint account reconciliation |
| Unauthorized mint/freeze authority | Explicit authority plan; verify signer and final on-chain authority state; no hidden authority; policy decision before implementation |
| Metadata spoofing / XSS / malicious media | File-signature validation, sanitization, safe rendering, content hash, URL allowlist, upload scanning |
| Fee diversion / hidden charges | Server-controlled recipient/rate; pre-sign fee disclosure; decoded instruction verification; on-chain balance delta reconciliation |
| Liquidity rug / LP misrepresentation | Explicit owner and lock terms; verify LP token/position account, lock contract/program, unlock authority and duration; never label “locked” without proof |
| RPC/provider compromise or stale reads | Multiple independent reads for critical state, finalized commitment, compare signatures/accounts, provider health and fail-closed behavior |
| Approval abuse / impersonation | Manual review, domain-bound creator proof, reviewer audit log, rate limits, duplicate/project impersonation checks |
| Denial of service / spam | Per-wallet/IP/account quotas, CAPTCHA or equivalent where appropriate, bounded uploads, request size/time limits |
| Secrets or signer compromise | No private keys in browser/Worker/GitHub/chat; hardware or multisig custody; secret rotation and access audit |
| Privacy leakage | Minimize personal data, access controls, retention/deletion policy, avoid exposing reviewer or creator private details |
| False success / partial failure | Durable state machine, chain reconciliation, explicit pending/error states, no optimistic LIVE status |

## 6. Devnet acceptance test plan (must pass before any mainnet proposal)

### A. Intake and metadata
- Valid submission accepted; malformed fields, oversized uploads, wrong MIME, malicious URL, script payload, impersonation and duplicate submissions rejected.
- Metadata URI resolves; content hash matches; metadata update behavior matches disclosure.
- Unauthorized user cannot read or mutate another creator's draft.

### B. Wallet and configuration
- Devnet wallet connects; Mainnet wallet/cluster is rejected by dev-only build.
- Wallet disconnect, accountChanged, clusterChanged, tab refresh, expired nonce, and config edit invalidate prepared transactions.
- Decimal and allocation property tests cover 0, max, fractional display values, integer overflow boundaries, and sum mismatch.

### C. Mint and authority
- Devnet mint creation produces one unique mint; correct decimals and total supply.
- Creator/treasury/sale allocations match approved config exactly.
- Mint and freeze authorities match explicit policy; authority revocation only if explicitly approved and separately tested.
- Replayed request and concurrent retries do not create duplicate mint or allocation.

### D. Sale / fee / liquidity
- No funds accepted until fee, refund and liquidity terms are approved and visible.
- Fee calculation, rounding, fee asset, recipient and refund treatment reconcile exactly.
- Pool uses expected program, mint pair, orientation, amounts and creator-approved parameters.
- LP ownership and lock/vesting state are verified from chain; failure to verify blocks LIVE status.
- Failed/aborted launch returns or accounts for funds according to disclosed, tested refund rules.

### E. Confirmation, history and resilience
- Simulated, submitted, processed, confirmed and finalized states are distinct.
- RPC timeout after submit resolves by signature lookup, not duplicate submit.
- Provider outage, rate limit, malformed response, stale data, dropped transaction and insufficient funds fail safely.
- Finalized state is independently fetched and reconciled before profile publication.
- Audit history records actor, timestamp, config hash, transaction signature and state transition.

### F. Security and release
- Unit, integration, browser E2E and static analysis pass on the same commit.
- Devnet end-to-end test is reproducible from a clean environment.
- Independent reviewer signs off on transaction construction, program allowlist, fee routing, custody/LP model and authority policy.
- Mainnet feature flags remain disabled until separate release approval, production monitoring, incident response and rollback plan exist.

## 7. Product decisions required before implementation

| Decision | Current evidence/status | Required owner decision |
|---|---|---|
| Launch mechanism | No program/contract verified | Choose direct mint + pool, bonding curve, or audited launch protocol |
| Launch path differences | Three static cards only | Define eligibility, fees, review and controls for Normal / Developer / Signature |
| LP ownership | Not implemented or verified | Creator-owned, Climboria-controlled, or protocol-managed; specify lock/unlock |
| Liquidity funding | Not implemented | Creator contribution, treasury, sale proceeds, or other source; define amounts and timing |
| Sale/fundraising | Not implemented | Whether fundraising exists at all; custody, escrow, allocation, refunds and jurisdiction review |
| Launchpad fee | Proposed 100 bps only; base/timing unresolved | Approve or reject rate, fee base, asset, recipient, settlement and refund treatment |
| Token supply | Not defined in code | Defaults, min/max, decimals, allocation caps and vesting |
| Mint/freeze/update authorities | Not defined in code | Retained/revoked authority policy and multisig/governance model |
| Metadata permanence | Not defined | Immutable vs updateable, update authority and storage provider |
| Creator verification | Not implemented | Required proof, reviewer roles, privacy and retention |
| Launch approval | Signature says selected projects, rules not finalized | Review rubric, rejection/appeal, prohibited categories and reviewer audit |

No implementation may silently choose defaults for these economic/custody decisions.

## 8. Implementation sequence and gates

1. **Decision gate:** resolve the table in section 7; legal/compliance review where applicable.
2. **Architecture gate:** select audited Solana programs/protocols; publish account/instruction diagrams and threat model; confirm custody and recovery model.
3. **Devnet vertical slice:** intake → review → config lock → transaction prepare/sign/submit → finalized verification → profile; no real funds or mainnet.
4. **Adversarial testing:** execute section 6 and threat-model tests; independent review.
5. **Mainnet proposal:** separate owner approval, production key management, monitoring/incident response, fee disclosures, terms and rollback. No automatic promotion from Devnet.

## 9. Current status

- Dedicated page is preview-only; no launch flow is implemented.
- No Launchpad API route, Solana program, mint transaction, pool, LP lock, fee collection, or end-to-end test has been verified in the repository audit.
- No Devnet or Mainnet transaction was performed in this work unit.
- No test run was triggered: this commit adds documentation only.
- **Exact next job:** obtain owner decisions for the 11 rows in section 7, prioritizing launch mechanism, LP ownership/funding, sale vs direct launch, fee base/asset/recipient, and authority policy. Then map selected audited Solana protocol/program instructions and define the devnet architecture before coding.


## Owner decision update — 2026-11-10
**APPROVED:** bonding-curve launch architecture with Raydium LaunchLab as the intended integration; **NO public deposits/fundraising** (no presale, auction, contribution escrow or allocation claims from public deposits). This supersedes the open mechanism/fundraising questions above. Other economics, fee, authority and LP questions remain unresolved. See [bonding architecture](./SIGNATURE-LAUNCHPAD-BONDING-ARCHITECTURE.md). The earlier generic sale/escrow/claim flow is an unselected alternative, not the approved implementation scope.
