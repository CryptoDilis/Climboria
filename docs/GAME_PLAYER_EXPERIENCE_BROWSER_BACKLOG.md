# Climboria Game — Player experience, retention and browser-first master backlog

Owner-approved additions: 2026-11-27 PHT. Status: APPROVED BACKLOG, NOT IMPLEMENTED by this record. Game-only scope. This is the detailed P4 expansion linked from the canonical root README master checklist; retain all existing Game development records, world-expansion requirements, bugs, and release gates.

## Reconciled baseline (2026-11-27)

| Existing work | Evidence / status | Outstanding |
|---|---|---|
| Playable Jarrell's Peak core | Existing browser gameplay; desktop/mobile automated smoke passed on #930 head e0177f25205b21d98d8f9123a8f0fd5a39d426ab, runs [Validate](https://github.com/CryptoDilis/Climboria/actions/runs/45949794874) and [Gameplay](https://github.com/CryptoDilis/Climboria/actions/runs/45949794998); merged cb7257ffd5e2e4d0f4a1d4428ed7a7265717082e | Full physical Android/iOS/desktop acceptance, individual historical bug reconciliation |
| Terrain, river, fishing, swimming, caves, chests and local inventory | Existing mechanics and automated checks; #178/#179/#180 grotto/swim work recorded in README | Full world/biome/shore/cave manual acceptance, authoritative persistent loot and inventory; no assumption every historical checkbox is closed |
| Starting pillar collision | #698 merged a6b792ace047359b5ad23ec69c525e5b580db4a7, seven green workflows, gameplay 45343480716 | Live physical collision acceptance |
| PC right-click and mobile chat | #810 merged a58c7cf468d66ffb42355c9db2dd45627a1676bb, eight green workflows including 45770106790 | Real chat delivery and physical interaction acceptance; preserve existing controls |
| Registered multiplayer pilot | #745 deployed readiness 45569973528 passed, public client and room readiness including Nearby Chat verified | Actual distinct-account bidirectional avatar/movement, World/Nearby Chat, reconnect/last location, no fake presence |
| Combat authority/browser GLB | #922, #925, #928 and #930 merged; latest #930 exact-head two workflows green above | Authored private pilot room and renderer integration, authorized edge QA, physical performance, production PvP remains off |
| World-drop/loot | Isolated synthetic atomic claim and inventory tests documented in GAME_DEVELOPMENT_RECORD; #843 strict eligibility merged | Real durable inventory, atomic grants, replay/ownership/anti-exploit validation; no public loot grant |
| Arena / Marketplace / Inventory / rewards | Arena future map, marketplace preview, local inventory preview; Base-first future onchain economy approved | Persistent ownership, marketplace, funded rewards, Base token and secure settlement gates, no live payout claim |
| Legacy backlog | README sections A–G, mobile launch bug list and CLIMBORIA_WORLD_EXPANSION_CHECKLIST.md remain authoritative historical requirements | Reconcile each item against exact evidence before closing; do not blanket-mark completed |

## Non-negotiable product direction

- Browser-first, no mandatory download, no wallet required for ordinary gameplay. Preserve existing authentication and guest access policy; do not imply guest multiplayer is already supported.
- Jarrell's Peak is an endless-feeling survival and treasure-hunting world, no summit/final level. Arena remains the only separate planned world. No redesign of existing map, menu, combat, controls or safe-zone rules by this documentation. Reconcile original no-safe-zone intent and current Sanctuary restrictions before changing either.
- Enjoyable gameplay first; no required financial rewards, paid random chests, pay-to-win, punitive streaks or mandatory daily logins. Optional adventures and meaningful nonfinancial unlocks.
- Base is intended for future verified digital ownership and reward settlement, not every movement/combat action. Keep financial/marketplace/token features gated. No chain deployment authorized.
- Reuse existing assets/world/Three.js and server stack where practical. Check existing implementation before adding duplicate systems.

## R0 — Stability and accessibility (dependency gate)

- [ ] R0.1 Close current #930 follow-up: separate authored private pilot room/renderer integration; keep fixed synthetic preview unchanged; account/origin/room gates, rate/cost controls, authorized edge QA. No public PvP/loot activation.
- [ ] R0.2 Complete real registered two-account acceptance for movement, avatars, World/Nearby Chat, reconnect, last location and logout/ghost cleanup.
- [ ] R0.3 Reconcile existing hero/animation/scale, stamina/damage, pillar/terrain/cave collision, mobile HUD, camera, audio, map, weather, loading and saved-state bugs with master checklist and exact CI/device evidence.
- [ ] R0.4 Establish measured desktop, low-end Android, Redmi 14 5G and iPhone/Safari baselines; measure cold/warm time-to-play, transfer bytes, peak memory, frame-time/FPS, thermals, long-session stability, WebGL context loss and reconnect.
- [ ] R0.5 Reuse world streaming, load/unload chunks and nearby actors; LOD, frustum culling, instancing, pooled effects, bounded AI/ticks and bandwidth; measure rather than assume improvements.
- [ ] R0.6 Optimize GLB/textures/audio with approved source backups, licensing, compression compatible with existing loader, caching and lazy loading; don't remove approved artwork/animations or hide loading failures.
- [ ] R0.7 Adaptive quality presets Ultra Low/Low/Medium/High/Ultra with manual override; proposed 30 FPS low-end and 30–60 midrange, 60 high-end targets only. WebGL compatibility first; WebGPU optional future path, never a requirement. Graceful degradation, no forced graphics downgrade without clear feedback.
- [ ] R0.8 Establish bounded server processing for authoritative multiplayer, inventory, events, rewards, AI where required; client renders/interpolates. Set real cost, per-room, entity, and payload limits after measurement.
- [ ] R0.9 Optional PWA install/home-screen experience after core browser acceptance; keep direct browser access; test cache/version/offline error handling, no offline authority or fake multiplayer.

## R1 — First adventure / discovery (highest new player-experience priority)

- [ ] R1.1 First 10-minute adventure: 0–1 create/select hero; 1–3 visible mystery near spawn; 3–5 traversal/environment challenge or approved beginner enemy; 5–7 useful starter item; 7–10 skill feedback and clue toward a bigger adventure. Timing targets, not forced script.
- [ ] R1.2 Optional short mini quests and clue-led hidden discoveries: caves, hidden entrances, traps, ruins, lost expeditions, mysterious tracks, abandoned camps, landmarks.
- [ ] R1.3 Treasure maps and map fragments, readable discovery journal, environmental lore through letters, symbols, artifacts and connected stories; avoid revealing hidden chests prematurely.
- [ ] R1.4 Reuse existing rarity chest system and publish odds before any reward release; materials, outfits, gear, artifacts and useful nonfinancial starter items. No guaranteed rare or monetary rewards; no real grant until authority is ready.
- [ ] R1.5 Acceptance: skip/revisit introduction, desktop/touch controls, no blocking modal or forced wallet, resume after reload, no duplicated grants, actual new-player playtest and voluntary feedback. Measure time to first discovery and optional return rates without intrusive telemetry.

## R2 — Living world and dynamic events (critical)

- [ ] R2.1 Server-defined event scheduler with bounded active events, deterministic test seeds, region-local activation, cooldowns, expiry, restart/reconnect and no duplicate grants.
- [ ] R2.2 Start with lightweight Falling Star, Lost Expedition, Secret Passage, Wandering Merchant and discovery events using existing landmarks/assets.
- [ ] R2.3 Treasure Storm, Blood Moon, weather-driven encounters, Ancient Awakening/world-boss events only after appropriate loot/AI/combat gates. System-generated events need no manual admin action per occurrence.
- [ ] R2.4 Region difficulty and secret encounters; no forced linear progression. Event visibility and World Chat notices must respect rate limits and user preferences.
- [ ] R2.5 Test event fairness, reachable paths, bounded spawn count, performance and no impact on existing controls or quests.

## R3 — Skill and character progression (critical)

- [ ] R3.1 Skill mastery from validated activities: climbing, strength/combat, endurance, swimming, fishing, survival, crafting and treasure hunting. No final level requirement, balanced unlocks, anti-grind and anti-cheat.
- [ ] R3.2 Equipment, armor, accessories and climbing gear, item stats, equipping and upgrades; no unapproved hero redesign.
- [ ] R3.3 Crafting recipes/materials, unlockable outfits/hairstyles/accessories only if asset supports them, personal artifact/trophy collections.
- [ ] R3.4 Durable authenticated progress/inventory with atomic updates, migrations, reconnect, replay protection, ownership and isolation; guest/local preview remains clearly separate.
- [ ] R3.5 Acceptance: first mastery unlock, meaningful choices, no pay-to-win, deterministic balance tests, no fabricated inventory.

## R4 — Wildlife, enemies and bosses

- [ ] R4.1 Passive/aggressive wildlife, approved hostile NPCs and cave guardians; reconcile older disabled snake/animal rules before specific creature reactivation. No unauthorized reintroduction of retired assets.
- [ ] R4.2 Bounded region-local AI, navigation, attack telegraph, damage/health/stamina authority and respawn; preserve mobile performance.
- [ ] R4.3 Solo encounters and optional cooperative world bosses; loot eligibility and fair contribution rules, no financial rewards without separate approval.
- [ ] R4.4 Start with one small creature/challenge and expand only after physical device measurements and actual player feedback.

## R5 — Multiplayer and social exploration

- [ ] R5.1 Friends/online status and party invitations, explicit join/leave, cooperative exploration and missions, rescue/revive with abuse protection.
- [ ] R5.2 Direct item trading with two-sided confirmation, atomic ownership and replay prevention; no financial trade until separate review.
- [ ] R5.3 Guilds, rivalry/encounter history and moderation (mute/block/report/anti-spam/privacy). Preserve existing World/Nearby Chat; private messaging after moderation review.
- [ ] R5.4 Personal customizable campsite, tent/campfire, crafting station, decorations and trophy display; no invulnerable zone or permanent world claims without explicit policy.
- [ ] R5.5 Separate Arena, free-for-all, guild battles, spectators and sponsored tournaments remain existing future scope; verify capacity before any concurrency claim.

## R6 — Reasons to return (optional, non-punitive)

- [ ] R6.1 Optional rotating daily adventures and weekly expeditions/challenges, no mandatory streaks, no lost progression for absence.
- [ ] R6.2 Seasonal activities, artifact/lore collections, permanent personal milestones and community exploration challenges.
- [ ] R6.3 All-Time/Weekly Top Gainers only with verified scoring, published eligibility and funded reward rules where applicable; no summit ranking or badge redesign.
- [ ] R6.4 Playtest repeat visits and satisfaction, review content freshness, performance, fairness and opt-out; avoid coercive engagement or crypto speculation.

## R7 — Base-powered economy (long-term / existing security gates)

- [ ] R7.1 Future Base wallet linking, verified ownership, marketplace/crafting settlement and optional onchain actions; preserve offchain play and ordinary authentication.
- [ ] R7.2 Preserve existing fee/funding design until separately reviewed; authoritative inventory and secure settlement, funded reward ledger and independent security review before any real funds.
- [ ] R7.3 Verify token/migration readiness separately; no Base CA, holder allocation, reward or NFT claim inferred from game planning.

## Handoff order

Current immediate task is R0.1 (after #930 merged), with real pilot/device acceptance in parallel where authorized. R1 then R2 then R3/R4/R5/R6 in small tested slices; R7 remains gated. Low-cost nonfinancial R1 discovery work may be prepared in isolation while operator-dependent QA is pending, but never skip existing release gates or claim live. Every cycle: inspect current main and existing features, record exact PR/SHA, terminal CI, real device/production evidence, remaining blockers, and next exact action in GAME_DEVELOPMENT_RECORD.md. No changes to DEX, Swap, Launchpad, ClimbX, token contracts or homepage.
