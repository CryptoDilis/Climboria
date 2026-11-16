# Official $CLIMB Token Announcement Record

**Record ID:** CLIMB-2026-11-15-001  
**Last website update:** 2026-11-16  
**Source:** Climboria project owner's public launch announcement and the official CA already present in the homepage announcement, committed as `8e0bf6db1fa669aa851153810d9fa8d808f63acc` on 2026-11-15.

## Permanent CA navigation and copy fallback — MERGED (2026-11-16)

- **GitHub PR:** [#514](https://github.com/CryptoDilis/Climboria/pull/514), merged into `main` via squash **`b4874c6fd693bdae0a945ff2b808dc7461691dd1`**. Exact PR head `c9641d67da05332c20e3994a4b1956a678910f86`. Reviewed file list only `index.html`, `.github/scripts/climb-token-record-smoke.mjs`, `.github/workflows/validate-climboria.yml` and this record. No Game, DEX, Swap, Launchpad, ClimbX, token contract or trading execution source changes.
- **Exact-head CI SUCCESS:** [Validate Climboria #43777794038](https://github.com/CryptoDilis/Climboria/actions/runs/43777794038) and [Climboria Browser Smoke Test #43777794052](https://github.com/CryptoDilis/Climboria/actions/runs/43777794052). The Playwright test includes desktop 1536/1365px, mobile 390/360px, both navigation pathways, URL anchor, no fixed-nav obscuring of CA card, copied exact owner-announced mint, and full visible text selection on clipboard refusal, plus prior market-claim and layout guards.
- **Postmerge source proof:** `main/index.html` includes `#climbCaNavLink` and `#mobileClimbCaNavLink`, both pointing to `/#climb-token-record`; copy fallback selects only visible `#climbOfficialCa` text; the permanent Tokenomics card exists once and the hero no longer contains a CA overlay.
- **Production boundary:** successful merged GitHub code and PR CI are **not** proof of GitHub Pages publishing or the current production page rendering. No GitHub Pages deployment SHA, production browser screenshot or live domain HTTP evidence was available from the installed connector. Do not assert `climboria.fun` has deployed #514 until verified.
- **EXACT NEXT:** inspect GitHub Pages deployment for the `b4874c6f` revision, open `https://climboria.fun/` on actual mobile and desktop (or Cloud Browser in Work), test top navigation `$CLIMB` and hamburger `OFFICIAL $CLIMB CA`, confirm the footer deep link, visible full CA, copy success/fallback, readability and the original hero image/three CTAs; record real production evidence here. Correct any proven production CSS issue on a new site-only PR without changing unrelated systems.

---

## Permanent CA navigation and copy accessibility — historical draft checkpoint (2026-11-16)

- **Objective:** keep the previous merged #513 permanent premium Tokenomics panel but make its published $CLIMB CA easy to reach and copy on both desktop and phones without resurrecting a hero announcement.
- **Site-only source branch:** `site/climb-ca-nav-copy-polish-2026-11-16`. Adds a small gold `$CLIMB` link in desktop navigation plus an `OFFICIAL $CLIMB CA` item in mobile navigation, both going to `/#climb-token-record`. CSS `scroll-margin-top` prevents the fixed nav from hiding the card heading. Existing footer link, official mint, hero artwork and the three hero CTAs stay intact.
- **Clipboard fallback:** browser still attempts to copy the exact rendered `#climbOfficialCa` value. If Clipboard API is blocked, the client selects only that visible address for manual copying and displays an accessible `aria-live` explanation. It never constructs a mint from untrusted input.
- **Regression:** extends `.github/scripts/climb-token-record-smoke.mjs` to cover widths 1536/1365/390/360, desktop/mobile nav anchor activation, menu closing, scroll clearance, exact selected CA on copy denial, and all previously validated responsive/token-caution/copy cases. `.github/workflows/validate-climboria.yml` now requires the two exact navigation deep-links and text-selection fallback.
- **Source commits:** `6270840dfe30a06d8be24166ad2da3f59248fb5c` (site), `a5df7f5bdd6255c5abb91b4f4d074dd281d7068b` (browser test), `79bcd93cd58e53e16fc99046c934f19b7040c1fa` (static validation). CI/PR/Pages production evidence **not yet available at this draft checkpoint**.
- **EXACT NEXT:** Open a scoped site-only PR. Confirm diff restricted to homepage, existing token browser script, Validate workflow and this record. Run Validate + complete Browser Smoke for exact PR head. Fix legitimate desktop/mobile regressions, merge only on green checks, record PR/merge SHA/run IDs. Verify that GitHub Pages actually serves merged code (deployment SHA and real production browser desktop/mobile) before calling production live. Do not touch Game, DEX, Swap, Launchpad, ClimbX, finance, contracts or market-data services.

---

## Permanent $CLIMB Tokenomics UI — MERGED (2026-11-16)

- **Completed in repo:** [PR #513](https://github.com/CryptoDilis/Climboria/pull/513) merged into main via squash **`1f1241652167c9a1db6844e405f2ef355fd9f731`**. Exact validated PR head: `65010d249a0ff0f959977825d9dc225c29403af6`. Diff limited to `index.html`, `.github/scripts/climb-token-record-smoke.mjs`, `.github/workflows/browser-smoke.yml`, `.github/workflows/validate-climboria.yml`, this record. Game, DEX, Swap, Launchpad, ClimbX and contracts untouched.
- **Exact-head CI proof:** Validate Climboria [run #43777277988](https://github.com/CryptoDilis/Climboria/actions/runs/43777277988) **SUCCESS** and full Climboria Browser Smoke [run #43777277995](https://github.com/CryptoDilis/Climboria/actions/runs/43777277995) **SUCCESS**. Browser Smoke contains new 1365px desktop and 390/360px mobile geometry, visible CA, precise external links, local copy-button success/failure, no token promo overlay above hero, no TBD tests; full existing homepage, auth, DEX/Swap Browser Smoke also completed without failures.
- **Verified on main source after merge:** hero contains no `id="climbOfficialCa"`; `#tokenomics` contains the sole `#climb-token-record` and exact project-announced Solana CA; no raw tokenomics `TBD` remains. Permanent footer link `/#climb-token-record` lets visitors jump to the card. Previous incorrect Whitepaper layout nesting corrected.
- **Important release boundary:** GitHub merge and CI are verified. The available GitHub connector does not independently prove GitHub Pages has published commit `1f124165` or show an actual production browser render. **Production `https://climboria.fun/#climb-token-record` is NOT independently verified here.** The CA is owner-announced, not an independent claim about actual market liquidity or safety.
- **EXACT NEXT:** verify GitHub Pages deployment SHA for merged code, manually open `https://climboria.fun/` on desktop and narrow phones (or Cloud Browser in Work), confirm there is no hero CA overlay, scroll to the permanent Tokenomics CA panel, test copy button, official Pump.fun/Solscan links and footer anchor. Investigate any deployed-cache/CSS issue without changing unrelated applications; record actual evidence in this file.

---

## Permanent premium Tokenomics position — 2026-11-16 (historical draft handoff)

- **Owner request:** remove the temporary homepage hero launch announcement. Give the CA a permanent, prominently styled position **inside the Tokenomics & Game Funding section pictured by the owner**, rather than another countdown/card overlay over the official hero artwork. Preserve Play / DEX / Launchpad hero buttons and official brand photography.
- **Implementation on** `site/permanent-climb-tokenomics-premium-2026-11-16`: retire the old hero `#climb-token-record` overlay, move the unique `#climbOfficialCa` plus `#copyClimbCa` button and `#copyClimbCaStatus` into a premium dark/gold `#tokenomics #climb-token-record` card, matching the same exact official owner-announced Solana mint in Pump.fun and Solscan links. Keep the copy/status handler reading the visible DOM address; preserve its safe fallback.
- **Redesign:** replace raw TBD token-allocation rows with a verified-details-when-available disclosure; display network, original announcement date, Pump.fun venue and published owner-announced CA without asserting current liquidity or supply. Reformat the right side into legible separate **Marketplace, Arena wagers, game rewards, $CLIMB item utility** paragraphs with planned/not-yet-live label. Do **not** claim marketplace, rewards, wagering, trading execution or liquidity are operating. Restore valid Whitepaper/Tokenomics sibling DOM structure so the Tokenomics section is not squeezed inside a stale Whitepaper layout wrapper. Add discoverable permanent footer link.
- **Responsive and acceptance:** new CSS scoped to `#tokenomics`, 1365 / 390 / 360px Playwright coverage for visible permanent CA, exact links, side-by-side desktop/stacked mobile card geometry, real copy click success/failure feedback and no hero CA overlay. Existing Validate Climboria official CA assertion strengthened for Tokenomics placement, no duplicates, no raw TBD or countdown. CI and real Pages deploy remain **unverified at this initial draft checkpoint**.
- **Game / DEX / Swap / Launchpad / ClimbX:** no change to these apps, contracts, pricing feeds or execution. The former PR #510 provided owner announcement, this is strictly a website layout/content refinement.
- **EXACT NEXT:** open focused PR; run exact-head Validate Climboria and Climboria Browser Smoke; repair UI/CSS/test failures on the PR branch, review only site/CI/doc changes, merge after green checks, then verify GitHub Pages deploy and actual desktop/mobile `https://climboria.fun/#climb-token-record` before claiming production live. Record PR/head/CI IDs/merge and Pages truth.

---

## Recorded announcement

- **Ticker:** $CLIMB
- **Network:** Solana
- **Launch venue:** Pump.fun
- **Launch announcement date:** November 15, 2026
- **Official owner-announced mint / CA:** `9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump`
- **Owner-announced token link:** https://pump.fun/coin/9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump
- **Public explorer lookup:** https://solscan.io/token/9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump
- **Official social channel for cross-checking:** https://x.com/ClimboriaHQ

This record confirms the exact announcement content supplied by the project owner and found in the site's own published source. It does **not** independently attest an on-chain mint, token authenticity outside those owner channels, current bonding curve, liquidity, holder count, price, volume, market cap, profitability, trading success, or a funded in-game reward pool. Do not invent those market values or describe unrelated Game/DEX/Swap/Launchpad systems as live because this announcement exists.

## Prior website update — PR #510 (superseded hero placement)

The homepage hero contains one responsive `#climb-token-record` with the full Solana mint, an accessible copy button and result status, an exact CA-matched Pump.fun link, an exact CA-matched Solscan explorer link, date and chain, and an explicit trading caution. Removed the old planned-launch target from the mobile menu, deleted unused countdown styling and replaced the obsolete planned-token validate check with strict current owner-announced CA/link/caution checks. These changes affect only the homepage and its validation, not token transactions or protocol contracts.

## Verification / release status

- **Source on branch:** `site/climb-official-token-record-2026-11-16`
- **Homepage UI commit:** `0ae50bfe700a07e0da00b755d81b8560a8f967ca`
- **Updated official-record CI validation commit:** `098b96eeef340c344772f08b087034b5c2305d7a`
- **Site-only PR:** [#510](https://github.com/CryptoDilis/Climboria/pull/510) **MERGED** to `main` via squash **`0ba579b13688a8a0e37a8d67626155a4565e6c6b`** from exact reviewed PR head `e202b159bb9462024a7bf50c3902e56e64e4fa9e`. Reviewed diff: only `index.html`, `.github/workflows/validate-climboria.yml`, this file. No Game, DEX, Swap, Launchpad or ClimbX modifications.
- **Exact-head required CI verified terminal SUCCESS prior to merge:** [Validate Climboria #43775330513](https://github.com/CryptoDilis/Climboria/actions/runs/43775330513) and [Climboria Browser Smoke Test #43775330507](https://github.com/CryptoDilis/Climboria/actions/runs/43775330507). The obsolete prelaunch-text CI failure from prior Game PRs was corrected by replacing its old assertion with strict exact official announced CA/URL/accessibility/no-countdown checks rather than bypassing the validation.
- **Postmerge source confirmed:** `main/index.html` contains `#climb-token-record`, exact announced CA, matching Pump.fun and Solscan URLs, and no `PLANNED LAUNCH TARGET` copy. **GitHub Pages production publish and live-browser render NOT verified by available GitHub connector**; do not claim that the production website has already refreshed without deployment/browser evidence.

## Historical PR #510 next steps (retained for audit; superseded above)

1. Open a focused site-only PR. Review diff for just `index.html`, `.github/workflows/validate-climboria.yml` and this announcement record. Keep unrelated Game, DEX, Swap, Launchpad and ClimbX files unchanged.
2. Run the latest exact-head Validate and Homepage/Browser CI; inspect script syntax and actual desktop/mobile layout. Fix real issues without bypassing assertions.
3. Merge only after required checks pass. Verify GitHub Pages actually deployed that merge SHA; check `https://climboria.fun/` desktop and mobile for readable contract, copy feedback, correct external links, no stale countdown, CTA visibility and no layout overlap.
4. Record exact PR number, CI run links, merge SHA, Pages result and any remaining mobile/browser shortcomings here. If site-only CI cannot be green or actual Pages is not verified, say so rather than claiming release.
