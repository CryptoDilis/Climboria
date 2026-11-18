# Climboria DEX — independent Solana third-party approval, frontend fail-closed (2026-11-18)

## Verified source and scope

- **Status:** **DRAFT PR #624 — NOT MERGED / NOT DEPLOYED / NOT LIVE CUSTOMER TRADING**. Separate [Swap-only release PR #618](https://github.com/CryptoDilis/Climboria/pull/618) remains the **Solana priority**. Never release DEX together with Swap merely because Swap is approved.
- **Current code-and-test SHA:** [`cb39ef80a0183448306197fb79c98d48a1771ae0`](https://github.com/CryptoDilis/Climboria/commit/cb39ef80a0183448306197fb79c98d48a1771ae0). Branch: `feature/solana-dex-independent-provider-off-20261118`.
- **Important:** Main and #618 have moved independently since this DEX draft was branched. **After verified Solana Swap go-live, reconcile/rebase the newer Swap host/worker safeguards and tests onto this DEX draft before approving any DEX deployment.** Do not overwrite #618's versioned active-pair invalidation, current browser tests, release gates or newer main changes. Merge conflicts/semantic drift are a real future release blocker.
- No Game, ClimbX bot, Launchpad, Base execution, EVM routing, signed order, native settlement or trading fee code is changed in this continuation. No secret or real wallet used.

## Problem

Existing first-party Jupiter host initially permitted both future surfaces to reuse a single configured `runtimeStatusUrl`. A later accidental `surfaces.dex=true` could therefore let Solana DEX frontend inherit **Swap** provider approval instead of independently consulting a DEX-specific operator status. The separate Worker DEX source-OFF endpoint already staged on PR #624 was not yet wired into the frontend host. Backend source-off alone must not be mistaken for complete frontend separation.

## Changes on draft DEX branch (fail-closed, default OFF)

1. `dex/provider-managed-swap.mjs`: Introduced `managedProviderStatusUrl(config,surface)`; **Swap** may use only its prior explicitly allowlisted `/swap-runtime-status.json` or existing `/api/swap/provider-status`, whereas **DEX** requires the exact `https://api.climboria.fun/api/dex/provider-status` *and* its own `dexRuntimeStatusUrl` config. No missing, redirected, query-parameterized, off-origin, or Swap-shaped fallback will authorize DEX. Page boot, user open, pre-init recheck, active panel polling, and tab-return recheck use the selected **surface-specific** URL. The existing no-store/strict JSON response check and vendor-close rollback remain in effect.
2. `swap-config.js`: Added an explicit, future DEX status URL as configuration **only**. Existing `managedProvider.surfaces.dex=false`, native `enabled=false`, and `revenue.feeCollectionEnabled=false` are preserved. A URL in public config is not approval; the separate Worker DEX source gate remains literal `false`.
3. `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: Ensures missing/forged DEX status URL hides launchers, and synthetic **Swap ON + DEX OFF** never downloads third-party JavaScript or initializes a DEX wallet even when DEX surface is enabled *in the isolated test*. No production gates are toggled.
4. `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: Synthetic Playwright fixtures inspect actual status request destinations; DEX must query only the DEX approval URL. Isolated test-only CORS and temporary local URL substitutions preserve tab return and cache-on rollback coverage without changing production policy. The official Jupiter SDK is **mocked**, never loaded with a real wallet in CI.
5. Prior PR #624 source changes: `dex/swap-proxy/src/index.mjs` has **`THIRD_PARTY_JUPITER_DEX_APPROVED=false`** and read-only, no-store, strict-CORS, GET-only `/api/dex/provider-status`; Worker deploy source check insists on literal false. Swap approval and native signing/execution gates are independent.

## Exact code-and-test CI evidence — 5/5 SUCCESS

All five workflows completed **SUCCESS** for code/test commit `cb39ef80a0183448306197fb79c98d48a1771ae0`:
- [Validate Climboria #44225153876](https://github.com/CryptoDilis/Climboria/actions/runs/44225153876)
- [Climboria Browser Smoke Test #44225153867](https://github.com/CryptoDilis/Climboria/actions/runs/44225153867)
- [DEX Swap Read-only Quote State Regression #44225153898](https://github.com/CryptoDilis/Climboria/actions/runs/44225153898) — synthetic SDK/browser, no customer funds
- [DEX Swap CPI Security #44225153991](https://github.com/CryptoDilis/Climboria/actions/runs/44225153991)
- [Climboria API Production Readiness #44225153801](https://github.com/CryptoDilis/Climboria/actions/runs/44225153801)

**Intermediate fail corrected:** Initial PR candidate head [`4ea64f8`](https://github.com/CryptoDilis/Climboria/commit/4ea64f8943ff4b18154c113fca321c35ba609f54) had a failed quote-browser regression because two legacy synthetic DEX tab-return/rollback fixtures still mocked only the Swap status URL, not the newly required independent DEX source. Updated fixtures use the exact synthetic DEX origin for browser tab-return, and a separate *local-only* URL substitution in the cache-on HTTP fixture. A subsequent final code head passed all five workflows. Do not cite the intermediate failure as a final status, and do not confuse the successful mocked fixtures with production wallet proof.

## Blockers and exact next task

1. **Keep both activation drafts unmerged** while the Solana Swap PR #618 vendor-hosted service/API/branding rights, dynamic vendor JavaScript/CSS/font trust, Cloudflare Analytics privacy decision, and current-build owner pre-sign minimum received/slippage/fee/device/rejection evidence are unresolved. The already-recorded two November 15 owner-controlled finalized staging mainnet swaps are historical DONE; no routine duplication.
2. Complete the separate [read-only live Jupiter CDN snapshot](https://github.com/CryptoDilis/Climboria/actions/workflows/jupiter-plugin-asset-drift.yml) on main with documented logs. Its five matching hashes, if observed, do not guarantee transitive runtime immutability or independently authorize customer funds.
3. With explicit operator acceptance, merge only the exact reviewed **Swap** activation head and confirm auto Cloudflare Worker deployment, public Swap status ON/no-store, health SHA and native execution OFF, actual in-site wallet disclosure/finality, and an executable source-OFF rollback. If this fails, restore OFF and verify public state; **do not proceed to DEX**.
4. **After verified Swap production**, update/rebase this DEX draft against the actual deployed main/Swap release without discarding later Swap safety code. Re-run all CI at the new DEX head; audit `surfaces.dex`, both Worker source approval literals, per-surface URLs, first-party Buy/Sell intent, selected token mints, live wallet pre-sign/slippage/minimum received, phone/desktop and rollback. Explicitly approve a separate DEX-only deployment; do not auto-enable DEX from Swap status.
5. After verified Solana Swap **and** Solana DEX Buy/Sell, do Base with independently audited EVM routing/approval/gas/fee flow, then additional EVM chains, and finally deferred Climboria Signature Launchpad.
6. Update this handoff with the **documentation-inclusive head's** exact CI before calling its full PR snapshot green. Do not overwrite the oversized (>1MB) historical `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` via an incomplete GitHub Contents response; this dated supplement and PR conversation are non-destructive durable records.

**Not verified:** Any production Jupiter customer swap, DEX Buy/Sell trade, hosted plugin legal permission, transitive JS integrity, browser wallet signing, on-chain production finality, Base/EVM execution, release acceptance or deployed DEX endpoint. **No trading claim is authorized by this PR.**


## 2026-11-18 continuation: real-browser Swap-ON / DEX-OFF negative release gate

**Exact code/test commit:** [`32ccf478c26bb75bab9b72d4fa1c38d0b3e101ce`](https://github.com/CryptoDilis/Climboria/commit/32ccf478c26bb75bab9b72d4fa1c38d0b3e101ce), still on **unmerged draft PR #624**. **No production deployment, no release approval, no wallet connection and no customer trading.**

### Why the additional browser case was needed
The earlier DEX host and unit tests already required a separate runtime status path, and synthetic browser *positive* fixtures tested independent DEX ON. The browser suite did not yet explicitly test a **Swap-ON / DEX-OFF** negative combination with `surfaces.dex=true` in an isolated test fixture. Such a case is essential so a later frontend change cannot regress to treating a successful Swap status as permission for DEX wallet UI.

### Change
- `.github/scripts/dex-swap-managed-provider-browser-smoke.mjs`: new `runDexIndependentOff` exercises the actual in-browser DEX page and its shared provider host with **Swap API approved in the fixture** and an independently mocked DEX API response in each of three conditions: `{enabled:false}`, invalid `{enabled:"true"}`, and `{enabled:true}` with **cacheable** headers (not no-store). Even though the fixture deliberately sets `surfaces.dex=true` to exercise the host, each case must request **only** `/api/dex/provider-status` and keep all three DEX launcher controls and the provider panel hidden, with zero `plugin.jup.ag` SDK downloads and zero Climboria native order/execute requests. Existing positive, close-during-load, tab-return and cache-rollback tests remain intact. The production DEX Worker literal approval gate and public `surfaces.dex=false` remain unchanged.

### Exact code/test SHA GitHub Actions: all 5 SUCCESS
- [Validate Climboria #44226316149](https://github.com/CryptoDilis/Climboria/actions/runs/44226316149)
- [Climboria Browser Smoke Test #44226316173](https://github.com/CryptoDilis/Climboria/actions/runs/44226316173)
- [DEX Swap Read-only Quote State Regression #44226316170](https://github.com/CryptoDilis/Climboria/actions/runs/44226316170) — includes the newly added negative synthetic Jupiter SDK/browser tests; no wallet signing or funded swaps
- [DEX Swap CPI Security #44226316177](https://github.com/CryptoDilis/Climboria/actions/runs/44226316177)
- [Climboria API Production Readiness #44226316227](https://github.com/CryptoDilis/Climboria/actions/runs/44226316227)

Previous documentation-inclusive head `1b707302cfb8f40bb495fd63dba1cddaa65eb85f` also eventually completed its 5 GitHub Actions workflows successfully; its quote-browser run [#44225452268](https://github.com/CryptoDilis/Climboria/actions/runs/44225452268) was initially pending while installing Playwright Chromium. **Do not classify this as a failure.**

### Evidence limits and exact next steps
1. Historical two **November 15, 2026 finalized owner-controlled staging transactions** are already documented. Prior screenshot review shows *estimated received*, not separately verifiable exact *pre-sign minimum received*. Prior read-only Jupiter quote UI tests showing a minimum are **not** a signed-wallet approval witness. Do not mark the current-build pre-sign gate complete merely because the staging swaps settled; do not request duplicate paid staging solely for historical receipts.
2. PR [#618 Swap-only activation](https://github.com/CryptoDilis/Climboria/pull/618) is still the current production priority, remains draft and unmerged. Review official Jupiter Plugin distribution/hosted SDK/API/branding terms, residual dynamically loaded vendor JS/CSS/font risk, Cloudflare analytics, existing owner-wallet acceptance proof and the manual read-only CDN live-drift check before seeking explicit exact-head approval. **A green CI run cannot authorize customer funds.**
3. **Do not merge #624 now.** After reviewed and verified Solana Swap production activation, reconcile latest `main` and #618's shared Worker/host, pair-change invalidation, safety tests and source gates into this older DEX branch. Re-run exact-head CI, check the independent DEX status remains default OFF and then seek a separate DEX-only wallet and release acceptance. Only after Solana Swap **and** DEX are verified move to Base, other EVM, then deferred Launchpad.
4. Documentation-only commit following this code SHA must have its **own** exact-head CI checked; the five runs above are explicitly for `32ccf478...` and must not be misattributed to the next docs commit.

The oversized historical `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` has been preserved intact; this dated report is the append-only continuation to avoid truncation via GitHub Contents.


## 2026-11-18 continuation: reconcile DEX's old shared Jupiter host with latest Swap safety

**Release scope:** This is preparatory hardening on [DRAFT/unmerged PR #624](https://github.com/CryptoDilis/Climboria/pull/624), **NOT approval to activate DEX trading**. The independent DEX Worker source approval and public `surfaces.dex` stay OFF; Climboria-native signing and execution, integrator fees, Base/EVM routing, Game, ClimbX and Launchpad source are untouched. Swap release [PR #618](https://github.com/CryptoDilis/Climboria/pull/618) remains separate, prioritized and also draft/unmerged.

### Why the DEX branch needed an early compatibility fix
Prior PR #624 shared-host source `dex/provider-managed-swap.mjs` was only ~389 lines. Newer reviewed Swap candidate PR #618 shared-host source had grown to ~552 lines and included major safety protections not present in the older DEX draft: mandatory selected Swap mints, provider-owned overlay concealment on close/rollback and tab return, vendor `close()/resume()` checks, async init fences, silent pair-change invalidation, 15-second reapproval monitor with pair checks, and detection of Solana-to-Base network drift. If the DEX branch were merged unmodified after the Swap branch, it could regress those shared behaviors.

### Concrete code and tests
1. [`3e5eb2536313df07cd70a6a3aee1388b97cdbaf8`](https://github.com/CryptoDilis/Climboria/commit/3e5eb2536313df07cd70a6a3aee1388b97cdbaf8) — updated **only** the shared frontend host on DEX branch with PR #618's current provider conceal, pair/network, async-init, stale-session, and tab-return guards, **while retaining** the DEX-only `managedProviderStatusUrl(config,surface)` logic and strict DEX URL `https://api.climboria.fun/api/dex/provider-status`. The Swap endpoint is never accepted as a DEX permission source. This change does **not** copy the source-ON Worker gate from Swap #618 or deploy anything.
2. [`67c6e1809210132bfe99c3ec98183238879b9efd`](https://github.com/CryptoDilis/Climboria/commit/67c6e1809210132bfe99c3ec98183238879b9efd) — restored synthetic Jupiter browser fixture `close()` and `resume()` to actually conceal/re-display the mocked vendor-owned root, matching current official lifecycle expectations instead of leaving an unmocked overlay visible.
3. [`21627e341ecb14a892b6a7ce538f4c1c1e8eed0d`](https://github.com/CryptoDilis/Climboria/commit/21627e341ecb14a892b6a7ce538f4c1c1e8eed0d) — updated old unit fixture to use a valid SOL/USDC pair by default for the **Swap** surface; DEX Market is still allowed to start with no selected mint pair. The hardened Swap host correctly refuses to initialize a generic vendor form on a missing Swap pair.
4. [`5ef01294fff276c76d7aac3127f4224b8c90a3ec`](https://github.com/CryptoDilis/Climboria/commit/5ef01294fff276c76d7aac3127f4224b8c90a3ec) — reconciled older test assertions with improved fail-closed behavior: stale paired form is concealed and launchers hidden, mounted Swap plugin receives actual SOL/USDC `formProps`, and tab-return tests explicitly mock the necessary vendor `close()/resume()`. This **code/test SHA passed 5/5 GitHub Actions**: [Quote State #44237775759](https://github.com/CryptoDilis/Climboria/actions/runs/44237775759), [Browser Smoke #44237775773](https://github.com/CryptoDilis/Climboria/actions/runs/44237775773), [Validate #44237775824](https://github.com/CryptoDilis/Climboria/actions/runs/44237775824), [CPI Security #44237775687](https://github.com/CryptoDilis/Climboria/actions/runs/44237775687), [API Readiness #44237775679](https://github.com/CryptoDilis/Climboria/actions/runs/44237775679).
5. [`793525a01055eb95fa1e1ef3a022504e050629d4`](https://github.com/CryptoDilis/Climboria/commit/793525a01055eb95fa1e1ef3a022504e050629d4) — three additional DEX-focused `node:test` negative cases: silently reversed selected DEX pair upon launcher click, DEX mint selection cleared while `Jupiter.init()` awaited, and a delayed *DEX* approval ON response after the first-party selected pair changed. All require the old Jupiter-owned UI hidden, no new init or resume, and status requests to remain restricted to the DEX-only endpoint; no wallet connection or funded transaction.

### Intermediate failures and their disposition
- First port attempt had [Quote Regression run #44237490019](https://github.com/CryptoDilis/Climboria/actions/runs/44237490019) FAIL with 18 old fixture/expectation errors, primarily because hardened Swap initialization now rejects missing mints. That was a **test compatibility problem**, not evidence of live customer trading.
- After correcting default Swap test mint selection, [Quote Regression #44237592175](https://github.com/CryptoDilis/Climboria/actions/runs/44237592175) still failed on older expectations for vendor-root conceal and resume. Those mocks/assertions were updated, and exact-head #5ef0129 subsequently passed **5/5 CI**. **Do not repeat those known fixture regressions or weaken source fail-closed rules to satisfy legacy tests.**

### Current acceptance boundary and exact next work
1. Check the exact five PR workflows at latest code-and-tests SHA `793525a...`; do not attribute the prior `5ef0129` success to the new tests without verifying their run. Check this **documentation commit's** CI separately as well.
2. Do **not** promote or merge DEX #624. Swap #618 must first be explicitly authorized/deployed on production with Jupiter hosted terms/vendor residual risk, Cloudflare Analytics decision, original current-build pre-sign minimum received/fees/rejection/device evidence, exact SHA approval and source-OFF rollback; verify actual mainnet provider wallet/finality before describing Swap as LIVE. Historical 2026-11-15 finalized staging swaps and completed 2026-11-18 five-asset CDN check are DONE.
3. Once production Swap is verified, reconcile DEX #624 **again** with the actual deployed `main` and final #618 Worker/provider host. This branch retains its own default-OFF DEX API endpoint and must never copy Swap's ON gate into DEX. Re-run DEX-specific independent approval, wallet pair, browser, Web Analytics, and rollback checks at the exact reviewed DEX commit.
4. Only after **separate** DEX owner acceptance and fully verified customer-funds flow, enable Solana DEX in a controlled release. Base, other EVM and Climboria Signature Launchpad come later; Launchpad is the only product that should carry "Signature" in public labels.
5. Preserve the oversized historical development record. This dated supplement and PR comments are the non-destructive handoff.

