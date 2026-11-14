# Climboria Swap / DEX — three-model adversarial code-review packet
**Prepared:** 2026-11-15 PH
**Repository:** https://github.com/CryptoDilis/Climboria
**Frozen review target:** `bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b` (`main` at packet creation; do not silently switch to newer commits)
**Scope:** Solana Swap/DEX wallet signing, Jupiter v2 order/execute contract, Jupiter V6 CPI routes, Cloudflare Worker and Durable Object order/replay state, token account verification, two-RPC receipt evidence.
**Out of scope:** Game, ClimbX, Launchpad, branding, visual design.

## Truthful current deployment status

- Climboria Swap and DEX **quote-only** behavior is deployed and has passed production desktop/mobile browser acceptance.
- In the Worker source, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false` and `EXECUTION_SECURITY_REVIEW_COMPLETE = false`. The deployed execution source paths remain disabled; **no production mainnet wallet-signed swap has been verified**.
- Jupiter V6/Raydium V4 were compared using two configured private RPC endpoints for *reported* finalized metadata and publicly observed upgrade slots/authorities. **This is not independently authenticated ledger finality or source-to-deployed-program parity.**
- `jupiter-v6-cpi-review.mjs` explicitly throws for every structurally supported route variant because downstream DEX program CPI account semantics, vault custody, authority/fees and split execution have not been audited.
- Offline diagnostic `operator-claimed-order-finality-check.mjs` may correlate a claimed order with observed two-RPC receipts. It is not a privileged, independently authorized final-state transition and does not provide permission to sign or execute.
- Passing synthetic regression tests, even 325/325, does NOT establish absence of critical bugs. No AI reviewer, including ChatGPT, may declare this safe for unsupervised customer funds based on source inspection alone.

## Source-of-truth files — review ALL relevant code, not just the README

- **Worker HTTP API / release gates:** [`dex/swap-proxy/src/index.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/index.mjs)
- **Durable Object order claim / settlement / cleanup:** [`dex/swap-proxy/src/order-store.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/order-store.mjs)
- **Solana v0 parser and Ed25519 transaction validation:** [`dex/swap-proxy/src/transaction-validation.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/transaction-validation.mjs)
- **Jupiter V6 structural route policy:** [`dex/swap-proxy/src/jupiter-v6-policy.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-policy.mjs)
- **Explicit fail-closed CPI review boundary:** [`dex/swap-proxy/src/jupiter-v6-cpi-review.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-v6-cpi-review.mjs)
- **Solana token and ALT RPC verification:** [`dex/swap-proxy/src/solana-rpc.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/solana-rpc.mjs)
- **Execution provider outcome handling:** [`dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/jupiter-execution-outcome-policy.mjs)
- **Original claimed order to dual-RPC evidence (offline only):** [`dex/swap-proxy/tools/operator-claimed-order-finality-check.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/operator-claimed-order-finality-check.mjs)
- **Full signed-wire finalized receipt correlation:** [`dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/correlated-finalized-swap-evidence.mjs)
- **Finalized transaction wire evidence:** [`dex/swap-proxy/src/finalized-order-wire-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/finalized-order-wire-evidence.mjs)
- **Two-RPC balance/fee receipt evidence:** [`dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/src/dual-rpc-finalized-swap-receipt-evidence.mjs)
- **Native order/settlement state-machine documentation:** [`docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_EXECUTION_SETTLEMENT_STATE_MACHINE.md)
- **Worker security regression tests:** [`dex/swap-proxy/test/worker.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/worker.test.mjs)
- **Durable Object replay-state regression tests:** [`dex/swap-proxy/test/order-store.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/order-store.test.mjs)
- **Jupiter route policy regression tests:** [`dex/swap-proxy/test/jupiter-v6-policy.test.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/test/jupiter-v6-policy.test.mjs)
- **Operator program metadata read-only inspection:** [`dex/swap-proxy/tools/operator-dual-rpc-program-provenance-report.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/operator-dual-rpc-program-provenance-report.mjs)
- **Operator deployed ProgramData digest checker (requires independent pins):** [`dex/swap-proxy/tools/jupiter-raydium-bytecode-digest-report.mjs`](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/dex/swap-proxy/tools/jupiter-raydium-bytecode-digest-report.mjs)

Related evidence:
- [Native execution operator checklist](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_NATIVE_EXECUTION_OPERATOR_CHECKLIST.md).
- [Development record](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md) (very long; prefer latest checkpoints).
- [Release source: quote-only frontend configuration](https://github.com/CryptoDilis/Climboria/blob/bffc8379fd4ddf0a2c68d7ca13106f4d69fe408b/swap-config.js).

If you cannot access a linked file, **explicitly say so and request its actual contents**. Do not claim to have audited a file that you have not opened. Do not use a summary or copied brief alone as evidence for a finding.

## Core prompt — paste into Grok, Meta AI and Gemini independently

> Perform an **adversarial security code review**, not a promotional summary, of Climboria Solana Swap/DEX at the pinned GitHub commit linked above. Open and read the actual Worker, Durable Object, transaction parser, Jupiter CPI policy, receipt verification and associated tests. Assume an attacker controls Jupiter/API responses, token account inputs, malformed Solana v0/ALT transactions, wallet/session race conditions, provider delays, RPC output and repeated requests—but not the user's wallet private key.
>
> Specifically try to find theft-of-funds, arbitrary authority/signing, writable-account privilege escalation, malicious CPI/vault substitution, fee or minimum-received bypass, unsigned/signed wire mismatch, ambiguous finalized receipts, replay/DoS, claim/settle race, expiration/retention/data loss, chain mismatch and secrets leak. Identify TOCTOU from upgradeable program changes, a routed/split hop with unreviewed CPI accounts, and provider "Success" incorrectly treated as authenticated settlement.
>
> Return **only grounded findings** with severity (Critical/High/Medium/Low), exact file and line/function, trigger, attacker capability, concrete exploit path or defensible reason it fails, and a minimal test or diff to demonstrate. Separate confirmed bugs from hypotheses that require runtime or live-chain evidence. Prioritize the **three highest-risk actionable** issues; explain what needs external Solana bytecode/source evidence to verify. Conclude with separate statuses: (A) safe to keep quote-only live? (B) safe for supervised non-customer test? (C) safe for unrestricted customer-funded swaps? Say `INSUFFICIENT EVIDENCE` when you cannot know.
>
> DO NOT assume green CI means safe; DO NOT recommend disabling source signing/execution gates or bypassing `requireReviewedJupiterV6CpiSemantics`. Do not request wallet seed phrases, private RPC URLs, API secrets or real customer funds. Review this frozen commit, and say which files you actually accessed.

## Independent reviewer assignments (use SAME core prompt plus this final instruction)

**Grok — red-team focus.** Seek adversarial Solana transaction-structure/CPI/account-index/ALT attacks, Jupiter v2 response forgery and exploitable fee/vault/authority substitutions. Demand a transaction fixture or exact counterexample.

**Gemini — protocol/invariants focus.** Check original unsigned v0 message vs signed wire, cryptographic Ed25519 validation, specific Jupiter and Raydium CPI layout assumptions, source-to-binary/provenance limitations, explicit slippage/minimum-output and final balance invariants. Demand precise line-level evidence.

**Meta AI — state-machine and deployment focus.** Attack Worker / Durable Object order issuance, one-time claim, provider status, retries, alarms, cleanup, replay retention, quote-only runtime/source gates, API secrets and browser wallet/session release switches. Demand a failing test for each claim.

## Output contract for each reviewer

1. Reviewer/product and **which commit + file contents they genuinely inspected**.
2. **Three highest severity findings first**, each with file:line, proof/exploit, recommended fix, and at least one negative test; if no findings, say **'no confirmed issue from accessible files'**, never 'audited safe'.
3. Suspected issues requiring live/provider/on-chain evidence, clearly labelled as such.
4. Remaining **independent human/third-party evidence gaps**, including executable ProgramData SHA-256 and CPI/vault control semantics.
5. Release conclusion: `QUOTE-ONLY` / `CONTROLLED TEST ONLY` / `PUBLIC EXECUTION`, with explicit reasons. Code-only AI reports cannot authorize changing `false` execution gates.

## Evidence collection / triage (owner + ChatGPT)

- Run the three model reviews in separate fresh chats, with the SAME pinned commit and links. If a model cannot read GitHub, upload just the referenced public source files or paste actual file contents; never substitute the README alone.
- Save all responses as **untrusted third-party opinions**. Record model, review date, accessible files/commit, actual finding and reproduction. Never present a model's unsupported 'safe to deploy' opinion as an independent audit.
- Bring the three reviews back to ChatGPT. Reproduce *each* valid finding in a bounded isolated test; fix one scoped Swap/DEX PR at a time with exact-head CI and production evidence. Track unresolved assertions.
- **NO-GO for native wallet-signable and on-chain customer execution** until route CPI semantics and audited deployed program/source artifacts, authenticated finality and privileged DO terminal-state process are independently verified, plus release monitoring/rollback and appropriate independent signoff. An AI consensus is not a replacement.

**Never paste API keys, full private Solana RPC URLs with tokens, Cloudflare secrets, seed phrases, wallets' secret keys or unredacted signed user payloads into external AI chats.**
