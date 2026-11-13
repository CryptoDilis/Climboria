# Climboria Whitepaper & Homepage Completion Checklist

**Tracking PR:** https://github.com/CryptoDilis/Climboria/pull/275  
**Canonical document:** https://climboria.fun/whitepaper/  
**Scope:** Complete, professional Climboria ecosystem whitepaper; remove the retired Overview entry points from desktop/mobile homepage.

This is the working release checklist. A checkbox is marked complete only after evidence is available. Planned product features must remain labelled as planned; documentation completion does not mean the product feature is live.

## A. Whitepaper content — editorial completion

- [x] Establish the Whitepaper as the sole canonical ecosystem document; the retired /overview/ route is deleted (no redirect).
- [x] Expand the paper beyond the old short version and restore detailed information from the former Overview.
- [x] Explain the project vision and Game First, Speculation Later principle.
- [x] Document Jarrell’s Peak, the single launch-world direction, survival, exploration, fishing, swimming, treasure discovery, and no-summit/no-final-level design.
- [x] Document free-to-play access, free hero choice, free starter tool, optional characters/skins, and fair progression.
- [x] Document ingredients, Forge, crafting, tool upgrades, and refining design.
- [x] Document random treasure chests, hidden discovery locations, public discovery records, and reward controls.
- [x] Document All-Time and Weekly Top Gainers, scoring design, and conditional weekly payout timing.
- [x] Document Marketplace, item/NFT minting design, fee rules, and the distinction between collected fees and trading volume.
- [x] Document Swap and dedicated DEX scope, wallet/quote/liquidity/security dependencies, and non-guaranteed execution.
- [x] Document Climboria Signature / Launchpad review and disclosure principles.
- [x] Document Arena, Guild Battles, spectators, Weekly Guild Wars, and the unverified nature of concurrency targets.
- [x] Document optional wager concept and its escrow, consent, dispute, anti-abuse, and compliance prerequisites.
- [x] Document Chatworld, Global/Proximity/Private Chat, moderation, guilds, referrals, and Social Lobby.
- [x] Document sponsor approval, written agreements, full-payment and prize-pool verification, and Jarrell’s Peak funding boundaries.
- [x] Document Solana-first strategy and later Base consideration without claiming unsupported chain functionality.
- [x] Document roadmap, risks, security gates, and explicit planned/in-development/live status distinctions.
- [ ] Complete final editorial consistency review against all approved project decisions and remove any contradictory or stale claims. (Current review confirms fee design and badge-deferred wording match README on main; confirm any older 10-mountain/top-25-badge notes are superseded before sign-off.)
- [ ] Verify every external link, internal section link, canonical metadata, mobile layout, and public deployment after merge.

## B. Homepage navigation cleanup

- [x] Remove Overview from desktop homepage navigation.
- [x] Remove Overview from mobile hamburger navigation.
- [x] Remove the Overview resource card from the homepage lower card/resource area.
- [x] Keep Roadmap and Game Concept cards.
- [x] Point desktop/mobile Whitepaper entry points to the canonical /whitepaper/ page.
- [x] Delete /overview/ entirely; do not retain a redirect or compatibility page.
- [ ] Verify these changes on the deployed production homepage after merge.

## C. Quality assurance and release

- [x] Focused static checks for Overview removal, Whitepaper navigation, retained cards, and detailed section anchors.
- [x] Validate Climboria GitHub Actions workflow passed on commit fdee69d33594340440ce4e2ffd5ac841c0b34296.
- [ ] Browser Smoke workflow completes successfully on the final PR head.
- [ ] Review any failed workflow step and logs; diagnose root cause before changing code or retrying.
- [ ] Review the final rendered Whitepaper on desktop and mobile.
- [ ] Merge PR #275 only after required checks and review are complete.
- [ ] Confirm GitHub Pages deployment and verify the public Whitepaper and homepage navigation.

## D. CoinGecko pre-listing evidence — separate from writing completion

- [ ] Confirm official token deployment and canonical Solana mint address.
- [ ] Verify ticker/name and official token identity from primary on-chain sources.
- [ ] Confirm total supply, circulating supply, decimals, mint/freeze authorities, and distribution/vesting details.
- [ ] Verify active exchange/DEX markets and trading pairs with reliable market data.
- [ ] Publish official website and social/community links.
- [ ] Provide security audit reports or accurately disclose audit status.
- [ ] Verify current operational status of game, Swap, DEX, Launchpad, Marketplace, and other products.
- [ ] Complete CoinGecko's current submission requirements and attach evidence; do not imply acceptance or listing is guaranteed.
- [x] Draft all five Section 3 project-information answers in third person, each above the 400-character minimum.
- [ ] Verify token deployment, mint, supply, and at least one active exchange market before submitting the form's trading-information section.
- [x] CoinGecko Section 6 asset classification prepared as Token on Solana (the planned initial chain).
- [ ] Leave all five Section 5 Block Explorer URL fields blank until the official mint exists; then add only verified explorer links (for example, Solscan token URL).
- [ ] Read actual mint decimals from the deployed token account; never assume a decimal count.
- [ ] Do not invent a Section 4 exchange name or pair analytics URL; add it only after a real market is active and discoverable.

## E. CoinGecko Section 3 form draft

- [x] Draft: What is the project about?
- [x] Draft: What makes your project unique?
- [x] Draft: History of your project?
- [x] Draft: What's next for your project?
- [x] Draft: What can your coin/token be used for?
- [ ] Owner verifies each answer and current project status before pasting/submission.
- [ ] Section 4 exchange and exact trading-pair analytics URL verified from a live market.

Draft file: [docs/COINGECKO_PROJECT_INFORMATION_DRAFT.md](./COINGECKO_PROJECT_INFORMATION_DRAFT.md)

## Current status snapshot

- **Whitepaper expansion:** substantial content added; final editorial consistency review remains open.
- **Homepage Overview removal:** desktop/mobile nav and bottom Project Overview card removed on the PR branch; /overview/ route deleted (no redirect). Production verification awaits merge/deployment.
- **Validate Climboria workflow:** passed on PR head d597176891ed8433381e869747a479a4bb385c7d (run 43363769740).
- **Browser Smoke workflow:** run 43363769789 is in progress on PR head d597176891ed8433381e869747a479a4bb385c7d; homepage/mobile, Swap, DEX, and market-state steps passed; Jarrell's Peak desktop/mobile gameplay smoke is still running.
- **PR #275:** open; not merged.
- **Production deployment:** not yet verified.
- **CoinGecko submission readiness:** evidence checklist remains open; a complete whitepaper alone is not sufficient.

- **CoinGecko Section 3 drafts:** five fields prepared; all exceed 400 characters. Owner review remains open.
- **CoinGecko Section 4–6:** token is still preview-stage with no deployed/verified mint supplied. CoinGecko currently marks Contract Address and Decimals as required, so this section cannot be completed truthfully yet. Explorer links remain blank; asset type is Token and blockchain selection is Solana. Do not invent CA or decimals. Save a draft if the portal offers it; otherwise pause this application section until deployment.
- **Latest exact PR head:** d597176891ed8433381e869747a479a4bb385c7d. PR #275 remains open; Browser Smoke is not complete, so no merge/deployment claim is made.

Last updated: 2026-11-13.


## G. Editorial consistency review — findings to close

- [x] Confirm Whitepaper v1.3 badge and canonical Markdown version both read 1.3.
- [x] Confirm documented marketplace fees match current README on main: 2.5% buy, 2.5% sell, and 5% of collected marketplace fee revenue allocated to game funding (not 5% of gross trading volume).
- [x] Confirm Whitepaper says badges are not currently planned; current README on main says badges are deferred, not an active reward promise.
- [ ] Owner sign-off that the current README/main design supersedes older notes about 10 normal mountains plus Jarrell's Peak and a top-25 free badge; do not reintroduce these older claims without confirmation.
- [ ] Consider adding the recorded 15 November 2026 15:00 UTC pump.fun launch target to the Whitepaper only if it remains an approved current target; label it a target, not a completed launch.
- [ ] Final cross-check of all remaining feature statuses against current main README and actual live product behavior.


## F. CoinGecko Sections 4–6 — form-entry checklist

- [x] Asset type selected as Token (not Coin), because $CLIMB is planned as a Solana token.
- [x] Initial blockchain platform identified as Solana.
- [x] Decision recorded: leave Block Explorer Links 1–5 blank until a real mint address is deployed and verified.
- [ ] After deployment, verify the mint address on-chain and add only valid explorer token-page URLs.
- [ ] Read and record the actual token decimals from the mint account.
- [ ] Verify supply and mint/freeze authorities from primary on-chain data.
- [ ] Add Section 4 exchange name and exact pair analytics URL only after an active market exists and is listed/selectable in CoinGecko's exchange field.
- [ ] If the form makes any of these fields mandatory before launch, pause rather than enter placeholder or fabricated data.


## H. Preview-stage CoinGecko submission decision

- [x] Confirmed from the owner's CoinGecko form screenshot that Contract Address and Contract Decimal Places are required fields.
- [x] Confirmed the $CLIMB token is still preview-stage and no verified deployed mint has been supplied.
- [x] Decision: do not enter a placeholder CA or guessed decimals; do not submit Section 6 with fabricated values.
- [ ] Check whether CoinGecko Partner portal provides a Save Draft function; if available, save without submitting.
- [ ] If no draft/save option exists, pause the listing application at this stage until token deployment and on-chain verification.
- [ ] After deployment, verify mint address, decimals, supply, authorities, and explorer links from primary on-chain sources before resuming.


## I. Community and growth-partner outreach

- [x] Receive an unsolicited offer from X account Kenzo to collaborate on Climboria promotion at no cost (based on the owner's shared DM screenshot).
- [x] Prepare a reply asking for concrete deliverables, channels/audience, scope, and any conditions or expectations.
- [ ] Receive and review Kenzo's proposed scope and deliverables.
- [ ] Verify account identity, audience quality, relevant campaign examples, and references before granting any role or access.
- [ ] Agree in writing on responsibilities, posting schedule, reporting, ownership of created assets, and termination/access-removal terms.
- [ ] Do not share wallet seed phrases/private keys, token treasury access, exchange credentials, or X account admin access during initial evaluation.
- [ ] Do not promise token allocation, payment, or revenue share unless separately approved and documented.


## J. Browser Smoke failure diagnosis and counter-fix

- [x] Exact failing run reviewed: Browser Smoke run 43364182457, job 131684675019, step 17 (Jarrell's Peak desktop/mobile gameplay smoke); Validate Climboria passed on the same PR head.
- [x] Confirmed steps covering Supabase auth/cloud-save isolation, homepage/mobile navigation, Swap, DEX, provider-error and true-empty states passed before the gameplay failure.
- [x] Root-cause finding: the mobile smoke harness used `mobile.keyboard.press('w')` and `keyboard.down('w')` as mobile movement inputs, even though the production mobile game exposes a touch joystick on the left side and action buttons on the right. This was a platform-mismatched test stimulus, not evidence that desktop keyboard movement was broken.
- [x] Counter-fix committed: mobile smoke now verifies the ready/walk state directly after GLB readiness and exercises the real touch-joystick event path for movement and camera-relative facing instead of relying on a hardware keyboard key.
- [ ] Validate the new smoke harness on the exact fix commit and inspect resulting diagnostics/screenshots; do not mark gameplay passed until the new run succeeds.


## L. CI failure diagnosis — Overview route removal

- [x] Inspected exact failed run 43367390776, job 131694914918, step 12 `Audit remaining game and site HTML scripts`.
- [x] Root cause confirmed from job log: validator's hard-coded audit file list still included `overview/index.html` after the route was intentionally deleted; Python raised `FileNotFoundError` and exited 1.
- [x] Browser Smoke run 43367390771 passed on the same pre-fix commit.
- [x] Updated `.github/workflows/validate-climboria.yml` to remove the retired Overview path from the audit list and include the new `game-concept/index.html` route.
- [ ] Validate Climboria passes on the exact workflow-fix commit.
- [ ] Browser Smoke and final Whitepaper checks complete on the latest exact PR head.



## M. Owner screenshot acceptance — homepage Overview removal and full Whitepaper

- [x] Reviewed owner screenshots showing the live homepage desktop navigation still contains an OVERVIEW button.
- [x] Reviewed owner screenshot showing the lower homepage Project Overview resource card still visible.
- [x] Confirmed these screenshots match the current deployed/main branch, while PR #275 is not yet merged; do not claim production changes are live.
- [x] Confirmed PR branch has removed Overview from desktop and mobile navigation and replaced the lower Project Overview card with the retained Roadmap and polished Game Concept destinations.
- [x] Confirmed PR branch has deleted `overview/index.html`; no redirect is intended. The home-page ecosystem intro anchor is renamed to avoid a leftover `#overview` entry point.
- [x] Expand the canonical Whitepaper so all approved former Overview material is represented, including free-to-play heroes/tools, Forge/refining, treasure discovery/public records, Top Gainers and funded reward safeguards, Arena/Guild Battles/wagers, Launchpad/Climboria Signature, sponsor approval/payment/prize protection, DEX/Launchpad funding boundaries, community/referrals, Social Lobby, mobile-app future status, NFT eligibility/ownership, and wallet boundaries.
- [x] Synchronize Markdown source and rendered `/whitepaper/` page to 21 numbered sections; static check confirms all 21 TOC anchors resolve to matching HTML section IDs and numbering is sequential.
- [ ] Run final focused static checks and required CI on the exact PR head.
- [ ] Merge only after required checks pass; verify deployed homepage screenshots and confirm `/overview/` returns 404.


## N. Whitepaper parity and homepage Overview acceptance — 13 November 2026

- [x] Rebuilt the published `whitepaper/index.html` table of contents to list all 21 numbered sections, including separate Official Channels and Pre-listing Information sections.
- [x] Matched the rendered HTML section order and numbering (01–21) with the canonical Markdown source sections (01–21).
- [x] Verified all 21 Whitepaper TOC anchors resolve to an existing section ID; no missing anchor targets.
- [x] Removed duplicated Guilds/events campaign copy from the Social Lobby section and consolidated repeated/duplicated Markdown tail content into one canonical explanation per topic.
- [x] Verified homepage `index.html` contains zero Overview text references, zero Overview navigation links, zero Overview URL references, and zero Project Overview cards.
- [x] Verified `overview/index.html` is absent from the PR branch; no redirect page is retained.
- [x] Verified homepage retains the Whitepaper and Roadmap destinations and a working `/game-concept/` link; Game Concept page has a proper document title.
- [ ] Run final content/editorial review of the full paper and exact-head required checks.
- [ ] Merge PR only after required checks pass; verify production deployment, Overview nav/card absence, and `/overview/` returning 404.

**Scope guard:** Do not work on Sanctuary/gameplay, Browser Smoke gameplay failures, Swap, DEX, Login, or any unrelated engineering task while this Whitepaper and Overview-removal task remains open.


## O. Climboria Signature status clarification — 13 November 2026

- [x] Corrected the Whitepaper Markdown and rendered HTML to state explicitly that Climboria Signature is planned, not implemented, and not operational.
- [x] Reframed identity, tokenomics, authority, liquidity, creator-lock, sell-limit, reviewer, and approval items as proposed requirements—not active review checks or existing controls.
- [ ] Recheck Markdown/HTML parity and focused status-language assertions on the new exact PR head.


## P. Two-destination scope audit — 13 November 2026

- [x] Audited active whitepaper, homepage, and Game Concept content against the approved scope: Jarrell's Peak and Arena are the only game-world destinations.
- [x] Replaced the retired eleven-mountain/single-world wording in the canonical Whitepaper source, rendered Whitepaper, Game Concept Markdown, and rendered Game Concept page.
- [x] Removed the active Game Concept statement that allowed additional maps after budget review; further game-world destinations are outside the approved scope.
- [x] Kept Arena clearly labelled as planned in the homepage destination panel. Marketplace and Inventory remain supporting panels, not game worlds.
- [x] Verified the homepage source contains no Overview desktop/mobile navigation item, Project Overview resource card, or Overview route link. The Whitepaper's internal executive-overview anchor remains a document section, not a homepage navigation entry.
- [x] Investigated Browser Smoke run 43384117049 on prior PR head d7b98a9: gameplay assertions completed; Playwright timed out at .github/scripts/game-smoke.mjs:840 while waiting for fonts during the mobile cave-entrance viewport screenshot. This is a smoke-artifact capture failure, not a failed world/HUD/control assertion.
- [x] Replaced Playwright screenshot capture with Chromium's native CDP viewport capture in ec9f454a. The smoke still emits and validates non-empty PNG artifacts at the same desktop/mobile checkpoints; no gameplay assertion was removed or relaxed.
- [x] Validate passed on exact head `d3822eba9679dad81ee7c8d7f2d5df0e6c9699f5`: run [43389235980](https://github.com/CryptoDilis/Climboria/actions/runs/43389235980), including homepage structure, inline scripts, game scripts, and site-script audit.
- [x] Browser Smoke passed on exact head `d3822eba9679dad81ee7c8d7f2d5df0e6c9699f5`: run [43389236007](https://github.com/CryptoDilis/Climboria/actions/runs/43389236007). It captured all six gameplay images using the non-empty PNG contract; mobile Sanctuary returned to `(0, -30)` with 72 frames.
- [x] Added bounded failure telemetry for the mobile screenshot-stage `Digit1` Sanctuary normalization in `d3822eb`. The subsequent green run did not invoke it; the preceding timeout could not establish a reproducible gameplay regression after the CDP screenshot-capture repair.
- [ ] Verify the deployed homepage and /overview/ 404 only after separate merge and deployment approval.
- Next task: retain this draft PR unmerged, then complete the separate Game Concept formatting and public-route review on its own draft branch.
