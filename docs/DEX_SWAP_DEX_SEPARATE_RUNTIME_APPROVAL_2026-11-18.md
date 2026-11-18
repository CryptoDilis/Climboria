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
