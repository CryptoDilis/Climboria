# Climboria Swap + DEX — Codex master implementation handoff: real in-site provider trades

**Date:** 2026-11-15 PH  
**Priority:** Urgent shipping; user says **actual trading on Climboria today if safely possible**. **Fee collection may remain completely OFF.**  
**Repository:** `CryptoDilis/Climboria` on `main`  
**Strict scope:** **Swap and DEX ONLY**, never modify Game, ClimbX, Launchpad assets, code, configs or their records. Every material change: PR, exact source SHA, test/deploy evidence, blocker and *next actionable task* MUST be recorded in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`, then re-read. Do not overstate release readiness.

## Read and understand these files first; avoid redoing passed work

1. `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` — newest **NEXT EXACT** checkpoint.
2. `docs/DEX_SWAP_PROVIDER_MANAGED_IN_SITE_RELEASE_CHECKLIST_2026-11-15.md` — required official provider and wallet evidence.
3. `docs/DEX_SWAP_MONETIZATION_RELEASE_PLAN_2026-11-15.md` — platform fee **target** 0.50% only, **NOT ACTIVE**.
4. `docs/DEX_SWAP_SPONSOR_INTAKE_HANDOFF_2026-11-15.md` — already deployed sponsor intake page; **do not work on it** unless broken.
5. `dex/provider-managed-swap.mjs`, `dex/provider-managed-swap.css`, `swap-config.js` — an opt-in **fail-closed shell** shared by Swap and DEX, but its historical Jupiter Terminal JS URL/init convention is NOT verified. **Don't assume it's supported.**
6. `swap/index.html`, `dex/index.html`, `dex/swap-proxy/src/index.mjs`, `dex/swap-proxy/src/jupiter-v6-cpi-review.mjs`, `.github/scripts/dex-swap-managed-provider-shell.test.mjs`, `.github/workflows/dex-swap-quote-state-smoke.yml`, `.github/scripts/dex-swap-production-quote-smoke.mjs`.

## Grounded state at the handoff

- Quote-only Climboria Swap/DEX currently live; existing read-only `/api/swap/quote` feeds are production browser-tested.
- [PR #460](https://github.com/CryptoDilis/Climboria/pull/460) added a gated Climboria in-site managed-provider widget **shell** to both Swap and DEX; script is NOT verified and remains OFF.
- [PR #461](https://github.com/CryptoDilis/Climboria/pull/461) added disclosure that **0.50% is not charged**, configured no fee recipient and no fee collection; implemented manual sponsor inquiry CTA.
- [PR #462](https://github.com/CryptoDilis/Climboria/pull/462) added deployed `/dex/partners/` sponsor inquiry form; CI green at PR head and merged Pages deploy on SHA `4e290eea1077ccc687e94b587b1b7caa7bd6789a` success [43645407821](https://github.com/CryptoDilis/Climboria/actions/runs/43645407821). Real production Swap/DEX quote browser check also success [43645408153](https://github.com/CryptoDilis/Climboria/actions/runs/43645408153); read-only quote state regression success [43645408081](https://github.com/CryptoDilis/Climboria/actions/runs/43645408081).
- **DO NOT ENABLE** custom Worker source `SIGNABLE_ORDER_SECURITY_REVIEW_COMPLETE=false`, `EXECUTION_SECURITY_REVIEW_COMPLETE=false`, CPI fail-closed review boundary, `wrangler.toml EXECUTION_ENABLED=false`, or `swap-config.js enabled:false`. Missing independently validated CPI accounts/vault, ALT/RPC provenance, authenticated finality and DO terminal reconciliation. These are NOT prerequisites for a separately vetted, independently managed official provider integration.
- **Desired release:** users swap **without leaving climboria.fun**, from their own Solana wallets, with Jupiter/established provider owning transaction-building/execution and existing third-party liquidity. No Climboria custody. **Trading platform fees can be ZERO for now** as explicitly allowed by owner. No monetization blocking launch.

## Codex assignment — execute, not just write a plan

### 1. Verify FIRST-PARTY CURRENT vendor SDK/API (must use actual verified docs + bytes)

- Research the **CURRENT official Jupiter** site/docs/repository and any vendor-verified, production-available embedded Terminal/Plugin/managed-in-site swap experience. Do not infer from stale search snippets, old npm packages, unsigned script guesses, mirrors, arbitrary redirects, or this repo's hypothetical `terminal.jup.ag/main-v3.js`. Verify legitimate domain, release source, supported embedding/API, wallet/session ownership, partner requirements, fee-free default, Solana network coverage, browser CSP/CORS and wallet-origin trust. Record the **exact official documentation and source/release URLs, publish/retrieval time, version, downloaded byte count, SHA-384 SRI, and test evidence**. Avoid dynamic unpinned script injection.
- If Jupiter's official in-site experience is discontinued or incompatible, investigate an officially documented, reputable **provider-managed** alternative with truly embed/in-site support; do not invent a feature and do not turn on our disabled custom backend as fallback.
- The existing host only accepts `terminal.jup.ag/main-vN.js` with SRI and historical `window.Jupiter.init` contract. **Rewrite it if the current legitimate SDK differs**, preserving strict source/version/hash pins and user-initiated requests. Do not copy old assumptions into production.

### 2. Connect the real in-site trading interface through a small reviewed PR

- Update the existing `/swap/` and `/dex/` provider-managed host to show real **provider-controlled** token-in/token-out, amount and wallet-review flow *in Climboria*. Wallet permissions require explicit click and disclose which provider executes; Climboria frontend may display token context but MUST NOT construct/trust arbitrary unsigned transactions from old custom Worker `/api/swap/order` or `/api/swap/execute`.
- Avoid silently treating Climboria's read-only quote as the executable quote; provider must generate fresh quote, mint/amount/minimum/fees and transaction the wallet approves. Make route errors, unsupported mints, unavailable provider, slippage, wallet rejection, or timeout fail safely. Never request seed phrase, key, custodial deposit, dangerous delegate permissions or arbitrary wallet signatures.
- Make responsive/professional Swap/DEX UI without changing unrelated navigation/brand. Existing quote-only functions must remain functional if provider is OFF. Keep Base trading disabled unless a separate verified supported EVM integration is actually included; **never label Base swaps live based on a Solana test**.
- Keep `revenue.feeCollectionEnabled=false`, `feeRecipient=null` and proposed 0.50% fee **NOT charged**; do not invent integrator fee/referral API or public wallet address. Focus on functioning real swaps first, fees later.

### 3. Test, verify, and release honestly

- Add tests proving **no** script load/wallet prompt until explicit click, pinned verified allowed origin and SRI, no custom Worker `/order` or `/execute` requests, no cross-origin arbitrary scripts, wallet rejection and provider failure handling; mock provider SDK only for local regression. Assert both /swap and /dex real hosted widget integration is wired when feature is explicitly enabled; run existing Node, Playwright desktop/mobile and quote-state tests. Provide browser screenshots or CI video artifacts only as evidence, not as made-up credentials.
- If vendor real SDK integration is verified, test on staging/testnet **where supported**; then supervised mainnet microtrade with **owner's own** wallet and independently checked finalized Solana signature/source debit/destination balance/minimum received/fees. NEVER submit real wallet funds automatically or request private key. If testing needs user's wallet prompt, supply exact instructions and acknowledge this is a HUMAN action.
- Check CSP/CORS, mobile wallet deeplinks and browser extension permissions. Check script integrity against downloaded verified source bytes. Do not fabricate deployment, tests, receipt signature, program audit, provider support or customer funds results.
- Submit isolated PR(s) with clear diff and evidence; wait for exact-PR-head tests **SUCCESS**, merge only safe changes, check post-merge Pages and `DEX Swap Production Quote Browser Smoke` desktop/mobile. Keep separate explicit rollback flag. DO NOT claim “real swaps live” until actual **wallet-owned signed and independently finalized swap** verified and production in-site flow observed. If blocked because docs/scripts cannot be verified, stop with precise blocker, leave disabled and don't bluff.

### 4. Required durable records and response

- After every meaningful source change append `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` with commit SHA, PR, tested workflows and verdict, production SHA, remaining security/revenue blockers, and next exact action. Read your entry back before continuing. No Game, ClimbX, or Launchpad changes.
- Final report: `quote-only: live/failed`; `in-site wallet swaps: implemented/verified/not live`; `customer-funded transactions: YES/NO`; `Climboria fee collection: OFF`; `mainnet signed test: signature or not performed`; `CI: actual links`; `NEXT EXACT`.
- The owner has **no paid auditor budget** and prefers to launch without fees, but wants **real** on-site swap. Do not pressure owner into enabling unsafe native backend; external auditing is not the same as a controlled self-funded functional test.

## Optional, NOT a blocker: Google advertising

- Google AdSense can monetize a website **only after application/approval and appropriate ad placement and policies**; it is separate from Jupiter fees and actual trading. Do **not** insert Google ad JavaScript or an invented `ca-pub-...` publisher ID without the owner's actual approved account and product instructions. Crypto/financial-content eligibility, consent/privacy and platform policies must be checked on Google's current official site. Focus on functional Swap/DEX first.

**Above all:** provide code that is genuinely tested and accurately report what is *not yet verified*. No shortcut that exposes user funds to our unaudited custom execution pipeline.
