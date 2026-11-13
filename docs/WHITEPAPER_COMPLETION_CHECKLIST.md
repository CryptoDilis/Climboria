# Climboria Whitepaper & Homepage Completion Checklist

**Tracking PR:** https://github.com/CryptoDilis/Climboria/pull/275  
**Canonical document:** https://climboria.fun/whitepaper/  
**Scope:** Complete, professional Climboria ecosystem whitepaper; remove the retired Overview entry points from desktop/mobile homepage.

This is the working release checklist. A checkbox is marked complete only after evidence is available. Planned product features must remain labelled as planned; documentation completion does not mean the product feature is live.

## A. Whitepaper content — editorial completion

- [x] Establish the Whitepaper as the canonical ecosystem document; /overview/ is a compatibility redirect.
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
- [x] Keep /overview/ redirect for old bookmarks and inbound links.
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
- **Homepage Overview removal:** confirmed by focused branch checks; production verification awaits deployment.
- **Validate Climboria workflow:** passed on latest PR head c840579c81da094a2348d8825cc7ce73f754b2df (run 43363525872).
- **Browser Smoke workflow:** run 43363525808 is in progress on latest PR head c840579c81da094a2348d8825cc7ce73f754b2df; homepage/mobile, Swap, DEX, and market-state steps passed; Jarrell's Peak desktop/mobile gameplay smoke is still running.
- **PR #275:** open; not merged.
- **Production deployment:** not yet verified.
- **CoinGecko submission readiness:** evidence checklist remains open; a complete whitepaper alone is not sufficient.

- **CoinGecko Section 3 drafts:** five fields prepared; all exceed 400 characters. Owner review remains open.
- **CoinGecko Section 4–6:** token is still preview-stage with no deployed/verified mint supplied. CoinGecko currently marks Contract Address and Decimals as required, so this section cannot be completed truthfully yet. Explorer links remain blank; asset type is Token and blockchain selection is Solana. Do not invent CA or decimals. Save a draft if the portal offers it; otherwise pause this application section until deployment.
- **Latest exact PR head:** c840579c81da094a2348d8825cc7ce73f754b2df. PR #275 remains open; Browser Smoke is not complete, so no merge/deployment claim is made.

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

