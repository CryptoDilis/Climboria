# CLIMBORIA — MASTER PLAN, MASTER CHECKLIST & DEVELOPMENT LOG

> **Single source of truth.** This root README is the canonical place for Climboria's product decisions, full master checklist, implementation status, test evidence, and next actions. At the end of any work session, update this file before stopping. At the start of the next session, review this file first. Do not rely on chat memory or recreate already completed work.
>
> **Status labels:** `NOT STARTED`, `PLANNED / DESIGN ONLY`, `IN PROGRESS`, `IMPLEMENTED — UNVERIFIED`, `TESTED — PASSED`, `BLOCKED`, `DEFERRED`. A checkbox is not complete merely because code was committed. Link the commit and relevant workflow runs; separate automated tests from manual device acceptance.
>
> **Precedence:** The current decisions and active checklist below override older historical notes later in this file. Historical entries are retained as evidence, not as permission to revive superseded plans. Never reintroduce the obsolete 10-normal-mountain plan.

## 2026-11-04 — latest workflow and master-list checkpoint

- **Latest main merge:** PR #189 `dd95ba219eb21df37324a8e95acc03022e147355` — mountain massif access regression gate. PR Validate passed (`41707182880`); PR Browser Smoke passed (`41707182711`). The completed job record confirms desktop/mobile smoke success. Main post-merge Validate `41708254827` and Pages deployment `41708254356` passed. Main post-merge Browser Smoke `41708254803` subsequently completed successfully (job `126169238689`).
- **PR #188** diagnostic instrumentation is merged as `6897101e2a2d5a873e6f292461b04077468c6d0a`. Validate `41706317323`, PR Browser Smoke `41706317202`, main Validate `41707027849`, main Browser Smoke `41707027773`, and Pages deployment `41707027558` passed. Eight sampled massifs show 7–8 of 8 clear approaches; spawn-to-summit route completed 100% (2,799 steps). Streamed rock blockers were identified; large fixed solids are cave perimeter barriers and were preserved.
- **PR #191** [Improve cave passage ambient readability](https://github.com/CryptoDilis/Climboria/pull/191) is open on a clean branch from current main. It raises cave hemisphere ambient fill from 0.9 to 1.2 and strengthens the lighting smoke threshold to 1.15. Validate `41708373290` passed; Browser Smoke `41708373224` was still in progress at this checkpoint. Manual desktop/Redmi cave visual review remains open. The earlier stacked PR #190 was closed as superseded; its changes were reapplied cleanly in #191.
- **PR #192** [Enforce water-edge vegetation clearance in smoke tests](https://github.com/CryptoDilis/Climboria/pull/192) is open. It now rejects CC0 forest placements inside mapped water or the 18-unit shoreline/bank exclusion buffer. Validate `126170489767` passed; Browser Smoke `126170490203` was still in progress at this checkpoint. This is a regression gate, not proof of full visual acceptance or aquatic life implementation.
- **Latest known workflow status:** no failed jobs confirmed in the latest main/PR runs; several Browser Smoke runs were still active. A cancelled superseded main Browser Smoke run `41706138043` is not a test failure.
- **Next actions:** retrieve completed conclusions for main Browser Smoke run `41708254803`, PR #191 Browser Smoke run `41708373224`, and PR #192 Browser Smoke check `126170490203`. Fix any genuine failures, merge only after both required checks pass, then continue cave maze/trap visual acceptance, aquatic ecosystems, freshwater expansion, forest/desert/Sakura scale, multiplayer backend, Arena, and physical Redmi 14 5G acceptance.
- **Release honesty:** 100 chests and summit 15-minute countdown remain local prototypes; shared server-authoritative chest state, atomic claims, funded crypto/NFT rewards, global multiplayer and production account systems are not implemented. Do not represent them as production-ready.

---

## 0. Current project control panel — updated 2026-11-03 (PRs #178–#180 merged; cave grotto swim path automated checks green)

### Current priority and sequencing

1. **P0 — Finish and polish the existing Jarrell's Peak world.** This is the active development priority. Repair regressions, finish the world checklist, verify collision/movement/swimming/caves/lighting/terrain/UI, and pass desktop/mobile tests. Preserve the existing map; do not replace or redesign it during unrelated UI fixes.
2. **P1 — DEX and Swap preparation (design/specification only while P0 is active).** Prepare a Climboria-specific product brief, premium visual direction, UX flow, architecture decision list, security/reliability requirements, and implementation checklist. Do not divert the active Jarrell's Peak workstream or publish a fake live trading interface.
3. **P2 — Universal player accounts, identity linking, cloud saves and backups.** Begin after Jarrell's Peak completion and acceptance.
4. **P3 — Character customization, inventory/equipment and item production.** Begin after the earlier gates, according to the detailed order below.
5. **P4 — Marketplace and seller settlement.** Implement only after its dependencies and security gates.
6. **P5 — DEX/Swap implementation and production activation.** The interface and technical plan may be prepared now; live swaps, liquidity, token transactions and fee collection require verified token identity, approved architecture, security review and end-to-end tests. Schedule production implementation after Jarrell's Peak is accepted unless the owner explicitly changes priority.

**Freeze rule:** No new feature implementation may displace Jarrell's Peak polish. Character Creator, accounts, cloud-save implementation, marketplace, and live DEX/Swap remain frozen until their sequence gate. Documentation/design preparation for DEX/Swap is allowed and must not alter gameplay.

### Verified repository snapshot at this update

- Repository: [CryptoDilis/Climboria](https://github.com/CryptoDilis/Climboria), default branch `main`.
- Latest verified merge: PR #171 soundtrack recovery `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`; PR #170 live-site smoke HUD contract `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR #169 rainforest placement diagnostics `db59fd36109d6e3e250e6758504da8aa1f3bb008`; PR #168 all-water-body swim diagnostics `65120d7e5647dbb08dd081520fdbb11b31074052`; readiness-fix PR #167 `5aae1b37cdec6240767a79d21cb7a85a21241a14`.
- PR #167 [Fix combined gameplay readiness lifecycle on current main](https://github.com/CryptoDilis/Climboria/pull/167) merged after both required checks passed: Validate run `41646206937` and Browser Smoke run `41646206964` (desktop and mobile gameplay smoke steps succeeded). The change is limited to `game/play.html`; chunk generation remains progressive/non-blocking, and combined readiness now waits for chunk and renderer readiness. It does not modify `waitForFunction`.
- PR #171 [Resume the approved soundtrack after the first gameplay gesture](https://github.com/CryptoDilis/Climboria/pull/171) merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`. PR Validate `41652748236` and PR Browser Smoke `41652748174` passed. Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed. Live smoke log explicitly reports `soundtrack: "playing"` after a real settings-button gesture, with game ready, active gameplay, visible hero/status HUD, map/settings, and a 1365×900 canvas. Post-merge Browser Smoke `41653566399` was still running when this entry was written; do not treat it as complete until its result is checked.
- PR #170 [Fix live-site smoke to assert the current gameplay HUD](https://github.com/CryptoDilis/Climboria/pull/170) merged as `dee1c94625b3e5ff019eb33f4e20aee168b6057f`. The scheduled live-site smoke had failed because it waited for the intentionally hidden legacy `#zone` HUD. The test now waits for the actual ready/free gameplay state and visible player/status cards, map and settings control. PR Validate `41652046809`, post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` all passed. The live log confirms the game-ready flag, active gameplay, 1365×900 scene canvas, player/health/stamina HUD, map and settings are visible. Soundtrack object was not present in this live smoke snapshot; investigate audio initialization separately rather than treating it as passed.
- PR #169 [Diagnose exact CC0 rainforest placement failures](https://github.com/CryptoDilis/Climboria/pull/169) merged as `db59fd36109d6e3e250e6758504da8aa1f3bb008`. Validate run `41650874654` and Browser Smoke run `41650874828` both passed. The desktop/mobile smoke log confirms all rainforest placement groups are valid (16 buttress, 16 canopy, 42 undergrowth, 14 fallen logs; zero invalid placements), all 11 fishing spots start correctly, freshwater entry/exit works, collision audit has 87 valid solids and zero water overlaps, and mobile HUD/controls/hero are visible. This PR changes diagnostics only; it does not change runtime map placement.
- PR #165 [Restore Climboria hub and saved hero expedition flow](https://github.com/CryptoDilis/Climboria/pull/165) remains open but is an older, heavily divergent branch. Do not merge it directly. Its previous mobile re-entry failure was traced to a smoke assertion reading `actualMobileTransition.heroMenuExists` instead of `actualMobileTransition.gameplay.heroMenuExists`; reconcile the intended changes onto current `main` and correct the assertion without weakening coverage.
- PR #175 [Make cave spike trap activation and damage testable](https://github.com/CryptoDilis/Climboria/pull/175) merged as `2d95a9c38cd254d34d084cab79dc567675ba5048` after PR Validate `41661810220` and Browser Smoke `41661810197` both passed on head `95516e99`. It adds a cave-local spike contact helper, 25-damage contract, finite cave-base audit and 35-spike/5×7 structural probes; it also fixes a smoke navigation waiter race without weakening the assertion. Post-merge main Validate `41663128185`, Browser Smoke `41663128171`, and Pages deployment `41663127860` all passed on merge SHA `2d95a9c3`. The earlier failed PR smoke `41660997756` was superseded by the passing corrected run; it is not an unresolved main-branch failure. Physical Redmi 14 5G visual acceptance remains open.
- PR #176 [Test cave spike damage, death, and Sanctuary respawn](https://github.com/CryptoDilis/Climboria/pull/176) merged as `231d7815789b2d976c1722f336dfdca55357a551` after Validate `41663885308` and Browser Smoke `41663884891` passed on head `9ffc1349`. Its smoke-only diagnostic invokes the real `hurt()` handler, verifies 25 HP damage, fatal damage, one death event, full-health Sanctuary respawn and terrain-grounded respawn height, then restores player/camera state. Post-merge main Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed; the latter Pages deployment superseded older cancelled deployments.
- PR #177 [Test live cave spike contact through gameplay damage tick](https://github.com/CryptoDilis/Climboria/pull/177) merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f` after Validate `41666014892` and Browser Smoke `41666014983` both passed. Post-merge main Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on merge SHA `22d8df59`. The live gameTick spike-contact test now passes on main; physical Redmi 14 5G cave verification and reward delivery remain open.
- PR #178 [Add a connected underwater grotto to the cave](https://github.com/CryptoDilis/Climboria/pull/178) merged as `544d5debccdf9b55b482b37faa801e9426a8337c`. PR Validate `41669267346` and Browser Smoke `41669267204` passed; post-merge main Validate `41670314519`, Browser Smoke `41670314884`, and Pages deployment `41670313977` passed. It adds the annex grotto, connected doorway, floor/walls/ceiling, rendered water surface, local light and bounded cave water body.
- PR #179 [Test real player traversal through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/179) merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`. PR Validate `41670872426` and Browser Smoke `41670871822` passed; post-merge main Validate `41671895023`, Browser Smoke `41671895050`, and Pages deployment `41671895388` passed. The smoke-only audit uses the actual `moveWalk` collision path to enter the grotto from the annex and exit again, and checks the water-body boundary and swim-depth/bed-clearance contract.
- PR #180 [Verify live swimming and diving through the cave grotto](https://github.com/CryptoDilis/Climboria/pull/180) merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`. Initial Browser Smoke `41672721544` failed because `groundAt` sampled procedural terrain beneath the cave's separately placed room floors; this left the test player roughly 18m below the grotto floor and invalidated surface/bed-clearance checks. Root cause was fixed by making `groundAt` return the placed cave floor height within every cave floor footprint; assertions were retained and extended to check exact floor alignment. Corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed on merge SHA `53bc90cd`.
- PR #173 [Improve cave readability with ambient and branch lighting](https://github.com/CryptoDilis/Climboria/pull/173) merged as `167cd24664510db80f864721c9a004a18f950fe0` after PR Validate `41657347964` and Browser Smoke `41657348026` both passed. The fix moves `caveAmbientFill` into the enclosing scope so the diagnostic can access it; it adds ambient and branch lighting coverage. Post-merge main Validate `41658107773` passed and Pages deployment `41658174908` passed on documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`. Browser Smoke `41658107652` passed the homepage CTA/DEX modal/mobile navigation stage and remains in progress in the desktop/mobile Jarrell's Peak gameplay stage at the latest check; do not mark the full post-merge smoke suite green until it completes. A superseded Pages run `41658107395` was cancelled when the newer deployment started; this is not a failed deployment. Cave lighting is automated-test verified only; physical Redmi 14 5G visual acceptance remains open. The earlier Browser Smoke failure `41656768675` was on the previous commit `82b0cdb4` and was superseded by the successful run on `4750ff49`.
- Historical main Browser Smoke failure `41653566399` on `cb7b9863` reached world/loot diagnostics but timed out at `.github/scripts/game-smoke.mjs:441` waiting for mobile hero readiness (`heroReady`, GLB renderer and camera-orbit hero flag). This is an older run, not the current main result; investigate if it recurs rather than weakening the readiness assertion. Main Browser Smoke `41656307236` on `f7919b77` subsequently passed.
- The latest development log entry for the connected cave side-room increment records commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131` with Validate, Browser Smoke and Pages deployment still pending in that log. Re-check live Actions before changing status.
- DEX/Launchpad uploaded HTML static audit exists at [docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md](./docs/AUDIT-DEX-LAUNCHPAD-UPLOADED-HTML.md). Verdict: **do not publish as a real mainnet DEX/Launchpad**. The audit found a non-functional token creation alert, incorrect hard-coded token decimal conversions, fabricated fallback quotes, placeholder mint data, misleading live/mainnet labels, and no verified wallet-signing or on-chain flow. No live transaction verification was performed.

### Non-negotiable development rules

- Preserve the current Jarrell's Peak map and already-working features unless the owner explicitly requests a change.
- Diagnose root causes; do not hide failures by weakening assertions or forcing test flags.
- Run relevant validation and desktop/mobile Browser Smoke after each gameplay change. Check Pages deployment when applicable. Inspect failed job logs and repeat until genuinely green.
- Report the exact commit SHA and workflow run links. Distinguish a passed workflow from a pending or failed workflow. Never call a commit “tested” without evidence.
- Manual visual acceptance on desktop and the owner's Redmi 14 5G is separate from automated browser tests.
- Never invent assets, API responses, prices, token addresses, liquidity, quotes, wallet connections, transaction hashes, or reward balances.
- Never expose private keys or seed phrases; never request them.
- Free/open-source assets must have their licence checked and recorded before use.
- Do not mark a feature complete because its button or mockup exists.

## 1. Current active master checklist — Jarrell's Peak first

### A. Stability, menu, UI and controls
- [ ] Resolve all currently open menu/title/hero-picker regressions in PR #165; verify desktop and mobile menu return, rapid enter, hero visibility, and re-entry.
- [ ] Preserve homepage hero, existing UI, four main hub destinations (Jarrell's Peak, Arena, Marketplace, Inventory) and separate Create Hero destination according to the approved architecture.
- [ ] Ensure full-screen layout uses the full mobile viewport without top/bottom black bars; preserve desktop layout and settings-icon position.
- [ ] Verify HUD, compass/coordinates, minimap/map UI, action prompts and mobile controls remain readable and correctly positioned.
- [ ] Remove only UI elements explicitly requested for removal; do not silently remove master-list items.
- [ ] Verify mouse/keyboard, left-click movement/click-to-move, camera orbit, wheel zoom, mobile joystick/touch and pinch zoom without control conflicts.
- [ ] Verify pause/resume, tab-hidden behavior, audio controls and no duplicate game loops/listeners.

### B. Character, animation and camera
- [ ] Integrate the approved Climboria hero asset without changing the user's approved face, tattoos, outfit, proportions or art direction.
- [ ] Verify scale, rig, idle/walk/run/jump/fall/climb/swim animation, foot grounding, facing direction and collision.
- [ ] Preserve third-person camera framing and independent camera orbit; character turns from movement, not camera orbit alone.
- [ ] Verify character remains visible after rapid entry, menu return, re-entry and asynchronous asset failures.
- [ ] Character Creator remains frozen until Jarrell's Peak acceptance; do not claim the current GLB supports appearance controls it does not actually expose.

### C. Terrain, world, collision and traversal
- [ ] Preserve the existing Jarrell's Peak map; do not replace it.
- [ ] Audit mountain and terrain collision so the player can approach walkable surfaces without invisible distant blockers, terrain penetration or clipping.
- [ ] Keep terrain varied and natural: rocky ground, forest, cliffs, snow/ice, desert/rocky zones, sandy beaches and non-flat shoreline transitions.
- [ ] Remove trees/plants incorrectly placed in sea, river, lake or pond water; build natural sand/rock shorelines and visible underwater sand/riverbeds.
- [ ] Verify water body boundaries, river/lake/pond entry and exit, swimming depth, underwater movement, and horizontal swim posture.
- [ ] Add floating river objects only where they look natural and do not block traversal; maintain appropriate water speed and performance.
- [ ] Keep collision geometry aligned with visible meshes and actual terrain/water shape.
- [ ] Run deterministic spawn-to-landmark and mountain approach probes; inspect first blockers rather than blindly changing collider sizes.
- [ ] Verify desktop and mobile landscape, including physical Redmi 14 5G acceptance.

### D. Caves and underground exploration
- [ ] Finish the cave lighting so the cave is bright/readable enough to navigate; verify on physical device, not only light-count assertions.
- [ ] Expand the current compact cave into a large connected multi-room cave/maze with real walkable floors, ceilings, wall collision and clear navigation.
- [x] Add the connected underwater grotto and cave-local bounded water volume. PR #178 is merged and its post-merge main Validate/Browser Smoke/Pages checks passed.
- [x] Automated cave grotto traversal and live swim-controller audit: PR #179 verifies annex-to-grotto movement through the real `moveWalk` collision path; PR #180 exercises the shared live water-state controller for surface swim, dive, safe depth clamp, resurfacing, exit and state reset. PR #180 also fixes `groundAt` to align collision/query height with the actual placed cave floors. PR #180 post-merge main Validate, Browser Smoke and Pages deployment all passed.
- [ ] Continue expanding branching corridors, traps and hidden chambers into the requested large cave maze; automated grotto checks do not prove full human-controlled exploration or visual quality.
- [ ] Add attacking cave creatures only after the user approves their return; snakes and other animals are currently removed/disabled per the latest instruction.
- [ ] Implement deterministic trap activation, damage, respawn and reward tests.
- [ ] Verify the full moving-spike contact-to-damage path in live gameplay and trap reward outcome; PR #176 now passes the real damage/death/Sanctuary-respawn handler test, but this does not yet prove spike contact triggers it during normal movement.
- [ ] Add hidden chests/treasure rooms and the planned rare reward chance of 3%, with server-authoritative randomization and anti-exploit checks.
- [ ] Use only licensed/free assets; check scale, collision, performance and licence. Do not use decorative meshes as fake collision walls.
- [ ] Verify cave pathfinding and collision on desktop/mobile and physical Android.

### E. World activities, landmarks and environment
- [ ] Preserve the existing riverside starting camp and improve campsite realism, fire lighting and usable resting/hangout space.
- [ ] Complete river and water activities: fishing tools, bait, fish, swimming, shoreline interaction and visible underwater details.
- [ ] Preserve the coast/sea, port, broken ship, rocky and sandy beaches and natural transitions.
- [ ] Add/finish rice field, wheat field, sunflower field, wild field and other planned vegetation zones without planting vegetation in water.
- [ ] Add/finish sanctuary, sakura hangout park, benches, swings/hammocks, ponds, ruins, statue, broken ancient building, remote campsites and discoverable landmarks.
- [ ] Add/finish snow, storms, rain and thunderstorms in appropriate regions; weather must not create severe performance or visibility regressions.
- [ ] Add decay soldiers and other hostile NPCs only according to the approved current gameplay scope.
- [ ] Random remote respawn chests and hidden treasures must not be visible/revealed before discovery.
- [ ] Use realistic free assets from approved sources (including Poly Haven/GitHub/CC0 sources); replace placeholder/cartoonish assets where requested.
- [ ] Preserve cinematic world quality while keeping mobile performance acceptable.

### F. Loot, progression and survival
- [ ] Implement/verify treasure discovery, rarity tiers, ingredient/material drops and chest respawn behavior.
- [ ] Keep loot randomness server-authoritative when persistent accounts/backend are implemented; client-side rewards are not trusted.
- [ ] Verify distance/survival-time influence and published reward odds; do not promise guaranteed rare rewards.
- [ ] Keep the current no-safe-zone / return-to-starting-camp rule as specified in the current game design.
- [ ] Teleport Stone mechanics are deferred until the core hero and map are stable; later require valid safe destination, cooldown and clear failure behavior.
- [ ] Keep all rewards and payout systems disabled or clearly marked preview until funded, secure and tested.

### G. Performance, smoke tests and acceptance
- [ ] Validate no JavaScript errors, unhandled promise rejections, WebGL context loss, runaway listeners or duplicate animation loops.
- [ ] Test desktop and mobile landscape for initial load, gameplay entry, movement, camera, swimming, caves, respawn and menu return.
- [ ] Inspect actual workflow logs for every failed run; repair root cause and rerun.
- [ ] Verify Pages build/deployment after relevant main-branch changes.
- [ ] Capture desktop/mobile screenshots and compare against approved visual design.
- [ ] Complete physical-device visual acceptance on Redmi 14 5G; automated CI is not a substitute.
- [ ] Only declare Jarrell's Peak complete after all required items are either tested/passed or explicitly accepted as deferred by the owner, with a final release checklist.

## 2. DEX & Swap — Climboria premium product preparation

**Status: PLANNED / DESIGN ONLY.** Prepare the product and architecture now without displacing Jarrell's Peak work. Do not present any interface as a live exchange until real data, wallet signing, transaction submission and on-chain verification are working.

### Brand and visual direction
- [ ] Build the DEX visual language from Climboria's actual identity: dark charcoal/obsidian surfaces, antique bronze and muted-gold accents, mountain silhouettes/topographic contours, compass-ring geometry and restrained metallic highlights.
- [ ] Use premium editorial hierarchy: refined display typography for major headings, highly legible sans-serif for data, disciplined spacing, crisp numeric alignment and accessible contrast.
- [ ] Create original Climboria-specific components: branded market header, token/pair selector, price panel, chart frame, swap card, wallet state, transaction receipt, liquidity/route detail and risk notice.
- [ ] Reuse the official Climboria emblem and existing approved assets; do not invent a new unrelated logo, random generated token art or generic crypto-dashboard theme.
- [ ] Design desktop and mobile layouts as first-class experiences; no squeezed desktop-only panels or overlapping mobile modals.
- [ ] Motion should be restrained and purposeful: subtle compass/contour transitions, clear loading states and no distracting animation around price data.
- [ ] Define empty, loading, stale-data, quote-unavailable, wallet-disconnected, wallet-rejected, pending, confirmed and failed states before implementation.

### Product experience
- [ ] DEX overview: verified $CLIMB identity, supported network, market summary, price/chart source and timestamp, liquidity/volume only when sourced, and clear network status.
- [ ] Swap flow: choose network and token pair; enter amount; validate token mint/address and decimals; request a real quote; show minimum received, price impact, route, network fee, Climboria fee if approved, quote expiry and slippage.
- [ ] Require explicit wallet confirmation; show the exact transaction being signed and never sign or submit silently.
- [ ] Transaction state: simulate/validate where supported, submit, monitor confirmation, show explorer link only for a real transaction signature, and handle rejection, timeout, stale quote and failed transaction.
- [ ] Token details: verified mint/contract address, decimals, supply/metadata only from authoritative sources, and copy-address controls.
- [ ] Transaction history: only confirmed transactions associated with the connected wallet; clearly separate pending and failed transactions.
- [ ] Security notices: token/network mismatch, suspicious token warning, price impact, slippage and irreversible on-chain action.
- [ ] Never show fabricated prices, demo quotes as real quotes, invented liquidity, fake chart candles, placeholder mint addresses or false “LIVE MAINNET” badges.

### Architecture and chain plan
- [ ] Solana first; Base/EVM support later after the Solana flow is secure and stable.
- [ ] Evaluate an established routing/aggregator integration (the uploaded UI previously referenced Jupiter) against direct pool integrations; choose only after checking current API, SDK, terms, quote semantics, supported tokens, reliability and security.
- [ ] Fetch mint metadata and decimals from a trusted source for every token; convert amounts using each token's actual decimals, never fixed 1e6/1e9 assumptions.
- [ ] Remove fake quote fallbacks. If the quote provider fails or returns invalid data, disable swap confirmation and show a truthful unavailable state.
- [ ] Validate chain ID/network, token mint/contract, input/output amounts, route, slippage, minimum output and quote freshness before signing.
- [ ] Keep RPC/provider keys server-side where required; never commit secrets. Use environment configuration and document safe deployment setup.
- [ ] Use devnet/testnet first, then independent review and controlled mainnet activation.
- [ ] Confirm the official $CLIMB mint/contract from Climboria's verified channels after deployment; ticker text is not proof of token identity.
- [ ] Define liquidity source, pool/route policy, market data source, fee basis, fee destination, treasury controls and reporting before activation.
- [ ] DEX fee contribution to Jarrell's Peak is a planned funding stream, but **no percentage or fee basis is finalized**. Do not invent a rate or merge it with marketplace accounting.
- [ ] Base is a later phase; do not imply Solana transactions are automatically portable to Base.
- [ ] Perform wallet-signing, quote-integrity, transaction simulation, network mismatch, token decimal, slippage, failed transaction and explorer verification tests.
- [ ] Security review/audit before mainnet activation; publish only verified capabilities.

### Existing DEX/Swap audit findings — known blockers
- [ ] Replace token-creation alert-only placeholder with a real, reviewed transaction flow only if/when Launchpad is approved; alert UI is not token minting.
- [ ] Fix incorrect output amount conversion that assumes 6 decimals.
- [ ] Fix input amount conversion that assumes SOL's 9 decimals for every token.
- [ ] Remove fabricated demo quote fallback and block swap on quote failure.
- [ ] Remove misleading “LIVE MAINNET”, “REAL MINT ON SOLSCAN”, “Real Jupiter” and checklist labels until each claim is independently verified.
- [ ] Replace placeholder/dummy mint address only after the official token is deployed and verified.
- [ ] Implement actual wallet connection/signature, transaction construction, submission and confirmation; no such end-to-end verification was established by the static audit.
- [ ] Re-run the audit after implementation and complete live wallet/devnet tests before any production claim.

## 3. Universal Player Account, wallet linking and Cloud Save — future phase

**Status: PLANNED / FROZEN until Jarrell's Peak is accepted.**

### Account and authentication
- [ ] Email/password registration and sign-in.
- [ ] Google OAuth sign-in (Gmail address alone is not the same as Google OAuth).
- [ ] X account OAuth, subject to provider approval, API access and possible cost.
- [ ] Optional wallet sign-in/linking: MetaMask (EVM), Phantom, Solflare and OKX Wallet, with supported chain/network validation.
- [ ] One Climboria account can link multiple sign-in methods and wallets; linking must not create duplicate player identities.
- [ ] Wallet login uses a one-time server nonce and verified signature; never request private keys or seed phrases.
- [ ] Account recovery, email verification, safe unlinking, session expiry, device/session management and anti-account-takeover protections.
- [ ] Ordinary gameplay must not require a crypto wallet.

### Cloud save and exact world-position restore
- [ ] Store player/account ID, world/map ID, X/Y/Z position, facing rotation, selected hero, checkpoint/expedition progress, inventory, collected items and relevant survival stats.
- [ ] Save authoritative data server-side so a player can resume on another device.
- [ ] Restore the last valid position after re-login; validate terrain, collision and safe spawn before placing the player.
- [ ] If saved coordinates are invalid, blocked, underwater or inside a trap/terrain, restore to the most recent safe position.
- [ ] Autosave on meaningful state changes and periodically; save on logout where possible.
- [ ] Recover from browser close, crash or unexpected disconnect using the latest confirmed server save.
- [ ] Protect against replay, tampering, duplicate item grants and client-side save forgery.

### Backups, monitoring and migration
- [ ] Evaluate Supabase or equivalent for auth/database only after checking current pricing, quotas, regional availability, pause policy and backup behavior.
- [ ] Evaluate independent object backup storage (e.g. Cloudflare R2) and current cost/egress limits before selection.
- [ ] Automated encrypted daily database backup and separate Storage/object backup; database backups alone may not include object files.
- [ ] More frequent incremental/state backups for critical player progress, subject to provider capabilities and cost.
- [ ] Transaction/ownership audit log and versioned backups.
- [ ] Backup integrity verification and scheduled restore tests.
- [ ] Usage monitoring with warning thresholds (proposed 50%, 75%, 90%) and monthly usage/cost report.
- [ ] Notify on backup failure, quota approaching limit, service pause or unexpected cost.
- [ ] No automatic paid plan upgrade or paid resource activation without explicit owner approval.
- [ ] Document migration and restore steps; GitHub stores code/config templates only, never secrets or public dumps of player data.

## 4. Character Creator, inventory, equipment and item production — future phase

**Status: FROZEN until Jarrell's Peak completion.**

- [ ] Keep Create Hero as a separate destination from the Expedition Menu; Select Hero remains the expedition selection flow.
- [ ] Preserve the approved default Climboria Hero.
- [ ] Only expose skin, face, hair, outfit and accessory controls when the actual model supports them.
- [ ] Full-body live 3D preview, rotation/zoom, editable player name, save/load and reset.
- [ ] Modular hair/outfit assets must match the rig/skeleton and animation system.
- [ ] Produce items through Blender/Meshy/licensed asset pipeline; validate scale, rig, attachment point, animation, collision and mobile performance.
- [ ] Catalog with stable item IDs, metadata, rarity, attributes, supply, unlock requirements and asset version.
- [ ] Categories: Teleport Stone, costumes/skins, climbing tools (ice axe, pickaxe, rope, lantern), ingredients/materials and weapons only if real combat supports them.
- [ ] Every functional item must have a tested gameplay effect; cosmetics must be labelled cosmetic.
- [ ] Test equip/unequip, character attachment, animation, durability/repair if applicable, inventory save/load and multiplayer/server validation.
- [ ] Lantern must light caves; rope must provide its defined fall/safety effect; teleport stone must use a valid destination/cooldown; tools must interact only with compatible surfaces.
- [ ] No item may be listed for sale until asset, function, ownership, save/load and marketplace checks pass.

## 5. Marketplace and seller payment settlement — future phase

**Status: PLANNED / FROZEN until its dependencies are ready.**

- [ ] $CLIMB-only marketplace as previously planned, subject to verified token launch and final fee policy.
- [ ] Seller listings, inventory ownership, listing expiry/cancellation and purchase confirmation.
- [ ] Seller connects and selects a payout wallet; multiple linked wallets may be supported.
- [ ] Proposed settlement example: 100 $CLIMB sale → 95 $CLIMB seller proceeds and 5 $CLIMB marketplace fee. This 95/5 split is **not finalized**; confirm whether the fee is deducted from listed price or charged separately before implementation.
- [ ] Define treasury wallet, fee use and reporting; do not revive obsolete mountain allocation plans.
- [ ] Secure escrow/settlement flow: verify payment and item ownership/transfer; prevent payment without item delivery and item delivery without confirmed payment.
- [ ] Seller dashboard: gross sales, fees, net proceeds, available/settled balance, transaction history, buyer/item reference, payout wallet and real transaction hash.
- [ ] Solana first; Base later.
- [ ] Test duplicate purchase, replay, cancellation, failed transaction, wallet rejection, insufficient balance, transfer failure and refund/dispute rules.
- [ ] No private keys/seed phrases collected; no payout claims before real on-chain settlement is verified.

## 6. Other ecosystem features — planned/deferred
- [ ] Arena as a separate future map; preserve current game hub and do not represent placeholder status panels as a live Arena.
- [ ] Chatworld: Global, Proximity, Party/Guild and Private chat with moderation, mute/block/report and anti-spam.
- [ ] Guild systems and Guild Battles with leader approval, spectators and event rules.
- [ ] Sponsorship workflow with admin review, written agreement, verified full payment and funded prize pool before activation.
- [ ] Future Launchpad / Climboria Signature, responsible launch safeguards, creator lock/sell-limit design and token metadata, only after compliance/security review.
- [ ] Rewards, leaderboard and payouts only with verified funding, server-side scoring and anti-cheat.
- [ ] Keep basic gameplay accessible without wallet ownership or crypto participation.

## 7. End-of-session handoff protocol
Before ending each work session:
1. Update the status panel and the relevant checklist items in this README.
2. Record exactly what changed, what did not change, commit SHA/PR, workflow run URLs and pass/fail/pending results.
3. Record the next single actionable task and any blocker.
4. Do not repeat work already marked `TESTED — PASSED` unless a regression or changed dependency requires retesting.
5. Do not mark anything complete from an unverified claim or an old workflow run.
6. On the next chat, the instruction is: **“Review the root README.md, check current GitHub state and continue from the first open priority. Do not repeat completed work.”**

---

# Climboria — Game Design & Economy Reference

Climboria is a browser-first climbing, survival, and open-world treasure-hunting project. **Game first, speculation later.** The initial world focus is Jarrell’s Peak. Features described as planned are not represented as live until implemented, tested, and officially released.

> This README records agreed design direction and economy rules; it does not claim every feature is production-ready.

> **Development continuity:** The persistent repair, workflow, collision, and free/open-source asset integration plan lives in [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md). Carry it forward across sessions and update it based on verified results.

## Current game-world scope: Jarrell’s Peak and Arena

Jarrell’s Peak is Climboria’s primary open-world wilderness experience, focused on exploration, survival, and treasure hunting. Arena is the separate competitive game mode/map. These are the only two game-world destinations in the current scope. Jarrell’s Peak has no final completion point. Its motto is **“Vengeance Is Always an Option.”**

- A riverside starting camp, long river, fishing, swimming, forests, cliffs, hidden routes, ruins, landmarks, and discoverable treasure locations.
- Distance and survival time may improve the chance of better loot without guaranteeing rare rewards.
- Chests may contain ingredients, materials, gear, and other eligible rewards across published rarity tiers.
- There is no safe zone. Death returns the player to the starting point under the implemented and published game rules.
- Documentation-only work must not change existing gameplay mechanics such as movement, climbing, collision, swimming, fishing, controls, camera, sound, weather, or treasure discovery.

## Game menu: four destinations

The current menu should show only these four destinations:
1. **Jarrell’s Peak** — the only playable launch world.
2. **Arena** — opens an honest status panel while the separate map remains future work.
3. **Marketplace** — a demo storefront only; no live trading or real purchases.
4. **Inventory** — a local preview only; persistent item ownership and equipment are not live.

Keep Jarrell’s Peak and Arena as the only game-world destinations. Marketplace and Inventory are supporting menu panels, not additional worlds. Character creation/editing remains accessible through the Jarrell’s Peak entry flow. Keep labels clear so a preview is never mistaken for a production system.

## Future Arena: separate public map

The Arena is a future map, separate from Jarrell’s Peak. It is planned as a large forest battle and event venue with a central platform, a tall sponsor flag, event banners, and an entrance sponsor panel.

- The four-destination menu includes an ARENA card that currently opens a status panel; access to the actual Arena map is future work.
- One shared Arena world is the design target, aiming for more than 1,000 concurrent players. This is not a verified capacity until architecture and load tests prove it.
- With no event running, players may freely brawl and trash-talk in free-for-all play, with no Arena rewards.
- During an approved Guild Battle, the entire Arena becomes the battlefield for the two participating guilds; other players watch as spectators.
- Any guild member may request a Guild Battle, but guild leaders must approve their guild’s participation.
- Future weapons must fit Climboria’s climbing theme. The roster and balance will be designed later.
- Weekly Guild Wars with rewards are future, budget-dependent features.

## Chatworld: future multiplayer feature

The intended in-game Chatworld for Jarrell’s Peak and Arena includes Global Chat, Proximity Chat, and Private Messages. Competitive banter and trash talk are allowed within published conduct rules; threats, targeted harassment, hate speech, scams, and spam remain subject to moderation. Mute, private-message blocking, reports, anti-spam limits, and moderator tools are intended safeguards. Server-side messaging, identity, permissions, and persistence are required.

## Leaderboards and rewards

There is no summit leaderboard and no badge system in the current launch plan.

- **Permanent All-Time Top Gainers:** a long-term record of eligible gains made in Jarrell’s Peak.
- **Weekly Top Gainers:** a separate weekly ranking used for any funded weekly reward distribution.
- The intended score combines eligible $CLIMB earnings, the published value of eligible treasures, and transparent rarity/difficulty bonuses.
- Scoring must be server-verified and designed to prevent duplicate claims, manipulated values, and client-side cheating.
- Weekly payout timing, if funded and activated: **Friday at 03:00 UTC (11:00 AM Philippines time)**.
- Rewards require a verified funding source and published rules; they are not guaranteed.
- Badges are deferred. A possible future badge system may be considered for a future Arena map.

## Marketplace and game funding: agreed design

Eligible marketplace items and crafted gear are intended to use **$CLIMB only**, subject to implementation.

- **Buy transaction fee:** 2.5%.
- **Sell transaction fee:** 2.5%.
- **Game funding allocation:** 5% of the actual marketplace fee revenue collected is allocated to the Climboria game funding pool. This is not an additional 5% charge on trading volume.
- Example: if 2,500 $CLIMB in marketplace fees are collected, 125 $CLIMB (5% of collected fee revenue) is allocated to game funding.
- NFT minting is intended to have no Climboria minting fee; the player pays network gas.
- Marketplace trading, minting, fee accounting, and reward distribution must be implemented and secured before being called live.


## Climboria Signature and Jarrell’s Peak funding

**Climboria Signature is a flagship Climboria product**, not a minor Launchpad option. The website and project materials should present it prominently as the ecosystem’s responsible-launch approach, including transparent project disclosures and the planned creator-lock and sell-limit safeguards. These safeguards remain in development until implemented, reviewed, and tested.

Jarrell’s Peak has a dedicated funding stream:
- A portion of eligible **Climboria DEX fees** is intended to support Jarrell’s Peak.
- A portion of eligible **Climboria Launchpad fees** is intended to support Jarrell’s Peak.
- Other projects may make **optional donations of $1–$1,000 worth of SOL** to support Jarrell’s Peak.
- SOL is intended to be converted to $CLIMB only through a safe, verified route. If no such route is available, the donation remains in a SOL reserve rather than being converted through an unverified path.
- Jarrell’s Peak DEX/Launchpad allocations and donations are separate from marketplace fee accounting. Do not silently merge the pools.

**No exact DEX or Launchpad allocation percentage has been finalized.** Publish the exact rates, fee basis, destination addresses, conversion policy, reporting method, and distribution schedule before activation. Until fee collection and distribution are implemented and verified, describe this model as planned—not live, guaranteed, or already funded.

## Arena wagers and event funding: future features

Casual Arena fights are free and have no prize payout. Optional wager matches are planned with mutually accepted $CLIMB stakes. The winner receives the total pot minus a **2.5% platform fee on the total pot**; that fee goes to the game funding pool. For a 200 $CLIMB pot, the fee is 5 $CLIMB and the winner payout is 195 $CLIMB. Wagers require secure escrow, consent, disconnect/dispute handling, anti-abuse measures, and any necessary compliance review.

Sponsored tournaments require a fully funded, disclosed prize pool. No event rewards are promised without a confirmed funding source.

## Sponsorship rules: future operational policy

Sponsorship operations are future systems until application, agreement, payment verification, event operations, and branding are implemented.

1. Review sponsor identity, brand, event proposal, promotional content, and eligibility.
2. Climboria admin makes the final approval decision using a written eligibility checklist.
3. Climboria Launchpad tokens may use fast-track review with basic eligibility, payment, and event checks. Fast-track is not a blanket exemption for fraud, impersonation, illegal promotions, or misleading claims. Other crypto sponsors receive full review; non-crypto sponsors are reviewed according to business type and risk.
4. The written agreement defines package, duration, exclusivity, fees, full prize pool, branding placements, cancellation/refund terms, postponement, force majeure, and responsibilities.
5. **Full payment first, no event otherwise.** The full agreed sponsorship fee and the entire promised prize pool must be received and verified before any public announcement, sponsor branding activation, or event activation. A screenshot or promise to pay is insufficient.
6. After verification, announcements may appear on X.com, the website homepage, game menu, and running in-game announcements in Jarrell’s Peak and the Arena.
7. Sponsor placements may include the Arena central flag, entrance panel, event banners, website, game menu, X.com, and in-game announcements. Exclusivity applies only to the defined slot/category and written sponsorship period.
8. Pricing is intended to include published starting prices with special agreements for major sponsors. Sponsorship may be event-only or long-term.
9. Automatic renewal at the same price is intended, with terms and cancellation deadline stated clearly. If renewal payment is not verified, a three-day grace period applies; new announcements and activations pause while unpaid. After three days without payment, sponsorship ends and branding is removed under the agreement.
10. Events not yet started are cancelled when their sponsorship ends. Events already in progress follow the written agreement and prize-protection rules. Refunds and cancellations follow the contract and applicable law.

## Token, Launchpad, DEX, and chain status

Solana is the initial chain focus; Base is a later possibility. $CLIMB is the intended ticker, but ticker text alone does not verify an official token. Use only a mint/contract address published by Climboria’s official channels after deployment. Launchpad, DEX, swap, liquidity, wallet flows, token utilities, and on-chain rewards must be labelled preview/planned until deployed and tested.

## Implementation and transparency

A commit means code changed; it does not prove the game works. Keep status explicit: **Not started**, **In progress**, **Implemented — unverified**, or **Tested — passed**. Do not claim multiplayer synchronization, 1,000+ shared-world capacity, secure wagers, persistent inventory, on-chain rewards, sponsorship payments, or moderation tools are production-ready until tested. This documentation update must not change gameplay code.

## Character collision and swimming references

- [Rapier JavaScript character controller guide](https://rapier.rs/docs/user_guides/javascript/character_controller/): use a capsule-like player shape, resolve intended movement against colliders, and respect the controller's corrected translation and grounded state.
- [larvuz2/capy-swim3d](https://github.com/larvuz2/capy-swim3d): open-source Three.js + Rapier example with capsule collision, ground detection, and separate character animation. Use it as a technique reference, not a drop-in replacement for the existing single-file world.
- Climboria currently keeps its procedural terrain-height collision and sampled movement checks. Jarrell's Peak adds multi-point footprint support on dry land and a distinct horizontal swim pose; water movement must not be grounded against the riverbed as if it were dry terrain.
- Regression gates should cover terrain penetration, obstacle blocking/sliding, river entry/exit, vertical swimming, and horizontal swim posture on desktop and mobile before marking the fixes as tested.

## Jarrell’s Peak river and free asset sources

- The river channel is generated in Three.js and terrain code: approximately 1.8 km of winding river, roughly 21–23 m of rendered water width, and a deeper sculpted riverbed. Collision, swim detection, and the smoke-test dimensions must stay aligned with this geometry.
- Optional riverbank boulders load from the Kenney Nature Kit mirrored at [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets). The pack lists **CC0-1.0** licensing; the game keeps its procedural rocks as a fallback if an external model cannot load. Asset catalogue: [Nature Kit entries](https://github.com/Hidencod/tge-assets/blob/main/catalog.json).
- Optional model source URLs use the public GitHub Pages mirror: `https://hidencod.github.io/tge-assets/packs/nature-kit/`. Models currently referenced: `rock-largea.glb`, `rock-largec.glb`, and `rock-largee.glb`. Kenney assets are CC0; see the source repository’s licence and asset metadata before adding more models.
- Keep mobile GPU cost in mind: fewer optional rock instances are created on mobile. The original procedural shoreline rocks, reeds, gravel, fish, and water shader remain in place.

## Existing Jarrell’s Peak requirements

- Deliberate riverside starting camp and accessible fishing water.
- Long navigable river with integrated banks and shoreline; swimming and collision must remain reliable.
- Endless-feeling wilderness with forests, cliffs, caves, rice fields, battlefield remnants, sanctuary lake/shrine, traps, hidden paths, and grounded landmarks.
- Death returns the player to the starting camp; no summit, final level, or safe zone.
- Randomized chest discovery with distance/survival-time influence; undiscovered locations must not be exposed.
- Teleport-stone mechanics are deferred until the hero and Jarrell’s Peak map are in good shape; the current priority is character quality, terrain, collisions, and swimming.
- Actual token payouts, persistent inventory, secure multiplayer, and anti-cheat remain separate production release gates.

The game remains the priority. Crypto participation must not be required for the basic adventure. All sponsorships, marketplace fees, wagers, and rewards need clear rules and funding before launch.


---



## 2026-11-03 — combined gameplay readiness lifecycle repaired and merged

- [x] Kept chunk, renderer and hero readiness as independent lifecycle flags; progressive chunk generation remains non-blocking.
- [x] Published `window.__climboriaGameReady` only after required chunk initialization and a successful renderer frame are both ready; hero readiness remains independently tracked.
- [x] Corrected the GLB renderer diagnostic to represent actual GLB load success/failure rather than merely a running render loop.
- [x] Preserved `waitForFunction`, existing smoke assertions, current world assets and approved hero asset.
- [x] Merged PR #167 into `main`: commit `5aae1b37cdec6240767a79d21cb7a85a21241a14` (source head `ca9ec69eca402057cd8c31b6c8c882e2a9284e24`).
- [x] Validate Climboria passed: run [41646206937](https://github.com/CryptoDilis/Climboria/actions/runs/41646206937).
- [x] Browser Smoke passed, including desktop and mobile Jarrell's Peak gameplay smoke and screenshot upload: run [41646206964](https://github.com/CryptoDilis/Climboria/actions/runs/41646206964).
- [ ] Manual visual acceptance on desktop and Redmi 14 5G remains open; automated CI does not close this item.
- Next: reconcile PR #165 hub/menu/hero re-entry changes onto current `main` (do not merge its divergent branch directly); correct the nested `gameplay.heroMenuExists` assertion and retain full regression coverage.

# Preserved detailed development history and checklist

The following is the existing detailed checklist/log imported intact for continuity. Its historical entries are evidence only; use the current control panel and active checklist above for present status and precedence.

## 2026-11-02 — first connected cave side room

- [x] Previous torch-cleanup baseline fully passed: Validate `41457459263`, Browser Smoke `41457459268`, Pages deployment `41457544768` (commit `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`).
- [x] Added one bounded side chamber connected to the existing cave by an 8m passage, within the cave's flattened terrain footprint.
- [x] Added seven visible rock wall segments with swept segment collision, plus matching walkable floor slabs and a local chamber light.
- [x] Added an intersection audit that verifies a clear passage route and a blocked movement across a wall; browser smoke now asserts both.
- [ ] Await validation, desktop/mobile Browser Smoke, and Pages deployment for commits `51ade066b9830ae18f54f7f65fa77e3dad35682e`, `016a8d24f87ae40c8f805f16f714893f3d835d9c`, and `f60560f0bac7d13ff7edf3bfcfad7b573bf25131`.
- [ ] Remaining cave scope: full multi-branch maze, underwater route, trapped side chambers, deterministic trap damage/reward logic, hidden reward rooms, and the rare 3% reward. This increment is only the first connected side room; do not label the full cave system complete.
- [ ] Manually inspect the cave on desktop and Android after CI; automated viewport tests do not replace physical-device visual acceptance.

---

## 2026-11-02 — cave torch layout cleanup

- [x] Confirmed the previous cave lighting increment passed all three workflows on `04359cfaf18300d2c9ee687f1b1d507fcd75472c`: Validate run `41456705602`, Browser Smoke run `41456705668`, Pages deployment run `41456705664`.
- [x] Removed two duplicate torch props that overlapped the two central pillar torches. The cave now has exactly six authored torch fixtures: two central and four perimeter.
- [x] Tightened browser smoke to require exactly six torch fixtures, at least five cave-local point lights, and finite fixture positions.
- [ ] Awaiting all workflows for cleanup commits `00a7fed7b6ba1a9d49400d5bac30322a94fa2e0b` and `e3d995e5333cd64d29e68a6dabdcb79ec42019a8`; do not mark green until Validate, Browser Smoke, and Pages all succeed.
- [ ] Full cave expansion remains open: current cave is a single chamber with traps and a chest; no verified connected maze, branch corridors, underwater route, or hidden reward rooms. Do not reuse older historical tunnel/viper checklist claims as current functionality.
- [ ] Next implementation: build a bounded multi-room cave using a dedicated walkable floor/ceiling/wall layout and movement collision that is tested against the player's actual grounding and collision path. Do not fake tunnels with decorative meshes or large circular blockers.

---

## 2026-11-02 — cave lighting increment and source-of-truth audit

- [x] Re-audited current `main` source against the older 2026-11-01 cave passage/viper verification entry. The older entry refers to commit `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`; those four passage segments, eight side-wall colliders, and three cave vipers are not present in the current `game/play.html`. Treat that entry as historical evidence only, not current feature status.
- [x] Improved the current cave chamber's warm-light coverage: six torch fixtures total and four additional perimeter point lights, while retaining existing crystal lights and geometry. Gameplay commit: `dfa3cbc5ae9fb988ec1321f43bf02843da84d407`.
- [x] Added a browser-smoke lighting audit for torch count, local point-light count, and finite fixture positions. Test commit: `815c35c14499e02e736c0ea4edf64367f985e321`.
- [ ] Awaiting Validate, Browser Smoke Test, and Pages deployment results for the two commits above; do not mark this increment green until all required workflows finish successfully.
- [ ] Cave remains a compact chamber, not a long maze. Full connected chambers/tunnels, real underground floor/roof collision, branching maze routes, underwater cavern route, traps with deterministic damage tests, and hidden reward rooms remain unimplemented in the current source.
- [ ] Manual visual acceptance still required on desktop and physical Android; CI lighting counts do not prove the cave is visually bright/readable on-device.
- [ ] Next cave task: design and implement a bounded multi-room cave layout with a walkable floor and reliable wall collision inside the cave's flattened terrain footprint; add deterministic traversal tests before extending the map or adding the underwater branch.

---

## 2026-11-02 — legacy hero choices disabled for Meshy replacement

- [x] Removed the Police Officer, Adventurer/Climboria Hero, and temporary Scout character-selection UI from the live game entry screen.
- [x] Removed legacy Police and Climboria Hero GLB URLs and the old character-selection loader/initialization path from `game/play.html`.
- [x] Kept the procedural placeholder character visible so the game does not start with an invisible player while replacement models are pending.
- [ ] Integrate and validate the new Meshy GLBs when supplied, including scale, rig, animations, grounding, and collision.
- [ ] The old GLB files remain stored under `assets/` as unreferenced source files; they were not permanently deleted.

---

## 2026-11-02 — mountain approach-angle regression assertion (verification pending)

- [x] Browser Smoke now requires all eight 45-degree summit approach probes to be present, ordered, and report finite non-negative traversal progress.
- [x] The test preserves the individual first-blocker diagnostics instead of treating a blocked direction as an automatic failure; the probe records evidence for review.
- [ ] Validate and Browser Smoke runs for this assertion are pending.
- [ ] Review the actual eight approach results and fixed-collider audit output before making any collider geometry changes.
- [ ] Manual desktop and Redmi 14 5G landscape traversal acceptance remains open.

---

## 2026-11-02 — fixed collision-solid integrity audit (verification pending)

- [x] Added a read-only audit for authored fixed colliders, reporting invalid coordinates/radii, radius distribution, large colliders, and water-body overlaps without changing gameplay collision behavior.
- [x] Extended Browser Smoke diagnostics to collect the fixed-collider audit and reject missing or invalid collider data.
- [ ] Validate, Browser Smoke, and Pages workflows for this change are pending; inspect actual run results before marking the automated audit verified.
- [ ] Large collider and water-overlap records are diagnostic evidence only; inspect the emitted results before changing any collider dimensions or classifying an overlap as a defect.
- [ ] Manual desktop and Redmi 14 5G landscape collision/terrain visual acceptance remains open.

---

## 2026-11-02 — selected GLB idle, walk, run, and swim transition coverage (automated verification passed; visual review open)

- [x] Added read-only diagnostics for the active authored hero animation state and clip name.
- [x] Browser Smoke enters gameplay, verifies the selected GLB transitions through idle → walk → run → swim, and asserts the clips `Walking`, `Running`, and `Swim_Forward`; the freshwater probe restores captured player position and swim state.
- [x] Validate passed on current-main code/test head `d75bf3f95ed4c22fbabddbd57cc631212bb0d0eb`: [run 41412697815](https://github.com/CryptoDilis/Climboria/actions/runs/41412697815).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41412697790](https://github.com/CryptoDilis/Climboria/actions/runs/41412697790).
- [ ] Jump/fall/climb pose appearance, swim pose quality, foot grounding, and physical Android visual acceptance remain manual checks; no visual/device acceptance is claimed from CI.

---

## 2026-11-02 — desktop wheel and mobile pinch camera zoom regression coverage (automated verification passed; manual review open)

- [x] Exposed read-only current and target camera distance diagnostics without changing camera controls.
- [x] Added desktop smoke assertions for wheel zoom in and out, and mobile smoke assertions for a two-finger pinch in and out.
- [x] Validate passed on code/test head `b906a549a7fb113e0369a48534a6ad7c73510c47`: [run 41366396548](https://github.com/CryptoDilis/Climboria/actions/runs/41366396548).
- [x] Browser Smoke passed on the same head, including desktop and mobile gameplay: [run 41366396554](https://github.com/CryptoDilis/Climboria/actions/runs/41366396554).
- [ ] Physical Android gesture acceptance and camera-distance stability over slopes/transitions remain manual checks.

---

## 2026-11-02 — Sanctuary national flags and summit-beam source audit (automated verification passed; manual review open)

- [x] Audited the 12 existing Sanctuary pillars. Each already carries a waving flag; improved the U.S. (13 stripes and 50-star field), South Korean (four distinct trigrams and taegeuk), Canadian (maple-leaf silhouette), United Kingdom (layered diagonal and cross), Australian (Union Jack and stars), and Indian (Ashoka Chakra) artwork. Preserved the Philippines flag, all pillar positions, count, and respawn layout.
- [x] Added read-only flag attachment diagnostics and Browser Smoke assertions for all 12 distinct country flags, attachment to the same pillar as the pole, and the existing 2.25 × 1.5 flag geometry.
- [x] Browser Smoke passed on code/test head `cbbada14eaad61b8266cb0e66e2500bd7def4c75`: [run 41364321368](https://github.com/CryptoDilis/Climboria/actions/runs/41364321368). Its diagnostics reported all 12 flags attached at the expected size; desktop/mobile rendering had no frame errors.
- [x] Validate passed on the same head: [run 41364321300](https://github.com/CryptoDilis/Climboria/actions/runs/41364321300).
- [x] Source audit found no beam mesh in the Jarrell’s Peak summit group. The tall cyan beacon is in the separate Sanctuary respawn group and remains part of that landmark; no summit-beam removal was needed in this source revision.
- [ ] Manually review flag artwork and readability at gameplay distance, waving and mount placement, and confirm no movement, interaction, or respawn obstruction on desktop and Android landscape. CI does not establish physical-device acceptance.
- [ ] Confirm the user-reported summit effect in a live visual/device review; current source separates the summit flag from the Sanctuary beacon.
- Code commits: `75fc615` (flag art/diagnostics), `1aa6d7f` (attachment smoke check), `06de9be` (distinct Korean trigrams), `cbbada1` (smoke serialization correction).

---

## 2026-11-02 — GLB renderer and mobile-facing smoke repair

- [x] Fixed renderer-state timing in `game/play.html`: successful loading of the selected GLB now publishes the renderer diagnostic at the same time the visible GLB is attached.
- [x] Replaced the fixed 350 ms mobile-facing sample with a bounded wait for the player heading to converge to the camera-relative movement direction in `.github/scripts/game-smoke.mjs`; the alignment assertion remains required.
- [x] Browser Smoke Test passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). The log reports 29 desktop render frames and 22 mobile render frames with no render errors, eight 65 m mountain approach probes, and a 2,799-step spawn route simulation reaching 100%.
- [x] Validate Climboria passed on the same head: [run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] These are automated browser checks only. Manual visual/gameplay review and physical Redmi 14 5G verification remain outstanding. The workflows reported only runner/action deprecation notices.
- [ ] Continue the remaining collision, route, and world requirements from the first unchecked item below; do not infer broad manual verification from this workflow result.

## 2026-11-02 — Section 10: deterministic spawn-to-summit collision trace (automated verification passed; manual review open)

- [x] Exposed the authored fixed-solid collision list through the read-only world diagnostics API; gameplay collision behavior and collider radii are unchanged.
- [x] Upgraded the Browser Smoke route trace to sample at the movement controller's 0.32-unit resolution from the sanctuary spawn to the computed summit peak.
- [x] Trace records route distance, step count, percentage reached, terrain height range, maximum sampled grade, first blocked segment, collision reason, and nearest fixed colliders when a fixed solid is responsible.
- [x] Added a smoke assertion that rejects missing/incomplete route traces or missing blocker diagnostics; legitimate terrain/collider obstruction is recorded, not misclassified as a test failure.
- [x] Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364). Inspected the route trace: eight 65 m approach probes and the 2,799-step spawn route all reached 100%; this is automated evidence only.
- [ ] Manual desktop and Redmi 14 5G landscape traversal remains open; CI does not establish visual collision alignment.
- Code commits: `64a5449` (collision diagnostics API), `3e58eb9` (movement-resolution route trace), `e6a8d3b` (trace assertions).

---

## 2026-11-02 — selected GLB stability regression coverage (automated verification passed; manual review open)

- [x] Browser smoke now fails if the original Climboria Hero GLB is not the active renderer at initialization.
- [x] Desktop and mobile smoke paths verify the same GLB asset remains active and visible after movement and camera orbit; fallback/disappearance is reported as a regression.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); inspected the logs.
- [ ] Verify idle/walk/run/jump/swim transitions and rendered feet grounding on desktop and Android landscape; those visual/device checks remain open.
- Code commit: `2c207a1`.

## 2026-11-02 — mobile movement-facing regression coverage (automated verification passed; manual review open)

- [x] Extended the mobile landscape browser smoke path to verify that movement changes hero heading toward the camera-relative movement vector after independent camera orbit.
- [x] Kept the existing assertions that camera drag changes camera yaw without rotating the player in place and that the selected GLB remains back-facing.
- [x] Browser Smoke and Validate passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390); the mobile heading assertion converged and the selected GLB remained visible.
- [ ] Manual Android landscape visual acceptance remains open.
- Code commit: `9ce647b`.

## 2026-11-02 — hero movement-facing implementation (verification open)

- [x] Decoupled movement input vectors from hero heading by using the independent camera orbit as the movement basis; camera orbit alone still does not rotate the character.
- [x] Added smooth hero heading updates from the actual world-space movement vector, so walking, strafing, and click-to-move turn the selected character naturally while preserving the existing GLB and its 180-degree back-facing offset.
- [x] Added a desktop browser-smoke assertion that moves after camera orbit and verifies the player heading turns toward the movement direction.
- [x] Browser Smoke and Validate passed for the movement-facing implementation on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364) and [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390).
- [ ] Verify actual rendered back-facing orientation and natural turning on desktop and Android landscape; no visual/device acceptance is claimed.
- Code commits: `b3b9946` (movement-facing behavior), `7c72325` (movement regression assertion).

## 2026-11-02 — hero-facing regression coverage update

- [x] Exposed read-only hero heading/GLB visibility diagnostics alongside the independent camera-orbit state; no gameplay-facing controls or hero appearance were changed.
- [x] Extended desktop and mobile browser smoke checks to assert camera orbit changes camera yaw without changing player yaw, and that the loaded GLB hero remains offset by 180 degrees from player heading (back-facing).
- [x] Updated Validate and Browser Smoke passed on code/test head `77a1fc5e33846d739655828c32eb48e8abf77bf0`: [Validate run 41363207390](https://github.com/CryptoDilis/Climboria/actions/runs/41363207390) and [Browser Smoke run 41363207364](https://github.com/CryptoDilis/Climboria/actions/runs/41363207364).
- [ ] Manually verify the hero's back-facing appearance while standing and moving, including camera orbit on desktop and Android landscape. CI assertions do not replace this visual check.
- Code commits: `c4d6b8d` (read-only diagnostics), `fd61161` (desktop/mobile regression assertions).

## 2026-11-02 — hero facing, summit beam removal, and respawn flag pillars (OPEN)

- [ ] Keep the hero facing AWAY from the player camera (show the hero’s back to the player) during normal third-person gameplay. Camera orbit/look input must rotate the camera independently and must NOT rotate the hero in place or make the hero continually turn to follow the camera. Hero heading should change only through actual character movement/turning controls and movement direction; preserve the selected model, outfit, tattoos, proportions, animations, and movement behavior. Verify camera orbit while standing still and while moving, on desktop and Android landscape.
- [ ] Remove the laser-like beam / pointing effect at the Jarrell’s Peak summit. Do not replace it with another beam, marker ray, or artificial spotlight; retain natural mountain lighting and atmosphere.
- [ ] Add a distinct national flag to every existing pillar in the Sanctuary respawn area. Include the Philippines flag 🇵🇭; use other country flags for the remaining pillars, with correct flag designs, readable proportions, secure mounts, and consistent placement. Preserve the existing pillar count, positions, and respawn-area layout.
- [ ] Verify flags remain attached to their pillars, render correctly at gameplay camera distance, and do not obstruct player movement, interactions, or respawning.
- [ ] Run Validate, Browser Smoke, and Pages workflows after implementation; diagnose failures at their root cause and re-run until green. Complete a manual visual check before marking these items done.

## 2026-11-02 — freshwater and river sandy bank foundation (in progress)

- [x] Expanded terrain vertex coloring with a soft sand apron along all three mapped freshwater basins and the river channel, preserving the existing depth-aware seabed sand-to-silt gradient.
- [x] Strengthened the shared terrestrial dressing clearance helper: vegetation/loose rocks are excluded within an 18-unit shoreline buffer, with direct water-body queries at the center and 24 radial samples; low bank ground is also reserved as shoreline.
- [x] Added desktop browser smoke assertions for each freshwater bank and the river bank; existing ocean, seabed, forest-placement, dock, and fishing checks remain active.
- [ ] Await Validate, Browser Smoke, and Pages workflows; inspect diagnostics and fix any regression before merge.
- [ ] Manual desktop and Redmi 14 5G visual review remains open for river/lake/pond sand blending, shoreline width, and vegetation placement.

## 2026-11-02 — CC0 rainforest expansion and placement regression correction

- [x] Expanded planned CC0 GLB dressing to 16 buttress trees, 42 undergrowth patches, and 14 fallen logs (72 planned instances); source GLBs remain cached and cloned.
- [x] Smoke diagnostics now validate deterministic spot counts, finite terrain coordinates, terrain-height agreement within 1 mm, valid ground elevation, and absence of a water-body overlap. This avoids a brittle shoreline-helper assertion while still checking that props are not placed in mapped water.
- [ ] Visual CDN load, actual model bounds/collision feel, waterline appearance, and desktop/Android frame-time acceptance remain manual checks; no claim of full visual acceptance.

## 2026-11-01 — user-reported gameplay and mobile launch bug master list (OPEN; do not mark complete from CI alone)

**Authoritative game-world scope:** Jarrell’s Peak and Arena only. Marketplace and Inventory are supporting systems, not additional game worlds.

### Mobile launch and layout
- [ ] On opening gameplay on a phone, request landscape/fullscreen as early as browser policy permits; if the browser cannot force orientation before a user gesture, show a correctly sized, readable rotate-phone gate that does not expose a squeezed portrait gameplay screen.
- [ ] Make all mobile gameplay UI fit inside the landscape viewport with safe-area spacing; no overlapping HUD, player nameplate, health/stamina/strength, minimap, settings, action buttons, inventory, or control hints.
- [ ] Remove the duplicate/stale world-coordinate and location text appearing on the left side of the mobile screen; show location information in one deliberate place only.
- [ ] Resize/reposition the minimap and all menus for landscape phones; map must be visible, readable, and never dark/blank after opening.
- [ ] Verify mobile controls and every gameplay panel at common phone landscape sizes, including short-height viewports; no clipped labels or controls hidden behind browser/system UI.
- [ ] Preserve desktop layout while fixing mobile-only styling and behavior.

### Hero / character
- [ ] Keep the selected original GLB hero visible and stable after the cinematic intro and during idle, walk, run, jump, swim, and camera changes; no fallback/procedural hero flashing or hero disappearing/reappearing.
- [ ] Keep GLB feet aligned to the actual ground over flat terrain, slopes, ridges, and uneven surfaces; no sinking, floating, or sudden vertical snapping.
- [ ] Persist the selected Adventurer/Police hero between game launches; do not require choosing a hero every time. Allow changing it intentionally from the character/expedition menu.
- [ ] Keep Create Character accessible from the Expedition menu; verify the button, character choices, preview/loading state, and return flow work.
- [ ] Confirm the intended GLB asset loads successfully on the live site on both desktop and Android; do not count the asset merely existing in the repository as proof.

### Camera
- [ ] Verify PC mouse-wheel zoom in/out works in active gameplay and remains smooth.
- [ ] Verify mobile two-finger pinch zoom in/out works in active gameplay without interfering with movement/look gestures.
- [ ] Verify camera distance remains stable and follows the player correctly through walk/run, slopes, and transitions.

### Music / audio
- [ ] Restore and verify the original Climboria soundtrack file `game/assets/music/TRACK_01.mp3` plays during gameplay after a valid user gesture.
- [ ] Ensure soundtrack playback works on Android browsers and desktop; diagnose loading errors, autoplay restrictions, mute state, and visibility/resume behavior rather than silently swallowing errors.
- [ ] Ensure music volume control actually changes soundtrack volume and its setting remains usable.
- [ ] Do not replace the original soundtrack with other tracks or generated/robot-like music.

### Environment / visual quality
- [ ] Remove the unwanted lollipop/low-poly tree models from the visible world until suitable realistic tree assets are ready; do not reintroduce the same placeholder shapes.
- [ ] Ensure the field map/minimap renders at first launch and remains legible when toggled.
- [ ] Keep terrain, water, paths, and existing world features intact while addressing the above issues; avoid unrelated edits during bug-fix passes.

### Verification and handoff rules
- [ ] Reproduce each user-reported issue on the actual affected viewport/device or a reliable browser test before editing; identify the root cause rather than layering CSS/JS patches blindly.
- [ ] Add targeted regression checks for each fix. Run Validate, Browser Smoke Test (desktop and mobile), and Pages deployment on the exact latest commit.
- [ ] Do not mark a user-visible issue fixed solely because CI is green. Check live-site behavior and retain manual Android acceptance as open until verified.
- [ ] After each focused task, record the exact commit SHA, workflow run IDs/status, what changed, what remains unverified, and the next single task here.
- [ ] Work only on the issue the user requested in that turn; do not bundle unrelated features or reopen superseded design decisions.

**Status:** All items above are recorded from user complaints/screenshots and remain open until individually reproduced, fixed, and verified. Recent commits are not assumed to have solved these items merely because code was committed.

---

## 2026-11-01 — Jarrell's Peak world-scale expansion requirements (new scope; not implemented)

- [ ] **Mountain access/collision audit:** inspect every major mountain and rocky massif collider against the rendered terrain; fix invisible blockers and excessive collision radii so players can approach, traverse intended paths, and climb intended faces without clipping through solid rock.
- [ ] **Distributed mountain geography:** replace the overly centralized mountain layout with multiple scattered rocky ranges, ridges, cliffs, foothills, and visible approach paths across the expanded world.
- [ ] **Water-edge vegetation cleanup:** remove terrestrial trees, bushes, ferns, flowers, and grass from sea, river, lake, and pond surfaces; keep aquatic vegetation only where it belongs and preserve clear water surfaces.
- [ ] **Sandy shorelines and seabeds:** create broad natural sandy beaches around the sea, plus appropriate sand/rock transitions and visible underwater sand; apply coherent bank/shore geometry to rivers, lakes, and ponds.
- [ ] **Aquatic ecosystems:** add suitable fish and other marine life to ocean/coastal water and freshwater fish/river life to rivers, lakes, and ponds; connect to actual fishing gameplay rather than decorative-only placement.
- [ ] **Eight coastal fishing docks:** build eight distinct, navigable fishing piers/dock areas distributed along the coastline, with safe access, usable fishing points, and nearby seating.
- [ ] **River recreation/fishing:** add multiple riverbank fishing spots and benches at suitable scenic sections without obstructing traversal or collision corridors.
- [ ] **Major Sakura park expansion:** substantially increase the park footprint and sakura grove density; add the already requested benches, swings, hammocks, and sanctuary/hangout details.
- [ ] **Freshwater scale-up:** enlarge the existing ponds and lake meaningfully; retain distinct identities, shore access, depth, swim transitions, and solid shoreline props.
- [ ] **Large forest biome:** expand the forest into a clearly visible, continuous region with varied tree density, understory, clearings, and traversable paths—not isolated small clusters.
- [ ] **Desert biome:** add a substantial desert region with sand dunes, rocky outcrops, and appropriate sparse vegetation/landmarks.
- [ ] **Overall world scale:** expand playable geography and biome footprints so all requested environments feel like large regions of one open world, not small props or tiny attractions placed close together.
- [ ] **Free asset sourcing:** investigate suitable free GitHub/CC0 assets and trusted libraries (including Poly Haven, Kenney, and Quaternius); verify each asset's license, attribution requirements, file dependencies, performance cost, and collision suitability before integration. Keep an asset-source/license record.
- [ ] **Verification gate:** test mountain approach/climbing and collision, shore entry/exit, water vegetation exclusion, aquatic life, dock navigation/fishing, and desktop/mobile performance. Do not mark visual acceptance complete from CI alone.
- [ ] **Execution order:** first resolve the current freshwater terrain/collision regression; then audit mountain collider access; then implement shoreline/biome foundations; then expand park/forest/desert/mountains and add docks/aquatic life; finally run visual and gameplay acceptance. Preserve every existing master-checklist item.
- [ ] **Status:** requirements recorded only; no world-scale expansion code or assets are claimed complete by this checklist entry.

---

## 2026-11-01 — pond-specific waterline and dive limits (CI queued)

- [x] Freshwater registry now records the actual visible water-disc elevations: Woodland Pond 0.035, Moonpool 0.045, Sanctuary Lake 0.05 world units.
- [x] On entering a pond, swimmer root snaps to that pond's surface offset; idle buoyancy and vertical up/down limits use the active pond's own surface. Existing river/ocean fallback values and checks remain unchanged.
- [x] Smoke API exposes each pond's swim profile; browser test checks registered surface elevations and finite, correctly ordered root/depth limits for all three ponds.
- [x] Gameplay commit: `1736d20a83885a2a637b48c5414b8e2a977e4bec`; initial test commit: `bd5fb9452969ee0a307dfdc72c666a3d9a3e68d4`; tightened test commit/current HEAD: `4f74a6562b97350d3c3bfac5809a147b690e91be`.
- [ ] Latest HEAD workflows are queued: Browser Smoke [41243511895](https://github.com/CryptoDilis/Climboria/actions/runs/41243511895), Validate [41243511878](https://github.com/CryptoDilis/Climboria/actions/runs/41243511878), Pages [41243511775](https://github.com/CryptoDilis/Climboria/actions/runs/41243511775). Earlier in-flight runs were superseded/cancelled by subsequent commits; verify latest HEAD before claiming green.
- [ ] Scope caveat: actual visual pond water/terrain alignment and water depth have not been manually inspected; pond shoreline prop collision and pond fishing remain open. Do not call freshwater gameplay complete yet.
- [ ] Next exact task: inspect terrain/water visual alignment and movement collision at each pond; add smoke coverage for entering and exiting each pond and ensure nearby rocks/reeds/landings remain solid. Then generalize river fishing prompt to ponds only if safe.

---

## 2026-11-01 — freshwater pond swimming integration (CI pending)

- [x] Implemented a shared named freshwater registry for Woodland Pond, Moonpool, and Sanctuary Lake in `game/play.html`; the registry uses the visible water-disc dimensions and exposes point-in-water lookup.
- [x] Integrated pond regions into the existing Jarrell's Peak swimming-state detection and proposed-water transition guard; existing river and ocean checks are retained.
- [x] Added browser smoke assertions for all three pond centers and points beyond each pond's shoreline boundary.
- [x] Gameplay commit: `1b876f1a23f4698c4cd517a2a6e3c6863aae6d51`; regression-test commit (current HEAD): `e7884dce0d49913abbb33e2a07138ef93a25e12d`.
- [ ] CI for current HEAD is still running: Validate [41243202102](https://github.com/CryptoDilis/Climboria/actions/runs/41243202102), Browser Smoke [41243202142](https://github.com/CryptoDilis/Climboria/actions/runs/41243202142), Pages [41243202727](https://github.com/CryptoDilis/Climboria/actions/runs/41243202727). Earlier runs for the intermediate gameplay commit were cancelled by the newer push; do not count them as failures or passes.
- [ ] Scope caveat: this increment connects the three pond footprints to the existing swim state and tests region bounds. It does NOT yet implement per-pond water-surface elevation, pond-specific depth limits, bank/prop collision validation, pond fishing prompts, or manual visual acceptance. Keep the overall freshwater task open.
- [ ] Next exact task: make swim buoyancy/depth use the active freshwater body's actual surface elevation, validate pond entry/exit and solid shoreline props, then extend fishing interaction to ponds only if its existing river interaction can be safely generalized. Preserve river/ocean behavior and add targeted desktop/mobile smoke coverage.

---

## 2026-11-01 — pond feature audit and next-task correction

- [x] Audited `game/play.html` and `.github/scripts/game-smoke.mjs` before implementing the previously listed pond task.
- [x] Confirmed existing decorative freshwater features: `JarrellWoodlandPond` (center approx. x=178,z=255; radius 11), `JarrellMoonpool` (x=300,z=278; radius 8.5), and the sanctuary lake (x=365,z=205; radius 23).
- [x] Confirmed the smoke test currently checks the woodland pond and Moonpool landmark names only; the sanctuary lake has no explicit landmark name and there is no dedicated pond-water volume/collision/fishing regression in the current smoke assertions.
- [ ] Do not duplicate the three existing decorative water features. Next code task is to turn these into a consistent freshwater gameplay system: named pond registry, shore/depth boundaries, entering/exiting swim-state integration, underwater depth controls, safe shoreline exits, and player collision with solid bank/props. Keep existing river/ocean behavior intact.
- [ ] Add Playwright desktop and mobile regression coverage for each pond (approach, enter, swim, depth, exit, bank collision); add fishing only if a real fishing interaction/tool already exists or is implemented as part of a separate scoped task.
- [ ] After code/test work, update both this file and `DEVELOPMENT_CHECKLIST.md` with exact commit SHA, passing workflow run IDs, and the next task. Do not mark manual visual acceptance complete from CI alone.

---

## 2026-11-01 — session handoff checkpoint and workflow verification

- [x] Rechecked GitHub Actions on current `main` commit `aa0cdf786b32064ce737810f4d0265290be98d01`.
- [x] Climboria Browser Smoke Test passed: [run 41242000621](https://github.com/CryptoDilis/Climboria/actions/runs/41242000621).
- [x] Validate Climboria passed: [run 41242000768](https://github.com/CryptoDilis/Climboria/actions/runs/41242000768).
- [x] GitHub Pages build and deployment passed: [run 41242000935](https://github.com/CryptoDilis/Climboria/actions/runs/41242000935).
- [x] Confirmed the male swim-pitch code and per-appearance regression assertion are present in `game/play.html` and `.github/scripts/game-smoke.mjs`; automated smoke is green, but do not call the pose visually accepted until manually inspected on real desktop/Android devices.
- [x] Adopted a permanent handoff rule: every completed master-checklist task must be recorded in this file and the relevant subsystem checklist, with commit SHA, test evidence, remaining caveats, and the next exact task.
- [ ] Manual desktop/Android acceptance remains open for male/female swim posture and strokes, waterline, cave readability/trap fairness, terrain/object collision, and touch controls.
- [ ] Next code task: continue P1 world expansion with multiple ponds in distinct regions; each needs shoreline, depth, collision, and freshwater fishing only where supported. Add regression coverage and update `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md` plus this log when complete.
- [ ] Keep README launch-scope truth authoritative: Jarrell's Peak + Arena only. No 11-mountain or 10-normal-mountain launch plan.

---

## 2026-11-01 — cave traversal/traps, swim depth, and mountain movement verified green

- [x] Diagnosed the preceding cave spike-trap test failure: the test called Playwright's `page.waitForFunction()` from inside `page.evaluate()`, where the Playwright `page` object is unavailable. Replaced it with browser-context polling of the eight live spike meshes; retained the exact damage and single-trigger assertions.
- [x] Latest gameplay/test commit: `d78ea96fa730335a9610d5eaf9ed05a6e9f833c0`.
- [x] Climboria Browser Smoke Test passed: [run 41238548708](https://github.com/CryptoDilis/Climboria/actions/runs/41238548708).
- [x] Validate Climboria passed: [run 41238548638](https://github.com/CryptoDilis/Climboria/actions/runs/41238548638).
- [x] GitHub Pages build and deployment passed: [run 41238548162](https://github.com/CryptoDilis/Climboria/actions/runs/41238548162); build, deploy, and status-report jobs all succeeded.
- [x] Inspected complete job summaries and relevant logs; no failed steps remain in this verification set.
- [x] Cave passage regression: four roofed/floored segments, 7.2 m width, 5.2 m height, 16 visible meshes, clear center lane, and eight blocking side-wall colliders passed.
- [x] Cave lighting regression: four visible wall torches, four working collision blockers, clear center lane passed.
- [x] Cave spike trap regression: all eight spikes extended; exactly one trigger applied 12 HP damage.
- [x] Cave viper regression: three snakes present; bite test applied the expected 8 HP damage.
- [x] Movement-driven mountain collision passed on desktop and mobile: player stopped at the massif face without penetration and slid along it under tangential movement.
- [x] Swim depth controls passed: swimmer settled near waterline; Space raised the player and Ctrl lowered the player within the tested depth bounds. Procedural arm/leg movement and horizontal face-down pitch assertions passed for the active test profile.
- [ ] Manual Android/desktop visual acceptance remains open for cave navigation, torch readability, trap fairness, snake presentation, swimming posture/strokes/waterline, and real-device controls. Automated CI is not a substitute for hands-on playtesting.
- [ ] Continue with the next unchecked P0/P1 world item; preserve the master checklist and never mark visual/physical acceptance complete from CI alone.

## 2026-11-01 — natural uphill traversal regression strengthened and verified

- [x] Audited the existing walkable-slope regression instead of duplicating it: it already selects a real heightfield slope, drives the player uphill, checks movement progress, and records terrain clearance/collision state.
- [x] Diagnosed the first added duplicate test as a test-fixture problem: its locally selected candidate had a short valid uphill segment but the player advanced only 0.84 m before the sample ended. This did not establish a gameplay defect; the original deterministic uphill test independently showed 1.45 m of movement and a ground-height gain of about 0.83 m.
- [x] Removed the redundant candidate-search test and strengthened the existing regression to require at least 0.2 m of actual terrain-height gain, while retaining its movement-distance and grounded-clearance assertions.
- [x] Final test commit: `1dae6ea97188906d9a9c451dcb5e23fa6ddab868`.
- [x] Desktop browser gameplay smoke passed: [run 41234087364](https://github.com/CryptoDilis/Climboria/actions/runs/41234087364); uphill slope, mountain face collision/sliding, water/ocean, cave and other gameplay regressions passed.
- [x] Validate Climboria passed: [run 41234087319](https://github.com/CryptoDilis/Climboria/actions/runs/41234087319); HTML/script checks and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41234087259](https://github.com/CryptoDilis/Climboria/actions/runs/41234087259).
- [ ] Manual Android/desktop playtesting remains open; automated uphill traversal is not a substitute for hands-on control/visual acceptance.

## 2026-11-01 — movement-driven mountain collision and traversal regression verified

- [x] Added a real player-physics regression against the Jarrell mountain massif: approach the face under movement input, verify the player stops without entering the collider, then verify tangential movement slides along the face.
- [x] Desktop audit passed: contact x=392.91 at massif edge x=392.72; no collider penetration; tangential slide advanced z by 0.94 m.
- [x] Mobile audit passed: contact x=393.98 at massif edge x=392.72; no collider penetration; tangential slide advanced along the face.
- [x] Both desktop and mobile retained the existing static collider checks: 39 mountain blockers, center blocked, outside clear, above clear.
- [x] Test commit: `2dbede9e396568fd6654b4ec5db011fb95052a61`.
- [x] Climboria Browser Smoke Test passed: [run 41231541066](https://github.com/CryptoDilis/Climboria/actions/runs/41231541066); movement-driven mountain collision and sliding regression passed.
- [x] Validate Climboria passed: [run 41231541134](https://github.com/CryptoDilis/Climboria/actions/runs/41231541134); syntax, HTML audit, and desktop/mobile gameplay smoke passed.
- [x] GitHub Pages build and deployment passed: [run 41231541549](https://github.com/CryptoDilis/Climboria/actions/runs/41231541549).
- [ ] This is automated movement/collider evidence, not manual visual acceptance on physical Android/desktop devices; steep-face traversal, clipping around crags, and collision with all world props still need hands-on playtesting.

## 2026-11-01 — procedural swim audit stabilized; gameplay screenshots retained

- [x] Diagnosed Browser Smoke Test failure in run [41226360172](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172): the male hero's procedural leg audit compared a single animation sample against the current live pose. Depending on render-loop phase, that sample could coincide with the current pose and falsely report no leg movement, even though the animation was applied.
- [x] Fixed `makeProceduralSwimPose().testLimbs()` to compare deterministic procedural poses at two distinct animation times, then restore the original live bone rotations. This keeps the arm-and-leg movement assertions intact without weakening the test.
- [x] Fix commit: `7c5d9c21403881f701bb5e3cc099bb7fda63bfdd`.
- [x] Climboria Browser Smoke Test passed: [run 41229644903](https://github.com/CryptoDilis/Climboria/actions/runs/41229644903); full desktop/mobile gameplay regression suite passed.
- [x] Validate Climboria passed: [run 41229645029](https://github.com/CryptoDilis/Climboria/actions/runs/41229645029); all validation and gameplay steps passed.
- [x] GitHub Pages build and deployment passed: [run 41229644758](https://github.com/CryptoDilis/Climboria/actions/runs/41229644758).
- [x] Retrieved and visually inspected the desktop and mobile gameplay screenshots from Browser Smoke artifact [13051829797](https://github.com/CryptoDilis/Climboria/actions/runs/41226360172/artifacts/13051829797); all four homepage/gameplay screenshot files were uploaded. The captured gameplay frames confirm the HUD, compass/coordinates, riverside camp, water, character, and mobile touch controls render in both viewports.
- [ ] Screenshot capture is headless CI evidence only; manual Android/desktop play inspection remains open, especially natural face-down swimming, stroke quality, and movement feel.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — treasure cache pause-state and swim-pose wait fixes verified green

- [x] Fixed browser regression setup: resume the game after the deliberate viper pause before testing the nearby treasure cache's E-key interaction; restore paused state afterward.
- [x] Hardened both-appearance swim-pose test to wait for active procedural swim pose with arm and leg movement audits before sampling; retained the full-limb assertions.
- [x] Latest gameplay/test commit: `7667c0a099541d8408f1c093b3d6fb7d6ff18f5a`.
- [x] Climboria Browser Smoke Test passed: [run 41222361583](https://github.com/CryptoDilis/Climboria/actions/runs/41222361583); homepage controls, desktop/mobile Jarrell gameplay, cache and swim regressions, and screenshot upload all completed successfully.
- [x] Validate Climboria passed: [run 41222361562](https://github.com/CryptoDilis/Climboria/actions/runs/41222361562); syntax checks, desktop/mobile gameplay smoke, and screenshot upload all completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41222360708](https://github.com/CryptoDilis/Climboria/actions/runs/41222360708).
- [x] Inspected complete job step lists for both gameplay workflows; every step completed successfully.
- [ ] Manual Android/desktop confirmation of natural face-down swimming, stroke quality, waterline, cache interaction, and shoreline transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interiors/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — movement-driven ocean shore regression: all required workflows green

- [x] Latest gameplay/test commit `4cdf68a290b7a7e300869d7855eb82d488e17632` stabilizes the swim-pose wait using Playwright's explicit options argument and verifies movement-driven west-shore exit without requiring an arbitrary extra metre beyond the sea boundary.
- [x] Climboria Browser Smoke Test passed: [run 41219099388](https://github.com/CryptoDilis/Climboria/actions/runs/41219099388), including desktop/mobile gameplay smoke and swim/ocean regressions.
- [x] Validate Climboria passed: [run 41219099410](https://github.com/CryptoDilis/Climboria/actions/runs/41219099410), including desktop/mobile Jarrell smoke, syntax checks, and screenshot upload.
- [x] GitHub Pages build and deployment passed: [run 41219100003](https://github.com/CryptoDilis/Climboria/actions/runs/41219100003).
- [x] Inspected the Validate job's complete step list; all steps, including desktop/mobile gameplay smoke and screenshot upload, completed successfully.
- [ ] Manual Android/desktop confirmation of face-down natural swimming, waterline, and actual shore transition remains open; automated smoke success is not visual acceptance.
- [ ] Mountain traversal/collision acceptance, navigable cave interior/traps, wildlife/danger zones, campsites/sanctuary, coast/fishing/port/broken ship polish, and mobile performance remain open.

## 2026-10-31 — final Pages verification for open-sea regression

- [x] Rechecked latest main commit `c07319c1598c06990b127e426e0ea4dafa737fc7`; Pages run [41212129956](https://github.com/CryptoDilis/Climboria/actions/runs/41212129956) completed successfully.
- [x] Inspected all Pages job steps: Jekyll build, artifact upload, build-status report, and deployment all succeeded.
- [x] Reconfirmed Browser Smoke Test [41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053) and Validate Climboria [41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050) passed, including desktop/mobile gameplay smoke.
- [x] No failed steps remain in the latest open-sea regression verification set.
- [ ] Manual ocean/coast traversal and swim-pose visual acceptance on Android and desktop remain open; automated bounds assertions do not prove movement-driven shoreline exit or natural-looking animation.

## 2026-10-31 — open-sea swimming regression added; CI verification pending

- [x] Confirmed Jarrell's open sea has explicit bounds and a deep sea-floor terrain check.
- [x] Identified a coverage gap: automated swimming-state and movement-driven shoreline exit tests covered the river, while ocean coverage only checked sea-floor depth.
- [x] Added browser smoke assertions for open-sea swimming activation, waterline settling, and clearing the swimming state beyond all four ocean bounds (west/east/north/south).
- [x] Browser Smoke Test passed: [run 41211481053](https://github.com/CryptoDilis/Climboria/actions/runs/41211481053); desktop/mobile gameplay smoke completed successfully, including open-sea boundary assertions.
- [x] Validate Climboria passed: [run 41211481050](https://github.com/CryptoDilis/Climboria/actions/runs/41211481050); syntax checks and desktop/mobile gameplay smoke completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41211495276](https://github.com/CryptoDilis/Climboria/actions/runs/41211495276); build, status report, and deploy jobs completed successfully.
- [x] Inspected the workflow job steps for all three runs; no failed steps were reported.
- [ ] Manual ocean/coast swimming and shoreline traversal on Android and desktop remain unverified; this automated boundary test does not replace visual/physical acceptance.

## 2026-10-31 — river/swim regression coverage audit; latest workflows green

- [x] Audited the current browser smoke test rather than assuming river exit was untested.
- [x] Confirmed automated dry-bank river entry is exercised and must enter stable swimming without a deep fall.
- [x] Confirmed swimming activation and waterline are checked at nine river positions: -700, -520, -360, -200, 0, 80, 280, 480, and 700.
- [x] Confirmed both banks are checked for swimming-state exit at each of those nine river positions.
- [x] Confirmed a separate movement-driven swim-exit scenario follows the local river-bank normal and requires the player to reach dry, grounded terrain within a 24-second observation window.
- [x] Confirmed the active swim pose is exercised for both selectable hero appearances, including pitch direction, pivot height, and arm/leg movement assertions.
- [ ] Manual visual acceptance remains open: face-down orientation, natural-looking strokes, and waterline on actual Android and desktop browsers.
- [ ] Manual traversal/collision acceptance remains open across mountain faces, cave walls, roots, rocks, structures, and shoreline props.
- [ ] Do not claim visual or physical completion from automated smoke coverage alone.

## 2026-10-31 — latest swimming regression hardening; all workflows green

- [x] Latest gameplay/test commit: `7cc7a39ef792d23a76bc42846ab585228b7c4bf8` — reject incomplete GLB swim clips and require procedural fallback to animate both arms and legs.
- [x] Climboria Browser Smoke Test passed: [run 41205023871](https://github.com/CryptoDilis/Climboria/actions/runs/41205023871); desktop/mobile Jarrell gameplay smoke and swim assertions completed successfully.
- [x] Validate Climboria passed: [run 41205023916](https://github.com/CryptoDilis/Climboria/actions/runs/41205023916); JavaScript syntax and desktop/mobile gameplay smoke checks completed successfully.
- [x] GitHub Pages build and deployment passed: [run 41205023965](https://github.com/CryptoDilis/Climboria/actions/runs/41205023965).
- [x] Inspected job step summaries for all three runs; every reported step completed successfully.
- [ ] Visual acceptance remains open: confirm both hero appearances swim face-down with natural strokes and correct waterline on Android and desktop.
- [ ] Manual traversal acceptance remains open: test multiple mountain faces for clipping, invisible walls, and edge bypasses.
- [ ] Verify actual river exit and shoreline transitions on desktop and Android.
- [ ] Keep the next world-geometry blocker paused until these manual acceptance checks are completed; green CI is not visual/physical acceptance.

## 2026-10-31 — latest drill: both hero swim-pose regression and all workflows green

- [x] Latest main gameplay/test commit: `9fbbb2065ec63877a44e50fdeb4a426e4a6d748c` — active swim-pose assertions for both hero appearances.
- [x] Validate Climboria passed: [run 41203860147](https://github.com/CryptoDilis/Climboria/actions/runs/41203860147); all validation steps completed successfully.
- [x] Browser Smoke Test passed: [run 41203860100](https://github.com/CryptoDilis/Climboria/actions/runs/41203860100); desktop/mobile Jarrell gameplay smoke and screenshot upload completed successfully.
- [x] GitHub Pages build, status report, and deployment passed: [run 41203860138](https://github.com/CryptoDilis/Climboria/actions/runs/41203860138).
- [x] Inspected each job's step list for all three runs; no failed or skipped validation steps were reported.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Do not continue to the next world-geometry blocker until these acceptance gaps are addressed; green CI alone is not visual/physical acceptance.


- [x] Rechecked latest main commit `87561d39178f01fc52ebd80cc600f919717c93dc`.
- [x] Validate Climboria passed: [run 41202315898](https://github.com/CryptoDilis/Climboria/actions/runs/41202315898).
- [x] Browser Smoke Test passed, including Jarrell’s Peak desktop and mobile gameplay smoke: [run 41202315842](https://github.com/CryptoDilis/Climboria/actions/runs/41202315842).
- [x] GitHub Pages build, status report, and deployment passed: [run 41202315659](https://github.com/CryptoDilis/Climboria/actions/runs/41202315659).
- [x] Reviewed current automated collision coverage: exposed tree-root flares, campsite cart/forge and cart handles, cave interior walls, mountain massif/crag bounds, uphill slope movement, river/sea terrain, and obstacle movement probes are already represented in `.github/scripts/game-smoke.mjs`.
- [x] Confirmed swimming tests cover river entry, waterline, surface/dive controls, male/female rig animation availability, and active-appearance pitch-sign assertions.
- [ ] Visual acceptance remains open: verify both male and female characters are face-down (not back-floating), with natural strokes and correct waterline on desktop and Android.
- [ ] Manual traversal acceptance remains open: physically walk/approach multiple mountain faces and verify no clipping, invisible walls, or edge bypasses; automated collider-center checks are not a full traversal test.
- [ ] Verify river exit and shoreline transitions with actual player movement on desktop and Android.
- [ ] Continue the next world-geometry blocker only after these acceptance gaps are addressed; do not mark visual/physical completion from green CI alone.

## 2026-10-31 — PR #120 post-merge verification

- [x] PR #120 face-down swim-pitch direction change merged to `main` as commit `9a711f71950cf813b53e58f12012425550100d60`.
- [x] PR Validate passed: [run 41166366930](https://github.com/CryptoDilis/Climboria/actions/runs/41166366930).
- [x] PR Browser Smoke Test passed: [run 41166366914](https://github.com/CryptoDilis/Climboria/actions/runs/41166366914).
- [x] Post-merge main Validate passed: [run 41167108701](https://github.com/CryptoDilis/Climboria/actions/runs/41167108701).
- [x] Post-merge main Browser Smoke Test passed: [run 41167108695](https://github.com/CryptoDilis/Climboria/actions/runs/41167108695).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41167108735](https://github.com/CryptoDilis/Climboria/actions/runs/41167108735).
- [ ] Visual acceptance remains open: verify the face-down orientation for both hero appearances, natural arm/leg strokes, waterline, and river entry/exit on desktop and Android. Automated assertions do not prove the character visually faces down.
- [ ] Continue the next swimming acceptance blocker only after inspecting actual model orientation and movement behavior; do not blindly invert rig bones or claim visual completion.

## Latest workflow verification — 2026-10-29 (cave-mouth collision regression)

- [x] Browser Smoke Test passed on gameplay/test commit `c92a299e6fef9ced988c799528572f2da7ff27af`: [run 40888314086](https://github.com/CryptoDilis/Climboria/actions/runs/40888314086).
- [x] Validate Climboria passed on the same commit, including desktop/mobile Jarrell gameplay smoke tests: [run 40888314061](https://github.com/CryptoDilis/Climboria/actions/runs/40888314061).
- [x] GitHub Pages deployment passed on the same commit: [run 40888312739](https://github.com/CryptoDilis/Climboria/actions/runs/40888312739).
- [x] Cave-mouth regression confirmed the real stone tooth blocks at ground level, the central entrance stays clear, and a distant approach is not falsely blocked.
- [x] Cave torch and approach trail checks passed: two warm-lit torches; twelve visible low-profile pavers with continuous spacing.
- [x] Desktop/mobile smoke passed, including swimming controls and respawn checks.
- [ ] CI frame-time baseline is warning-only because only three samples were captured; its sub-1 FPS figure is not a reliable real-device performance measurement.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures/cart geometry against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (live-site smoke and selector fix)

- [x] Diagnosed historical live-site smoke failure [run 40878012057](https://github.com/CryptoDilis/Climboria/actions/runs/40878012057): test waited for nonexistent `#jarrellLootHUD` and timed out; this was a stale test selector, not evidence of a gameplay failure.
- [x] Updated live-site smoke assertions to use actual `#levelName`, `#hudPlayerName`, `#healthValue`, and `#staminaValue` elements in commit `af2685d691025d15da7e76ab3c027b72ba7a6742`.
- [x] Validate Climboria passed on commit `af2685d`: [run 40878600904](https://github.com/CryptoDilis/Climboria/actions/runs/40878600904).
- [x] GitHub Pages deployment passed on commit `af2685d`: [run 40878600812](https://github.com/CryptoDilis/Climboria/actions/runs/40878600812).
- [x] Added a push trigger for edits to `.github/workflows/live-site-smoke.yml` so the live-site check runs when its own workflow is changed, commit `5a555362dae92205db0a292f2b76f6696cc1543f`.
- [x] Live Site Smoke Test passed on commit `5a555362`: [run 40881208397](https://github.com/CryptoDilis/Climboria/actions/runs/40881208397).
- [x] Validate Climboria passed on commit `5a555362`: [run 40881208294](https://github.com/CryptoDilis/Climboria/actions/runs/40881208294).
- [x] GitHub Pages deployment passed on commit `5a555362`: [run 40881208064](https://github.com/CryptoDilis/Climboria/actions/runs/40881208064).
- [x] Confirmed `.github/scripts/game-smoke.mjs` contains a direct left-click movement regression: it dispatches a world click, checks a destination is created, and asserts the movement vector points toward it.
- [ ] Manual live-site gameplay review remains outstanding for movement feel, collision, swim pose/waterline, and river exit.
- [ ] Continue with the next collision blocker: explicitly verify exposed roots and built structures against actual world geometry; do not claim broad collision coverage from passing CI alone.

## Latest workflow verification — 2026-10-29 (click-to-move smoke verification)

- [x] Gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c` added Dota-style left-click destination movement while preserving keyboard/touch controls.
- [x] Validate Climboria passed on that gameplay commit: [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), including syntax checks and Jarrell desktop/mobile smoke tests.
- [x] Climboria Browser Smoke Test passed on that gameplay commit: [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), including homepage controls and Jarrell desktop/mobile smoke tests.
- [x] GitHub Pages deployment passed for the follow-up checklist commit `ebce28bb99856e9d5f6522d60f725a7a365af8d6`: [run 40875852184](https://github.com/CryptoDilis/Climboria/actions/runs/40875852184).
- [x] Added a targeted browser regression assertion that clicks a walkable destination, verifies a movement target is created, and checks steering alignment in `.github/scripts/game-smoke.mjs`; confirm it remains green in the latest validation run above.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision, swimming pose/waterline, and river exit.
- [ ] Continue from the first unchecked gameplay blocker; do not mark movement/collision/swimming fully complete based on workflow success alone.

## Latest workflow verification — 2026-10-29 (swimming buoyancy motion)

- [x] Commit `7c57e660a0adcacf326b4fbbe2e4e8203a100ab7` added restrained buoyancy bob and subtle roll to the existing horizontal swim pose.
- [x] Validate Climboria passed for this commit: [run 40869466394](https://github.com/CryptoDilis/Climboria/actions/runs/40869466394).
- [x] Climboria Browser Smoke Test passed for this commit: [run 40869466395](https://github.com/CryptoDilis/Climboria/actions/runs/40869466395).
- [x] GitHub Pages deployment passed for this commit: [run 40869466180](https://github.com/CryptoDilis/Climboria/actions/runs/40869466180).
- [x] Homepage controls, launch-copy checks, script syntax checks, and desktop/mobile Jarrell’s Peak automated smoke test passed in the latest validation run.
- [ ] Manual live-site visual confirmation of swimming pose, waterline, and river exit remains outstanding; automated smoke success does not prove animation quality.
- [ ] Continue with natural arm/leg swimming animation and verify the selected GLB swim clip versus procedural fallback before changing animation behavior.

## Latest workflow verification — 2026-10-29 (continuous cave approach trail)

- [x] Latest gameplay/test commit `023802449a08c0a52fb655ad9bff01da0348e5cb` passed Validate Climboria [run 40837168883](https://github.com/CryptoDilis/Climboria/actions/runs/40837168883).
- [x] The same commit passed Climboria Browser Smoke Test [run 40837168934](https://github.com/CryptoDilis/Climboria/actions/runs/40837168934), including the cave trail continuity/span and maximum-gap regression.
- [x] GitHub Pages build and deployment passed for the same commit [run 40837169475](https://github.com/CryptoDilis/Climboria/actions/runs/40837169475).
- [x] The 12-stone approach trail is now checked for continuity/span and maximum spacing in addition to count, visibility, geometry, and low profile.
- [ ] Manual live-site gameplay review remains outstanding; automated success does not prove every collision or swimming behavior.
- [ ] Continue with swimming/riverbank behavior and terrain/object collision coverage; inspect real implementation and tests before editing.

## Latest workflow verification — 2026-10-29 (cave approach trail regression)

- [x] Previous gameplay commit `5ad57180b911aa4f06690d59f7339d97343d5bb8` passed Validate Climboria [run 40835399036](https://github.com/CryptoDilis/Climboria/actions/runs/40835399036), Browser Smoke Test [run 40835398837](https://github.com/CryptoDilis/Climboria/actions/runs/40835398837), and Pages deployment [run 40835398503](https://github.com/CryptoDilis/Climboria/actions/runs/40835398503).
- [x] Added a named array for the twelve low-profile cave approach pavers so the browser smoke test can inspect the actual scene meshes.
- [x] Added a browser regression audit for paver count, mesh visibility/type, and low profile; Browser Smoke Test passed on commit `644c7f9b` [run 40836380834](https://github.com/CryptoDilis/Climboria/actions/runs/40836380834).
- [x] Validate Climboria passed on commit `644c7f9b` [run 40836380866](https://github.com/CryptoDilis/Climboria/actions/runs/40836380866).
- [x] GitHub Pages deployment passed for checklist commit `d2621ce0` [run 40836402781](https://github.com/CryptoDilis/Climboria/actions/runs/40836402781).
- [ ] Manual live-site gameplay review remains outstanding; automated tests do not prove all collision or swimming behavior.
- [ ] Continue with swimming buoyancy/pose and reliable riverbank exit, then expand collision coverage based on actual world geometry.

## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [x] Browser smoke also checks tree trunk collision across X/Z spatial-grid boundaries and vertical bounds.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow verification — 2026-10-29 (large-rock collision bounds)

- [x] Validate Climboria passed on commit `dba0a28b73bcae197a7590f3bac396d282fedb1b`: [run 40771353480](https://github.com/CryptoDilis/Climboria/actions/runs/40771353480).
- [x] Browser Smoke Test passed on the same commit: [run 40771353495](https://github.com/CryptoDilis/Climboria/actions/runs/40771353495).
- [x] GitHub Pages build and deployment passed: [run 40771352636](https://github.com/CryptoDilis/Climboria/actions/runs/40771352636).
- [x] Added a regression check for large Jarrell rocks: blocked at ground level, clear beyond the horizontal radius, and clear above the collider's vertical bounds.
- [ ] Manual live-site gameplay review remains outstanding; automated success is not proof of every physical interaction.
- [ ] Continue with collision coverage for roots, cave walls, carts/buildings and slope/shoreline/respawn edge cases; do not mark broad collision complete from the rock test alone.

# Climboria — Master Repair & World-Building Checklist

> **Carry-forward project checklist.** Use this document as the persistent source of truth across new chats and development sessions. Continue from the first unchecked blocker; do not restart planning from scratch. Keep working on the repository, verify changes, and report actual results—not assumptions.

## Product goal

Build a polished, believable browser-based open-world wilderness survival and treasure-hunting game centered on **Jarrell’s Peak**. The map is vast and endless-feeling, with **no summit and no final level**. The player should spend time exploring a living world, finding treasure, fishing, swimming, and discovering hidden locations. The motto is **“Vengeance Is Always an Option.”**

The launch menu has only four destinations: **Jarrell’s Peak, Arena, Marketplace, Inventory**. Jarrell’s Peak is the only playable launch world; the other three must be honestly labeled as previews/future work where appropriate.

## Working rules

- Fix blockers before adding new features.
- Do not mark an item complete because code was merely edited. Complete means tested; record the relevant commit/run and observed result.
- After each meaningful code change, inspect the newest GitHub Actions run, identify the actual failing step and log, fix the root cause, then rerun relevant checks.
- Page Deployment being green does **not** mean main validation or gameplay tests passed.
- Never hide or suppress a failing test merely to make a workflow green. Update a test only when its expectation is demonstrably wrong and verify the real behavior independently.
- Use free GitHub-hosted/open-source assets only after checking the asset's license, attribution requirements, file size, format, and compatibility. Keep attribution/license notes in the repo. Do not assume “free to download” means free for any use.
- Prefer reusable, optimized assets and modular code. Avoid bloating the single-page game or breaking unrelated mechanics.
- Preserve user-created music/assets and agreed designs. Test desktop and mobile after gameplay changes.
- Carry this checklist forward when starting a new chat; update it rather than replacing it with a fresh plan.

### Required next gameplay fixes — added 2026-10-29
- [ ] Swimming: horizontal, natural face-down pose; correct buoyancy/depth and movement; smooth water entry/exit; no sinking into the riverbed or getting stuck at banks.
- [ ] Collision: prevent the hero from passing through bushes where blocking is intended, fallen logs, tree trunks/roots, rocks, mountain/cliff faces, cave walls, tents, carts, and buildings. Test on slopes, shoreline transitions, and respawn.
- [ ] Caves: dim atmospheric lighting with warm wooden torches spaced along navigable routes; preserve visibility and limit dynamic lights/particles for mobile performance.
- [ ] Mountains: visible, continuous dirt hiking paths with natural switchbacks and worn-soil edges, inspired by well-marked Olympic-style trails; paths must be grounded, walkable, and visually distinct from surrounding terrain.
- [ ] Campsite: make the main tent slightly larger/taller than the hero with a clear entrance; add bedrolls, crates, firewood, cooking gear, stools, lanterns, and supplies while preserving walkable space and proper collision.
- [ ] Starting/respawn area: create a polished medieval-fantasy frontier camp featuring a castle-era black-market cart/stall and a clearly identifiable merchant NPC with an honest interaction prompt. Keep any purchase as a demo until currency/inventory transactions truly work.
- [ ] Climboria soldiers: add patrol NPCs that loop around suitable camp, trail, and ruin routes, turn/pause naturally, avoid obstacles, and never block or trap the player at spawn.
- [ ] Free assets: research GitHub/open-license models first, verify the exact license and redistribution terms, record source URLs/license/format/size in the asset-source log, and test model loading, scale, rig/animations, collision, and mobile performance before marking integrated.

## P0 — Restore a stable build (blockers)

- [x] Fix all current JavaScript/module-loading errors in `game/play.html`; confirm Three.js and GLTFLoader load in a real browser. Browser smoke run [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148) completed successfully on gameplay commit `3ea08fbb`.
- [x] Run JavaScript syntax checks for every inline game/site script. Validation run [40704150014](https://github.com/CryptoDilis/Climboria/actions/runs/40704150014) completed successfully on checklist commit `b3195458`.
- [x] Make **Validate Climboria** pass on gameplay commit `b6a56d16`; run [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078) completed successfully (job `validate`, conclusion `success`). Recheck after future gameplay changes.
- [x] Make **Climboria Browser Smoke Test** pass on gameplay commit `b6a56d16`; run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) completed successfully (job `browser-smoke`, conclusion `success`). Recheck after future gameplay changes.
- [x] Resolve the current regression that blocked the swim-exit smoke test: run [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027) passed after the test began near the real shoreline and the observation window was extended. This verifies the current automated scenario only; broader collision/terrain edge cases remain unchecked.
- [x] Confirm no uncaught browser errors or blank 3D scenes in the automated desktop/mobile smoke scenario; critical camp tent GLBs and gameplay initialization were verified by [40704098148](https://github.com/CryptoDilis/Climboria/actions/runs/40704098148). This is automated coverage, not a full manual live-site audit.
- [x] Confirm Browser Smoke Test, Validate Climboria, and Pages deployment are green on gameplay commit `b6a56d16`: smoke [40698275027](https://github.com/CryptoDilis/Climboria/actions/runs/40698275027), validation [40698275078](https://github.com/CryptoDilis/Climboria/actions/runs/40698275078), and deployment [40698275144](https://github.com/CryptoDilis/Climboria/actions/runs/40698275144) all completed successfully. The subsequent checklist-only commit `cb383fca` has validation [40698748741](https://github.com/CryptoDilis/Climboria/actions/runs/40698748741) still to verify; no game code changed in that commit.
- [ ] Test the deployed game through manual live-site gameplay review. Latest gameplay/test commit `153222ca` passed Validate Climboria [run 40753994293](https://github.com/CryptoDilis/Climboria/actions/runs/40753994293), Browser Smoke Test [run 40753994239](https://github.com/CryptoDilis/Climboria/actions/runs/40753994239), and Pages deployment [run 40753993503](https://github.com/CryptoDilis/Climboria/actions/runs/40753993503). The smoke suite now covers tree-collider hits across both X and Z grid boundaries plus vertical bounds; this is automated evidence only, and manual visual gameplay is still not verified.

## P1 — World environment and free asset research/integration

For each asset or code technique: find a trustworthy open-source/GitHub source, verify license and attribution, record the source and license, integrate it, optimize it, and test collision/performance. Do not bulk-copy an entire project without checking its license and dependencies.

### Terrain, mountains, weather, and water
- [ ] Realistic mountain ranges, ice peaks, snow/rock transitions, cliffs, ridges, ravines, boulders, scree, and believable terrain silhouettes.
- [ ] Volcano/magma region in a distinct part of the map, with safe readable boundaries, heat/particle effects, and tested collision.
- [ ] Dynamic or varied weather: fog, rain, storms, wind, cloud layers, snow at high elevations, and atmospheric lighting; keep mobile performance in mind.
- [ ] Long winding river, ponds, lakes, waterfalls, wet banks, streams, marshes, and an explorable sea/coast section where map layout permits.
- [ ] Correct water surface, swimming, diving, shore exit, underwater/shore visibility, and collisions with riverbeds, rocks, banks, and shore objects.
- [ ] Ice peak and slippery/icy terrain behavior if supported by gameplay and performance tests.

### Forests, plants, and landscapes
- [ ] High-quality realistic trees: varied species, trunks, branches, leaf shapes, scale, color, age, and density; avoid repetitive low-quality “copy-paste” forests.
- [ ] Dense forest, sparse woodland, clearings, mountain pines, tropical vegetation, ferns, grass, flowers, fallen logs, roots, and ground cover.
- [ ] Park-like sanctuary/clearing areas, natural landmarks, hidden paths, caves, ruins, and discoverable locations.
- [ ] Rice fields and rural Philippine-inspired landscape details where they fit the world, including paddies, embankments, and irrigation channels.
- [ ] Bahay kubo, tents, trail shelters, camps, abandoned huts, bridges, docks, and other believable structures.
- [ ] Tent variants and damaged/closed/open states; verify all models load and have sensible collision.

### Wildlife, fish, and flying creatures
- [x] Remove the primitive-sphere/cylinder wolf and deer placeholders that looked rat-like. They are no longer spawned; proper wildlife models remain a follow-up requirement (commit `ce9916f5`).
- [ ] Source and integrate a cohesive, realistic/real-world-proportioned wildlife set. Until suitable models are verified, Jarrell’s Peak intentionally has no procedural wolf/deer placeholders. Prefer downloadable GLB/glTF assets with visible previews, compatible commercial-use licenses, clear attribution terms, and explicit source URLs. Do not call low-poly assets “realistic”; use them only if intentionally matching the final art direction.
- [ ] Add birds in the sky and forest canopy (small flocks, perching, takeoff/landing, simple flight paths); keep counts low and use distance culling.
- [ ] Add local fauna suitable for a Philippine-inspired wilderness: monkeys/macaques, chickens/roosters near rural camps, snakes near rocks/riverbanks, and small forest birds. Use plausible habitat placement and avoid spawning animals inside props or on steep slopes.
- [ ] Add other biome-appropriate wildlife where assets and performance allow: wild boar, civet, monitor lizard, frogs, butterflies, bats, deer, and freshwater fish; rare dragon sightings remain an optional uncommon fantasy event.
- [ ] Give each animal species a simple species-appropriate behavior set: idle, walk/run, turn, forage/rest, flee or approach, and attack only for clearly hostile species. Avoid identical movement patterns across all species.
- [ ] Replace the primitive models only after confirming model orientation, real-world scale, rig/animation clip names, texture loading, collision bounds, and browser/mobile performance. Keep an unobtrusive fallback if an optional remote asset fails.
- [ ] Wildlife behavior: idle, roam, flee/approach where suitable, simple navigation, and non-blocking collisions.
- [ ] Balance animal counts and animation distance/LOD to preserve frame rate on mobile.

### Ruins, soldiers, caves, loot, and survival props
- [ ] Caves, cave entrances, rock formations, tunnels, hidden chambers, and reliable collision/navigation through them.
- [ ] Treasure chests in varied styles and locations, with readable open/closed states and interaction feedback.
- [ ] Abandoned/decayed soldier camps, damaged military props, and non-graphic fallen/deceased soldier environmental storytelling where appropriate; keep it fictional and consistent with the setting.
- [ ] Sanctuary/temple/ruin locations, weathered structures, broken walls, debris, bones/decay props where appropriate, and environmental storytelling.
- [ ] Realistic rocks, rubble, fallen trees, cliff debris, and breakable/crumbling props only if collision and performance remain stable.
- [ ] Mountain-related tools and weapons that fit the setting: climbing tools, ropes, axes, knives, survival gear, fishing equipment, and other appropriate props. Keep weapon features separate from core traversal until stable.

### Fishing, crafting, and usable objects
- [ ] Fishing rods, lines, hooks, bait, tackle, fishing animations, water contact, catch feedback, and inventory integration.
- [ ] Bait and fishing loot tables for freshwater versus marine areas; do not show a catch unless the interaction actually succeeds.
- [ ] Functional interaction prompts and collision/interaction ranges for chests, tents, tools, huts, fish spots, and landmarks.
- [ ] Reuse suitable open-source interaction, inventory, terrain, navigation, and collision techniques where license and architecture permit; adapt carefully rather than blindly transplanting code.

## P1 — Hero character, realistic animation, and player skins

- [ ] Choose the active hero based on believable human proportions and movement, not appearance alone; avoid a placeholder/prototype fallback.
- [ ] Replace the current male police-uniform model with a realistic wilderness/adventure outfit and review both hero appearances in the actual game. Current source models are `The_Adventurer.glb` and `The_Police_Officer_Nigeria.glb`; do not claim the appearance change is complete until the new model is sourced/generated, license-checked, and visually tested.
- [x] Improve animation clip selection to avoid backward/side-step/limp-like locomotion where a forward walk/run clip is available, and smooth idle/walk/run transitions. Commit `3ea08fbb`; verify on desktop/mobile smoke tests before treating the movement improvement as fully accepted.
- [ ] Research free-to-use character sources (including Mixamo-compatible rigs and CC0/open-license packs); verify commercial-game rights, attribution, redistribution rules, and exact license before integration.
- [ ] Confirm the chosen model's rig/skeleton and animation format are compatible with the current Three.js/GLTFLoader pipeline; document any retargeting or conversion steps.
- [ ] Integrate and test a complete baseline animation set: idle, walk, run/sprint, start/stop/turn, jump, fall/land, crouch if used, swim/surface, dive, climb/use tools, fish, and interact with/open treasure chests.
- [ ] Validate animation blending, foot planting, ground contact, slopes, waterline transitions, camera framing, hitbox/collider dimensions, and respawn; animations must not alter gameplay collision.
- [ ] Test the hero on desktop and narrow Android/mobile viewports; measure model/texture size, load time, frame rate, and memory. Use LOD/compressed textures where appropriate.
- [ ] Build a modular cosmetic-skin system separate from gameplay logic: cosmetic-only materials, outfits, headgear, backpacks, gloves, boots, and accessories must not change hitboxes or give unbalanced advantages.
- [ ] Create original Climboria-themed cosmetic concepts (e.g. Bitcoin-inspired gold/black explorer, Ethereum-inspired violet arcane gear, Solana-inspired gradient techwear, Base-inspired blue expedition kit) without using unauthorized logos or implying official affiliation.
- [ ] Let players preview and customize permitted colors/accessories; define a constrained customization pipeline so arbitrary player designs cannot inject scripts, oversized assets, or unsafe content.
- [ ] Define marketplace/NFT metadata and ownership flow before selling: item name, creator, edition/supply, image/preview, rarity rules, chain/network, minting status, and transfer/trade behavior must match the actual implementation.
- [ ] Do not advertise a skin as an NFT until minting, wallet ownership, marketplace listing/purchase, transfer, royalties/fees, and failure handling are implemented and tested on the intended network.
- [ ] Confirm intellectual-property rights for every skin design; no unlicensed token logos, third-party characters, brand marks, or copied commercial skins.
- [ ] Record model/animation source, exact license, attribution, modifications, performance impact, and test evidence in the asset-source research log.

## P2 — Collision, physics, and controls

- [ ] Terrain ground detection: automated smoke test checks safe dry-ground settling and a multi-point terrain sweep; manual gameplay must still confirm the character never sinks, floats, or snags on invisible surfaces.
- [ ] Reliable collision on slopes, cliff edges, rocks, tree trunks, huts, tents, bridges, cave walls, chests, and props. Current automated coverage does not establish all of these collision cases.
- [ ] Water volumes match visible water; swimming starts/ends consistently; shore transitions work from both sides and along curved river segments. Automated smoke checks river bends and a starting-river exit; broader manual shoreline, riverbed, and prop-collision review remains outstanding.
- [ ] No collision gaps, invisible walls, or false blocks that prevent reaching the riverbank, camp, or intended routes.
- [ ] Desktop controls: WASD, jump, sprint, interact/pickup, camera, pause.
- [ ] Mobile controls: movement, jump, sprint, interaction, camera, swim/dive; all held inputs release on pointer-up, pointer cancellation, lost focus, hidden tab, and lost pointer capture.
- [ ] Respawn returns the player to the intended starting point with a valid grounded position.
- [ ] Automated tests use the actual curved river centerline/terrain geometry; do not loosen assertions just to pass.
- [ ] Add reproducible tests for terrain collision, river entry/exit, props, caves, and mobile control cleanup.

## P2 — Multiplayer communication and social systems

These are planned product requirements, not implemented/verified features until each channel is functional and tested with multiple real clients.

- [ ] **World chat** — shared public chat for players in the world, with message ordering, reconnect handling, rate limits, and basic moderation/reporting.
- [ ] **Nearby chat** — proximity-based messages visible only to players within a defined distance; verify range boundaries and that distant players cannot read messages.
- [ ] **Private chat** — direct messages between two players, clear recipient identity, block/report controls, and safe handling of reconnects.
- [ ] **Party chat** — messages delivered only to current party members; verify joining/leaving and party disband behavior.
- [ ] **Guild chat** — messages delivered only to current guild members; verify membership changes, roles, and permissions.
- [ ] Build the real multiplayer messaging transport/backend and authenticated player identity; do not present local-only UI or simulated messages as online chat.
- [ ] Add timestamps, unread indicators, channel switching, mobile-friendly chat UI, mute/block/report, spam/rate limiting, and message-length limits.
- [ ] Test two or more independent browser sessions for delivery, isolation between channels, reconnects, and abuse controls; document backend/service costs and free-tier limits before choosing a provider.

## P3 — Visual quality, audio, and performance

### Restore the user's original music

- [ ] Restore and use the user's original TRACK_01.mp3 soundtrack from the repository's tracked music asset/history where available; preserve the file unchanged and verify its exact audio identity before replacing any other track.
- [ ] Verify that Jarrell's Peak plays the user's original MP3 soundtrack and that no synthetic/robotic, hoarse-sounding background melody is active. Do not substitute another generated melody.
- [ ] Keep background music separate from synthesized sound effects; preserve independent volume/mute controls and ensure no duplicate tracks play simultaneously.
- [ ] Verify actual playback and audio quality on desktop and Android/mobile, including browser autoplay restrictions, volume sliders, mute/unmute, and track looping. Do not mark complete from code inspection alone.


- [ ] Cohesive premium art direction: believable scale, lighting, terrain materials, vegetation, structures, water, fog, and sky.
- [ ] Realistic ambient weather, forest, wind, river, waterfall, cave, wildlife, footsteps, swimming, fishing, chest, and interaction sounds.
- [ ] Preserve and correctly integrate the user's original music; keep music and sound-effect volume controls independent.
- [ ] Use licensed/free sound assets with attribution records; avoid abrupt, harsh, or repetitive audio loops.
- [ ] Use optimized meshes/textures, compressed formats where supported, instancing, level of detail, culling, and sensible loading.
- [ ] Check asset sizes and loading errors; do not stall the initial scene while loading optional distant assets.
- [ ] Test frame rate, memory, and controls on desktop and representative Android/mobile viewports.
- [ ] Keep HUD readable and map/menus usable on narrow screens.

## P4 — Final product verification

- [ ] Starting camp looks intentional, scenic, and is close to the long river and fishing access.
- [ ] Jarrell’s Peak remains a large, endless-feeling open-world survival and treasure-hunt experience.
- [ ] Treasure exploration, chest interactions, fishing, inventory, swimming, and respawn work together.
- [ ] Keep the agreed menu structure: Jarrell’s Peak, Arena, Marketplace, and Inventory. Only Jarrell’s Peak and Arena are game-world destinations.
- [ ] No prototype hero fallback or retired procedural hero code is reintroduced; active hero assets load correctly.
- [ ] Run syntax/validation checks, desktop smoke tests, mobile smoke tests, and manual live-site checks.
- [ ] Confirm **all required main workflows** are green on the latest relevant commit; record commit SHA and run URLs.
- [ ] Update this checklist with what passed, what failed, the evidence, and the next concrete task.

## Asset-source research log

For every integrated asset or borrowed technique, record:
- Asset/technique name and purpose
- Original GitHub repository and exact source path/release
- License and required attribution
- Files imported and any modifications
- Target location in Climboria
- Collision/interaction implementation notes
- Performance impact and verification status

**Acceptance standard:** a beautiful asset that breaks collision, loading, mobile performance, or the license rules is not ready to ship. Stability first, then quality and variety.


## Visual review and realistic environment asset pass — 2026-10-29

- [x] Reviewed the supplied gameplay video and identified the highest-impact visual gaps: repeated cone-shaped trees, toy-like angular rocks, uniform grass and abrupt shoreline transitions.
- [x] Added a first-pass procedural rock/canopy silhouette improvement in commits `56e9fe37e0bbc8f7f298795c40f22e917d831887` and `1ad4e4cfc7d9c9a5d21e240cb2a71c166464413e`.
- [x] Added a source/license/optimization register for photorealistic Poly Haven rocks and PBR surfaces in `ASSET_SOURCES.md` (commit `e6a2aeb591819b2fcbabe279e05294d6beab5c2e`).
- [ ] Integrate optimized photorealistic rock GLBs and textures; do not count the current procedural meshes as completion of this item.
- [ ] Ground texture/shoreline blending and a sparse desert biome remain outstanding.
- [ ] Inspect camera behavior near large terrain and verify swimming in a real browser/device.
- [ ] Verify all workflows for the latest commit chain before continuing beyond this visual pass.


## Terrain and free mountain/cave asset carry-forward — 2026-10-29

- [ ] Current workflow runs for commit `076e7a6` are still in progress at the desktop/mobile Jarrell gameplay smoke step; do not call them green until they finish. The earlier broad terrain-slope scan was reduced in commit `076e7a680dcdb066477ca30c5deec7d195fe2125`, but this has not yet been verified as a completed run.
- [ ] Evaluate the CC0 Innerscene Mountain Peak GLB and official Kenney Modular Cave Kit; source and collision caveats recorded in `ASSET_SOURCES.md`.
- [ ] Build non-flat, connected terrain using shared visible height data and player grounding/collision, with hills/ridges/gullies/valleys/terraces instead of a mostly level floor.
- [ ] Distribute mountains and cave systems across separate world regions. Imported visual meshes need explicit collision and walkability tests; a free GLB is not automatically climbable.
- [ ] Integrate optimized local assets and test desktop/mobile loading, collisions, and performance before checking off asset integration.


## Latest terrain implementation — 2026-10-29

- [x] Commit `67bf54a4a1fc71846f9dacd7827fb10934ffc729` adds multiple separated terrain ridges and gullies to the Jarrell height field. This is an implementation pass, not yet a verified gameplay acceptance.
- [x] Added CC0 mountain and cave candidates plus explicit collision/optimization caveats to `ASSET_SOURCES.md` (asset research commit `b8a009d9ba1a6efe6abb51172cb30131d41178b6`).
- [ ] Verify latest Validate and Browser Smoke Test runs for `67bf54a`; previous runs for `076e7a6` were stuck at the Jarrell gameplay smoke step when last checked.
- [ ] Confirm visible terrain, player grounding, riverbank/camp, and mobile frame-time after ridge changes before further increasing terrain amplitude.
- [ ] Real CC0 mountain/cave asset files are still candidates only, not integrated; do not mark them complete until local assets and colliders are tested.


## User-requested carry-forward additions — 2026-10-29 (append-only; do not remove older items)

- [ ] **World chat** — add persistent in-game world chat with channels/rooms, message history for the active session, readable mobile layout, moderation/report/mute safeguards, and rate limits. Define the backend/realtime transport and identity rules before claiming multiplayer chat is live; a local-only mock does not count as working global chat.
- [x] **Upper-right compass HUD** — added compass dial/cardinal labels and heading display in `game/play.html` (commit `d64467cbae644f803a57438c5c0607d9561e9df9`). Still requires workflow and real browser orientation verification.
- [x] **Live player coordinates HUD** — added X/Y/Z readout and region grid number below the compass in `game/play.html` (same commit). Y uses the shared terrain-height query; verify coordinate signs, swimming/airborne behavior, and region boundaries in-game.
- [ ] **HUD layout regression** — confirm compass and coordinates stay upper-right, don't cover the map/menu, remain legible on Redmi/mobile widths, and update smoothly without per-frame DOM churn.
- [ ] **Append-only checklist rule** — preserve previous completed/incomplete history; only remove or change an item when the user explicitly asks. New scope is added as dated entries, not used to replace older requirements.


## Workflow verification — 2026-10-29 (compass/coordinate HUD regex fixes)

- [x] Validate Climboria passed on commit `2c41c0a17334b49e1da33a25d6398d6cd9d8a4b6`: [run 40806645023](https://github.com/CryptoDilis/Climboria/actions/runs/40806645023).
- [x] Browser Smoke Test passed on the same commit, including the desktop/mobile compass-heading and coordinate smoke assertions: [run 40806644929](https://github.com/CryptoDilis/Climboria/actions/runs/40806644929).
- [x] GitHub Pages build and deployment passed: [run 40806644779](https://github.com/CryptoDilis/Climboria/actions/runs/40806644779).
- [x] Scheduled live-site smoke test passed on the same commit: [run 40825462789](https://github.com/CryptoDilis/Climboria/actions/runs/40825462789).
- [x] The earlier failures on `ac4878f` were test-regex escaping defects (region format and heading degrees), not a reported gameplay runtime failure; corrected in commits `ac4878f` and `2c41c0a`, then all four checks above passed.
- [ ] Manual visual validation of compass orientation, coordinate correctness while walking/swimming/airborne, and region boundary transitions remains open; automated smoke checks alone do not establish those behaviors.
- [ ] Continue with camera/terrain line-of-sight, collision, swimming, and performance checks below; green workflows do not mean the full Jarrell’s Peak checklist is complete.


## Workflow verification — 2026-10-29 (follow-camera terrain line-of-sight regression)

- [x] Validate Climboria passed on commit `19d46b108f56655a909cd16b8c7c31685da87e35`: [run 40826309354](https://github.com/CryptoDilis/Climboria/actions/runs/40826309354).
- [x] Browser Smoke Test passed on the same commit, including the new 16-sample terrain line-of-sight clearance assertion: [run 40826309272](https://github.com/CryptoDilis/Climboria/actions/runs/40826309272).
- [x] GitHub Pages build and deployment passed on the same commit: [run 40826309148](https://github.com/CryptoDilis/Climboria/actions/runs/40826309148).
- [x] Inspected the latest job summaries; all three workflows completed successfully with no failed steps.
- [ ] Manual camera sightline and compass/coordinate visual validation remains open; automated tests do not prove visual quality across devices.
- [ ] Continue the next gameplay blocker: complete the remaining environment collision coverage, then test actual terrain/water transitions and benchmark desktop/mobile performance.


## Follow-up verification — 2026-10-29 (checklist documentation deployment)

- [x] The checklist-record commit `d43654106fe083a6698ed1ad1cd1ceab1eb5163e` deployed successfully: [Pages run 40826931236](https://github.com/CryptoDilis/Climboria/actions/runs/40826931236).
- [x] Confirmed all jobs for that deployment (build, deploy, report-build-status) completed successfully with no failed steps.
- [ ] Next collision acceptance work remains: add/verify specific regressions for cave walls, carts/buildings and root/rock boundaries; current smoke tests already cover tents, trees, bushes, fallen logs and large rocks.


## Latest workflow verification and next collision pass — 2026-10-29

- [x] Fixed the stale loot-HUD assertion in smoke tests in commit `4d995583216e7da7d70a05194811ee3a9bdc8f63`; the test now asserts that the contextual chest prompt initializes while the retired permanent loot HUD remains absent.
- [x] Validate Climboria passed on that commit: [run 40828508414](https://github.com/CryptoDilis/Climboria/actions/runs/40828508414).
- [x] Browser Smoke Test passed on that commit: [run 40828508215](https://github.com/CryptoDilis/Climboria/actions/runs/40828508215).
- [x] GitHub Pages build and deployment passed on that commit: [run 40828507963](https://github.com/CryptoDilis/Climboria/actions/runs/40828507963).
- [x] Rechecked the latest workflow list after completion; all three required workflows above are green for the same commit.
- [ ] Next implementation task: expand collision regressions to cover roots, cave walls/entrances, carts and buildings where those collider types actually exist; do not fabricate collider fixtures that do not match the live world.
- [ ] Keep manual browser verification open for contextual prompt range/flashing, compass orientation, coordinate updates, water/shore transitions, and mobile rendering.


## 2026-10-29 — latest workflow check and collision regression
- [x] Reviewed latest main-branch workflow results: latest Pages deployment on `1475d7e` succeeded; Validate and Browser Smoke Test both succeeded on gameplay commit `4d995583`.
- [x] Confirmed the earlier failures on `39325ef` were caused by a stale smoke assertion expecting the removed permanent loot HUD; fixed in `4d995583` and verified both test workflows green.
- [x] Added automated regression coverage for campsite supply-crate collision (center must block; point outside radius must remain clear), commit `3643916f`.
- [ ] Verify Validate, Browser Smoke Test, and Pages deployment after `3643916f` completes.
- [ ] Next collision pass: cave entrance/wall and quartermaster cart/forge props; inspect actual geometry and spawn clearance before adding colliders so the cave/cart do not become invisible walls.


## 2026-10-29 — compact navigation HUD
- [x] Combined current location (live X/Y/Z coordinates and region grid) into the compass card so navigation reads as one compact upper-right HUD instead of separate cards; commit `eec29c80`.
- [ ] Verify combined compass/location card spacing and legibility on desktop and mobile after workflow checks.


## 2026-10-29 — swimming-stroke verification and next collision pass

- [x] Latest swimming-stroke/procedural-fallback commit `c95aa1fb542687399b17a6d4c3e1c38ae1846740` passed Pages deployment: [run 40872708005](https://github.com/CryptoDilis/Climboria/actions/runs/40872708005).
- [x] Validate Climboria passed for `c95aa1fb`: [run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617).
- [x] Browser Smoke Test passed for `c95aa1fb`: [run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Confirmed all three required workflows green on the same commit; no failure diagnosis or corrective fix was needed.
- [ ] Next implementation: expand collision regression coverage for the actual quartermaster cart/forge and cave entrance geometry. Inspect the live colliders and spawn clearance before asserting blocks, to avoid invisible-wall regressions.
- [ ] Continue manual visual validation of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and collision audit
- [x] Latest Pages deployment for commit `3b00611c` completed successfully: [run 40873779446](https://github.com/CryptoDilis/Climboria/actions/runs/40873779446).
- [x] Confirmed Validate Climboria and Browser Smoke Test passed on the swimming-stroke gameplay commit `c95aa1fb`: [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617) · [Browser Smoke](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656).
- [x] Audited the quartermaster cart/forge meshes: they are level-01 scene props, while the Jarrell obstacle grid and its smoke API are level-11-only; do not reuse that grid blindly for level 01.
- [ ] Trace level-01 movement, terrain, and collision handling before implementing cart/forge blockers and regression tests.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — latest workflow verification and level-01 collision diagnosis
- [x] Latest Pages deployment for documentation commit `851b9875` completed successfully: [run 40874296037](https://github.com/CryptoDilis/Climboria/actions/runs/40874296037).
- [x] Previous gameplay commit `c95aa1fb` remains green on Validate Climboria ([run 40872707617](https://github.com/CryptoDilis/Climboria/actions/runs/40872707617)) and Browser Smoke Test ([run 40872707656](https://github.com/CryptoDilis/Climboria/actions/runs/40872707656)).
- [x] Confirmed no current failed workflow runs in the latest 15-run audit; older runs on `9df7a5f0` and `21c5d3ad` were cancelled by newer commits, not failures.
- [x] Collision root-cause audit: level-01 quartermaster cart and forge are visible scene meshes with no registered blockers; the existing `hitsJarrellObstacleAt` collision grid intentionally returns false outside level 11, so it cannot protect the level-01 props.
- [ ] Implement level-01 camp-prop collision through a level-01-specific, spawn-safe collider path and expose a smoke-test API for cart/forge inside/outside checks before marking this fixed.
- [ ] Continue visual checks of swimming stroke, waterline, and river exits for both hero appearances on desktop/mobile.


## 2026-10-29 — Dota-style click movement
- [x] Implemented a desktop mouse-left-click destination input for Jarrell’s Peak in `game/play.html`; it raycasts the clicked scene point and steers the hero toward it.
- [x] Kept WASD and existing touch joystick input available; right-click camera orbit clears the click destination.
- [x] Click movement yields to active keyboard/joystick input and clears the target when reached or when movement is fully blocked by collision.
- [ ] Add a focused browser regression that clicks a safe ground target and confirms the hero moves toward it without breaking WASD, camera orbit, or mobile controls.
- [ ] Verify the gameplay commit `8d4a5e1fdc486eaf8c560cd2d33352b3ebcb5c6c`: Validate Climboria [run 40875751783](https://github.com/CryptoDilis/Climboria/actions/runs/40875751783), Browser Smoke Test [run 40875751854](https://github.com/CryptoDilis/Climboria/actions/runs/40875751854), and Pages deployment [run 40875751653](https://github.com/CryptoDilis/Climboria/actions/runs/40875751653) were in progress at last inspection; do not mark green until each conclusion is confirmed.
- [ ] Manual desktop gameplay check: left-click walk destination, redirect mid-walk, obstacle collision/slide, water entry and swimming, and verify no click movement when interacting with HUD/UI.


## 2026-10-29 — latest workflow verification and sanctuary collision

- [x] Latest pre-change commit `52f4e00b9fc6909026438c70c1c05df08c01d3ed`: Validate Climboria passed [run 40883620373](https://github.com/CryptoDilis/Climboria/actions/runs/40883620373), Browser Smoke Test passed [run 40883620364](https://github.com/CryptoDilis/Climboria/actions/runs/40883620364), and Pages deployment passed [run 40883620095](https://github.com/CryptoDilis/Climboria/actions/runs/40883620095).
- [x] Added a vertical-aware collider for the sanctuary shrine structure in `game/play.html`, commit `5e27799d`.
- [x] Added browser regression checks for shrine center blocking, clear space outside its radius, and clear space above its vertical bounds, commit `6dfb7058`.
- [ ] Verify the latest shrine-collision code and regression test on Validate Climboria, Browser Smoke Test, and Pages; do not mark complete until all three runs are green.
- [ ] Continue collision audit for exposed roots and remaining built structures/cart geometry using actual mesh placement and spawn-safe tests.
- [ ] Manual live-site gameplay review remains outstanding for click-to-move, collision feel, swimming pose/waterline, and river exit.


## 2026-10-31 — post-PR #119 verification and collision audit

- [x] PR #118 swimming diagnostics export fix merged; its PR validation and browser smoke checks passed.
- [x] PR #119 added bounded collision regressions for the Sakura park swing and hammock; PR Validate and Browser Smoke Test passed before merge.
- [x] Post-merge main Validate passed: [run 41165173473](https://github.com/CryptoDilis/Climboria/actions/runs/41165173473).
- [x] Post-merge main Browser Smoke Test passed: [run 41165173480](https://github.com/CryptoDilis/Climboria/actions/runs/41165173480).
- [x] Post-merge GitHub Pages build, status report, and deployment passed: [run 41165173417](https://github.com/CryptoDilis/Climboria/actions/runs/41165173417).
- [x] Re-audited current main code and browser smoke assertions: exposed tree roots have inside/outside/vertical-bound checks; cart and forge have bounded collision checks; cart handles have isolated boundary checks; cave-mouth flank stones, cave torches, shrine, park swing and hammock have targeted checks.
- [ ] Do not treat these targeted checks as proof that every cave wall, terrain edge, building, slope, or shoreline is collision-safe. Continue only with uncovered real geometry and player-movement tests.
- [ ] Next gameplay priority remains the unresolved swimming visual/physics acceptance: face-down natural swim pose for both hero rigs, correct waterline/buoyancy, and reliable riverbank exit. Diagnostics export is not visual proof.
- [ ] Manual live-site gameplay review remains outstanding for swim pose, waterline, river exit, click-to-move feel, and collision behavior on desktop and Android.


## 2026-10-31 — cave traversal and water-exit audit

- [x] Rechecked latest main workflows on `e8802e7f5941c0c604eb2ec270b1d74b0b979192`: Validate, Browser Smoke Test, and Pages deployment all completed successfully.
- [x] Audited the current western cave scene: it contains a dark circular backdrop, decorative stone arch/flank rocks, two warm-lit entrance torches, snakes, and a twelve-paver approach trail.
- [ ] Cave traversal is NOT complete: current scene evidence does not establish a navigable tunnel/interior, continuous cave-wall collision, trapped cave route, or interior exploration. Implement an actual cave passage and bounded wall/ceiling/floor collision before marking cave exploration complete.
- [x] Audited water-state logic: river/ocean swimming is selected from horizontal water bounds; surface and dive controls adjust player height, and movement state is damped on water transitions.
- [ ] Automated water checks currently establish river depth, shallow shore shelf, and ocean basin geometry, but do not yet prove a player can swim to both banks, transition to land without sticking/falling, or exit from the sea. Add deterministic movement-level regressions for both riverbanks and sea shore; keep visual/manual acceptance open.
- [ ] Do not mark cave traversal or shore-exit gameplay complete based only on green workflow runs or static terrain measurements.


## 2026-10-31 — female swim orientation and mountain collision pass

- [x] Rechecked the latest workflow history before gameplay changes; the prior cave-test commits were superseded by newer commits, not recorded as code failures.
- [x] Corrected the female adventurer's swim pitch independently from the male rig: female appearance now uses the opposite local X pitch so the intended prone orientation is restored; male pitch remains unchanged.
- [x] Added bounded collision volumes for the three large scenic mountain massifs and their foreground crags on Jarrell's Peak; movement collision now checks these volumes alongside existing cliff colliders.
- [x] Exposed mountain blocker diagnostics to the browser smoke harness.
- [x] Added a regression for mountain massif blocking, outside-radius clearance, and vertical clearance.
- [ ] Automated Validate, Browser Smoke Test, and Pages deployment for commit `ec89771e` are still running at the time of this entry; verify all three before marking this pass green.
- [ ] Visually verify female face-down swimming in the live game on desktop and Android; automated pitch-sign checks are not visual acceptance.
- [ ] Test mountain contact from multiple approach directions and verify players cannot bypass the massif blockers through their edges or climb over the scenic ridge volume.
- [ ] Audit streamed terrain collision separately from scenic ridge collision; the heightfield sweep still needs movement-level acceptance across steep mountain faces.


## 2026-10-31 — formatted Game Concept and return to gameplay

- [x] Added a responsive, formatted Game Concept page at `/game-concept.html` so the public concept is readable on mobile and desktop; retained `GAME_CONCEPT.md` as the editable Markdown source.
- [x] Main commit `097adaf1adecf83077b0e010e5998ec63a388b9a` passed Validate (run 41196386620) and GitHub Pages build/deployment (run 41196386458).
- [x] Latest gameplay commit `a5cca05684438b69f32d8460669ff173de56838c` passed Validate (run 41195282196), Browser Smoke Test (run 41195282118), and Pages deployment (run 41195281763).
- [ ] Browser Smoke Test has not yet been rerun for the documentation-only commit; gameplay code is unchanged.
- [ ] Return to P0 gameplay acceptance: manually verify both male and female face-down swimming posture, waterline/buoyancy, riverbank exit, and mountain collision from multiple approach directions on desktop and Android.
- [ ] Automated green status is not visual acceptance; do not mark these player-experience checks complete until directly verified.


## 2026-11-01 — freshwater stone collision audit repair

- [x] Inspected failed Validate run [41244811813](https://github.com/CryptoDilis/Climboria/actions/runs/41244811813) and Browser Smoke Test run [41244811799](https://github.com/CryptoDilis/Climboria/actions/runs/41244811799) on `88c55c5e`. Homepage structure, copy, JavaScript syntax checks and Pages deployment passed; both gameplay jobs failed during the freshwater stone collision boundary regression.
- [x] Root cause confirmed from job logs and `.github/scripts/game-smoke.mjs`: the stone boundary audit called the global `testObstacleCollision()` helper, so nearby unrelated colliders could be counted as a hit outside the target stone. The per-collider helper `testObstacleCollider()` is the correct isolated assertion.
- [x] Repaired the audit to call `testObstacleCollider(item, ...)` for both center and outside-radius samples. Fix commit: `82a3267e66cf0e0ae12d5f69eef82d74125902c0`.
- [x] GitHub Pages deployment passed for fix commit `82a3267e` (run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767)).
- [ ] Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793) and Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794) were still in progress when this checkpoint was written; recheck final conclusions after this checklist commit.
- [ ] Next task: perform movement-driven shoreline tests at Woodland Pond, Moonpool and Sanctuary Lake—approach stones from multiple directions, enter/exit water across each bank, verify the player cannot clip through solid stones, and confirm reeds remain pass-through. Keep visual/manual desktop and Android acceptance open.
- [ ] Fishing integration remains deferred until pond shoreline movement and collision are stable.


## 2026-11-01 — movement-driven freshwater shoreline collision regression

- [x] Previous freshwater collider repair fully verified: Browser Smoke Test run [41245529794](https://github.com/CryptoDilis/Climboria/actions/runs/41245529794), Validate run [41245529793](https://github.com/CryptoDilis/Climboria/actions/runs/41245529793), and Pages deployment run [41245529767](https://github.com/CryptoDilis/Climboria/actions/runs/41245529767) all passed on `82a3267e`.
- [x] Added a movement-level browser regression that approaches all 5 Woodland landing stones and all 13 Moonpool rim stones using the real player movement controller, then asserts movement occurred and the player stopped outside the collider boundary.
- [x] Movement regression commit: `4effb52a20e8496dc656bda54a17bbf75b27af8f`.
- [x] Browser Smoke Test passed on this commit: run [41246472175](https://github.com/CryptoDilis/Climboria/actions/runs/41246472175).
- [x] Pages deployment passed on this commit: run [41246472274](https://github.com/CryptoDilis/Climboria/actions/runs/41246472274).
- [ ] Validate Climboria run [41246472199](https://github.com/CryptoDilis/Climboria/actions/runs/41246472199) is still in progress; confirm its final result before considering the full CI set green.
- [ ] Next task: audit Sanctuary Lake perimeter rocks and shoreline route; currently the lake perimeter rocks are decorative placements and need an explicit collision decision/test. Then extend real movement tests to the Sanctuary Lake edge and verify water entry/exit.
- [ ] Manual desktop and Android visual gameplay acceptance remains open; automated movement regressions are not a substitute for real-device inspection.
- [ ] Fishing integration remains deferred until all three freshwater shorelines are traversable and stable.


## 2026-11-01 — Sanctuary Lake shoreline collision pass

- [x] Audited Sanctuary Lake's 32 visible perimeter rocks; the prior implementation placed decorative rocks only and did not register dedicated obstacle colliders.
- [x] Added terrain-aligned `freshwater-sanctuary-rim-rock` colliders for all 32 rocks while retaining the existing ring spacing/gaps. Gameplay commit: `4e750ec1965f455b0167222c5d79c9dd01b72179`.
- [x] Extended isolated collider boundary checks and movement-driven player approach tests to include all 32 Sanctuary Lake rocks, alongside Woodland Pond (5) and Moonpool (13). Test commit: `fcb8a73baa5db16c64b26306aed5a73eba030c75`.
- [ ] Validate Climboria run [41247232083](https://github.com/CryptoDilis/Climboria/actions/runs/41247232083), Browser Smoke Test [41247232104](https://github.com/CryptoDilis/Climboria/actions/runs/41247232104), and Pages deployment [41247232546](https://github.com/CryptoDilis/Climboria/actions/runs/41247232546) are still in progress at this checkpoint; do not treat this change as CI-verified until all complete successfully.
- [ ] Inspect real gameplay around Sanctuary Lake to confirm shoreline gaps feel walkable, rocks visibly match their collision footprints, and entry/exit/swimming transitions remain natural on desktop and Android.
- [ ] After green workflows, continue the three-lake shoreline approach-angle and water-entry/exit audit; defer fishing integration until traversal is stable.


## 2026-11-01 — Freshwater approach-gap regression coverage

- [x] Confirmed Sanctuary Lake collision implementation and prior CI: Validate run `41247232083`, Browser Smoke Test run `41247232104`, and Pages deployment run `41247281088` all passed on the preceding checkpoint.
- [x] Added an angular-gap audit to the browser smoke suite. It sorts each lake's shoreline colliders by angle and checks the midpoint of every consecutive stone pair for a clear approach point; covers Woodland Pond, Moonpool, and Sanctuary Lake.
- [x] Test commit: `9f1660ea47be91516add3565ccb82dea79e3b8a0`.
- [ ] Latest Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296), Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256), and Pages deployment [41248315729](https://github.com/CryptoDilis/Climboria/actions/runs/41248315729) are queued/running; no pass/fail claimed yet.
- [ ] If angular-gap audit fails, diagnose the specific shoreline collider arrangement and adjust spacing/colliders while preserving visible rocks and swimming access.
- [ ] Manual desktop/Android review remains open; automated midpoint clearance is not a substitute for playing the approach paths.
- [ ] Next after green CI: add controlled movement-driven water entry/exit approach tests through the clearest gaps, then proceed to fishing integration only after traversal feels stable.


## 2026-11-01 — Freshwater gap-audit false positive correction

- [x] Diagnosed failed Validate run [41248316296](https://github.com/CryptoDilis/Climboria/actions/runs/41248316296) and Browser Smoke Test [41248316256](https://github.com/CryptoDilis/Climboria/actions/runs/41248316256): both failed in the shared Jarrell browser smoke scenario because the new test treated Woodland Pond's five landing stones as a closed circular ring and projected angular midpoints onto a radius. The stones are actually an open, near-linear landing row, so that geometry generated invalid sample points and false blocked-gap failures.
- [x] Corrected the audit to test Cartesian midpoints between actual neighboring collider centers; Woodland Pond now tests its four open-row gaps without an artificial wraparound pair, while Moonpool and Sanctuary Lake retain closed-ring checks.
- [x] Test correction commit: `a7b8d449ac8f5d465b5d73ff2d7ae0ed09d08e04`.
- [ ] Validate and Browser Smoke Test reruns for the correction are pending; do not mark CI green until both pass.
- [ ] After CI, continue movement-driven entry/exit checks through real gaps. Manual desktop/Android review remains outstanding.


## 2026-11-01 — Woodland Pond landing access spacing correction

- [x] Follow-up CI diagnosis on Validate run [41249142801](https://github.com/CryptoDilis/Climboria/actions/runs/41249142801) and Browser Smoke Test [41249142795](https://github.com/CryptoDilis/Climboria/actions/runs/41249142795): the corrected Cartesian midpoint audit showed all four Woodland Pond landing-row gaps were blocked by the effective player/collider footprint; Moonpool (13/13) and Sanctuary Lake (32/32) gaps passed.
- [x] Increased Woodland Pond landing-stone center spacing from 1.65 to 2.3 world units while retaining five stones, their collider radius, and the same shoreline row. Gameplay commit: `3b23a6442acc81b3e0d4590089f4ab798b6ce106`.
- [ ] Validate and Browser Smoke Test for the spacing correction are pending; no green status claimed yet.
- [ ] After green CI, add movement-driven water entry/exit through the widened Woodland Pond gaps and representative gaps at Moonpool and Sanctuary Lake.
- [ ] Manual desktop/Android visual review remains outstanding; verify the widened stone row still looks natural and is accessible in actual play.


## 2026-11-01 — freshwater movement entry/exit regression verified green

- [x] Rechecked latest `main` HEAD: `e3a46183179635d3e13696a4c3d44586497686b1`.
- [x] Diagnosed the prior freshwater exit regression as a movement-test timing issue: the return leg could continue through the pond before the swimming state cleared. Updated the test to wait for the actual `window.jarrellSwimming` transition with a bounded deadline rather than relying on a short fixed wait.
- [x] Regression-test commit: `e3a46183179635d3e13696a4c3d44586497686b1` (`.github/scripts/game-smoke.mjs`).
- [x] Validate Climboria passed: [run 41252879416](https://github.com/CryptoDilis/Climboria/actions/runs/41252879416). Inspected all job steps; homepage structure, token copy, script syntax audits, desktop/mobile Jarrell smoke, and screenshot upload all succeeded.
- [x] Climboria Browser Smoke Test passed: [run 41252879249](https://github.com/CryptoDilis/Climboria/actions/runs/41252879249). Inspected all job steps; homepage controls, DEX modal, mobile navigation, and Jarrell desktop/mobile gameplay smoke all succeeded.
- [x] GitHub Pages build and deployment passed: [run 41252878821](https://github.com/CryptoDilis/Climboria/actions/runs/41252878821). Build, status report, and deploy jobs all succeeded.
- [ ] Manual desktop/Android review remains open for actual waterline alignment, natural swimming posture/strokes, shoreline gap feel, and player movement around all three freshwater bodies. CI proves the automated regression, not visual acceptance.
- [ ] Fishing interaction remains deferred until hands-on shoreline traversal is accepted.
- [ ] Next exact task: inspect the latest desktop/mobile gameplay screenshots and, where possible, manually playtest Woodland Pond, Moonpool, and Sanctuary Lake entry/exit. Then proceed to freshwater fishing only if traversal is stable.


## 2026-11-01 — CI duplication removed; shoreline regression verified

- [x] Rechecked the west-ocean shoreline regression: Browser Smoke Test run [41270649779](https://github.com/CryptoDilis/Climboria/actions/runs/41270649779) passed on gameplay commit `d92a30e030f98d5c564bf05c8ffd27bd899f2b5f`. The movement-driven test requires the player to enter swimming inside the sea, move across the west water boundary under player control, leave swimming state, and settle within the dry-ground clearance range.
- [x] Validate run [41270649827](https://github.com/CryptoDilis/Climboria/actions/runs/41270649827) and Pages deployment [41270649596](https://github.com/CryptoDilis/Climboria/actions/runs/41270649596) passed on the same gameplay commit.
- [x] Removed the duplicate full Playwright install/gameplay run from `.github/workflows/validate-climboria.yml`; Validate retains homepage, token-copy, script-syntax, and duplicate-ID checks. Full desktop/mobile gameplay assertions remain in the dedicated Browser Smoke workflow.
- [x] CI optimization commit: `965becdcdcd5288a72afc22f92538be4d0e3e1b9`.
- [x] Validate after optimization passed: [run 41271895495](https://github.com/CryptoDilis/Climboria/actions/runs/41271895495); all remaining validation steps succeeded without Playwright installation/gameplay duplication.
- [x] Pages deployment after optimization passed: [run 41271895304](https://github.com/CryptoDilis/Climboria/actions/runs/41271895304).
- [ ] Browser Smoke was not triggered by the workflow-file-only change; the gameplay source and browser smoke script are unchanged from the green `d92a30e` run. Re-run full Browser Smoke on a later gameplay/test change.
- [ ] Manual desktop/Android visual acceptance remains open for ocean and freshwater shorelines, sandbeds, mountain collision approaches, and face-down swimming posture. Automated checks are not visual acceptance.
- [ ] Next exact task: inspect retained desktop/mobile gameplay and freshwater screenshots; verify sea/beach, river/lake shorelines and swim posture visually before adding freshwater fishing.


## 2026-11-01 — latest main verification checkpoint (commit 488375cfc5e8885e194574e1c2cfe63f4ccc7483)

- [x] Validate Climboria passed: run [41290710864](https://github.com/CryptoDilis/Climboria/actions/runs/41290710864).
- [x] GitHub Pages build and deployment passed: run [41290710930](https://github.com/CryptoDilis/Climboria/actions/runs/41290710930).
- [x] Browser smoke passed on desktop and mobile: run [41290710942](https://github.com/CryptoDilis/Climboria/actions/runs/41290710942); job 124801191342 completed successfully.
- [x] Screenshot artifact uploaded: `climboria-browser-smoke-screenshots`, artifact 13076803732 (7-day retention; expires 2026-11-08).
- [x] Desktop left-click movement regression: destination created and movement alignment measured 1.0.
- [x] Mountain movement/collision: uphill traversal, massif face stop, no penetration, and sliding along face passed.
- [x] Water cleanup: shoreline/seabed audit passed for sea, river, Woodland Pond, Moonpool, and Sanctuary Lake; 94 loaded nature meshes audited with zero water-placement hits.
- [x] Swim automation: procedural swim pose moved arms and legs for both tested character appearances; desktop/mobile swim depth, shore exit, and touch-input cleanup assertions passed.
- [x] Cave/trap/snake, mountain massifs, respawn, and mobile compass/coordinate assertions passed.
- [ ] Manual visual acceptance is still required on real desktop and Android hardware. CI does not establish visual quality, natural swimming appearance, full-world collider correctness, or real-device performance.
- [ ] World-scale expansion remains open: scattered mountain ranges, large biomes, aquatic life and functional fishing, eight coastal docks, expanded sakura park, forest/desert scale-up, and broad world geography.
- [ ] Next task: inspect the uploaded desktop/mobile/freshwater screenshots and continue the world-scale expansion from the highest-priority unfinished item. Preserve all earlier requirements and caveats.


## 2026-11-01 — Mountain approach collision threshold pass

- [x] Adjusted the terrain collision slope threshold from 2.6 to 3.8 and maximum step-up from 2.1 to 2.8 world units in `game/play.html`, allowing steeper natural mountain approaches while retaining near-vertical face and ledge blocking. Gameplay commit: `2125af914ba69b3958c8f3de860a5cdc6469cb37`.
- [x] Validate Climboria passed: [run 41319001106](https://github.com/CryptoDilis/Climboria/actions/runs/41319001106).
- [x] Browser Smoke Test passed, including Jarrell's Peak desktop/mobile gameplay: [run 41319000999](https://github.com/CryptoDilis/Climboria/actions/runs/41319000999).
- [x] GitHub Pages build and deployment passed: [run 41319001031](https://github.com/CryptoDilis/Climboria/actions/runs/41319001031).
- [ ] Manual acceptance remains open: approach the major mountain faces and paths on desktop and Android; confirm there are no invisible blockers, excessive collider radii, terrain penetration, or abrupt stops. CI success does not prove the mountain feels traversable in live play.
- [ ] Next exact task: audit generated mountain/rock collider footprints against visible geometry and intended approach paths. Keep this focused; do not change unrelated gameplay systems.


## 2026-11-02 — current playable-source freshwater audit (main `3e39005`)

- [x] Re-read the actual deployed gameplay entry point `game/play.html` and its browser smoke harness on current `main`.
- [x] Confirmed the current playable terrain defines one procedural river channel and an ocean basin in `rawH()`; swimming is currently driven by the single `groundAt(x,z) < -1.4` threshold and a fixed `swimSurface = 1.72`.
- [x] Confirmed the current `game/play.html` does **not** contain a freshwater-body registry or the previously documented Woodland Pond, Moonpool, and Sanctuary Lake runtime objects. The smoke harness likewise has no pond-specific movement assertions. Earlier checklist entries describing those three bodies and their passed tests are historical notes from an earlier source state and must not be treated as current implementation evidence.
- [x] Confirmed current fishing is a single coastal `FAC` interaction near the west shore; it is not connected to freshwater ponds or riverbank spots.
- [ ] P0: implement an explicit water-body registry (river, ocean, and distinct freshwater bodies) with per-body surface height, depth/bounds, biome metadata, and deterministic query helpers; do not fake freshwater by labeling flat ground as a pond.
- [ ] P0: integrate player swim state and buoyancy with the active water body's actual surface elevation while preserving current river/ocean behavior; verify approach, entry, swimming, dive, exit, and dry-land recovery.
- [ ] P0: add deterministic desktop and mobile browser regressions for every registered freshwater body, including shore collision and passable approach gaps.
- [ ] P1: only after the above is stable, add freshwater fishing spots and catch tables separately from coastal fishing.
- [ ] Manual desktop/Android visual acceptance remains open. No pond system, pond fishing, or manual water visual acceptance is claimed complete by this audit.


## 2026-11-02 — verified freshwater and Sakura Park increments on current main

- [x] Merged PR [#133](https://github.com/CryptoDilis/Climboria/pull/133): added a current-main water-body registry for Woodland Pond, Moonpool, Sanctuary Lake, the Long River, and Open Sea; carved three freshwater basins into procedural terrain; added point lookup and water-surface-driven swimming.
- [x] Merged PR [#134](https://github.com/CryptoDilis/Climboria/pull/134): exposed the existing player movement controller to the browser test harness; added movement-driven freshwater entry/exit checks for all three basins and explicit river/ocean query assertions.
- [x] PR #133 browser smoke passed on head `27366c4` (run [41331590649](https://github.com/CryptoDilis/Climboria/actions/runs/41331590649)); Validate passed on the same feature batch (run [41331590635](https://github.com/CryptoDilis/Climboria/actions/runs/41331590635)).
- [x] PR #134 browser smoke passed (run [41331995947](https://github.com/CryptoDilis/Climboria/actions/runs/41331995947)); Validate passed (run [41331995955](https://github.com/CryptoDilis/Climboria/actions/runs/41331995955)).
- [x] Merged PR [#135](https://github.com/CryptoDilis/Climboria/pull/135): added two timber swing frames, two cloth hammocks, and collision records for their support posts/seats in Sakura Park.
- [x] PR #135 browser smoke passed (run [41332291635](https://github.com/CryptoDilis/Climboria/actions/runs/41332291635)); Validate passed (run [41332291628](https://github.com/CryptoDilis/Climboria/actions/runs/41332291628)).
- [ ] Current-main post-merge checks for commit `5feab1c` are still running at this checkpoint: Browser Smoke [41332464567](https://github.com/CryptoDilis/Climboria/actions/runs/41332464567), Validate [41332464541](https://github.com/CryptoDilis/Climboria/actions/runs/41332464541), Pages [41332465039](https://github.com/CryptoDilis/Climboria/actions/runs/41332465039). Recheck these exact runs before calling current main green.
- [ ] Manual desktop/Android acceptance remains open: confirm pond waterline/visual alignment, natural entry/exit, depth feel, bank collision, and the park swing/hammock placement. The swings/hammocks are decorative and are not yet animated or interactable.
- [ ] Freshwater fishing, expanded shore geometry, water-edge vegetation cleanup, and larger park/forest/desert/mountain scale remain open. Do not infer them from the registry or park fixtures.
- [ ] Next exact task: inspect current post-merge browser screenshots, then audit water-edge geometry and shoreline access before adding freshwater fishing. Continue the remaining world-scale checklist without deleting deferred requirements.


## 2026-11-02 — freshwater fishing interaction milestone

- [x] Merged PR [#137](https://github.com/CryptoDilis/Climboria/pull/137): added three freshwater bank fishing landmarks (Woodland Pond, Moonpool, Sanctuary Lake) while retaining the separate open-sea fishing point.
- [x] Fishing now records the active water-body ID and selects separate freshwater and marine catch tables; successful timed catches enter the existing inventory and emit the fish event.
- [x] Added smoke checks that start fishing at all four spots and verify each spot uses its expected water-body ID.
- [x] First smoke attempt failed because the test harness temporarily changed the cinematic player's mode to `walk` and did not restore it; fixed the harness to restore the original mode after each interaction. This was a test-state leak, not a game runtime failure.
- [x] Corrected Browser Smoke Test passed on head `2d2a0e9`: [run 41332835081](https://github.com/CryptoDilis/Climboria/actions/runs/41332835081); Validate passed: [run 41332835098](https://github.com/CryptoDilis/Climboria/actions/runs/41332835098).
- [ ] Rod/line/bait models and animations, cast/reel timing, catch-specific feedback, eight coastal docks, and manual fishing acceptance remain open.
- [ ] Manual desktop/Android acceptance remains open for the three freshwater piers, player approach, collision, visible waterline, and actual catch flow.
- [ ] Next exact task: improve swim depth controls and waterline/shore transitions per water-body depth, then continue coastal dock expansion and broader world scale. Keep snakes and all wildlife disabled per the latest temporary instruction.


- [x] Replace procedural low-poly 2D/primitive forest tree stand-ins with CC0 3DAssets.dev GLB canopy models (Jungle Canopy Tree + Buttress Root Tree); preserve 3D undergrowth/log dressing and rock placement.
- [ ] Manually verify tree scale, ground contact, canopy density, collision clearance, CDN loading and mobile frame-time on desktop and Redmi 14 5G.


## 2026-11-02 — mountain approach collision audit (diagnostic increment)

- [ ] Expose the existing movement collision predicate and its configured slope/player/step limits to the browser smoke harness; no gameplay collision values are changed in this diagnostic pass.
- [ ] Add eight deterministic radial approach probes toward the summit, starting 150 world units away and measuring progress toward an 85-unit perimeter; record the exact first blocked coordinate/terrain height for each bearing.
- [ ] Use the probe results to identify whether the reported early blocker comes from terrain slope/step limits or authored circular prop colliders; then make a narrowly targeted fix and add a regression assertion for the corrected approach.
- [ ] Do not loosen all mountain collision globally or remove legitimate rock/tree/structure collision without evidence.
- [ ] Manual desktop and Redmi 14 5G approach/climb acceptance remains open.


## 2026-11-02 — spawn-to-summit route collision probe

- [ ] Add a deterministic collision trace along the actual starting-area-to-summit route; the earlier eight radial probes only checked the final 65 m approach ring and did not test the long approach from spawn.
- [ ] Record the first blocked segment, terrain heights and percentage of route completed; compare the trace with authored tree/rock/structure colliders before changing movement limits.
- [ ] Fix only the demonstrated obstruction and keep legitimate collision intact.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — classify the first mountain-route collision

- [ ] Record the exact collision class at the first spawn-to-summit blocker: fixed prop, streamed chunk collider, center slope, edge slope, or step-up.
- [ ] Use the measured blocker coordinates and collider/terrain data to make a narrowly targeted correction; retain legitimate environmental collision.
- [ ] Add a regression assertion for the corrected route and rerun desktop/mobile browser smoke plus Validate.
- [ ] Manual desktop and Redmi 14 5G mountain approach acceptance remains open.


## 2026-11-02 — Jarrell’s Peak coastal dock expansion (in progress)

- [x] Added eight deterministic coastal fishing dock candidates along the west shoreline, each selected from the live Open Sea boundary query and paired with a dry-bank approach.
- [x] Added smoke coverage for the eight coastal docks and all eleven fishing interactions (eight marine docks and three freshwater piers).
- [ ] Verify all dock placement assertions and the complete Validate / Browser Smoke / Pages workflow set before merge.
- [ ] Manual desktop and Redmi 14 5G acceptance remains open for the dock approach, deck height, shoreline transitions, and fishing feedback.


## 2026-11-02 — Jarrell’s Peak shallow seabed shading (in progress)

- [x] Added a depth-aware sand-to-silt color blend for underwater terrain vertices without changing water-body geometry or swim depth.
- [x] Added automated browser diagnostics for shallow open-sea and freshwater color samples versus deep ocean.
- [ ] Verify all automated workflows and manual live rendering before merge.


### Implementation commit — 2026-11-02
- [x] Added national flag meshes to all 12 existing Sanctuary pillars; Philippines flag is included, with 11 additional national flags.
- [x] Removed the artificial vertical beam and summit glow from Jarrell's Peak; natural environmental lighting remains.
- [x] Aligned the selected GLB hero's facing offset with the fallback hero so the player's initial third-person view shows the hero's back. Camera orbit continues to use the independent cameraYaw value.
- [ ] Browser/desktop/Android visual verification and workflow validation still required before closing this task.
- Code commit: `8f80db9189b37b78ddfc8f281ca72be69b6dd79a`.


### Weather and day/night controls — 2026-11-02
- [x] Moved the weather and interaction keyboard listener out of the per-frame `gameTick()` function into the single global keydown handler, preventing a new listener from being registered every frame.
- [x] Added working `R` weather cycling (Clear → Rain → Thunderstorm) and `T` time-of-day cycling (Golden hour → High noon → Dusk → Moonlit night), with key-repeat protection.
- [x] Added touch-friendly Time of Day and Weather cycle buttons inside Expedition Settings for mobile players.
- [x] Fixed cumulative fog darkening by restoring fog color from the active time-of-day preset each frame before applying weather tint; rain/storm now also adjusts sunlight and ambient light, and storm lightning remains active.
- [x] Added current weather name beside the time-of-day label in the gameplay HUD.
- [ ] Verify all four lighting presets, rain visibility, thunderstorm flashes, and mobile settings buttons in a live browser session; workflow/browser validation still pending.
- Code commit: `3782787627ec088d1c74276c90731d2422425460`.


## 2026-11-02 — mobile settings placement beside field map (OPEN)
- [x] Move the Expedition Settings gear to the immediate left of the field map on mobile landscape; align it with the map's top edge.
- [x] Move the settings panel to open beneath the gear without covering the field map.
- [ ] Verify on actual Android landscape and desktop; confirm map expand/collapse does not create overlap.
- [ ] Continue hero relaxed-arm pose review without changing the hero's face, tattoos, outfit, proportions, or model.
- [ ] Replace flat/static pillar flags with accurate national flag artwork and wind-driven cloth motion; Philippines flag must be correct.
- [ ] Check license and adapt a lightweight Three.js cloth-wave implementation from a permissively licensed GitHub source; optimize for mobile.
- [ ] Run validation, browser smoke, and Pages workflows; diagnose and rerun any failures.
- Code commit: 2a00315951c1ee0f82c18adb0aebd7f5a72a8e2b

### Sanctuary flag artwork and wind motion — 2026-11-02
- [x] Replace the inaccurate Philippines flag star placement with the correct three-star triangle layout and sun.
- [x] Subdivide all 12 Sanctuary flag meshes and add lightweight wind-driven cloth ripples, increasing motion toward the free edge.
- [x] Keep existing pillar count, placement, flag countries, and hero asset unchanged.
- [ ] Visual-check flag orientation, cloth normals, and mobile frame rate in the live game.
- [ ] Review the hero's idle arm/hand pose on the actual GLB and adjust only the pose (never the face, tattoos, outfit, or proportions).
- Reference research: MIT-licensed Three.js flag cloth simulation — https://github.com/krikienoid/flagwaver (implementation adapted as a lightweight in-place vertex deformation, not a copied asset pack).
- Code commit: a4c5825fedcfd189b4f6581febe8f0597e73e952


## 2026-11-02 — premium realistic grass and vegetation upgrade (OPEN)
- [ ] Add dense, natural-looking individual grass blades to suitable grassy biomes; avoid a flat green carpet appearance.
- [ ] Use InstancedMesh/batched geometry for grass so high density does not create excessive draw calls.
- [ ] Add subtle wind-driven grass sway (shader or efficient vertex animation), with varied phase, height, and stiffness for natural motion.
- [ ] Implement distance-based LOD: detailed grass close to the player, simplified/sparser coverage at medium range, and terrain color/texture only at far range.
- [ ] Add biome-specific vegetation palettes and species: lush green grass, dry grass, meadow patches, and highland vegetation.
- [ ] Preserve clear beaches, sand banks, rivers, lakes, ponds, roads, trails, caves, structures, interaction areas, and player movement/collision routes.
- [ ] Keep vegetation placement terrain-aware; do not place grass underwater, on steep rock faces, snow peaks, or inside protected POI footprints.
- [ ] Optimize for Redmi 14 5G and desktop: cap visible instances, use deterministic chunk placement, avoid per-frame allocations, and profile frame time.
- [ ] Visually verify density, wind, biome transitions, clipping, and mobile performance in live gameplay before marking complete.
- Reference target: premium realistic grass/vegetation quality from the user's visual reference; implement in the actual Three.js game, not as a generated background/image.


### Grass implementation progress — 2026-11-02
- [x] Add per-terrain-chunk InstancedMesh grass batches with deterministic placement.
- [x] Add shader-driven wind sway with varied blade phase from world position.
- [x] Restrict grass to suitable grassy biomes and exclude shore/water buffers, POIs, steep slopes, high peaks, and low terrain.
- [x] Use lower instance counts on mobile than desktop.
- [ ] Browser/WebGL shader compilation verification on desktop and Android; inspect grass density, terrain clipping, and frame time.
- [ ] Tune density/LOD after live profiling; current implementation uses chunk-batched density rather than multi-tier LOD.
- Code commits: 34f80dcbbbebe47dbbcd7a0992f135b0e6b88904; shader newline fix ef330605049479a4d16d6404842d99f97a908fe7.


## 2026-11-02 — homepage UI hierarchy and mobile presentation

- [x] Replace the long inline Game menu update paragraph with a four-destination visual summary: Jarrell’s Peak (playable), Arena (future), Marketplace (demo preview), and Inventory (local preview).
- [x] Replace the dense One clear funding promise paragraph with a concise funding commitment panel; keep DEX/Launchpad allocations and optional project donations directed to Jarrell’s Peak, separate from marketplace accounting.
- [x] Keep rates, collection addresses, conversion rules, reporting, and distributions explicitly not active until public and verifiable.
- [x] Add mobile-responsive destination cards and funding panel styles; retain existing dark/gold visual identity.
- [ ] Verify the new sections in actual desktop and Android/Redmi 14 5G screenshots; source/CSS change alone is not visual acceptance.
- [ ] Latest previous workflows: Validate run 41435000305 passed; Pages run 41435000817 passed; Browser Smoke run 41435000365 failed during expedition entry. Root diagnostic: world boots and player reports mode walk, but smoke snapshot does not observe the expected body.free class. Fix the state/UI transition without removing the assertion or weakening gameplay checks.
- Code commit: 20aafe46fb07aac624ed1927406eab30eedb69d1.


### Cave mineral glow implementation — 2026-11-02
- [x] Add 14 cave crystal clusters with four emissive color families and animated shimmer; expose them to deterministic world diagnostics.
- [x] Add a browser smoke assertion for the expected cluster count and facet geometry.
- [ ] Await Validate, Browser Smoke, and Pages workflows; fix any regression without weakening existing gameplay assertions.
- [ ] Manual desktop and Redmi 14 5G review remains open for brightness, cave readability, crystal placement, and performance.
- Code commits: abbd6522a7dd6f6a919ac7a3bcb7b41b93bc30dc; 57180bfb680aca26ec79917668fba5e636ecd3c7.


## 2026-11-02 — expedition title-overlay entry regression repair (verification pending)

- [x] Diagnosed Browser Smoke run 41436996416: homepage/mobile navigation passed and world diagnostics completed, but the expedition-entry wait timed out after the title overlay click.
- [x] Updated the visible title overlay to enter gameplay on the initial pointer press as well as click; the handler is guarded so the click following pointerdown cannot start the expedition twice.
- [x] Validate passed for the pointer-entry change: run 41438273705 on code head 61f09594bc9262f9a8b1c9797adac0d98639001d.
- [ ] Browser Smoke run 41438273619 is still in progress; inspect the expedition-entry and desktop/mobile results before closing this regression.
- [ ] Pages deployment for the current documentation head is pending; rerun/verify deployment after the latest main commit.
- [ ] Manual desktop and Redmi 14 5G touch-entry acceptance remains open.
- Code commit: 61f09594bc9262f9a8b1c9797adac0d98639001d.


## 2026-11-02 — expedition entry follow-up diagnosis and fix

- [x] Rechecked latest workflows on `391bebec`: Validate passed (run 41438521135), Pages passed (run 41438521187), Browser Smoke failed (run 41438521131); several nearby Pages runs were cancelled by newer pushes, not failed.
- [x] Confirmed homepage CTAs, DEX modal, mobile menu, world boot, water/fishing diagnostics, collision audit, and mountain route probe all passed before the Browser Smoke failure.
- [x] Isolated the remaining failure to the title-overlay expedition-entry transition: the test remained in cinematic mode and timed out waiting for `body.free` plus `player.mode === 'walk'`.
- [x] Changed the entry handler to transition gameplay synchronously before requesting optional fullscreen/orientation; made the title pointerdown listener capture-phase so optional immersive behavior cannot prevent player takeover.
- [ ] Verify Browser Smoke, Validate, and Pages on the new commit; do not close this regression until desktop and mobile gameplay smoke both pass.
- [ ] Manual real-device Android landscape/touch acceptance remains open.
- Code commit: 45dc262ecef59775d2dc82b47ae5fa20a40311b6.


## 2026-11-02 — Browser Smoke expedition-entry test correction

- [x] Rechecked commit `f0fbf5c1`: Validate run 41440866820 passed; Pages run 41440866689 passed; Browser Smoke run 41440866915 failed at `.github/scripts/game-smoke.mjs:172` waiting for `body.free` and player `mode === 'walk'`.
- [x] Confirmed homepage CTA/DEX/mobile-nav smoke passed and world boot, water/fishing, collision, and mountain route diagnostics passed before the expedition-entry timeout.
- [x] Identified the test was dispatching a synthetic `pointerdown` event directly. Replaced it with a real Playwright click on the visible title overlay; retained the same gameplay-state assertion and desktop/mobile checks (no assertion weakened).
- [x] New commit: `9a02a52c7fab1382efc573d9db4c6c7488f56feb`.
- [x] Validate run 41441203816 passed.
- [ ] Browser Smoke run 41441203819 still running at checklist update; confirm desktop and mobile entry before closing.
- [ ] Pages run 41441202765 queued at checklist update; confirm deployment result.


## 2026-11-02 — mobile landscape viewport width regression (fix committed; verification pending)

- [x] Diagnosed the split-screen symptom: the resize handler preferred `document.documentElement.clientWidth` over the actual window/visual viewport width, allowing a stale narrow layout width to shrink the WebGL canvas after orientation/fullscreen changes.
- [x] Updated `game/play.html` to size the renderer from the maximum current window, document, and visual viewport dimensions; on mobile landscape, also account for `screen.width` when the browser reports a stale narrow layout viewport. Synchronized the camera aspect ratio and canvas CSS to the full landscape viewport; re-run sizing on screen-orientation changes.
- [ ] Validate Climboria, Browser Smoke, and Pages workflows on gameplay commit `ebff425f8fe6f71786167d4438ef9a9259d8c143` (checklist commit `ed9e12e`); inspect logs and repair any failures.
- [ ] Confirm on the Redmi 14 5G in landscape that the 3D world fills the entire screen, the right-side black region is gone, and DIVE / USE / JUMP-SURFACE / RUN controls remain visible and correctly positioned. Desktop layout must remain unchanged.


## 2026-11-02 — follow-up mobile landscape canvas repair (CI/device verification pending)

- [x] Re-inspected the screenshot regression against the live `game/play.html` CSS and renderer sizing. The previous patch still depended on the browser reporting landscape orientation correctly; Android desktop-site / viewport reporting can leave the CSS viewport at the short dimension.
- [x] Updated the renderer resize routine to derive long/short physical screen bounds on touch devices, use the full long edge for landscape canvas width, and explicitly pin the WebGL canvas to the resulting pixel dimensions while updating the camera projection. The resize routine is also invoked immediately at initialization (not only after a later resize event). Desktop sizing remains based on the current browser viewport.
- [ ] Verify the latest gameplay commit `e9c2c7105d402a50c1c59833e78be14a3e649356` with Validate Climboria, Browser Smoke Test, and Pages deployment; inspect any failed jobs and logs.
- [ ] Physical-device acceptance remains required: Redmi 14 5G landscape must show world across the full display with no black half-screen; all mobile action controls and HUD remain visible; portrait rotate prompt still works; desktop remains unchanged.


## 2026-11-02 — restore missing mobile gameplay UI (verification pending)

- [x] Inspected the supplied Redmi landscape screenshot: only the 3D world, character, green status dot, and four touch actions were visible; the player HUD, health/stamina/damage card, field map, and expedition settings were absent.
- [x] Found the root cause in `game/play.html`: the `#player-card` wrapper was missing its closing `</div>`, so the following status card, map, and settings controls were parsed as descendants of a parent whose opacity is 0 outside `body.free`.
- [x] Added the missing closing tag so all gameplay panels are siblings and can render independently; no HUD components were removed or redesigned.
- [ ] Validate Climboria, Browser Smoke, and Pages runs triggered by commit `9852c319984fef6488e2319c26cc05099f8cd22a`.
- [ ] Confirm on the Redmi 14 5G landscape screenshot that player card, health/stamina/damage, map, settings, and touch actions are all visible and not overlapping; confirm desktop remains unchanged.


## 2026-11-02 — mobile HUD restoration and browser-smoke repair

- [x] Diagnosed why the mobile gameplay HUD disappeared: Android can report a portrait CSS viewport after physical rotation. The portrait media query hid the player card, health/stamina card, field map, settings, and HUD even while the WebGL canvas was sized for the physical landscape screen.
- [x] Added physical-orientation classes during viewport resize and a landscape fallback that restores the player card, health/stamina card, field map, and settings visibility during active mobile gameplay. Portrait rotate guidance remains in place.
- [x] Diagnosed Browser Smoke Test failure: the test clicked the WebGL canvas while the visible `#title` / `#tmsg` expedition-entry overlay intercepted the pointer. Updated Playwright to click the actual title overlay, matching the real player interaction.
- [x] `Validate Climboria` passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [x] GitHub Pages build/deployment passed on `66f3052c56fba275478555b9f9f53241add7d835`.
- [ ] Browser Smoke Test run `41446985537` is still in progress; inspect its final result and repair any additional failure before marking this complete.
- [ ] Physical-device acceptance remains required: confirm the Redmi 14 5G landscape view shows player card, health/stamina, field map, settings, hero, and touch controls without overlap or black bars; verify portrait rotate gate and desktop layout.


## 2026-11-02 — mobile HUD, physical orientation, and browser-smoke recovery (green)

- [x] Root cause of the missing HUD: `#player-card` was missing its closing `</div>`, nesting the status/map/settings elements under a parent hidden outside free-play. Restored the wrapper boundary without removing or redesigning UI.
- [x] Root cause of the Android landscape HUD regression: CSS orientation media queries could disagree with physical orientation. Added explicit `climboria-landscape` / `climboria-portrait` class-based visibility rules driven by `screen.orientation` and viewport resize, preserving the portrait rotate gate and revealing player/status/map/settings in landscape.
- [x] Root cause of a previous Browser Smoke failure: portrait test emulation silently swallowed failure to override `screen.orientation`, leaving the test's orientation ambiguous. Made the Playwright orientation mock deterministic with a prototype fallback and added orientation diagnostics.
- [x] Confirmed Jarrell desktop smoke: WebGL ready, 17 render frames, zero render errors, 7 chests, 14 cave crystal clusters, collision audit 87 valid solids with no invalid colliders or water overlaps, all 8 mountain approach bearings clear, full spawn-to-summit route complete, fishing interactions and freshwater movement passed, hero GLB movement states idle/walk/run/swim.
- [x] Confirmed mobile smoke: WebGL ready, 23 render frames, zero render errors, controls/player name/player card/status card/world map/settings/hero all visible, document width equals viewport width (844px); no horizontal overflow.
- [x] Homepage CTA, DEX modal, mobile menu, and mobile width smoke passed.
- [x] `Validate Climboria` passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448182622).
- [x] GitHub Pages build and deployment passed on `d69b549d4d94bf06e497b6de53646a1ed14e124e` (run 41448181907).
- [x] Climboria Browser Smoke Test passed on `d69b549d4d94bf06e497b6de53646a1ed14e` (run 41448182685); screenshots uploaded as artifact 13143541311.
- [ ] Physical-device acceptance remains outstanding: verify on Redmi 14 5G in actual landscape that fullscreen covers the panel, HUD is legible/non-overlapping, and touch controls are correctly placed. Automated mobile emulation is green but is not a substitute for the physical phone.


## 2026-11-02 — end-to-end regression verification (all automated checks green)

- [x] Latest `Validate Climboria` run 41448808748 passed on `20da162dc2a874e0b11dcd90e8d31483bb46d5a8`.
- [x] Latest `Climboria Browser Smoke Test` run 41448808610 passed on the same commit. Homepage CTAs, DEX modal open/close, mobile menu, desktop/mobile Jarrell gameplay, hero GLB, world rendering, terrain/collision audits, fishing/water interactions, inventory, mobile HUD and all four on-screen touch actions were checked.
- [x] Latest GitHub Pages build and deployment run 41448808360 passed on the same commit.
- [x] Browser smoke screenshot artifact 13144610742 uploaded successfully (desktop/mobile homepage and gameplay captures; retained for 7 days).
- [x] Diagnosed and repaired prior smoke failures: expedition-entry overlay intercepted a canvas click; Android orientation emulation did not reliably override `screen.orientation`; portrait rotate-gate test then exposed inconsistent orientation state. Tests now click the actual overlay and use deterministic orientation mocking with diagnostics.
- [x] Added explicit assertions that all four mobile action buttons are visible, at least 50×50 px, and fully inside the viewport; player HUD, status card, map, settings and hero must also be visible. Latest run passed.
- [ ] Physical Redmi 14 5G confirmation is still required; CI emulation cannot certify real device browser fullscreen/system-bar behavior or touch feel.
- [ ] Non-blocking CI maintenance: GitHub warns several `actions/*@v4` steps target Node.js 20 and are being forced to Node.js 24; npm also emits `punycode` / `url.parse()` deprecation warnings. No current test failure is caused by these warnings.


## 2026-11-02 — continue Jarrell's Peak world expansion

- [x] Verified freshwater/river sandy bank foundation against actual browser smoke output: 3/3 freshwater enter-exit tests, 8/8 coastal docks accessible, 11/11 fishing interactions started, shoreline and seabed tint checks true.
- [x] Confirmed collision baseline: 87 valid solids, zero invalid solids/water overlaps; central summit eight-direction approach checks clear and spawn-to-summit route 100% clear.
- [x] Added spatially distributed mountain-massif approach diagnostics in `.github/scripts/game-smoke.mjs` (commit `3c6b7b4eabdc064d35859843f67cda8dd1525619`) to inspect more than the single central summit.
- [ ] Inspect latest Validate/Browser Smoke/Pages results and review massif diagnostic output before any mountain collider edits.
- [ ] Physical desktop/Redmi 14 5G review remains required for actual shoreline appearance and mountain approach feel.



## 2026-11-02 — cave side-room collision recovery and soundtrack path (all automated checks green)

- [x] Added a connected 8 m-wide passage and 18 m × 18 m side chamber to the existing cave; preserved the original chamber, traps, soldiers, crystals, chest, six torch fixtures, and existing hero/world UI.
- [x] Added seven matching cave wall segments with swept player-movement collision; deterministic cave audit verifies the route remains open and crossing a wall is blocked.
- [x] Fixed two JavaScript temporal-dead-zone errors discovered by browser smoke: hoisted the cave coordinate transform as a function declaration and initialized the cave wall registry before cave construction.
- [x] Fixed the game soundtrack URL from `../assets/music/TRACK_01.mp3` to `./assets/music/TRACK_01.mp3`; the asset exists at `game/assets/music/TRACK_01.mp3`.
- [x] Verified on commit `647135f9242b53d82a1f5db745a54c88e42e4d26`: Validate Climboria run 41464651699 passed; Browser Smoke Test run 41464651478 passed; Pages deployment run 41464651065 passed.
- [ ] Full cave scope remains open: long multi-section route, branching maze, multiple trap types/trigger logic, underground pool with navigable underwater passage and exit, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] 3% rare-reward chance is not implemented; do not imply cave gems or the existing chest satisfy this reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains open; automated smoke does not replace real-device testing.


## 2026-11-02 — second connected cave annex (automated checks green)

- [x] Extended the existing side chamber with a second north doorway, a six-metre passage, and a separate 10 m × 5 m mineral annex.
- [x] Added matching swept movement colliders for the new passage and annex walls; smoke audit checks the original passage and annex route remain traversable and wall crossings remain blocked.
- [x] Kept the original cave chamber, spike field, stalactites, soldiers, crystal clusters, chest, six torches, hero, HUD, and other world systems intact.
- [x] Verified commit `9a59f81d65e7931a969b3c72f77a7762cc5a66a4`: Validate run 41466992208 passed, Browser Smoke run 41466992432 passed, Pages deployment run 41466993088 passed.
- [ ] Still open: full-length cave network, branching maze, additional trap types and trigger logic, underwater pool/passages, hidden reward rooms, and 3% rare-reward mechanic.
- [ ] Manual desktop and Redmi 14 5G visual/gameplay acceptance remains outstanding.

## 2026-11-02 — cave feature gap audit (implementation queued; no unverified world edits)

- [x] Inspected the actual `game/play.html` cave construction block rather than relying on checklist claims.
- [x] Confirmed current cave is a single compact chamber around `POI.cave`, with one spike-trap field, seven stalactite/rock forms, 14 small crystal clusters, a small soldier group, and one cave chest.
- [ ] Major requested cave features are NOT implemented yet: long multi-section cave route, branching maze, multiple trap types/trigger logic, underground pool with walkable underwater passage, cave-specific hostile encounters, and meaningful exploration/reward rooms.
- [ ] Cave illumination needs an in-browser visual pass: current code has two torches, one orange point light, and crystal bounce lights; no visual test currently proves that the entire cave remains readable without washing out its dark atmosphere.
- [ ] Before implementation, expand cave layout as a coherent navigable route with collision solids for walls/floors/traps, explicit underwater swim volume and exit, layered light sources, and deterministic smoke coverage for each branch. Do not claim these features are complete based on the existing 14 crystal clusters.
- [x] Current verified baseline remains green on commit `6b1db3ec0bd34728358264696f831f36918f28b6`: Validate run 41452445827, Browser Smoke run 41452445961, Pages run 41452443966. Browser screenshots artifact 13146020853.


---

# DEX / TOKEN TERMINAL — EXPANDED PRODUCT REQUIREMENTS (2026-11-03)

> This section expands and takes precedence over the shorter DEX feature list above. The target is a Climboria-native token discovery and trading terminal with feature parity in spirit with Pump.fun, DEX Screener, GeckoTerminal and FOMO. Implement original Climboria UX and integrations; do not copy proprietary code, branding, protected visual assets or private APIs.
>
> **Status: PLANNED / DESIGN ONLY.** Jarrell's Peak remains P0. This feature inventory is for product design and architecture preparation, not a claim that these features exist or are live.

## A. Climboria DEX product vision
- [ ] One unified destination for token discovery, project research, charts, market activity, trading, portfolio and launch lifecycle.
- [ ] Climboria-branded premium interface using the official emblem, dark charcoal/obsidian surfaces, antique bronze/muted gold, compass geometry and mountain/topographic motifs.
- [ ] Desktop multi-panel terminal and purpose-designed mobile layout.
- [ ] Clear distinction between on-chain verified facts, third-party indexed data, derived analytics and user-submitted project metadata.
- [ ] Every metric shows source and/or last updated time where relevant; stale/unavailable data is visibly labelled.
- [ ] No fabricated chart candles, order book depth, holders, token age, volume, liquidity, market cap, creator identity, quote or transaction status.

## B. Discovery / markets board (Pump.fun + DEX Screener + GeckoTerminal style)
- [ ] Live new pairs / new pools feed.
- [ ] New token launches and launchpad discovery feed.
- [ ] Bonding-curve tokens and graduation/migration status where applicable.
- [ ] Trending tokens, hot pairs, top gainers, top losers and most active.
- [ ] Highest volume, highest liquidity, most buys, most sells, most transactions and largest price movement.
- [ ] Recently created tokens with token age / pair age shown separately and accurately.
- [ ] Search by token name, ticker, mint/contract address, pool/pair address and project/social handle.
- [ ] Filters: chain, DEX/venue, quote asset, age, liquidity, volume, market cap/FDV, transaction count, price change and risk flags.
- [ ] Sortable, configurable columns and saved filter presets.
- [ ] Token watchlist/favourites, recently viewed and custom lists.
- [ ] Trending/boosted/promoted labels must be clearly distinguished from organic ranking; disclose paid promotion.
- [ ] Network-specific discovery: Solana first; add Base/EVM and other chains only after supported data/trading integrations.
- [ ] Token and pair cards show price, price change, liquidity, volume, FDV/market cap, buys/sells, transaction count and pool age only when reliable source data exists.

## C. Token detail / project research page
- [ ] Token name, ticker, logo, verified mint/contract address, chain/network and token standard.
- [ ] Copy contract/mint address and open the correct chain explorer.
- [ ] Token creation timestamp and token age, with source and timezone; show pair/pool creation age separately.
- [ ] Price in USD and quote asset, market cap, FDV, liquidity, 24h volume, transaction count, buys/sells and price changes across supported intervals.
- [ ] Supply data: total, circulating and max supply only when independently sourced/defined; clearly label unknown or unverified fields.
- [ ] Pool/pair list, venue, pool address, quote asset, liquidity and pool creation time.
- [ ] Project description, category, tags, logo/banner and roadmap/project details where submitted and verified.
- [ ] Official website, X/Twitter, Telegram, Discord and other project links.
- [ ] Creator/deployer profile: creator wallet/address, linked public profile, other launched projects, creation timestamp and public on-chain activity where available.
- [ ] Creator identity is not inferred from wallet address; distinguish verified team identity from an anonymous wallet.
- [ ] Creator/team wallet holdings and concentration only where traceable; label heuristics and uncertainty.
- [ ] Token holder count, top holders, concentration, holder changes and distribution; flag exchange, LP, burn and program wallets when reliably identified.
- [ ] Contract/mint authority, freeze authority, mint authority, metadata mutability, LP/lock/burn status and token extensions where chain/token standard supports them.
- [ ] Security/risk panel: honeypot/sell restrictions where detectable, token taxes, authority risks, liquidity risks, concentration, suspicious deployer patterns and third-party risk score with provider/source attribution.
- [ ] Audit status and links only when a real audit report exists; never display an invented audit badge.
- [ ] Project information update workflow with verification and abuse reporting.

## D. Advanced charts and technical analysis (GeckoTerminal + FOMO style)
- [ ] Professional candlestick, line, area and bar charts.
- [ ] Timeframes from 1 minute through longer intervals only where source history supports them.
- [ ] OHLCV history sourced from a documented provider or indexed on-chain data.
- [ ] Volume bars, price/market-cap toggle, liquidity overlay and event markers.
- [ ] Drawing tools and technical indicators when supported by the selected chart library/licence.
- [ ] Chart crosshair, zoom, pan, reset, fullscreen and responsive mobile gestures.
- [ ] Live trade markers for buys/sells, with transaction links and clear event timestamps.
- [ ] Personal trade markers (user's own entries/exits) only after account/portfolio infrastructure exists.
- [ ] Graduation, pool migration, liquidity changes and project announcements as annotated events.
- [ ] Show chart source, pair/venue and last update; handle gaps and low-liquidity candles honestly.
- [ ] Do not fabricate candles or interpolate misleading prices when the provider has no data.

## E. Trading terminal / order entry
- [ ] Buy and Sell panels with token amount, quote amount, balance, presets, Max and fee breakdown.
- [ ] Real-time quote, route/venue, expected output, minimum received, price impact, slippage and quote expiry.
- [ ] Wallet connect/disconnect and network switch; explicit user signature/confirmation for every on-chain action.
- [ ] Solana first; Base/EVM later, with chain-specific transaction construction and validation.
- [ ] Fast buy/sell presets and one-tap trade only after the user has configured and explicitly approved the flow.
- [ ] Priority fee / transaction speed controls where supported, with clear cost disclosure.
- [ ] Live trades tape: timestamp, side, price, amount, wallet/trader label only if public and accurately attributed, and transaction link.
- [ ] **Order book distinction:** bonding curves and AMMs do not inherently have a traditional bid/ask order book. Show curve price/reserves, pool liquidity, swap tape and price impact for those venues. Display genuine bid/ask depth only for a venue with a real order-book feed.
- [ ] Spot limit orders, stop-loss and take-profit only if supported by a secure on-chain program or reliable execution service; show trigger and execution semantics.
- [ ] Order status, open orders, partial fills, cancel/replace and expiry only where the execution venue actually supports them.
- [ ] Transaction simulation/preflight where supported; pending, confirmed, failed, rejected, expired and timed-out states.
- [ ] Retry logic must not create duplicate transactions or duplicate purchases.
- [ ] No silent signing, no hidden custody and no seed phrase/private-key collection.

## F. Holder, wallet and trader intelligence (FOMO style)
- [ ] Holder distribution table with wallet address, balance, percentage and known wallet labels.
- [ ] Top holder concentration and changes over time.
- [ ] Public wallet trade history and buy/sell activity.
- [ ] Trader profile and leaderboard by time range, with methodology and anti-sybil caveats.
- [ ] PnL, average entry, realized/unrealized PnL and holding time only when enough wallet transaction history exists; show calculation limitations.
- [ ] Team/creator wallet flags only when supported by evidence; distinguish known labels from inferred clusters.
- [ ] Live swap feed and optional chart overlays.
- [ ] Watch/follow public wallets and receive activity alerts, subject to privacy and abuse controls.
- [ ] No unsupported claims that a wallet belongs to a named person.

## G. Portfolio, watchlists and alerts
- [ ] Connected-wallet portfolio with token balances and valuation source/timestamp.
- [ ] Position details, cost basis and PnL only when complete enough to calculate; disclose incomplete history.
- [ ] Open orders and transaction history.
- [ ] Watchlists, folders and pinned tokens.
- [ ] Price, percentage-change, liquidity and volume alerts.
- [ ] New-pair, graduation, liquidity-change and watched-wallet activity alerts.
- [ ] In-app notifications first; optional browser/push/email only after account preferences and consent.
- [ ] Alert deduplication, quiet hours, rate limits and user controls.

## H. Launchpad / Pump.fun-style lifecycle (separate from ordinary DEX swaps)
- [ ] Define whether Climboria will operate its own token launchpad, integrate an existing launchpad, or both; no decision implied by this checklist.
- [ ] If own launchpad is approved: token creation form, name, ticker, metadata, image, description, website, X, Telegram, creator wallet and fee recipient.
- [ ] Explicit token supply, decimals, authority, allocation, creator fee, platform fee and launch parameters before deployment.
- [ ] Bonding curve design, quote calculation, slippage, curve progress and graduation threshold documented and independently reviewed.
- [ ] Graduation/migration to a supported AMM pool with verified liquidity handling.
- [ ] Creator dashboard for launch status, public project details and fee/volume analytics where available.
- [ ] Anti-spam, impersonation, prohibited content, token impersonation and abuse review.
- [ ] Clear risk disclosures: permissionless token launches can be scams; platform listing is not endorsement.
- [ ] Testnet/devnet, transaction simulation, security review and legal/compliance review before any mainnet launch.
- [ ] Do not advertise token creation as live until a real mint and transaction are confirmed on-chain.

## I. Social and community layer
- [ ] Project social links: website, X, Telegram, Discord and other verified links.
- [ ] Creator profile with verified/claimed status and linked projects.
- [ ] Community posts/updates or project feed, if moderation capacity exists.
- [ ] Comments/reactions only with spam prevention, moderation, reporting and block/mute tools.
- [ ] Search on X or open official project links without implying Climboria endorses the project.
- [ ] Community takeover/ownership-claim workflow with proof of wallet control and anti-impersonation checks.

## J. Admin, moderation, integrity and analytics
- [ ] Admin review queue for reported projects, suspicious metadata and impersonation.
- [ ] Clearly label verified project ownership, third-party data and community-submitted data separately.
- [ ] Paid promotion/boost purchase and status disclosure, if offered; no pay-to-hide risk labels.
- [ ] API health dashboard, provider quota/rate-limit monitoring, cache age and fallback status.
- [ ] Data lineage for price, volume, liquidity, holder and security metrics.
- [ ] Abuse controls, rate limits, bot detection and audit logs.
- [ ] No private user data or API secrets in client bundles or GitHub commits.

## K. Data providers, licensing and integration strategy
- [ ] Evaluate Pump.fun documented programs/SDKs and supported public data for launchpad lifecycle; do not assume its bonding curve is a traditional order book.
- [ ] Evaluate DEX Screener API for pair search, token profiles, pair/token metrics, boosts and paid-order status; check current rate limits, attribution/terms and production suitability.
- [ ] Evaluate GeckoTerminal/CoinGecko API for pool discovery, OHLCV, liquidity, DEX rankings and token/pool data; check current rate limits, plan and licensing.
- [ ] Evaluate FOMO as a feature benchmark for chart overlays, holder analysis, trader feed, thesis/social context, watchlists and alerts; do not assume its private backend/API is available.
- [ ] Evaluate direct Solana RPC/indexer and venue-specific feeds for authoritative on-chain transaction and account state.
- [ ] Use an internal normalized market-data schema so the UI is not tightly coupled to one provider.
- [ ] Cache and deduplicate requests; respect provider quotas, attribution, terms and data licensing.
- [ ] Use multiple sources for critical values where practical; detect stale or conflicting results and show uncertainty.
- [ ] Define production SLA, rate-limit handling, retries, backoff, circuit breakers and graceful degradation.
- [ ] Confirm whether charting library is open-source or requires a commercial licence before shipping.
- [ ] Never scrape private endpoints or bypass provider access controls.

## L. Climboria DEX implementation and acceptance gates
- [ ] Product requirements and screen-by-screen wireframes approved.
- [ ] Brand system and responsive high-fidelity designs approved.
- [ ] Data-provider selection, API terms, quotas and cost model documented.
- [ ] Solana market-data ingestion and normalized schema tested.
- [ ] Token discovery, search and token detail pages pass data-integrity tests.
- [ ] Charts verified against independent source and on-chain trades.
- [ ] Wallet connection, signing, quote, swap and explorer verification tested on devnet.
- [ ] Security/risk labels tested for false positives/false negatives and clearly qualified.
- [ ] Portfolio/PnL math tested against known transaction histories.
- [ ] Mainnet launch only after security review, confirmed official token identity, liquidity/venue validation and owner approval.
- [ ] Base/EVM phase only after Solana production flow is stable and independently verified.

## M. Reference feature research (not implementation evidence)
- Pump.fun: launch lifecycle, bonding-curve trading, creator-fee concepts and graduation/migration to AMM. Reference: https://pump.fun/docs/bonding-curve and https://www.pumpdocs.fun/
- DEX Screener: token profiles, latest community takeovers, paid-order status, pair search, token pairs, price, transactions, volume, price change, liquidity, FDV/market cap, pair creation time, website/social links and boosts. Reference: https://docs.dexscreener.com/api/reference
- GeckoTerminal: real-time DEX prices, volume, transactions, liquidity, advanced charts, OHLCV, pool rankings, watchlists and API. Reference: https://www.geckoterminal.com/about-us and https://support.coingecko.com/articles/6867086195-does-geckoterminal-have-an-api
- FOMO: discovery tables, watchlists, charts, trade overlays, holders, swaps, theses, trader feed, leaderboards, quick buy/sell, alerts and portfolio views. Reference: https://fomo.family/release-notes and https://fomotrading.app/terminal/
- Research sources and capabilities can change. Re-check official docs and terms immediately before implementation.



## N. Climboria-exclusive product concept: Trade Twin & Decision Engine (DESIGN ONLY)

**Status:** Proposed signature differentiator; design/specification only. Jarrell's Peak remains the active development priority. No DEX implementation is authorized by this section.

**Product promise:** Do not merely show traders what the market is doing. Help them understand what a proposed trade could cost, how it could fail, how it affects their existing exposure, and whether the original thesis remains valid. The engine is decision support, not a buy/sell oracle and never guarantees profit.

### N1. Core concept — Trade Twin
- [ ] Build a pre-trade digital twin of the exact proposed transaction and resulting position using current, timestamped market and wallet data.
- [ ] Simulate the actual supported route/venue, expected output, fees, priority fee, slippage, price impact, quote expiry and minimum received.
- [ ] Simulate multiple position sizes (for example, the user's entered size plus smaller/larger alternatives) and show how exit liquidity and estimated proceeds change at each size.
- [ ] Model clearly labeled stress scenarios: market price falls, liquidity decreases, large holder sells, volume collapses, route becomes unavailable, transaction is delayed, and network fees rise.
- [ ] Show estimated break-even price after fees, downside exposure, and the price/condition at which the user's stated thesis would be invalidated.
- [ ] Show portfolio-level impact when the user has connected a wallet: concentration, correlated token exposure, available balance and maximum loss under the selected hypothetical scenarios.
- [ ] Let the user set their own risk budget and maximum position size. The engine must not silently choose or execute a trade.
- [ ] Show data coverage, assumptions, confidence/uncertainty, source timestamps and unavailable inputs beside every simulation.
- [ ] Never present scenario outputs as predictions or guaranteed outcomes. Include best/base/stress cases, not a single falsely precise target.

### N2. Trade Plan Card — actionable, user-controlled output
- [ ] Convert the analysis into a compact Trade Plan Card containing: proposed entry, size alternatives, estimated execution cost, exit-liquidity estimate, break-even, user-defined invalidation condition, and optional take-profit/stop conditions.
- [ ] Explain each warning in plain language and link it to the underlying evidence (transaction, pool, wallet, authority, metric or source).
- [ ] Clearly separate observed facts, inferred patterns, model estimates and user assumptions.
- [ ] Provide three honest outcomes: Proceed to wallet confirmation, Review/adjust the plan, or Do not proceed because a defined hard constraint is violated. Never label a token “safe.”
- [ ] User must independently review and sign every transaction. No custody, private-key collection, seed phrase collection or automatic trade execution by default.

### N3. Live Thesis Monitor — after entry
- [ ] Let the user save the reason they entered a position (their thesis) and the conditions that would invalidate it.
- [ ] Monitor only observable conditions: liquidity changes, abnormal sell pressure, tracked-wallet movements, holder concentration changes, volume/participation changes, authority changes and relevant project events.
- [ ] Notify when the original thesis materially changes, and explain which evidence changed and when.
- [ ] Compare current conditions with the saved plan; do not simply send price alerts.
- [ ] Offer user-configured exit/review reminders, but never execute a sell without explicit authorization and wallet signature.

### N4. Decision Receipt & Learning Loop — the compounding advantage
- [ ] Save a timestamped, exportable Decision Receipt before the trade: market snapshot, data sources, quote/route, assumptions, scenario estimates, warnings, user's thesis, chosen size and user decision.
- [ ] After execution, attach the confirmed transaction and compare expected versus actual output, fees, slippage and timing.
- [ ] Track what the engine got right or wrong across historical receipts; measure calibration and false alarms rather than claiming predictive accuracy from a few examples.
- [ ] After the position closes, compare the original thesis and scenarios with the observed outcome; let the user add a short reflection.
- [ ] Build a private personal decision-quality dashboard: plan adherence, execution quality, risk-budget adherence and recurring mistakes. Do not rank users by raw PnL alone.
- [ ] Make personal trading history private by default; sharing must be explicit and revocable.

### N5. Research and differentiation safeguards
- [ ] Treat Trade Twin as Climboria's proposed signature integration and user workflow, not a claim that no competitor has any similar simulation, risk or AI feature.
- [ ] Before implementation, benchmark current products and published research for overlap; document what is genuinely distinct in Climboria's combination, evidence trail, thesis monitoring and feedback loop.
- [ ] Start with transparent deterministic calculations and explainable rules. Add machine-learning components only after enough high-quality labeled outcomes exist and independent evaluation is possible.
- [ ] Backtest and paper-trade with out-of-sample data; include fees, slippage, failed transactions, liquidity constraints, survivorship bias and data gaps.
- [ ] Publish methodology, limitations, model/version, calibration and evaluation windows. Do not market an unvalidated win rate or imply financial advice.
- [ ] Add adversarial testing for wash trading, bundled wallets, Sybil behavior, spoofed social activity, stale feeds, manipulated liquidity and coordinated exits.
- [ ] Do not infer real-world identity or criminal intent from wallet clusters; use careful labels such as “potentially related activity” and show evidence/uncertainty.
- [ ] Obtain security, privacy, provider-terms and applicable legal/compliance review before launch.

### N6. Delivery phases (after Jarrell's Peak is fully polished and DEX work is explicitly prioritized)
1. **Phase 1 — Trade Twin MVP:** quote/route simulation, fee and slippage breakdown, position-size comparison, exit-liquidity scenarios, break-even and evidence-linked risk warnings.
2. **Phase 2 — Decision Receipt:** save pre-trade snapshot, attach confirmed transaction, calculate execution quality and provide private trade journal.
3. **Phase 3 — Live Thesis Monitor:** user-defined invalidation conditions and evidence-backed alerts.
4. **Phase 4 — Calibrated intelligence:** historical replay, model evaluation, anomaly detection and personalized insights only after sufficient reliable data.
5. **Release gates:** paper-trading validation, independent math verification, security review, privacy controls, mobile usability, provider reliability and explicit owner approval.

### N7. Other selected DEX additions (design backlog)
- [ ] **Wallet Relationship & Funding Graph:** visualize shared funders, coordinated timing and wallet behavior as evidence-backed hypotheses, not identity claims.
- [ ] **Liquidity Exit Simulator:** estimate executable exit proceeds across position sizes and stress cases, not just displayed pool liquidity.
- [ ] **Launch Fairness Monitor:** analyze early allocation, deployer-linked activity, concentration, bundled-buy patterns and liquidity events with uncertainty labels.
- [ ] **Social Hype vs. On-chain Reality:** compare social engagement with unique buyers, liquidity, volume and holder growth; flag possible manipulation rather than asserting it.
- [ ] **Trade Quality Dashboard:** compare quoted vs. realized execution, fees, slippage, route and confirmation time.
- [ ] **Risk-aware alerts:** alert on changes to a user's saved thesis and risk conditions, not only price movement.
- [ ] **Strategy Replay / Paper Trading:** test user-defined rules on historical data with realistic fees, slippage and liquidity assumptions before real-money use.

### N8. Additional signature engines — OWNER-APPROVED DESIGN BACKLOG (DESIGN ONLY)

**Owner approval recorded:** The owner explicitly approved these concepts for the Climboria DEX design backlog. These concepts extend the Trade Twin workflow. They are product hypotheses, not claims of historical first-ever invention. Benchmark competing products and prior art before making any uniqueness claim.

- [ ] **Climboria Market Fork Engine:** let a trader compare counterfactual paths for the same market window (enter now, split entries, wait for a defined confirmation/liquidity condition, reduce size, or stay out). Replay each path against timestamped historical data and compare realized hypothetical execution cost, exposure and outcome. Prevent look-ahead bias; label simulations as hindsight analysis, not forecasts.
- [ ] **Climboria Liquidity Mirage Detector:** distinguish displayed liquidity from realistically executable liquidity. Simulate sells at multiple sizes, measure price impact and route availability, track sudden liquidity withdrawals and pool concentration, and show how much could plausibly be exited under stated assumptions. Never equate TVL with guaranteed exit liquidity.
- [ ] **Climboria Position Lifeline:** monitor an open position against the user's saved thesis and user-defined invalidation conditions. Track evidence such as liquidity deterioration, concentrated-holder transfers, creator/deployer-linked movements, unique-buyer participation and sell pressure. Explain evidence and uncertainty; alert only, never auto-sell.
- [ ] **Climboria Trade Integrity Ledger:** estimate how much reported token activity appears organic versus potentially circular, self-funded, bundled or wash-like. Analyze same-transaction buy/sell loops, wallet clusters, repeated counterparties, funding links and suspicious timing. Publish the methodology, coverage and confidence; do not call a trade fake or accuse a wallet without sufficient evidence. This is especially relevant because recent investigations have highlighted large-scale questionable reported DEX volume; see the research note in the DEX reference list.
- [ ] **Climboria MEV & Execution Fairness Receipt:** after a confirmed swap, compare the user's quote and signed transaction with actual execution, block/slot ordering, price movement, priority fee and observable sandwich/front-run indicators where the chain exposes enough data. Explain what is provable versus merely suspected; show whether a different supported route or protection setting might have reduced exposure. Never promise MEV protection that the infrastructure cannot guarantee.
- [ ] **Climboria Market Dependency Stress Map:** map material dependencies behind a token's apparent market health: major liquidity pools, concentrated LP positions, deployer/treasury-linked wallets, key funding sources, bridge or oracle dependencies where relevant, and correlated assets. Let users stress one dependency (for example, a major LP withdraws) and see which market metrics and exit paths may be affected. Avoid identity claims and clearly mark incomplete graph coverage.

### N9. Climboria Decision Intelligence System (CDIS) — OWNER-APPROVED UMBRELLA ARCHITECTURE (DESIGN ONLY)

**Proposed modules:** Discovery Engine → Token X-Ray → Trade Twin → Market Fork → Liquidity Mirage → Trade Integrity Ledger → MEV & Execution Fairness Receipt → Position Lifeline → Market Dependency Stress Map → Decision Receipt & Learning Loop.

- [ ] Present one coherent evidence-first workflow rather than a pile of disconnected dashboards.
- [ ] Every module must separate on-chain facts, off-chain claims, derived metrics, hypotheses and simulations.
- [ ] Every alert must show the trigger, evidence, timestamp, data coverage, uncertainty and why it matters to the user's saved plan.
- [ ] No fabricated order-book depth for AMMs, fake volume certainty, unsupported safety labels, guaranteed returns, or black-box buy/sell commands.
- [ ] All simulations must disclose assumptions and include realistic fees, slippage, failed transactions, liquidity constraints and missing-data behavior.
- [ ] Keep the system non-custodial by default. Users retain control of wallet signing and all trading decisions.
- [ ] Jarrell's Peak remains the active development priority. These DEX concepts are design backlog only; no DEX implementation begins until the game is fully polished and the owner explicitly reprioritizes it.


## 2026-11-03 — all-water-body swim depth regression coverage

- [x] Extended the Jarrell's Peak Browser Smoke diagnostics to audit all five registered water bodies (three freshwater basins, river and ocean).
- [x] Added checks for the expected surface swim offset, monotonic mid-depth/deep movement, seabed clearance, and clamping when dive input exceeds the allowed depth.
- [x] Assertions are additive; existing gameplay, movement, and visual checks are unchanged.
- [ ] Validate Climboria and Browser Smoke must pass on the resulting PR before this coverage is accepted.
- [ ] Physical Redmi 14 5G swimming and underwater visual acceptance remains open.


### 2026-11-03 — Mobile saved-hero smoke assertion repair

- Browser Smoke run `41648207838` failed at `.github/scripts/game-smoke.mjs:441` because the test hard-coded `document.documentElement.dataset.climboriaHero === 'adventurer'`, while the current saved-hero loader publishes the selected hero name dynamically and exposes authoritative readiness through `__climboriaReadiness`, `__climboriaGLBRenderer`, and `__climboriaCameraOrbit.heroUsesGlb`.
- Desktop Jarrell diagnostics in that run passed: world readiness, 182 chunks, five water-body depth audits, freshwater entry/exit, fishing interactions, collision audit, spawn-to-peak route, and original GLB movement states. Mobile gameplay smoke then timed out on the stale name assertion.
- Fixed the mobile smoke gate to require chunk/render/hero readiness, successful GLB renderer load, and a visible GLB hero; fallback/load-error states cannot pass.
- Repair commit: `8a1c15e805a9655b3d76308993c6d4acdf364350` on `codex/test-all-waterbody-dive-depths`.
- **Status: IMPLEMENTED — UNVERIFIED.** Validate and Browser Smoke must rerun and pass before PR #168 can merge. No gameplay runtime, world assets, approved hero asset, or `waitForFunction` implementation was changed.


## 2026-11-03 — CC0 rainforest placement diagnostics verified green (PR #169)

- [x] Added per-instance placement diagnostics without changing the existing strict acceptance assertion.
- [x] Validate run `41650874654` passed.
- [x] Browser Smoke run `41650874828` passed on desktop and mobile. Log confirms buttress 16/16, canopy 16/16, undergrowth 42/42, fallen logs 14/14; all four groups report `valid: true` and `invalid: []`.
- [x] Fishing interaction smoke passed for all eight coastal docks plus woodland pond, moonpool and sanctuary lake; freshwater movement entry/exit passed; collision audit reported 87 valid solids and no water overlaps; mobile diagnostics reported visible hero, HUD, map, settings and mobile controls.
- [x] Merged PR #169 at `db59fd36109d6e3e250e6758504da8aa1f3bb008`.
- [ ] Physical Redmi 14 5G visual acceptance remains open. Automated browser evidence does not certify real-device rendering.


## 2026-11-03 — live-site smoke HUD contract repaired and reverified (PR #170)

- [x] Diagnosed scheduled live-site smoke failure `41651569323`: Playwright timed out waiting for legacy `#zone` to become visible, although current gameplay intentionally hides the legacy HUD.
- [x] Updated the live-site test to assert actual readiness (`__climboriaGameReady`), active gameplay (`body.free`), visible player/status cards, health/stamina, map and settings; no runtime gameplay changes.
- [x] PR #170 merged at `dee1c94625b3e5ff019eb33f4e20aee168b6057f`; PR Validate `41652046809` passed.
- [x] Post-merge Validate `41652151971`, live-site smoke `41652151904`, Pages deployment `41652150568`, and current-main Browser Smoke `41651579697` passed.
- [ ] Live smoke reported `soundtrack:false`; current smoke does not fail on this optional field. Audio initialization/volume and the user's approved soundtrack remain an open manual/technical acceptance item.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — approved soundtrack gesture recovery merged (PR #171)

- [x] Kept the single approved `game/assets/music/TRACK_01.mp3`; no extra music track was added.
- [x] Exposed the existing audio element for diagnostics and retry playback after a real pointer/keyboard gesture if browser autoplay was blocked; retry listeners are removed after playback starts.
- [x] PR #171 Validate `41652748236` and Browser Smoke `41652748174` passed; merged as `cb7b9863cab6e1182c63bb2fb3742be6e7382b39`.
- [x] Post-merge Validate `41653566430`, Live Site Smoke `41653566407`, and Pages deployment `41653566488` passed.
- [x] Live smoke log explicitly reported `soundtrack: "playing"` after the settings-button gesture; game-ready state, active gameplay, player/status HUD, map/settings and canvas were also verified.
- [ ] Post-merge Browser Smoke `41653566399` was still in progress at the time of this update; recheck before marking the full post-merge suite green.
- [ ] Physical Redmi 14 5G audio/visual acceptance remains open.


## 2026-11-03 — cave lighting post-merge verification and next P0 action

- [x] PR #173 merged at `167cd24664510db80f864721c9a004a18f950fe0`; PR Validate `41657347964` and Browser Smoke `41657348026` passed.
- [x] Main Validate `41658107773` passed.
- [x] Pages deployment `41658174908` passed for documentation-updated main `40719c718b862c5d95b38a60a5ef2177da26b2dd`.
- [ ] Main Browser Smoke `41658107652` remains in progress at the gameplay smoke step; inspect its final conclusion before calling the full main suite green.
- [ ] Manual physical-device cave lighting verification on Redmi 14 5G remains open.
- [ ] Next P0 cave task: expand the existing compact connected cave (current 23 wall segments, one side room, annex and east branch) into a substantially larger connected multi-room maze. Preserve existing geometry/routes and smoke contracts; add real floors/ceilings/wall colliders, branching corridors and hidden rooms, then add an independently verified underwater room/hangout and trap activation/damage/respawn tests. Snakes/wildlife remain disabled until owner approval.
- [ ] Do not merge PR #165 wholesale: it remains open and divergent, and includes broad changes to `game/play.html`, hub, character-lab, customization, smoke workflow and multiple pages. Reconcile only required approved hub/hero-picker changes onto current main after inspecting each change and its tests.


## 2026-11-03 — cave maze expansion merged

- [x] PR #174 merged to main as `94db5c17de7a3c2b8c1e15bc4656b12bbf18bf92` after both required checks passed.
- [x] PR #174 Validate `41658934167` passed.
- [x] PR #174 Browser Smoke `41658934220` passed, including Jarrell's Peak desktop/mobile gameplay smoke stage.
- [x] Previous post-cave-lighting main Browser Smoke `41658107652` passed; main Validate `41658107773` and Pages deployment `41658639293` passed.
- [ ] Verify post-merge main Validate, Browser Smoke, and Pages deployment for merge SHA `94db5c17` before treating this change as main-deployed.
- [ ] Next cave P0: add underwater route/room and safe hangout/swimming area with collision/water-boundary checks; implement deterministic trap activation, damage and respawn tests. Keep snakes/wildlife disabled unless approved.
- [ ] Expand cave beyond the newly added west/north chambers toward the full large maze requirement; add readable navigation, additional branches, trap variants, hidden treasure chamber and reward odds safeguards. Do not claim the cave finished from the current two new chambers alone.
- [ ] Continue remaining Jarrell's Peak checklist without replacing the existing world. Physical Redmi 14 5G visual acceptance remains open.


## 2026-11-03 — latest workflow recheck and cave trap logic correction

- [x] PR #174 post-merge main Validate `41659750696` passed.
- [x] PR #174 post-merge main Browser Smoke `41659750658` passed on merge SHA `94db5c17`.
- [x] Pages deployment `41659785216` passed on docs-updated main SHA `5e0700f3`.
- [x] PR #175 Validate `41660175511` passed on initial trap-audit commit; that run's Browser Smoke `41660175702` was cancelled after a follow-up code correction, not a failure.
- [x] Root cause correction in PR #175: trap contact must compare the player's feet and animated spike height in cave-local vertical coordinates. The initial helper mixed world-space player Y with cave-local spike Y. Live gameplay now converts player feet into cave-local Y, and deterministic audit probes use local Y.
- [x] Updated PR #175 commit `85e4cb44e5e853db07513b05ef10950fba42c10e`; Validate `41660703787` passed.
- [ ] PR #175 Browser Smoke `41660703828` is running; require it to pass before merge.
- [ ] Main Browser Smoke and main deployment are green after PR #174; no outstanding failed workflow on current main.
- [ ] Remaining cave scope: full death/respawn behavior test, more maze branches and hidden chambers, underwater route/room/hangout, readable wayfinding, treasure/reward odds safeguards, and physical Redmi 14 5G verification. Current PR #175 only adds deterministic spike contact/damage contract checks; do not claim end-to-end trap/respawn completion.
- [ ] Next technical implementation should inspect the cave's actual vertical placement, terrain/water queries and collision model before adding an underwater chamber. Current world water plane is at Y=0 and freshwater/ocean registries are global; do not simply add a water mesh inside the cave without a coherent water volume, player swim query and collision boundaries.
- [ ] Keep existing world, UI, hero, and disabled wildlife intact. No snake/animal reactivation without explicit owner approval.


### Follow-up detail — PR #175 cave elevation and local trap coordinates

- [x] Cave group now sets `POI.cave.h = heightAt(POI.cave.x, POI.cave.z)` before placement; the cave smoke audit asserts finite `caveBaseY`. This prevents undefined terrain elevation from propagating into cave transforms and makes local/world vertical comparisons well-defined.
- [x] Spike contact helper now receives the player's feet converted to cave-local Y (`P.y - caveG.position.y - 1.75`) and compares against the animated spike's local Y. The prior helper version mixed coordinate spaces; its smoke run was superseded/cancelled after correction.
- [x] Latest PR #175 validation `41660997856` passed on commit `9ada31a2`.
- [ ] Latest PR #175 desktop/mobile Browser Smoke `41660997756` is still in progress; do not merge before it passes.
- [x] Main Pages deployment `41660802606` passed after this README's previous update; this new documentation update will trigger a fresh deployment.


### 2026-11-03 — PR #175 Browser Smoke diagnosis and rerun

- [x] Main Pages deployment `41661185235` passed on main SHA `3b31dcd4`; main Browser Smoke after PR #174 `41659750658` passed.
- [x] PR #175 validation on cave trap/elevation correction `41660997856` passed, but Browser Smoke `41660997756` failed at `.github/scripts/game-smoke.mjs:307` after the homepage, mobile navigation and desktop world diagnostics all passed.
- [x] Failure root cause: the smoke script used `Promise.all([page.waitForURL(...), locator.click()])` for a hub `<button>` whose click handler assigns `location.href`. The click itself waits for the navigation; the competing URL waiter timed out even though the browser had reached `game/play.html?level=11`. This was a test synchronization defect, not evidence of a gameplay exception.
- [x] Corrected the test on PR #175 commit `95516e99a44047347944341232a30707a8cfa5b1`: click the launch button, await document load, and independently assert pathname `/game/play.html` and query `level=11`, while retaining the no-retired-hero-query assertion.
- [x] PR #175 Validate `41661810220` passed on commit `95516e99`.
- [ ] PR #175 Browser Smoke `41661810197` is running the full desktop/mobile gameplay suite. Do not merge until it completes successfully.
- [ ] Cave trap acceptance remains incomplete: deterministic helper probes are not proof of live trap damage, death and sanctuary respawn. Underwater cave room/swimming hangout, further maze expansion, treasure odds/server authority and physical Redmi 14 5G visual acceptance remain open.
- [ ] Cave terrain elevation is now explicitly sampled with `heightAt` before positioning the cave group; do not build a water room by reusing the global sea-level water plane. Inspect the local cave water volume, swim query and collision design before implementation.


### 2026-11-03 — PR #175 merged; post-merge verification

- [x] Corrected PR #175 Validate `41661810220` and Browser Smoke `41661810197` both passed; merged with expected head SHA `95516e99a44047347944341232a30707a8cfa5b1` as `2d95a9c38cd254d34d084cab79dc567675ba5048`.
- [x] Main Validate `41663128185` passed on merge SHA `2d95a9c3`.
- [x] Pages deployment `41663127860` passed on merge SHA `2d95a9c3`.
- [ ] Main Browser Smoke `41663128171` is still running the desktop/mobile gameplay stage; recheck final result.
- [x] Superseded PR Browser Smoke failure `41660997756` was diagnosed as a Playwright navigation-waiter race and corrected in `95516e99`; the full corrected PR smoke passed.
- [ ] Actual live spike damage, repeated damage through death, Sanctuary respawn and post-respawn state are not yet end-to-end tested. Current cave trap smoke checks only geometry/contact probes and configured damage contract.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water system has five global water bodies at surface Y=0; cave group is terrain-anchored at `heightAt(POI.cave.x, POI.cave.z)`. A cave-specific water volume needs coherent query, swim depth, movement, boundaries, and collision; do not fake this with a decorative water plane.
- [ ] Continue P0 cave work with deterministic live trap damage/death/respawn verification, then implement the cave water volume and expand the maze. Preserve the current map and keep snakes/animals disabled.
- [ ] PR #165 remains open and divergent; reconcile only the approved hub/menu/hero-picker changes onto current main after individual diff and smoke review.
- [ ] Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — cave trap damage and Sanctuary respawn lifecycle verified

- [x] PR #176 Validate `41663885308` and Browser Smoke `41663884891` passed; merged with expected head `9ffc134920785b869555712f4c4cea3ab2d92aff` as `231d7815789b2d976c1722f336dfdca55357a551`.
- [x] Smoke-only lifecycle audit invokes the real `hurt()` function, verifies exactly 25 HP damage, then fatal damage, one `climboria:death` event, health reset, walk mode, Sanctuary coordinates `(0, -30)`, and terrain-grounded respawn height. The test restores original player, camera and free-mode state.
- [x] Post-merge main Validate `41664796949` passed.
- [ ] Post-merge main Browser Smoke `41664796906` is running; require a pass before marking full main verification green.
- [ ] Post-merge Pages deployment `41664795649` is pending; an earlier docs deployment `41663650284` is still in progress.
- [ ] Actual animated-spike contact through the live movement loop and trap reward delivery remain open; the lifecycle test exercises the real damage/death/respawn handler, not the full collision-to-damage path.
- [ ] Cave underwater route/room/hangout remains unimplemented. Current world water bodies share the global Y=0 water plane; do not add a decorative-only water plane. Implement a coherent cave-specific water query, swim depth, movement, boundaries and collision.
- [ ] Preserve the existing world and keep snakes/animals disabled. Physical Redmi 14 5G visual acceptance remains open.


### 2026-11-03 — latest workflow audit and PR #177 live spike-contact test

- [x] Current `main` PR #176 merge SHA `231d7815789b2d976c1722f336dfdca55357a551`: Validate `41664796949`, Browser Smoke `41664796906`, and Pages deployment `41665131699` all passed.
- [x] No failed workflow remains on current `main`. Pages runs `41665089617`, `41665030566`, and `41664795649` were cancelled as newer deployments superseded them; latest Pages deployment `41665131699` passed.
- [x] PR #177 Validate `41666014892` passed on head `4f227973f699c9a8ea449def08c7c095f3c357a2`.
- [ ] PR #177 Browser Smoke `41666014983` is still running the desktop/mobile gameplay stage; do not merge until it passes.
- [ ] PR #177 extends test coverage from direct damage-handler/death-respawn to the actual gameTick spike-contact-to-damage branch. It does not yet test a full human-controlled approach to a moving spike or reward delivery.
- [ ] Cave underwater room/swimming hangout, large connected maze expansion, hidden treasure odds/server authority and physical Redmi 14 5G acceptance remain open.
- [ ] PR #165 remains open and heavily divergent. Do not merge it wholesale; inspect and port only approved hub/menu/hero-picker changes to current main with fresh smoke coverage.
- [ ] Preserve existing map and keep snakes/animals disabled until the owner approves their return.


### 2026-11-03 — main workflow verification and connected underwater grotto implementation

- [x] PR #177 merged as `22d8df59fc807dac0d17cc391ac8075d5341ee4f`; its Validate `41666014892` and Browser Smoke `41666014983` both passed.
- [x] Post-merge `main` Validate `41667116031`, Browser Smoke `41667115287`, and Pages deployment `41667115942` all passed on `22d8df59`. No failed workflow remains on current `main`; older Pages runs `41666235089` and `41666201102` were cancelled as superseded deployments.
- [ ] PR #178 adds a walkable grotto directly west of the existing annex, a doorway, floor, walls, ceiling, rendered water surface, local lighting, and a cave-local bounded water body (`surfaceY = cave base + 2.8`, depth `2.5`) wired into the existing swim movement logic. Smoke asserts inside/outside water boundaries, surface height and depth, and the updated 41-wall cave collision contract.
- [ ] PR #178 Validate `41668368982` and Browser Smoke `41668368987` are queued; require both to pass before merge. If Browser Smoke fails, diagnose the actual failing assertion and correct the implementation without weakening checks.
- [ ] The grotto is implemented but not yet accepted: verify the player can enter/exit the water, dive/surface, remain above the floor, and move without wall/terrain clipping. Physical Redmi 14 5G visual acceptance is still required.
- [ ] The complete large cave maze, more hidden chambers, trap reward delivery/server-authoritative odds, and full world acceptance remain open. Preserve existing map and keep snakes/animals disabled.


### 2026-11-03 — cave grotto traversal and live swim controller verified on main

- [x] PR #178 merged as `544d5debccdf9b55b482b37faa801e9426a8337c`; PR Validate `41669267346`, PR Browser Smoke `41669267204`, and post-merge main Validate `41670314519`, Browser Smoke `41670314884`, Pages deployment `41670313977` passed.
- [x] PR #179 merged as `cd4d8bc8800698a8585bed11c7c5da9576144fb1`; PR Validate `41670872426`, PR Browser Smoke `41670871822`, and post-merge main Validate `41671895023`, Browser Smoke `41671895050`, Pages deployment `41671895388` passed. The diagnostic traverses annex-to-grotto and back through the actual movement collision path.
- [x] PR #180 merged as `53bc90cd097276e62cfdbcd912f3ca7c4dac9850`; corrected PR Validate `41674032425` and Browser Smoke `41674032335` passed. Post-merge main Validate `41675144465`, Browser Smoke `41675144851`, and Pages deployment `41675143704` all passed.
- [x] PR #180 first Browser Smoke `41672721544` exposed a real floor-query defect: the grotto's rendered/collidable floors were placed relative to the cave group, but `groundAt` still sampled the procedural terrain underneath. The diagnostic player was consequently initialized below the actual room floor. Corrected `groundAt` to return the placed cave floor height within the defined cave-room footprints; kept and strengthened floor-alignment, swim-surface, depth-clamp and bed-clearance assertions.
- [x] Live water-state logic is shared between per-frame gameplay and the smoke-only diagnostic. The audit verifies swim entry, surface settling, controlled dive, depth clamp, resurfacing, exit and swim-state reset. This is automated controller/path verification, not a substitute for hands-on gameplay review.
- [ ] Physical Redmi 14 5G visual/gameplay acceptance of cave lighting, grotto visibility, swimming feel, mobile controls and collision remains open.
- [ ] Continue P0 cave expansion: larger connected maze, additional branches and hidden chambers, readable navigation, deterministic trap/reward delivery and server-authoritative 3% rare-reward odds. Preserve existing map and keep snakes/animals disabled until owner approval.
- [ ] Continue remaining Jarrell's Peak P0 checklist; do not call the whole world finished based on cave smoke alone.


### 2026-11-04 — PR #181 hidden geode chamber review and workflow checkpoint

- [x] Re-read the canonical master plan and latest main commit `26f7b6b8e8cd054044684c35178a30cfb05aa44b`; the most recent completed main validation, browser smoke, and Pages deployment runs remain green: Validate `41675144465`, Browser Smoke `41675144851`, Pages `41675143704`. Their latest-attempt jobs were individually inspected and all completed successfully.
- [x] Reviewed the complete PR #181 diff. Scope is limited to `.github/scripts/game-smoke.mjs` and `game/play.html`: six-metre geode corridor, 12m x 12m chamber, matching floor/ceiling, six new wall segments with one removed east-room wall (expected net wall count 46), cave floor-height mapping, and deterministic route/floor/wall assertions.
- [x] Static geometry review confirms the east-room north opening connects to the new corridor; corridor side walls bound the six-metre passage; the chamber has south/east/north walls and a partial west wall that leaves the corridor entrance open. The test checks the geode route, east boundary blocking, and floor alignment.
- [ ] PR #181 must remain unmerged until its Validate and full desktop/mobile Browser Smoke runs complete successfully. The connector did not expose the PR head SHA or associated run IDs in this audit, so do not infer that its checks have passed from main's earlier green runs.
- [ ] If PR #181 smoke fails, inspect the exact failing step/log and repair the implementation or test contract without weakening assertions. Then rerun both required checks.
- [ ] After merge, verify new main Validate, Browser Smoke, and Pages deployment; record their actual run IDs and commit SHA here.
- [ ] Next cave priorities after #181: extend connected maze/hidden chambers; improve cave wayfinding and lighting; verify treasure placement and respawn; implement funded, server-authoritative 3% rare-reward logic. No token reward should be promised or minted without a funded, auditable source.
- [ ] Continue Jarrell's Peak P0 checklist in order: mountain approach/collision acceptance, full world interaction regression, UI/hero/HUD/fullscreen review, desktop and Redmi 14 5G hands-on acceptance. Keep wildlife disabled and preserve the existing map.
- [ ] Do not claim the entire world is complete from cave geometry smoke alone. Physical device review and remaining world acceptance are separate gates.

## 2026-11-04 — PR #181 geode chamber merged after green PR checks

- [x] PR #181 head commit `f793c3d1fc341e45ef4bcd60a140bf26c38818b0`: Validate Climboria run `41676389523` passed; all listed validation steps completed successfully.
- [x] PR #181 Browser Smoke run `41676389571` passed; the `browser-smoke` job completed successfully, including homepage CTA/DEX/mobile navigation and the full desktop/mobile Jarrell's Peak gameplay smoke step.
- [x] Merged PR #181 using the expected head SHA as squash merge `fb3f2d0c36455e3958a5a9bdffc419ce8dc24f4f`. Scope adds the connected geode corridor/chamber, cave floor mapping and deterministic passage/floor/collision assertions. No unrelated map, wildlife, hero, or UI changes were included.
- [ ] Post-merge main Validate, Browser Smoke and Pages deployment still require fresh run-ID verification. The available commit-run lookup exposes PR-triggered runs only and returned no post-merge push runs for this merge SHA; do not infer deployment success from the green PR checks.
- [ ] Next P0: continue the connected cave maze/hidden-room expansion and improve wayfinding/lighting; then verify treasure placement/respawn and implement funded, server-authoritative 3% rare-reward logic with anti-exploit safeguards.
- [ ] Continue Jarrell's Peak acceptance in order: mountain approach/collision, full world-interaction regression, UI/hero/HUD/fullscreen, desktop and physical Redmi 14 5G. Preserve the current map and keep wildlife disabled until owner approval.

### 2026-11-04 — cave treasure/respawn implementation audit

- [x] Inspected the current chest implementation in `game/play.html`: seven world chests are spawned (three fixed landmarks plus four randomized remote chests); opened chests hide and respawn after a randomized 90–150 second timer.
- [x] Identified a cave-specific gap: only one fixed cave chest is currently registered at the older cave coordinate; the newly merged geode chamber has no dedicated chest/treasure spawn or chamber-specific smoke assertion.
- [x] Confirmed current chest rewards are added to the browser's persistent local inventory. This is not a server-authoritative reward ledger and does not implement or secure the requested 3% rare-reward roll.
- [ ] Next implementation: add a reachable, floor-aligned treasure spawn inside the geode chamber; extend smoke coverage to assert chamber location, open/hide/respawn lifecycle and inventory result. Preserve existing seven chests and test contracts.
- [ ] Keep any 3% rare reward disabled/unpromised until there is a funded server-authoritative reward service, auditable randomness, anti-repeat/anti-exploit controls and a verified payout path. Do not simulate this with client-side Math.random or localStorage.

### 2026-11-04 — geode chamber treasure spawn implemented

- [x] Added a dedicated eighth world chest in the center of the hidden geode chamber at cave-local coordinates (54, 42).
- [x] Geode chest placement uses the cave floor elevation on initial spawn and every respawn; the other existing chest placement behavior is unchanged.
- [x] Extended Browser Smoke to assert the geode chest exists, is visible and unopened at startup, and its Y coordinate matches the cave floor audit.
- [ ] Await fresh Browser Smoke and Validate results for commits `8c96b46a2ac7570997859bb309541dcc94c2e61b` and `065b88ff98db511de9b0660e285cdd6d5b9e81b1`. The current GitHub connector exposes PR-triggered runs only; it returned no push-triggered run records/statuses for these main commits, so no green status is claimed.
- [ ] Follow-up: add an automated open/hide/90–150 second respawn/inventory lifecycle assertion; this change currently verifies spawn visibility and floor alignment only.
- [ ] Do not enable or advertise the 3% rare token jackpot until a funded, server-authoritative reward service and verifiable payout controls are implemented.


### 2026-11-04 — PR #182 geode chest lifecycle verification and 100-chest system specification

- [x] PR #182 head `df37813296f529bd4663308196cd365bf62f68e2`: Validate run `41696728129` passed and desktop/mobile Browser Smoke run `41696728185` passed. Both checks ran against the same PR head SHA.
- [x] Merged PR #182 as squash commit `263130638b5f0e9b3e94e672f8e137715f24a2c3`. The smoke-only geode audit verifies chest opening, inventory reward quantity (including stacked `qty`), hiding, 90–150 second timer bounds, respawn, and cave-floor alignment. This verifies the current single geode chest lifecycle only; it does not implement the planned 100-chest system.
- [x] Audited current main chest implementation before expansion: **8 chest instances currently spawn** — one cave chest, one geode chest, one summit chest, one ruins/landmark chest, and four randomized remote chests. Existing chest respawn is 90–150 seconds; randomized remote chests select a new position when placed, while fixed chests return to their fixed coordinates.
- [ ] New approved design: exactly **100 chests** = 84 randomized world chests + 15 cave chests + 1 permanent summit chest. The current cave and geode chests count toward the 15; existing world landmark chests count toward the 84.
- [ ] World chest respawn target: 90–150 seconds, newly selected valid location. Cave chest respawn target: 120–240 seconds, newly selected valid cave spawn. Summit chest: fixed location, globally shared 900-second (15-minute) cooldown after a successful claim.
- [ ] Proposed rarity tables and summit reward-class pool are recorded in `CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md`. These are design probabilities only, not live drop rates.
- [ ] Summit chest is planned as a contested solo/party/guild objective with one globally locked claim per cycle, shared countdown, winner announcement and reward history. The server-authoritative competition and claim system is not implemented.
- [ ] NFT and cryptocurrency rewards are disabled until a funded, auditable, server-authoritative reward and delivery service exists. Current inventory/reward handling is browser-local and must not be represented as secure token custody or payouts.
- [ ] Next implementation gate: design and test deterministic valid spawn zones and category counts before changing production chest spawning. Then add server-backed shared summit cooldown/claim locking before enabling PvP contest rewards.


### 2026-11-04 — PR #208 fishing pass and PR #209 mobile smoke diagnosis

- [x] PR #208 latest head `87b4e9a81cf3e5c909e991746a0ac5cced704f08`: Validate run `41819446009` passed and desktop/mobile Browser Smoke run `41819445973` passed. Fish silhouettes and submerged-clearance assertions are included in this tested head.
- [x] PR #209 cave head `763ca8b4bfecd78d27541fd4afe52ebba54434a3`: Validate run `41819048497` passed; Browser Smoke run `41819048434` failed at mobile GLB readiness wait in `.github/scripts/game-smoke.mjs:588` after 45 seconds. Desktop cave capture completed; mobile readiness did not satisfy the smoke contract. This is not evidence that the cave geometry itself failed.
- [x] Inspected the failed run log and captured mobile gameplay screenshot. Failure is specifically the conjunction of `heroReady`, `__climboriaGLBRenderer`, and `heroUsesGlb` not becoming true; the original log did not include the mobile state or console errors at timeout.
- [x] Added failure diagnostics and mobile console-error capture to the smoke test in commit `2d31f9ced302666c9a836bfa5fd95c30d8564644`. This preserves the 45-second readiness requirement and does not weaken the GLB acceptance check.
- [ ] Await fresh Validate and Browser Smoke runs for `2d31f9ced302666c9a836bfa5fd95c30d8564644`; no run for this commit was visible at the latest API check. If the workflow starts, inspect the detailed mobile diagnostic and repair the actual GLB readiness cause.
- [ ] PR #208 remains open pending separate visual acceptance of pond shoreline blending and natural character idle; passing automated smoke does not certify those visual details.
- [ ] PR #209 remains open and unmerged until fresh desktop/mobile smoke passes and cave entrance/interior screenshots are visually reviewed. Do not merge either PR solely on validation success.
