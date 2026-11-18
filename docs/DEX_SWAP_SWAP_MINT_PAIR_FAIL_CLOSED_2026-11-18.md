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


## 2026-11-18 continuation: missed pair-change event and async init fail-closed

**Code/test SHA:** [`3c08f0a8dc7a361d558eaa5a98cdbdc95a9aac66`](https://github.com/CryptoDilis/Climboria/commit/3c08f0a8dc7a361d558eaa5a98cdbdc95a9aac66). **Draft PR #618 remains unmerged, unapproved and NOT customer-trading live**. Source Worker approval remains OFF; DEX activation, ClimbX/Game/Launchpad code, native signing/execution and integrator fee remain OFF/untouched.

### Newly closed browser/provider race

The earlier fail-closed fix rejected an incomplete or cleared *new* Swap mint pair. A **previously mounted** Jupiter widget could nevertheless remain visible when the first-party selected mint pair silently changed (or was cleared) **without dispatching** the normal `climboria:managed-provider-pair-change` event: on a new launcher click, input validation threw before the existing `mounted && !sameMountedPair()` guard, and the generic invalid-pair error UI could reveal the panel while the vendor form still held its **old pair**.

A second latent case existed when the third-party `Jupiter.init()` returned asynchronously: the first-party mints or Swap network could silently change *after* the pre-init validation and *before* `init()` resolved without emitting the usual event. The prior code marked `mounted=true` for the original pair even though the selection had changed.

### Source and tests changed

- `dex/provider-managed-swap.mjs`: when any mounted vendor instance is present, check `sameMountedPair()` **before** generic token-validation errors or revealing the provider panel on every launcher click. Mismatch -> `hideRevoked()` closes the vendor-owned root, hides the panel and launchers, and displays the stale-trade-intent warning. On resolving asynchronous `Jupiter.init()`, compare the originally initialized pair against **fresh** current first-party mint attributes, and require the Swap network still to be Solana. A mismatch closes the vendor root with `providerInitInFlight` still set, hides launch controls and refuses to mark the widget as mounted.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: tests for Swap and DEX old-mint roots after **silently** cleared, partial or reversed pair selection with no change event; and fresh post-init guard for silent cleared/reversed pair and Solana-to-Base network switch during asynchronous provider init. Tests assert no reopened stale form, vendor close requested, no second init and stale intent message. DEX remains separately default OFF in actual config; DEX cases are isolated synthetic regressions on the shared host only.
- No official vendor JS was modified, no transaction was executed, and best-effort `Jupiter.close()` still **cannot** cancel wallet pop-ups or transactions that were already approved/submitted by an external provider. This is a wallet-widget visibility and initiation guard, not a complete independent provider audit.

### Exact code/test SHA: 10 of 10 GitHub Actions SUCCESS

- [Climboria API Production Readiness #44228795525](https://github.com/CryptoDilis/Climboria/actions/runs/44228795525)
- [DEX Swap Production Quote Browser Smoke #44228795550](https://github.com/CryptoDilis/Climboria/actions/runs/44228795550)
- [DEX Graduation Feed Tests #44228795512](https://github.com/CryptoDilis/Climboria/actions/runs/44228795512)
- [Jupiter API Provider Status Production Smoke #44228795565](https://github.com/CryptoDilis/Climboria/actions/runs/44228795565) — **PR/offline**, not a deployed ON status
- [Validate Climboria #44228795710](https://github.com/CryptoDilis/Climboria/actions/runs/44228795710)
- [Jupiter Plugin Audited Asset Snapshot #44228795705](https://github.com/CryptoDilis/Climboria/actions/runs/44228795705) — **offline schema only**, not a manually dispatched live vendor CDN check
- [Climboria Browser Smoke Test #44228795724](https://github.com/CryptoDilis/Climboria/actions/runs/44228795724)
- [DEX Swap Read-only Quote State Regression #44228795771](https://github.com/CryptoDilis/Climboria/actions/runs/44228795771) — synthetic Jupiter SDK/browser and pair-race tests, no funded wallet swaps
- [DEX Swap CPI Security #44228795781](https://github.com/CryptoDilis/Climboria/actions/runs/44228795781)
- [CLIMBX public preview visibility #44228795633](https://github.com/CryptoDilis/Climboria/actions/runs/44228795633) — CI compatibility only, no ClimbX source modified

### Remaining blockers and exact next execution order

1. Keep draft PR #618 **unmerged** until official provider SDK/API hosted terms/branding, transitive dynamically loaded vendor JS/CSS/font integrity risk and Cloudflare Analytics/privacy decision are reviewed; secure and document explicit owner/operator acceptance of residual risk and rollback. **Do not infer these from 10 green CI checks.**
2. The [Jupiter Plugin Audited Asset Snapshot manual workflow](https://github.com/CryptoDilis/Climboria/actions/workflows/jupiter-plugin-asset-drift.yml) requires an operator to run `workflow_dispatch` on `main` and inspect `manual-live-snapshot` for all five exact CDN artifact SHA384 matches. The GitHub connector in this session exposes GitHub Action GET/CI observation and rerun operations but **no explicit workflow_dispatch action**, so a new live read-only CDN check was **not performed**. Even matching CDN digests do not enforce transitive SRI or grant vendor license approval.
3. Reconcile any existing current-build owner-held before-sign **minimum received**, correct pair/direction, slippage, network/provider fee, wallet reject/expire and desktop/mobile evidence with previously recorded finalized **Nov 15 staging transactions**. These staging swaps establish historical settlement, not exact current-build production approval. Do not request repeated funded staging simply for the old receipts.
4. Once explicit release approval and evidence are recorded, merge/deploy **Swap-only** with reviewed source rollback. Verify actual deployed `/api/swap/provider-status` = `enabled:true` with `no-store` and restricted CORS, deployment health SHA, native execution OFF, owner wallet pre-sign acceptance and actual finalized swap receipt. Revert/verify OFF upon failure. **This step has not been performed.**
5. **Only after verified live Solana Swap:** reconcile [separate draft DEX PR #624](https://github.com/CryptoDilis/Climboria/pull/624) with the latest shared host safeguards from this Swap branch (including silent-pair and async-init guards) and the current deployed main, retest, obtain separate DEX release approval, then Base, other EVM networks, and deferred Launchpad.
6. Recheck CI at the next **documentation-inclusive** head, update PR discussion with exact evidence. Preserve historical >1 MB record without truncation; this date-stamped supplement is the durable non-destructive handoff.
