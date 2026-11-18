# Swap/DEX — Solana Jupiter empty-pair fail-closed continuation (2026-11-18)

## Release state and scope
- **Branch:** `release/swap-jupiter-provider-on-review-20261118` / [draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618).
- **Validated code-and-test commit:** [`6eb1858037e3ab526ad3200f4afe0978aefa7883`](https://github.com/CryptoDilis/Climboria/commit/6eb1858037e3ab526ad3200f4afe0978aefa7883).
- **Result:** Source-only Swap safety enhancement; **not merged, not deployed, not approved for customer funds or live trading**. Production Worker third-party status remains source **OFF**; both Climboria-native signable order and execution source gates stay false, DEX provider surface OFF, integrator fees OFF.
- **Scope boundaries:** Solana Swap priority, then independent Solana DEX Buy/Sell, Base, reviewed other EVM networks, Launchpad last. No Game, ClimbX bot, Launchpad, Base routing, tokenomics, wallet secret, or native signing/execution code touched.
- **Naming audit:** Current public-facing `index.html`, `whitepaper/index.html`, `dex/index.html`, `swap/index.html`, `overview/index.html`, `support/index.html` contain zero case-insensitive matches of `Signature DEX` / `Signature Swap` or reversed equivalents; `Climboria Signature` remains the Launchpad brand. Historical docs can retain source quotations, but should not reintroduce old user-facing labels.

## Concrete vulnerability closed in draft code
A cleared Swap mint selection could previously produce `readSelectedProviderPair(panel) === null`. `integratedTerminalOptions(target.id, null)` permits an unprefilled generic Jupiter Plugin form, which is intentional only for the separate DEX Market flow. Consequently, a Swap user with no valid mints could otherwise open an unrelated vendor default trading form.

**Changes:**
1. `dex/provider-managed-swap.mjs`: at initial user click and again after the asynchronous SDK/status fetch immediately before `Jupiter.init()`, a **Swap** session with `null` selected mints throws the same invalid/incomplete token-pair error used for malformed or partial pairs. No third-party executable is fetched when the pair was already cleared at click time. If it clears during SDK load, no provider initialization runs.
2. `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: default synthetic **Swap** panel now contains the real SOL/USDC mint pair (matching the public first-party Swap route); DEX retains its intentional null/default Market case. The existing successful widget initialization assertion now checks the exact selected mints. Two new negative tests cover missing/partial/identical/malformed Swap pairs before SDK fetch and mint clearing during script fetch before vendor init.
3. Prior active-session pair change and vendor-root concealment guards remain intact; the new check does not enable trading or attempt to control external wallet popups or already broadcast transactions.

## Exact code-and-test SHA CI — all 10 completed SUCCESS
- [Climboria API Production Readiness #44222771494](https://github.com/CryptoDilis/Climboria/actions/runs/44222771494)
- [DEX Swap Production Quote Browser Smoke #44222771661](https://github.com/CryptoDilis/Climboria/actions/runs/44222771661)
- [DEX Graduation Feed Tests #44222771699](https://github.com/CryptoDilis/Climboria/actions/runs/44222771699)
- [Jupiter API Provider Status Production Smoke #44222771631](https://github.com/CryptoDilis/Climboria/actions/runs/44222771631) — **PR/offline**, not a deployed ON status
- [Validate Climboria #44222771687](https://github.com/CryptoDilis/Climboria/actions/runs/44222771687)
- [Jupiter Plugin Audited Asset Snapshot #44222771575](https://github.com/CryptoDilis/Climboria/actions/runs/44222771575) — **offline manifest**, not an operator-invoked live CDN scan
- [Climboria Browser Smoke Test #44222771584](https://github.com/CryptoDilis/Climboria/actions/runs/44222771584)
- [DEX Swap Read-only Quote State Regression #44222771696](https://github.com/CryptoDilis/Climboria/actions/runs/44222771696) — mocked Plugin SDK/browser, **no funded transaction**
- [DEX Swap CPI Security #44222771558](https://github.com/CryptoDilis/Climboria/actions/runs/44222771558)
- [CLIMBX public preview visibility #44222771516](https://github.com/CryptoDilis/Climboria/actions/runs/44222771516) — compatibility check only; no ClimbX source edited

## Blockers and exact next work
1. **No automatic merge or deploy.** The all-green draft checks do not approve third-party customer funds. Confirm applicable official Jupiter hosted SDK/API usage and attribution terms and get recorded operator acceptance of residual vendor-managed dynamically loaded app JS/CSS/fonts, Cloudflare Analytics privacy/executable injection and rollback exposure. Source hash of the v1.0.18 bootstrap is not transitive integrity enforcement; do not assert approval from a repository MIT badge alone.
2. Run the **manual-live-snapshot** job in [Jupiter Plugin Audited Asset Snapshot](https://github.com/CryptoDilis/Climboria/actions/workflows/jupiter-plugin-asset-drift.yml) from `main` and verify all five CDN digests, or document access/failure. Offline PR checks do not substitute.
3. Reconcile existing owner-controlled, current-build **before-sign** minimum received, exact pair/direction, slippage, network/provider fees, wallet rejection/expiration and desktop/mobile proof. Two **2026-11-15 finalized Solana mainnet staging swaps** have already been recorded; no duplicate paid staging merely for old receipts.
4. Obtain explicit owner/operator release approval of exact PR #618 HEAD, automatic Cloudflare Worker deployment, fallback/rollback and residual vendor risk **before merge**. On accepted release, deploy **Swap-only**, then independently verify deployed `/api/swap/provider-status` `enabled:true`, `Cache-Control:no-store`, restricted CORS, `/health` exact SHA with native execution OFF, in-site wallet signing disclosures and real transaction finality. If any failure, source-OFF rollback and verify public OFF.
5. After verified Solana Swap, independently review [draft DEX safety PR #624](https://github.com/CryptoDilis/Climboria/pull/624), implement DEX-specific runtime approval and wallet checks, then Base, other EVM networks and deferred Launchpad. Do not conflate Swap's source ON with DEX approval.
6. After any further change, recheck exact-head CI, update this dated supplement and PR discussion. The historical `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` exceeds the GitHub Contents read threshold (~1.28 MB); **do not replace it with an empty or truncated file**. This dated supplement is the non-destructive durable handoff for this continuation.
