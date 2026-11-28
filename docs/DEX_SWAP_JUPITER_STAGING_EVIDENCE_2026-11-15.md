# Jupiter pinned-plugin staging evidence — November 15, 2026

This file preserves the **branch-specific detailed test and staging audit trail** originally appended to `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md` on draft PR #475. The main development record is kept synchronized with the current `main` branch to avoid losing later, independently merged Swap/DEX release checkpoints.

**IMPORTANT:** Historical staging observations are not production release approval. Actual live Swap/DEX wallet trading remains OFF. The pinned Jupiter app and bootstrap rehosting on this draft branch require upstream-supported complete-runtime integrity and applicable license/permission review before they can be considered for production. Nothing in this document authorizes enabling the provider, custom execution, or collection of a trading fee.

**Provenance:** Draft branch `codex/swap-dex-npm-integrity-check`, previously appended branch history snapshot blob `cbfdb8cef18a696cdab1e05d3ac32e0b856ce932`, common main-record prefix 646,506 characters, copied unmodified below apart from surrounding document framing.

---

### 2026-11-15 PH — Published Jupiter npm package retains the runtime integrity blocker

Downloaded [`@jup-ag/plugin` 1.0.18](https://registry.npmjs.org/@jup-ag%2fplugin/1.0.18) from the npm registry and independently matched the tarball SHA-512 against registry `dist.integrity`: `sha512-piB2fP16TsT1m6voTOAepWEbJbUDd6/IBBRdQ+g/R2CfcDai8DnEG7L7lFtxn1zCex2pxkTKYSqUUk51TmH/hQ==`.

The extracted package exports `dist/index.js`. Its production `RenderLoadableJupiter` effect invokes `loadJupiter()`, which calls `loadRemote` for `https://plugin.jup.ag/plugin-1.0.18-app.js` under default settings. The loader sets the script URL and appends it to the page without setting `integrity`. A package lock and ordinary bundling of this entry point therefore leave the remote executable outside the pinned build. This was verified by static inspection of the published bytes. No browser, wallet, trade, or deployment test was performed.

**Next:** Evaluate a separately reviewed, locally built or integrity-pinned complete Jupiter runtime with remote executable loading blocked, or obtain a supported immutable runtime manifest from Jupiter. Validate the exact artifacts in staging on both routes before any owner-wallet acceptance. Production config and execution gates were untouched.

### 2026-11-15 PH — Pinned Jupiter runtime browser probe

Re-downloaded the five versioned Jupiter artifacts and matched every SHA-384 against the earlier source audit. Ran an isolated Playwright Chrome harness with a desktop viewport labeled Swap and a mobile viewport labeled DEX. The harness fulfilled only exact verified Jupiter asset URLs from local bytes and blocked other outbound requests. The initial run blocked Google's font stylesheet and timed out before the app script loaded. With an explicit local empty stylesheet response for that request, both viewports loaded the pinned bootstrap, three Jupiter stylesheets and pinned app script, and exposed `JupiterRenderer.RenderJupiter` without uncaught page errors during observation. No other scripts were requested in the observed initial-load flow. The logo and token lookup requests were blocked, so the test did not validate the user-facing widget or quote flow.

These were isolated test pages, not Climboria's actual routes. Playwright interception provided the integrity enforcement for this probe. Production still needs an implementation that enforces the same guarantee without test interception, plus desktop and mobile testing of the full wallet flow. No deployment, wallet connection, signing or settlement occurred. The font dependency must be explicitly pinned, removed, or handled with a reviewed local fallback for any staging integration.

### 2026-11-15 PH — Actual Swap and Signature DEX pages exercised with pinned Jupiter assets

Local Playwright Chrome staging loaded the real `/swap/` and `/dex/` HTML from commit `7bf09f4bbd8e65423bdfaf42c8064a3ad100866d`, the existing provider host and the existing launcher controls. The harness overrode only the provider configuration and host URL validation/init options in served responses. It kept native execution and fees off, disabled provider auto-connect, served all five pinned Jupiter artifacts from SHA-384-verified bytes, supplied an empty local font stylesheet, and blocked other external network requests.

Ran both routes at 1280 × 800 and 390 × 844. In all four combinations, the real launcher loaded Jupiter's pinned bootstrap and app script, and Connect Wallet opened the provider's wallet picker. With no installed wallet the picker reported zero wallets on all four. With a synthetic Solana Wallet Standard adapter, the picker exposed the test wallet and selecting it invoked the connect callback exactly once with zero sign calls in all four combinations. The adapter had no keys and refused signing. These checks cover the launcher, picker, discovery and connection callback in an emulated viewport. They do not cover a physical mobile wallet, extension authorization, live quotes, transaction review or settlement.

Production remains quote-only. Browser interception supplied the asset restrictions locally. Next, enforce the same verified runtime in a deployable staging configuration, validate a real desktop wallet and physical mobile wallet there, then proceed to supervised owner-wallet acceptance.

### 2026-11-15 PH — Standalone pinned Jupiter staging server passes browser wallet-adapter checks

Run `node .github/scripts/dex-swap-pinned-staging.mjs` from this branch with Node 22 or later. The server listens on loopback port 4173 and serves the actual `/swap/` and `/dex/` pages. It downloads the five audit artifacts without redirects and refuses to start on a digest mismatch. After verification it rewrites the bootstrap's asset origin to the staging server and uses a local empty font stylesheet, then computes SRI for the resulting bootstrap. It serves the verified app and three Jupiter stylesheets from memory and sends a script CSP allowing same-origin scripts and the actual pages' hashed inline scripts. The provider config override exists in server responses only.

Tested locally in Chrome through actual HTTP, without browser request interception, at 1280 × 800 and 390 × 844 on both routes. All four cases selected a synthetic Wallet Standard adapter, invoked its connection callback once, and invoked signing zero times. Observed Jupiter script requests completed exclusively from the staging server. This validates local staging and the adapter flow. It does not validate a real extension, physical mobile wallet, transaction review, or settlement.

For physical mobile testing, run behind a separate HTTPS staging reverse proxy and set `SWAP_STAGING_ORIGIN` to that exact HTTPS origin and `SWAP_STAGING_PORT` to the loopback backend port. No HTTPS staging origin was deployed by this change. Next verify real owner-controlled desktop and mobile wallet connection on the staging origin. Production config and execution gates remain untouched.

### 2026-11-15 PH — HTTPS staging verified for owner wallet connection

Served the staging server behind a temporary Cloudflare HTTPS tunnel on a separate origin. Both routes returned HTTP 200. The initial HTTPS run observed a Cloudflare-injected email decoder on DEX and third-party chart iframe scripts on desktop Swap. Commit `df43fd3b28b4f22614ec43a9a7be9e3f9be4f313` tightened the staging CSP to explicit same-origin script paths plus inline hashes and blocked frames. The final HTTPS Chrome smoke passed all four route and viewport combinations with the synthetic Wallet Standard adapter. Only the expected scripts completed loading, including the local pinned Jupiter bootstrap and app bundle. One connect callback and zero signing calls were observed in each case.

The temporary endpoint depends on the workstation and tunnel processes. Owner-controlled desktop extension and physical mobile wallet connection remain pending. No trade was submitted. No production deployment or configuration change was made.

### 2026-11-15 PH — Owner reports real wallet connection on both HTTPS staging routes

Owner reported successful wallet connection on staging Swap and Signature DEX on desktop and mobile. This is owner-observed connection evidence. No wallet vendor/version or device details were supplied. Independently rechecked both staging routes returned HTTP 200 with CSP present, and production Worker health still reported `execution: "disabled"` and `executionEnabled: false`. No production deployment, transaction approval, submission or settlement occurred.

**Next acceptance step:** On one staging route, use an owner-controlled test wallet and one smallest practical swap after reviewing the quote and wallet preview. Capture the route, device/wallet, token mints, input, expected output, minimum received and displayed fees. The owner reviews the preview and approves only if it matches. If submitted, capture the public signature and verify mainnet finality, successful execution, token balance deltas, network fee and any separately observable provider fees against the preview using Solana RPC or an explorer. Keep production quote-only while the test and release review are pending.

### 2026-11-15 PH — Owner staging Swap settled on Solana mainnet

The owner supplied the staging Jupiter receipt and [transaction signature](https://explorer.solana.com/tx/5qizkUeng2abJnZ3VtXU3Kdz1SbeNva8jKbCKe2cCUzeMa3bS59v8VtiHceRHsnHZxfj4FJmCtiiX9FjvMGmm5TF). Independently queried Solana mainnet `getTransaction` at `finalized` commitment. Slot `469561132`, 2026-11-15 10:25:10 PH, `meta.err: null`. The fee payer's SOL balance decreased by 5,006,364 lamports, including a network fee of 6,364 lamports (0.000006364 SOL). The remaining 5,000,000 lamports split into 4,999,000 lamports (0.004999 SOL) reaching the swap pool and a separate 1,000-lamport wrapped SOL balance increase. That split is consistent with the 0.02% platform fee shown by Jupiter. The owner's canonical USDC balance increased by 352,733 base units (0.352733 USDC), matching the Jupiter receipt. Wrapped SOL mint: `So11111111111111111111111111111111111111112`. USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.

The successful attempt's pre-approval minimum received was not supplied, so quote-floor comparison remains unverified. The earlier attempt displayed “Transaction expired” and had no signature supplied. This is one finalized staging Swap settlement. Production Worker health still reported execution disabled. Keep public Swap and Signature DEX quote-only pending release review.

### 2026-11-15 PH — PR #475 production rollout review

Reviewed draft head `efe2b5719c52f315616f5ceec53c860bcc1b1b45`. The diff adds a staging server and updates this record. [Validate Climboria 43667838801](https://github.com/CryptoDilis/Climboria/actions/runs/43667838801) passed on that head. The run covers existing repo and Worker checks. The pinned staging server and browser acceptance are not exercised by that CI run. Production Worker health still reported execution disabled.

**Release blockers and order**

1. Confirm terms for the exact production delivery. The staging server modifies and re-serves the CDN bootstrap. Jupiter's [SDK/API agreement](https://developers.jup.ag/docs/legal/sdk-api-license-agreement) contains restrictions on redistribution and modification. Confirm which terms govern these specific Plugin artifacts and what authorization is needed, or use a supported delivery mechanism that provides equivalent runtime integrity. Record the applicable terms and attribution before creating a public enablement change.
2. Build a separate production integration PR with the provider disabled by default. Pin the complete runtime, verify hashes in CI, preserve the native Worker gates, and keep Climboria referral settings off. The staging server assigns CSP only to exact route URLs while direct HTML file paths can serve the same pages without it. Production must enforce the policy on all entry URLs, including aliases and cached responses. Rehearse rollback to quote-only on both routes by turning off provider delivery and verifying the cache cannot continue serving the enabled configuration.
3. Test the exact production candidate on a stable HTTPS origin. Automate pinned-asset integrity, wallet picker and close/reopen, tampered artifact rejection, stale quote or expired transaction handling, and the absence of native execution requests. Verify the browser security policy and existing quote and market views on both routes. Separately exercise desktop and physical mobile wallets. Document the provider and network fees distinctly from any Climboria fee and capture the minimum received before signer approval.
4. Use a limited owner acceptance on the exact candidate, starting with Swap. Verify finalized signature, mints, balance deltas, minimum received and fees. The existing finalized settlement proves one staging Swap transaction. DEX has wallet connection evidence and no settled trade recorded. Validate DEX before enabling it. After release approval, verify the exact deployed builds and monitor wallet failures, transaction expiry and unexpected asset loads; revert to quote-only if a release condition fails.

Keep PR #475 as staging/evidence and keep public Swap and Signature DEX quote-only while these items remain open.

### 2026-11-15 PH — Production runtime guard drafted and delivery terms checked

[Jupiter's HTML example](https://developers.jup.ag/docs/tool-kits/plugin/html-app-example) documents the CDN embed. [Plugin integration docs](https://developers.jup.ag/docs/tool-kits/plugin) also document the npm route. The audited CDN and npm artifacts load the app script dynamically without SRI. No supported complete integrity manifest was found in the official public documentation reviewed. The [SDK/API agreement](https://developers.jup.ag/docs/legal/sdk-api-license-agreement) sections 2.2, 2.4 and 3.2 restrict redistribution and modification where applicable and give a written-consent route. The package MIT metadata does not resolve which terms govern re-serving the CDN artifacts and API use in this deployment. Ask Jupiter for a supported immutable manifest covering the bootstrap, transitive JavaScript and styles, or written confirmation of the terms for re-serving those exact artifacts and replacing the bootstrap asset origin and font URL. No provider correspondence or clearance was obtained.

Separate disabled-by-default [draft PR #476](https://github.com/CryptoDilis/Climboria/pull/476) adds a runtime approval gate to the provider host shared by Swap and Signature DEX. Head `b73298938ca07c69bb919f6a7ecbe1d449fbda7c` passed 10/10 local provider-shell tests and git diff check. Both public flags are false and the provider script URL and integrity remain unset. The PR adds no live provider delivery or assets. Production continues quote-only. If the staging harness is later rebased over the guard, its staging-only config response needs the approval flag to exercise the synthetic provider.

### 2026-11-15 PH — Jupiter maintainers contacted and production guard CI passed

Opened [jup-ag/plugin issue #238](https://github.com/jup-ag/plugin/issues/238) requesting a supported immutable full-runtime integrity manifest or build. The issue also asks for the appropriate written-approval contact for the exact version-pinned rehosting and limited bootstrap changes if the supported option is unavailable. Awaiting Jupiter response. No written approval or supported manifest has been received.

[Draft PR #476](https://github.com/CryptoDilis/Climboria/pull/476), head `b73298938ca07c69bb919f6a7ecbe1d449fbda7c`, passed [desktop/mobile quote regression](https://github.com/CryptoDilis/Climboria/actions/runs/43668057840), [browser smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43668057915), and [validation](https://github.com/CryptoDilis/Climboria/actions/runs/43668057862). Production Worker health continued to report execution disabled. No merge, deployment or enablement was performed.

### 2026-11-15 PH — Staging page aliases now enforce the canonical route policy

Commit `98758613161748062c4b163be09dc1509c6ced0e` redirects slashless and direct `index.html` entry paths for Swap and Signature DEX to their canonical routes and denies other HTML in the staging server. Local HTTP checks verified all four alias redirects, HTTP 200 with CSP on both canonical pages, and 404 for the root `index.html`. Local Chrome smoke passed both routes at desktop and mobile viewport sizes with the pinned app script and one synthetic wallet connect callback with zero signing calls per case. The old temporary HTTPS staging deployment was not updated. Production Worker health still reported execution disabled.

### 2026-11-15 PH — Alias fix deployed and verified on temporary HTTPS staging

Deployed the staging script from PR head `e9310e28b637a481a0ff099ffedc5ed37be7e4f9` to the existing HTTPS staging tunnel. Verified that `/swap`, `/swap/index.html`, `/dex`, and `/dex/index.html` return 308 to their respective canonical routes, both canonical pages return 200 with Content Security Policy, and the root `/index.html` returns 404.

Chrome HTTPS smoke passed all four combinations of Swap/DEX and desktop/mobile viewports with the pinned Jupiter runtime. The synthetic Wallet Standard adapter received exactly one connect callback and zero signing calls per case. Real-wallet approval and settlement were not rerun for this alias fix. The production Worker still reported execution disabled.

### 2026-11-15 PH — Owner staging Signature DEX swap settled on Solana mainnet

Independently queried [the owner-supplied signature](https://explorer.solana.com/tx/3ctyBwrwWo1EckaRGgfoLRtffHsHL1YPpvgF1SYLptPdVHJtNxaovE37gjrbZe1uNqajSTpWQCJUNPknfwA2deJd) through Solana mainnet `getTransaction` at `finalized` commitment. Slot `469584646`, 11:49:32 AM PH, `meta.err: null`. The fee payer's canonical USDC balance decreased by 352,743 base units (0.352743 USDC), matching the Jupiter receipt. The pool's wrapped SOL balance decreased by 4,933,645 lamports (0.004933645 SOL), the gross output shown by Jupiter. A separate wrapped SOL account increased by 986 lamports, consistent with the displayed 0.02% platform fee. The network fee was 9,844 lamports (0.000009844 SOL). The fee payer's native SOL balance increased by 4,922,815 lamports (0.004922815 SOL) net, reconciling the gross output minus both fees. USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Wrapped SOL mint: `So11111111111111111111111111111111111111112`.

The Phantom preview provided an estimated receive amount. The pre-approval Jupiter minimum received was not supplied, so the quote-floor comparison remains unverified. This is one verified owner settlement on the HTTPS staging DEX, alongside the earlier staging Swap settlement. Production Worker health still reported execution disabled. Public Swap and Signature DEX remain quote-only pending delivery and release review.

### 2026-11-15 PH — Both staging settlements verified, production release still pending

The earlier rollout review's DEX settlement gap is resolved for the temporary HTTPS staging build. Both owner test swaps have finalized Solana mainnet receipts and reconciled token balance changes and fees. The pre-approval minimum received was not captured for either successful attempt. Capture it on the exact release candidate before approval.

Rechecked [Jupiter issue #238](https://github.com/jup-ag/plugin/issues/238): open, zero replies. Confirm a supported complete runtime integrity mechanism or obtain written clearance for the exact pinned rehosting and bootstrap changes before choosing a production delivery. [Draft PR #476](https://github.com/CryptoDilis/Climboria/pull/476) remains open and mergeable at its previously green head `b73298938ca07c69bb919f6a7ecbe1d449fbda7c`. It adds the disabled-by-default guard. Production Worker health still reports execution disabled.

Once delivery is confirmed, build the production candidate with provider off by default. Verify pinned assets and security policy on the exact deployable build, including entry aliases and cache behavior. On stable HTTPS, rerun desktop and physical mobile wallet acceptance with that build, capture minimum received and separate provider/network fee evidence, and rehearse rollback to quote-only. Keep native Worker signing/execution and Climboria referral fees off. Enable Swap first only after release review, then Signature DEX after verifying its rollout independently. No production change was made for this checkpoint.

### 2026-11-15 PH — Quote-only rollback rehearsal with browser cache enabled

[PR #476](https://github.com/CryptoDilis/Climboria/pull/476), head `b0bec320d1bc3c8d305b037ff479ea43316fb6c2`, extends the browser suite with a local HTTP fixture that uses the actual Swap and DEX pages and switches from an enabled synthetic provider to the production quote-only config. The fixture uses a cacheable synthetic SDK and a `Cache-Control: no-store` config. It runs without request interception, so the browser cache stays enabled. All four local Chrome cases passed (both routes at 1280 and 390 pixels). An already-open document retained its mock widget after the server switch. After navigating away and revisiting the same URL in the same browser session, each page fetched the disabled config, hid its provider controls, and loaded no SDK or native order/execute endpoint. No real wallet was connected.

**Production cache gap:** a read-only request to the live `/swap-config.js` returned `Cache-Control: max-age=600`. The live content is currently disabled. This is not evidence for fast rollback once an enabled config is ever cached. Confirm a stable HTTPS delivery where the mutable config is `no-store` (or reliably revalidated), and verify page aliases, CDN behavior and cache headers before release. CI for the rehearsal runs in [DEX Swap quote-state regression 43674453805](https://github.com/CryptoDilis/Climboria/actions/runs/43674453805).

**Rollback procedure for the release candidate:** Serve the quote-only config with managed provider `enabled:false` and `runtimeApproved:false` and verify it at the CDN edge. Purge affected cached config and entry URLs if the delivery platform supports it. Revisit both canonical routes and aliases in the same warm browser session and in a fresh session. Verify quote functionality, hidden provider UI and absent SDK/order/execute requests. Ask users with already-open provider panels to reload or close the page. Turning off config delivery does not unload a running widget or cancel signed or submitted transactions. Rehearse this procedure on the exact deployment before any public activation.

Production Worker health still reported execution disabled. No production deployment or configuration change was made. Jupiter issue #238 remained open without comments at this check.

Exact-head CI completed successfully: [quote-state regression including rollback](https://github.com/CryptoDilis/Climboria/actions/runs/43674453805), [browser smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43674453913), and [validation](https://github.com/CryptoDilis/Climboria/actions/runs/43674454346).

### 2026-11-15 PH — HTTPS rollback verified despite a cached enabled config

[PR #476](https://github.com/CryptoDilis/Climboria/pull/476) head `1ac8dc1941d25cd94e00e769dc556f6f3e0d4e17` adds a fail-closed, same-origin runtime status check. Even with valid enabled flags and a script pin in `swap-config.js`, a new page only exposes the provider after a successful non-redirected `/swap-runtime-status.json` response with `Cache-Control: no-store` and JSON `enabled: true`. Requests bypass browser caching. A timeout, missing or invalid response, or cacheable response keeps the page quote-only. Both routes reference the new host version.

The temporary HTTPS staging host was restarted against this code with a staging-only status endpoint and `max-age=600` on the enabled config to reproduce the live header. Chrome tested both routes at desktop and mobile viewport widths without request interception. All four cases loaded the pinned runtime while on. After setting the status off and revisiting the URL in the same session, the browser still reused the enabled config from cache, read the fresh disabled status, hid the provider controls and made no additional SDK requests. An already-open widget continued to exist until navigation. No wallet signing or transaction was performed in this rehearsal. The staging switch was returned to off.

Production still serves its disabled config from GitHub Pages with `max-age=600`. This PR prevents the cached config alone from activating a new widget. Before public rollout, deploy an authoritative same-origin status endpoint with CDN caching disabled and verify its behavior on the actual production delivery path. There was no production deployment or change to the Worker or fee settings.

GitHub checks passed on PR #476, including [quote-state and rollback regression](https://github.com/CryptoDilis/Climboria/actions/runs/43674837563), [browser smoke](https://github.com/CryptoDilis/Climboria/actions/runs/43674837537), and [validation](https://github.com/CryptoDilis/Climboria/actions/runs/43674837558). A final HTTPS read confirmed staging status `{"enabled":false}` with `Cache-Control: no-store`.

### 2026-11-15 PH — Disabled production status handler prepared; apex routing pending

[Draft PR #476](https://github.com/CryptoDilis/Climboria/pull/476) head `7c37cfa` prepares a standalone worker for the exact production status path. It serves only `https://climboria.fun/swap-runtime-status.json`, returns `{"enabled":false}` and `Cache-Control: no-store`, and has no public workers.dev or preview URL. Local handler checks passed for GET, HEAD, unsupported method, unrelated path, and unrelated origin.

Production remains on GitHub Pages. The apex resolved directly to GitHub Pages IPs, and the status URL returned 404 from GitHub. [Cloudflare Worker routing](https://developers.cloudflare.com/workers/configuration/routing/routes/) requires a proxied DNS record for this route. Deploying the worker alone cannot intercept the apex request. The next infrastructure action is an apex routing change by the zone operator, preserving and verifying the existing Pages delivery for the rest of the site, followed by deployment of the exact-path worker. Verify public GET returns 200, `enabled:false` and `no-store`, and rerun quote-only smoke on both routes before considering the endpoint deployed. No DNS, route, or production deployment was changed.

Production Worker health still reported execution disabled. [Jupiter issue #238](https://github.com/jup-ag/plugin/issues/238) remained open without comments.

### 2026-11-15 PH — Production endpoint route blocked by Cloudflare DNS access

A read-only [routing preflight](https://github.com/CryptoDilis/Climboria/actions/runs/43675403340) using the existing repository deployment credential located the Cloudflare zone. Cloudflare rejected the apex DNS record list request with authentication error 10000. The preflight made no DNS or Worker changes and its one-time workflow was removed from [PR #476](https://github.com/CryptoDilis/Climboria/pull/476). The existing handler remains there. The public status URL still returned HTTP 404, and production Worker health still reported execution disabled.

Next, use Cloudflare zone access that can read and edit the apex DNS records. Verify Pages origin TLS and existing routes, proxy the apex while preserving the Pages origin, attach the exact-path disabled Worker, and verify HTTP 200 with `Cache-Control: no-store` and `{"enabled":false}`. Confirm both public pages still serve quotes. No deployment or production execution change occurred.

### 2026-11-15 PH — Disabled endpoint deploy stopped at DNS token authentication

GitHub confirmed the `CLOUDFLARE_RUNTIME_DNS_TOKEN` secret exists and injected it into [deployment run 43676907287](https://github.com/CryptoDilis/Climboria/actions/runs/43676907287). Cloudflare returned error 9109, “Invalid access token,” on the initial zone lookup. This occurred before any DNS write, Worker deployment, or route change. The one-time deployment trigger was removed from [PR #476](https://github.com/CryptoDilis/Climboria/pull/476), which retains the existing endpoint handler. The public status URL remained HTTP 404, and production Worker health still reported execution disabled. Restore a valid zone-scoped DNS token in the existing secret before retrying.

### 2026-11-15 PH — Updated DNS secret retry rejected before deployment

[Retry run 43677488557](https://github.com/CryptoDilis/Climboria/actions/runs/43677488557) received the updated GitHub secret but Cloudflare again returned 9109 at the initial zone lookup. No DNS record, Worker, or route was changed. Removed the one-time deploy trigger from [PR #476](https://github.com/CryptoDilis/Climboria/pull/476), retaining the existing handler. Independent live checks returned 404 for the status endpoint and 200 for both Swap and DEX pages. The native Worker still reported execution disabled. Before another deployment, verify token authentication with a read-only lookup from Actions or use the signed-in Cloudflare dashboard.

### 2026-11-15 PH — Token is active, but Cloudflare zone access still rejected

The read-only [Actions run 43677950409](https://github.com/CryptoDilis/Climboria/actions/runs/43677950409) confirmed the GitHub secret authenticates at Cloudflare's user token verification endpoint with status `active`. Cloudflare still returned error 9109 on the `climboria.fun` zone lookup, so DNS listing could not proceed. The underlying reason for the zone-specific rejection was not established. The one-time workflow was removed from #476. No changes were made to DNS, Workers, or production execution. The signed-in Cloudflare dashboard remains the alternate deployment path.

### 2026-11-15 PH — Disabled runtime status endpoint verified in production

The owner deployed the existing [PR #476](https://github.com/CryptoDilis/Climboria/pull/476) handler and added the exact Cloudflare route through the dashboard. Independent GET to [the production status URL](https://climboria.fun/swap-runtime-status.json) returned HTTP 200, `Cache-Control: no-store`, and `{"enabled":false}`. Both Swap and Signature DEX pages returned 200. The live frontend config still has native execution, managed provider, and fee collection disabled, and the API Worker health reported execution disabled. This resolves the disabled endpoint routing blocker. Production remains quote-only.
