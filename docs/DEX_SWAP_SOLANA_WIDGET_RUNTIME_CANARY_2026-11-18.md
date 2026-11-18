# Solana Swap — production Jupiter UI mount canary and wording (2026-11-18)

## Verified evidence (not equivalent to funded trading)

- Swap-only source-ON Jupiter Plugin gate was deployed to production at commit `60781702dcae4bffa12560e7f5b47b61e8e51a72`.
  [Deploy Climboria API #44252474216](https://github.com/CryptoDilis/Climboria/actions/runs/44252474216) completed SUCCESS (exact SHA gate, Cloudflare Worker deployment, deployed SHA health, real Jupiter SOL/USDC quote/token search). `SOLANA_RPC_URL` was not configured for the native transaction path; native source signing/order execution remains OFF by design.
- [Jupiter API Provider Status Production Smoke #44252550190](https://github.com/CryptoDilis/Climboria/actions/runs/44252550190) completed SUCCESS: source-matched `enabled:true`, HTTP 200, `Cache-Control: no-store`, restricted CORS and GET-only.
- [Read-only production Swap/DEX browser #44339571700](https://github.com/CryptoDilis/Climboria/actions/runs/44339571700) completed SUCCESS on newer `main` SHA `708196d795b1e03b915088db8b60efeb986d7130` (real Jupiter quotes, amount/minimum-received preview, chart-link safety, mobile layout). **This script intentionally BLOCKS Jupiter widget hosts**, so its success does **not** prove real Jupiter Plugin rendering or an in-site wallet swap.
- No verified browser evidence yet of real external Jupiter SDK mounting, wallet pre-sign minimum received/fees/slippage, actual owner-funded production consent, final mainnet signature and finality. Third-party hosted vendor runtime/branding risks and Cloudflare Analytics dashboard/privacy acceptance remain separate human-release decisions.

## This branch: PR #651

- Clarifies Swap page public meta description, execution warning, external Jupiter handoff, trust panel and Solana chain notice: **native Climboria execution is OFF; separately approved Jupiter Plugin trading is a distinct provider-owned wallet experience**. Does not say all Solana trading is disabled while the provider is released. Base/EVM remains OFF.
- Adds a simple source/HTML regression contract asserting accurate language without enabling native signing or DEX provider.
- Adds a separate `Solana Swap Jupiter Live Widget Mount Canary` workflow and `.github/scripts/solana-swap-provider-live-canary.mjs`, running after PR/push, manually or twice daily. This uses isolated Chrome with **no wallet credentials/extensions**, blocks browser POST and any non-idempotent request, checks official released status, opens the actual `/swap/` launcher, verifies request for the exact official plugin bootstrap and DOM nodes rendered at Climboria's reviewed integration target. On an emergency source-OFF rollback, status must match OFF and the canary reports SKIP instead of falsely requiring a vendor trade UI.
- The widget canary can **only** establish read-only hosted mount state. Aborting non-idempotent requests may block some vendor backend operations, so a failure is a diagnostic to analyze, not proof that a real wallet swap is impossible. A pass is NOT a wallet-signing/settlement approval.

## Exact next actions

1. Read PR #651's checks at its final head (including new no-wallet live provider canary and DEX/Swap read-only quote regression). If any fail, inspect GitHub job logs and fix the specific defect. Do not weaken closed native gates to make a mock test green.
2. Merge PR #651 only after successful checks and reconcile any newer main changes. Verify GitHub Pages actually deployed this Swap-only copy update and repeat the read-only browser check. Do not touch the Cloudflare Worker release guard or variable merely for a content change.
3. Review live canary output for real vendor mount. If it fails, distinguish CDN/SRI/runtime-status/DOM/GET-only canary restrictions from a true customer wallet failure, and fix only evidence-backed issues.
4. Operator tests actual `https://climboria.fun/swap/` on Solana (desktop and mobile). Confirm `Swap with Jupiter · In Climboria` launches a working in-page provider interface, uses intended mints, displays wallet minimum received/slippage/fee, allows rejection and does not request a secret recovery phrase. Record acceptance of embedded vendor JS/CSS/font/branding and Cloudflare Analytics privacy separately.
5. Only after operator consent, run one very small owner-funded real mainnet transaction; verify the resulting signature and finalized settlement, amount/fees, status and rollback readiness. Never assert customer-funds LIVE from CI or read-only canary alone.
6. Keep `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, integrator fee collection OFF, DEX release surface OFF. DEX PR #624 remains separate for later; Base/EVM and Launchpad after Solana product acceptance.

**Scope:** Swap-only UI disclosure and read-only instrumentation. Game, ClimbX, Launchpad and DEX execution are not modified.
