# Native Swap/DEX release — operator evidence checklist

**Status: NO-GO for wallet-signable orders and on-chain execution.** This is an operator checklist, not a release authorization. Quote-only production Worker deploy for commit `b724a602047600000ef239a6514914deb2e11a87` passed [Actions run 43573594485](https://github.com/CryptoDilis/Climboria/actions/runs/43573594485). Its logs explicitly say `SOLANA_RPC_URL` was unset. No actual signed swap or finalized settlement was verified.

## Phase A — prerequisites, private operator environment

1. Provision **two independently operated Solana HTTPS RPC endpoints** with different infrastructure/operators. Do not put credentials, endpoint tokens or wallet secrets into issues, PRs, logs, screenshots, or committed files. Use approved encrypted secret management. Confirm TLS, RPC rate limits, access control and key rotation.
2. Independently corroborate genesis and network identity for both endpoints, then collect matching finalized slots and full account/ProgramData evidence for the exact Jupiter V6 and Raydium V4 programs under review. A matching RPC response alone is not independent proof of authentic ledger state.
3. Compare deployed full ProgramData bytes, program authority/upgrade status and SHA-256 against independently reviewed source/binary builds. Audit CPI account ordering, signer and writable roles, vault ownership, transfer authority, slippage/fees and all supported route variants. Record reviewer identity, immutable artifact digests and any exceptions **without exposing credentials**.
4. Record a signed approval or explicit NO-GO from a reviewer independent of the implementer. Do not substitute synthetic fixture tests for real on-chain evidence.

## Phase B — controlled end-to-end transaction evidence

1. Select a supported Devnet route or isolated validator with the **actual reviewed program semantics**. If Jupiter or Raydium does not support the chosen network/route, mark BLOCKED; do not pretend an unrelated mock trade is equivalent.
2. Capture original unsigned v0 wire, wallet-signed wire, verified taker signature, request ID, expiry/blockhash and lastValidBlockHeight. Exercise Durable Object one-time claim, single submission, and replay denial.
3. Obtain finalized transaction evidence independently from both RPCs: signature, slot, message/instructions, actual fees and before/after owner/mint/raw token balances. Reconcile the exact stored `claimedSignature` and transaction wire. Treat provider `Success` or `Failed` as **unconfirmed** until independent finality is established.
4. Run negative cases: mismatched/omitted signature, wallet rejection, provider timeout after possible submission, duplicate claim, expired blockhash, conflicting RPC observations, delayed finality, token-account changes, fee/slippage caps and rollback.
5. Independently audit and implement a **privileged authenticated post-finality Durable Object transition** before allowing `completed` or terminal `failed`. Current `/settle` intentionally rejects both; do not modify it merely to make a green demo.

## Phase C — release controls

- Confirm incident response, monitoring, RPC outage handling, immutable reconciliation records, abuse limits, secret rotation and rollback.
- Open a separate scoped Swap/DEX release PR with independent review, tests, a reversible staged rollout and a precise operator signoff.
- **Only after all evidence is accepted** consider reviewing the hard source gates `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE`, `EXECUTION_SECURITY_REVIEW_COMPLETE`, Wrangler `EXECUTION_ENABLED`, and frontend `enabled`. Never flip any gate just to pass a deadline.
- Verify the exact deployed SHA in `GET https://api.climboria.fun/health`, and run `CLIMBORIA_EXPECTED_DEPLOY_SHA=<actual-deployed-40-character-sha> node .github/scripts/api-production-readiness.mjs` in a network-capable operator environment. **Important:** this existing production readiness probe requires execution to remain disabled; it is a quote-only baseline, not a validation of a future execution-enabled release. An execution release requires its own independently audited production probe.

## Evidence handoff format (no secrets)

| Gate | Required artifact | Current status |
| --- | --- | --- |
| Production quote-only | Exact SHA + successful deployment and quote/search checks | PASS for `b724a602...` |
| Two independent RPCs + genesis | Signed operator provenance and finalized corroboration | BLOCKED / not provided |
| Jupiter/Raydium deployed bytecode/CPI | Independently reviewed digests and authority/fee audit | BLOCKED / not provided |
| Real signed controlled swap | Original/signed wire, one-time claim, finalized balance/fee reconciliation | BLOCKED / not provided |
| Privileged finalized DO transition | Reviewed implementation and adversarial tests | NOT IMPLEMENTED |
| Independent release approval | Named accountable reviewer, rollback and monitoring | NOT PROVIDED |

Every meaningful action and exact next step must also be appended to `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`. Do not modify Game, ClimbX or Launchpad.
