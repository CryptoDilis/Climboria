# Climboria DEX, Swap & Launchpad — Development Record / Chat Handoff

**Last reviewed:** 2026-11-14 (Philippine time)
**Repository:** `CryptoDilis/Climboria`
**Baseline observed:** `main` at `11c76a34b2da53854253670eebaa6fa52f224607`
**Owner-directed scope:** **DEX, Swap, Launchpad ONLY.** The Game is owned by a separate chat/developer. This file supersedes older cross-project priority instructions **for this workstream only**.
**State:** active development; **not** evidence that signed mainnet swaps or token launches are live.

## How to resume after a chat ends

1. **Read this file FIRST**, then fetch current `main`, open PRs and exact-head GitHub Actions runs. Do **not** assume the baseline SHA above is still current.
2. Work on **DEX, Swap and Launchpad only**. Avoid `game/`, Game assets, `GAME_CONCEPT.md`, gameplay-specific workflows and Game progress records. The other developer handles those.
3. Before every substantial change, inspect the relevant source + current remote CI. Use a focused branch/PR, preserve unrelated changes, and validate exact-head checks before merging. Shared frontend/workflows require extra conflict care.
4. **Update this same record after each meaningful completed task, test result, merge or blocker diagnosis.** Add the date, affected files, branch/PR/commit, exact run URLs and pass/fail conclusion, and one concrete next step. Refresh obsolete statuses; do not append unsupported success claims.
5. No asynchronous work is implied by this document. A future chat resumes by reading it and taking the next step, rather than repeating earlier planning.

## Current release truth (verified source and GitHub evidence)

| Area | Verified accomplishments | Still blocked / NOT verified |
| --- | --- | --- |
| **DEX** | Public static DEX market explorer, discovery, charts, liquidity/market data interface deployed through GitHub Pages; browser regression coverage. PRs [#283](https://github.com/CryptoDilis/Climboria/pull/283) canonical SOL/USDC identity, [#287](https://github.com/CryptoDilis/Climboria/pull/287) missing provider values, [#288](https://github.com/CryptoDilis/Climboria/pull/288) browser-history CI merged. | Provider freshness, mobile real-device behavior, and end-to-end market/quote availability on the actual production origin still need acceptance evidence. Website deployment does not establish order execution. |
| **Swap** | `/swap/` frontend deployed; Jupiter token search and quote-preview proxy implemented in `dex/swap-proxy/src/index.mjs`. Quote validation hardening [#286](https://github.com/CryptoDilis/Climboria/pull/286), safe production probe [#289](https://github.com/CryptoDilis/Climboria/pull/289), and quote-only RPC-optional release [#293](https://github.com/CryptoDilis/Climboria/pull/293) merged. Worker deployment workflow on [commit `72ac1d8`](https://github.com/CryptoDilis/Climboria/commit/72ac1d8e003eccb62c05b1693d8b592f90cc53d7) **succeeded** ([deploy run 43457843679](https://github.com/CryptoDilis/Climboria/actions/runs/43457843679)). | **Production readiness probe failed** on the same commit ([run 43457843923](https://github.com/CryptoDilis/Climboria/actions/runs/43457843923)): `Missing Worker binding: orderStore` / missing expected field in production `/health` response. Could reflect stale Worker/custom-domain target vs wrong runtime binding; diagnose, do not assume root cause. Do **not** claim live Jupiter quotes verified. `swap-config.js` remains `enabled: false`; source-level signable-order and execute gates remain false, so **real trading is disabled**. |
| **Launchpad** | `/launchpad/` is an informational preview with Normal, Developer and Signature sections. `docs/SIGNATURE-LAUNCHPAD-IMPLEMENTATION-SPEC.md` and `docs/SIGNATURE-LAUNCHPAD-BONDING-ARCHITECTURE.md` document Solana-first Devnet/security plan and proposed Raydium LaunchLab bonding-curve integration. | No verified creator submission, token mint, curve trading, migration, LP, fee settlement, Devnet lifecycle or production token deployment. No public fundraising/deposit vault. Mainnet launch **not approved**; fees are proposals, not collected. |

### Safety boundaries (non-negotiable)

- Keep `swap-config.js` `enabled: false`, `EXECUTION_ENABLED = "false"`, `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE = false`, `EXECUTION_SECURITY_REVIEW_COMPLETE = false` until a separately documented, independently reviewed and explicitly approved release; no temporary bypass to meet a deadline.
- Quote-only endpoint must never return a wallet-signable order, sign a transaction, or submit an on-chain trade. Production acceptance probes must not call the signable-order creation endpoint. A test/CI green status is not equivalent to verified mainnet execution.
- No private keys, seed phrases, Jupiter keys, RPC secrets or Cloudflare credentials in repo, frontend, logs, or chat.
- Launchpad must remain preview-only until program/SDK provenance, configuration, economics, creator authentication, Devnet launch-to-migration reconciliation, incident controls and independent security review all pass.
- Prefer free/low-cost infrastructure **without downgrading** authentication, validation, key management, rate limiting or asset safety.

## Exact next steps — in order

**P0 — Restore honest, verified quote-only production API.**
- Compare deployed `https://api.climboria.fun/health` JSON **schema, Worker version and target custom-domain route** against the current source; inspect Cloudflare deployment run 43457843679 and failure logs for 43457843923. Do not expose secrets or invent availability. Investigate why the production response omitted `configured.orderStore` even though the new deployment workflow reported success.
- Check Durable Object `ORDER_STORE` binding/migration and whether the custom domain serves the intended Worker revision. Make a targeted fix only after diagnosing the mismatch.
- Run/trigger the safe, read-only production API readiness check. Must pass health + binding/schema + exact-origin CORS + real Jupiter SOL search + SOL/USDC quote + disabled execution. Record run link and actual conclusion.

**P1 — DEX and Swap quote UX acceptance.**
- Test real site on desktop and mobile at `/dex/` and `/swap/`; ensure genuine provider responses, no fake prices or fabricated balances, clear loading/errors, stable token/pool selection and quote-only messaging.
- Fix one reproducible blocker per PR, add regression coverage, record exact commit/CI evidence.

**P2 — Secure signed Swap (NOT mainnet-ready).**
- Finish Jupiter v0 instruction/account semantic validation, token movement/fee-recipient proof, replay/expiry controls, Devnet or controlled-validator sign→verify→submit→finalize→balance reconciliation, independent security review and rollback plan.
- Only after explicit release approval, consider enabling transaction paths in a separate carefully gated deployment. Never infer approval from a user asking to “go live.”

**P3 — Launchpad (after read-only Swap API is stable; prototype on Devnet only).**
- Continue the existing Solana-first LaunchLab design. Verify deployed program IDs/SDK/protocol fees and security, design wallet-owned creator signing, exact curve/config allowlists and on-chain reconciliation.
- Implement a Devnet-only vertical slice with deterministic tests; do **not** represent the informational Launchpad UI as a token creation service.

## Change log

### 2026-11-14 — Workstream continuity record created
- **Task:** establish one authoritative record for this chat's DEX/Swap/Launchpad ownership, release truth and next steps.
- **Evidence checked:** `main` baseline `11c76a34...`; deployment success 43457843679; real production API readiness failure 43457843923 (`orderStore` missing); frontend/runtime source; Launchpad preview and implementation specifications.
- **Status:** handoff/documentation only; no new production capability claimed.
- **Next:** P0 — diagnose the production Worker `orderStore` health/schema mismatch and re-run safe quote-only acceptance.

### Required format for EVERY subsequent entry
```text
YYYY-MM-DD — <specific task>
Scope: DEX | Swap | Launchpad
Before: <main SHA / PR head and observed problem>
Changed: <files, branch, PR, commit>
Verified: <exact GitHub Actions run URLs + conclusion; production-origin evidence if any>
Unresolved: <remaining blockers / risks>
NEXT: <single specific next coding or verification action>
```

**Cross-chat ownership:** Game owner must independently keep a separate `docs/GAME_DEVELOPMENT_RECORD.md`. Neither chat should alter the other chat's progress record. If a change to shared code is unavoidable, communicate the exact file, branch and PR before touching it.
