# Native Swap/DEX release — operator evidence checklist

**Status: NO-GO for wallet-signable orders and on-chain execution.** This is an operator checklist, not a release authorization. Quote-only production Worker deploy for commit `b724a602047600000ef239a6514914deb2e11a87` passed [Actions run 43573594485](https://github.com/CryptoDilis/Climboria/actions/runs/43573594485). Its logs explicitly say `SOLANA_RPC_URL` was unset. No actual signed swap or finalized settlement was verified.

## Private RPC setup — actionable operator handoff (2026-11-15)

**I can build and test the integration, but I cannot create API keys or paid provider accounts for the owner.** The two RPC URLs must come from two genuinely independent providers under owner-controlled accounts (candidate providers include Helius and QuickNode; current free-tier plans, limits and availability are **not** verified here). Neither ordinary public Solana RPC nor two URL paths under one provider count as independently operated private endpoints.

1. Owner creates accounts with two separate providers; creates **Solana Mainnet-Beta HTTPS RPC** endpoints with least-privilege API credentials and restricted usage. Save credentials only in the provider dashboards and GitHub encrypted secrets; **never put real URL/query tokens into Git commits, PR comments, chat, or screenshots**. Do not send wallet seed phrases.
2. In **GitHub repository Settings > Secrets and variables > Actions**, add encrypted repository secrets:
   - `CLIMBORIA_SOLANA_RPC_URL` — private primary RPC URL.
   - `CLIMBORIA_SOLANA_RPC_URL_SECONDARY` — separate provider/hostname private secondary URL.
   Under repository **Variables**, add `CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH` — public Mainnet-Beta genesis hash **independently corroborated outside either chosen RPC**. Do not guess the genesis value from provider output.
3. Once `.github/workflows/verify-swap-private-rpc.yml` is merged, choose **Actions > Verify Swap DEX private Solana RPC (read-only) > Run workflow** on `main`. The manual job runs existing genesis checks and the new two-RPC read-only `getGenesisHash` + finalized `getSlot` preflight. It fails closed for missing/malformed endpoints, same hostname, mismatched pinned hash, failed RPC or >2048 finalized-slot discrepancy. The job prints **only public slot numbers and generic fixed status**, never the URLs or provider exceptions.
4. The preflight must report **PASS** for both hostnames before any later audit step is started. It **does not establish independent infrastructure ownership, authenticated Solana finality, contract correctness, or permission to enable trading**. Collect independent provider ownership and binary/source audit evidence separately.
5. **Existing production Worker deployment expects a different legacy Actions secret** named `SOLANA_RPC_URL`. The new private RPC check intentionally does **not** change, deploy or enable the Worker. Once approved for a controlled stage, the operator can separately configure the production secret from the reviewed primary endpoint, following normal secret management; do not copy credentials into code. Do not deploy/enable native swaps based on a green preflight alone.

**CLI alternative** (local trusted operator workstation, no cloud workflow required): keep the three `CLIMBORIA_...` variables private in the local environment and run `node dex/swap-proxy/tools/operator-private-rpc-setup-check.mjs`. No signing/transaction is performed.

## Jupiter/Raydium deployed-program metadata comparison (2026-11-15)

After the **real** two-private-RPC connectivity preflight succeeds, the same protected workflow (manually dispatched on main, or automatically triggered only when its own reviewed workflow file changes on main; never on PRs/forks) also runs `node dex/swap-proxy/tools/operator-dual-rpc-program-provenance-report.mjs`, using the **existing** encrypted primary and secondary RPC URL secrets and pinned public genesis hash. No additional credentials or RPC accounts are needed.

This second, read-only step independently queries **both configured RPC hosts** for finalized Jupiter V6/Raydium V4 Upgradeable Loader program headers, derives canonical ProgramData PDAs locally, checks loader account ownership and deployment slots, then compares both providers' **program IDs, ProgramData addresses, PDA bumps, last deploy slots, upgrade authorities and immutability status**. Any missing, mismatched or unresponsive provider fails closed. Public metadata (including public upgrade authorities) may be printed, but RPC URLs, keys and untrusted transport errors are not. The code lives in `dex/swap-proxy/tools/`, deliberately outside deployed Worker source.

**This is a public-metadata consistency check ONLY.** Two matching claims do not prove independent provider operation, full allocated ProgramData SHA-256, audited source/build parity, Jupiter CPI semantics, DEX vault/fee custody, authenticated Solana ledger finality or a safe order to sign. The next prerequisite is separately reviewed full-payload hashes via `jupiter-raydium-bytecode-digest-report.mjs` with independently sourced hash pins. If no such source-reviewed digest references exist, report **BLOCKED** rather than deriving the expected digest from the same RPC being checked or approving execution.

## Verified current public checkpoints (2026-11-15 PH)

- **PASS, real two-RPC genesis and finalized-slot connectivity:** [main run 43621573449](https://github.com/CryptoDilis/Climboria/actions/runs/43621573449) matched the operator-pinned Mainnet-Beta genesis and observed 1-slot difference.
- **PASS, real two-RPC Jupiter V6/Raydium V4 upgradeable loader metadata:** [main run 43622879520](https://github.com/CryptoDilis/Climboria/actions/runs/43622879520), commit `b1085a7fd1cc6290efc702497a9722e343ff2fcd`; both providers reported finalized slot 469416561 and **identical** program IDs, canonical ProgramData PDAs, last deploy slots and upgrade authorities. **Both programs were upgradeable**, so any independently approved future trade must recheck the deployed upgrade slot and exact pinned audited binary.
- **NOT VERIFIED:** independently trustworthy RPC operators, full separately pinned bytecode digest/source parity, signed audited Jupiter CPI/vault/fee flows, real controlled wallet-signed swap/finalized settlement and privileged Durable Object final-state release. This evidence does not authorize on-chain execution or change any source/config gate.

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
