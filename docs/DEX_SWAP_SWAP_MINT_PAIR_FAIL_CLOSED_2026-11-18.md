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
2. **DONE, superseding this earlier action:** [manual live Jupiter CDN run #44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829), main, on November 18, 2026, matched all five SHA-384 digests and byte counts. Do not request a duplicate just to repeat existing receipts; this is not transitive SRI or a production wallet authorization.
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
2. **DONE, superseding the earlier pending wording:** [manual live Jupiter CDN run #44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829) passed on main, with offline-schema and manual-live-snapshot jobs SUCCESS. Directly verified logs at 2026-11-18 00:29:48 UTC show all five exact SHA-384 and byte-count matches. Do not repeat unless asset bytes/build change or a fresh launch check is required; matching CDN files do not enforce dynamic transitive SRI or grant hosted-use permissions.
3. Reconcile any existing current-build owner-held before-sign **minimum received**, correct pair/direction, slippage, network/provider fee, wallet reject/expire and desktop/mobile evidence with previously recorded finalized **Nov 15 staging transactions**. These staging swaps establish historical settlement, not exact current-build production approval. Do not request repeated funded staging simply for the old receipts.
4. Once explicit release approval and evidence are recorded, merge/deploy **Swap-only** with reviewed source rollback. Verify actual deployed `/api/swap/provider-status` = `enabled:true` with `no-store` and restricted CORS, deployment health SHA, native execution OFF, owner wallet pre-sign acceptance and actual finalized swap receipt. Revert/verify OFF upon failure. **This step has not been performed.**
5. **Only after verified live Solana Swap:** reconcile [separate draft DEX PR #624](https://github.com/CryptoDilis/Climboria/pull/624) with the latest shared host safeguards from this Swap branch (including silent-pair and async-init guards) and the current deployed main, retest, obtain separate DEX release approval, then Base, other EVM networks, and deferred Launchpad.
6. Recheck CI at the next **documentation-inclusive** head, update PR discussion with exact evidence. Preserve historical >1 MB record without truncation; this date-stamped supplement is the durable non-destructive handoff.


## November 18 continuation — active pair monitoring and evidence reconciliation

**State:** Swap release [draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618) remains unmerged, unapproved for customer funds, and not deployed. Production third-party approval, native signing/execution and integrator fee collection remain OFF; DEX provider surface also remains OFF. No Game, ClimbX, Launchpad, Base/EVM trading or wallet funds touched.

### Source change and evidence

- Code and test commit: [85ecfba06c294b5b13ecd4cd832dc80dfcaf451b](https://github.com/CryptoDilis/Climboria/commit/85ecfba06c294b5b13ecd4cd832dc80dfcaf451b). Files: dex/provider-managed-swap.mjs and .github/scripts/dex-swap-managed-provider-shell.test.mjs.
- The active 15-second provider approval monitor checks the currently selected mint pair against the mounted Jupiter session BEFORE fetching status and again AFTER the asynchronous status response. If a missed picker event or in-flight network response encounters a cleared or reversed pair, it hides the Climboria panel, closes the provider-owned UI best-effort, conceals launchers and stops monitoring. A wallet popup or already-submitted transaction cannot be cancelled.
- New regression coverage includes silently reversed Swap/DEX pairs with no change event and a Swap pair cleared while an approved runtime-status response was pending. Tests are synthetic and cannot establish real provider wallet consent.
- **Exact code/test SHA: 10/10 CI SUCCESS.** [API readiness #44232898008](https://github.com/CryptoDilis/Climboria/actions/runs/44232898008), [Browser Smoke #44232897891](https://github.com/CryptoDilis/Climboria/actions/runs/44232897891), [CPI Security #44232897923](https://github.com/CryptoDilis/Climboria/actions/runs/44232897923), [Validate #44232897959](https://github.com/CryptoDilis/Climboria/actions/runs/44232897959), [DEX Graduation #44232897973](https://github.com/CryptoDilis/Climboria/actions/runs/44232897973), [Jupiter offline snapshot #44232897903](https://github.com/CryptoDilis/Climboria/actions/runs/44232897903), [ClimbX preview compatibility #44232897901](https://github.com/CryptoDilis/Climboria/actions/runs/44232897901), [Jupiter provider status smoke #44232897946](https://github.com/CryptoDilis/Climboria/actions/runs/44232897946), [Production Quote Browser #44232897951](https://github.com/CryptoDilis/Climboria/actions/runs/44232897951), [DEX Swap Read-only Quote Browser #44232898739](https://github.com/CryptoDilis/Climboria/actions/runs/44232898739). PR status tests remain offline/synthetic, not evidence of a deployed ON gate or funded trading.

### CDN historical audit — completed

- The earlier [manual-live-snapshot run #44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829) on main completed SUCCESS in both manual-live and offline-schema jobs. Examined the actual GitHub Actions job log at 2026-11-18 00:29:48 UTC: all five fixed assets matched November 15 SHA-384 and byte counts: plugin-1.0.18.js (243597), plugin-1.0.18-app.js (797972), plugin-1.0.18-Tailwind.css (26583), plugin-1.0.18-Jupiter.css (29292), scoped-preflight-v4.css (3062). This is also documented in the pre-existing DEX_SWAP_JUPITER_RELEASE_EVIDENCE_MATRIX_2026-11-18.md. **Do not continue treating manual CDN verification as pending.**
- The GitHub upstream [Jupiter Plugin issue #238](https://github.com/jup-ag/plugin/issues/238) remained OPEN with zero public comments on latest Nov 18 check. Unanswered support does not mean that the independently completed CDN comparison failed, nor is it a hosted API usage license decision.

### Remaining exact next steps — prioritized

1. Decide and record acceptance of official hosted Jupiter Plugin SDK/API terms, branding/attribution and the residual dynamically loaded vendor app JS/CSS/font trust. The five-file CDN snapshot is evidence of historical bytes only, not browser-enforced transitive SRI; do not demand a new costly native execution audit for a third-party-only swap without a concrete need.
2. Resolve Cloudflare Analytics executable injection/privacy at its actual dashboard origin or explicitly approve retention with evidence; docs/DEX_SWAP_CLOUDFLARE_ANALYTICS_RELEASE_DECISION_2026-11-17.md remains PENDING, and a GitHub code edit does not decide cloud dashboard settings.
3. Reconcile previously performed Nov 15 finalized owner mainnet staging swaps and any private same-build pre-sign original evidence (Jupiter minimum received, token pair, slippage, network/provider fee, rejection/expiry, desktop and mobile). Phantom estimated received is NOT the binding minimum-received floor. Do not repeat paid transactions merely for prior receipts.
4. Obtain explicit operator exact-head release approval including automatic Cloudflare Worker deployment and source-OFF rollback. Only then merge Swap PR #618. Verify deployed /api/swap/provider-status enabled:true/no-store/restricted CORS, /health SHA and native execution OFF, Solana-only Swap, DEX OFF, real wallet pre-sign consent and finalized production settlement before calling trading LIVE; roll back/verify public OFF on any failure.
5. Once Solana Swap is verified live, reconcile separate draft DEX PR #624 with the latest shared host and Worker fixes, retest and release DEX separately. Then Base, additional EVM chains, and Launchpad last.
6. Check the documentation-inclusive commit's exact CI after this update; append the result to the PR discussion. Preserve the oversized historical development record rather than replacing it with partial GitHub Contents output.


## November 18 continuation — missed network-change notification in an active Swap session

- **Source/test SHA**: [`078b88bffab1e73f1b792e7f38750d7dc31a6fdd`](https://github.com/CryptoDilis/Climboria/commit/078b88bffab1e73f1b792e7f38750d7dc31a6fdd), draft [Swap PR #618](https://github.com/CryptoDilis/Climboria/pull/618). **NO production merge/deploy/trading release.** Files changed: `dex/provider-managed-swap.mjs` and `.github/scripts/dex-swap-managed-provider-shell.test.mjs`. The shared provider host is protected on the Swap draft; independent DEX approval is still OFF.
- **Problem**: a Solana-to-Base tab change ordinarily calls the proper first-party switch handler and closes the Solana Jupiter widget. But a *missed* network-change event can leave the exact Solana input/output mint attributes unchanged on an already-mounted vendor instance. The recently added mint-pair comparison would then return true and retain or resume a Solana wallet widget while the Swap page's selected network is Base.
- **Fix**: keep the existing `sameMountedPair()` for strict selected mint comparison and introduce `sameMountedTradeIntent()` requiring BOTH matching mints and `data-climboria-managed-swap-network="solana"` on the Swap surface. Check this combined assertion before and after active no-store approval polling, on subsequent launcher clicks with mounted sessions, and on focus/BFCache/tab-return immediately before `Jupiter.resume()`. A network mismatch immediately runs the existing fail-closed `hideRevoked()` path to conceal the first-party panel, provider-owned root and launchers. It does NOT enable any Base trading.
- **Three new isolated `node:test` checks**: (1) silently selected Base with same Solana mints is detected **before** a redundant status fetch at the active interval; (2) late valid ON status cannot preserve the old widget after a silent Base switch during the status request; (3) approved focus return cannot resume the vendor-owned Solana root if Base was silently selected while the browser was waiting. All use mocked Jupiter and no wallet or funded transactions.
- **Limitation**: the interval is 15 seconds and tab return/explicit clicks check sooner; a vendor-owned wallet prompt already opened or a signed/broadcast transaction is not recalled by hiding its UI. This is a release-exposure safeguard, not a funded production acceptance.

### Exact code+tests SHA: all 10 GitHub Actions SUCCESS
- [Jupiter API Provider Status Production Smoke #44234160198](https://github.com/CryptoDilis/Climboria/actions/runs/44234160198) — source/offline, not an active public provider
- [Jupiter Plugin Audited Asset Snapshot #44234160234](https://github.com/CryptoDilis/Climboria/actions/runs/44234160234) — offline manifest, *not* a new manual CDN verification
- [DEX Swap CPI Security #44234160216](https://github.com/CryptoDilis/Climboria/actions/runs/44234160216)
- [Climboria API Production Readiness #44234160167](https://github.com/CryptoDilis/Climboria/actions/runs/44234160167)
- [CLIMBX public preview compatibility #44234160594](https://github.com/CryptoDilis/Climboria/actions/runs/44234160594) — no ClimbX implementation edited
- [DEX Graduation Feed #44234160208](https://github.com/CryptoDilis/Climboria/actions/runs/44234160208)
- [DEX Swap Production Quote Browser #44234160146](https://github.com/CryptoDilis/Climboria/actions/runs/44234160146)
- [Validate Climboria #44234160212](https://github.com/CryptoDilis/Climboria/actions/runs/44234160212)
- [Climboria Browser Smoke Test #44234160610](https://github.com/CryptoDilis/Climboria/actions/runs/44234160610)
- [DEX Swap Read-only Quote State Regression #44234160199](https://github.com/CryptoDilis/Climboria/actions/runs/44234160199) — includes new pair/network guards with synthetic provider

### Verified DONE / outstanding / exact next steps
1. **DONE**: manual-live Jupiter Plugin five-asset CDN match, November 18 [#44208231829](https://github.com/CryptoDilis/Climboria/actions/runs/44208231829); two finalized owner-controlled November 15 staging mainnet swaps; mock/browser security checks listed above. Do not request duplicate funded staging or another snapshot merely because a prior checklist mistakenly marked them pending. Neither the CDN snapshot nor mock tests proves all transitive browser scripts are pinned.
2. **Still pending**: document approval of Jupiter hosted/SDK/API usage, branding/attribution and residual dynamic vendor JS/CSS/font trust. The [upstream usage question #238](https://github.com/jup-ag/plugin/issues/238) remains a contact path, not a universal blocker that forces rebuilding the Climboria execution pipeline.
3. **Still pending**: operator Cloudflare Web Analytics privacy/injection decision and site-level implementation evidence (dashboard-controlled; cannot be truthfully checked from an offline GitHub PR run).
4. **Still pending**: reconcile existing private, exact current-build wallet **pre-sign minimum received** (NOT Phantom estimated received), slippage, provider/network fees, wallet refusal/expiry and desktop/mobile proof with the already-finalized staged mainnet swaps; keep any private wallet evidence out of public GitHub.
5. **Still pending**: explicit operator authorization of **exact PR #618 head**, automatic Cloudflare Worker deployment, assigned rollback and source-OFF recovery. Only after that approval, merge/deploy Swap **alone** and verify deployed Worker SHA, `/api/swap/provider-status` ON/no-store/CORS, native execution OFF, Swap Solana-only and DEX OFF, real production wallet consent and finalized transaction before declaring live; fail closed and verify public OFF on any blocker.
6. **Later**: after independently verified Solana Swap live, reconcile [separate DEX draft PR #624](https://github.com/CryptoDilis/Climboria/pull/624) with this later shared-host network-and-mint guard, rerun its exact-head CI, obtain **separate** DEX approval, then Base, other EVM networks, and deferred Launchpad. No Game/ClimbX bot/Launchpad source changes.
7. For this documentation-only commit, verify the **new final HEAD CI** and record the exact result in the PR discussion, distinct from the 10 green checks above on `078b88b...`. Keep oversized historical `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` intact.
