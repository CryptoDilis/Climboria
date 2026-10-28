# Climboria — Jarrell's Peak World Expansion Checklist

> Persistent continuation checklist for the agreed open-world scope. Keep this file and DEVELOPMENT_CHECKLIST.md as the source of truth. Do not mark an item complete until the asset/code is integrated, its license is recorded, the relevant tests pass, and gameplay is checked where possible.

## Workflow diagnosis snapshot — 2026-10-29

- [x] Inspected recent GitHub Actions failures and job logs before making changes.
- [x] Root cause in the newest historical failures: both Validate Climboria and Browser Smoke Test failed at the Jarrell desktop/mobile gameplay smoke step because the visible swimming pose had `tilt: 1.35` (upright/backward orientation) while the test required a horizontal face-down posture.
- [x] Confirmed a later main-branch commit corrected the swimming pose: latest inspected run logs show `tilt: -1.35`, and the swim depth controls plus mobile input cleanup checks complete.
- [x] Verified latest inspected main-branch runs are green: [Validate Climboria run 40755094053](https://github.com/CryptoDilis/Climboria/actions/runs/40755094053) and [Browser Smoke Test run 40755093895](https://github.com/CryptoDilis/Climboria/actions/runs/40755093895). These verify the automated scenarios only; they do not replace manual live-site playtesting.
- [ ] Keep checking the newest relevant workflow run after each code change. Diagnose the exact failed step and logs first; fix the cause, commit, then verify. Do not blindly rerun failures or loosen valid assertions.

## P0 — Finish the current playable world before expanding further

- [ ] Manually play the deployed Jarrell's Peak on desktop and Android/mobile.
- [ ] Confirm character grounding, terrain collision, trees/rocks/buildings collision, and walkable uphill movement.
- [ ] Confirm swimming pose is horizontal, water depth controls work, and the character can enter/exit the water without sinking into the riverbed or getting stuck on the bank.
- [ ] Confirm starting camp, camera, controls, respawn, and fishing access.
- [ ] Record actual FPS/load/memory symptoms before optimization; preserve screenshots/logs when a regression appears.

## P1 — Caves, ponds, and exploration

- [ ] Add multiple ponds in different regions, each with shoreline, depth, collision, and suitable freshwater fishing where supported.
- [ ] Build caves with entrances, tunnels, chambers, readable lighting, and reliable navigation/collision.
- [ ] Add cave traps with visible or discoverable cues, fair trigger ranges, reset behavior, and safe test coverage.
- [ ] Add hostile snakes that can attack the player with readable warning/attack/recovery behavior; ensure they do not spawn inside terrain or props.
- [ ] Add hidden routes, caveside treasure, remote landmarks, and rewards that encourage exploration without exposing hidden chest locations through client debug/UI.

## P1 — Park and sanctuary hangout areas

- [ ] Build a scenic player hangout park with sakura/cherry-blossom trees and a coherent landscaped layout.
- [ ] Add long benches, swings/hammocks, paths, lighting, and places for players to stop and enjoy the view.
- [ ] Build a separate sanctuary area with a calm atmosphere, landmarks/statues, and readable paths.
- [ ] Add statues and weathered ancient buildings/ruins with appropriate scale, grounded placement, collision, and environmental storytelling.
- [ ] Verify that park, sanctuary, seats, swings, and ruins do not block the main path or create invisible collision walls.

## P1 — Campsites, danger areas, and decayed battlefield

- [ ] Add believable campsites with tents, supplies, logs, cooking props, and realistic-looking fire with flame, glow, smoke, and safe performance.
- [ ] Keep fire visual effects optimized and avoid excessive transparent particles on mobile.
- [ ] Add clearly communicated danger areas with distinctive environment cues and suitable risk/reward.
- [ ] Add decayed soldier/battlefield remnants and abandoned military props as fictional, non-graphic environmental storytelling.
- [ ] Ensure every prop has appropriate collision or is deliberately non-colliding; do not block traversal accidentally.

## P1 — Coastal sea, port, fishing, and wreck

- [ ] Extend the world to a sea/coast on another side of the map if terrain/world layout permits.
- [ ] Add a believable port/dock with piers, mooring details, and shoreline transitions.
- [ ] Add a displayed wrecked ship as a discoverable landmark, with safe walkable access where intended.
- [ ] Implement marine fishing separately from freshwater fishing with suitable bait/catch tables and real success feedback.
- [ ] Test sea/shore collision, swimming, fishing interactions, loading distance, and mobile performance.

## P1 — Fields and biome variety

- [ ] Add open wild fields and natural grassland with varied height, density, and paths.
- [ ] Add wheat fields with believable rows and wind movement, optimized with instancing or lightweight geometry.
- [ ] Add sunflower fields as a visually distinct landmark, with varied heights and efficient rendering.
- [ ] Add snow-covered regions and believable snow/rock/vegetation transitions at suitable elevations.
- [ ] Add storm and thunderstorm weather in selected regions, including clouds, rain, lightning flashes, thunder audio, and safe visibility.
- [ ] Ensure regional weather is coherent and does not render expensive effects across the entire map at once.

## P1 — Wildlife and flying animals

- [ ] Source suitable free/open-source realistic wildlife and flying-animal assets from GitHub or their linked official repositories.
- [ ] Verify exact license, commercial-use permissions, attribution, redistribution terms, file format, rig, animation clips, scale, and download size before integration.
- [ ] Add realistic wild animals with species-appropriate idle, roaming, turning, fleeing, and hostile attack behavior where intended.
- [ ] Add flying animals (birds and other suitable creatures) with lightweight flight paths, distance culling, and sensible spawn habitats.
- [ ] Add attacking snakes as specified above; keep all wildlife away from invalid terrain/props and preserve frame rate.
- [ ] Record every integrated asset and license in the asset-source research log; provide graceful fallback if an optional model fails to load.

## P1 — Remote and randomized respawning treasure

- [ ] Place treasure/respawn chests in remote and less-frequently visited parts of the map as well as selected discoverable landmarks.
- [ ] Randomize eligible chest respawn locations within valid authored zones; validate terrain height, slope, water distance, and obstacle clearance before activating a spawn.
- [ ] Prevent chest spawning inside rocks, trees, caves walls, water, buildings, or unreachable terrain.
- [ ] Use fair respawn timing and loot rules; do not promise rare loot or token rewards without a verified reward/funding system.
- [ ] Ensure discovery does not reveal all hidden chest locations to the player through public data or debug UI.
- [ ] Test chest interaction, despawn/respawn, duplicates, and mobile UI feedback.

## P1 — Mountains, peaks, overlooks, and hangout summit

- [ ] Add several walkable/explorable mountains beyond the existing terrain, with paths and believable slope transitions.
- [ ] Ensure selected mountains have accessible peaks and panoramic overlooks with intentional sightlines.
- [ ] Create one mountain destination specifically designed as a scenic hangout, not a level-ending summit.
- [ ] Preserve Jarrell's Peak's endless exploration identity: no final summit, no final level, and no completion point.
- [ ] Test walking/climbing routes, fall recovery, collision at ridges, and performance while viewing distant terrain.

## P2 — World chat and other chat channels

- [ ] Implement real World/Global Chat, not a local-only visual mockup.
- [ ] Implement proximity/nearby chat, private messages, party chat, and guild chat as applicable.
- [ ] Use authenticated player identities, a real messaging transport/backend, delivery/reconnect handling, and server-side authorization.
- [ ] Add mute, block, report, moderation, spam/rate limits, message length limits, and mobile-friendly channel switching.
- [ ] Test with at least two independent browser sessions and verify channel isolation and proximity boundaries.
- [ ] Document provider cost/free-tier limits before choosing a multiplayer/chat backend.

## P2 — Cinematic polish across the whole map

- [ ] Establish a cohesive cinematic art direction for lighting, sky, fog, color grading, water, vegetation, and terrain materials.
- [ ] Add context-sensitive ambient sound for forest, caves, coast, campfire, storms, wildlife, footsteps, swimming, fishing, and treasure interactions.
- [ ] Use restrained camera polish and environmental motion without compromising control, comfort, or visibility.
- [ ] Preserve the user's original music track and agreed music behavior; do not replace it with generated/synthetic music.
- [ ] Verify visual quality on desktop and Android/mobile; do not call a static screenshot proof of playable quality.

## P0 — Performance / anti-lag gate

- [ ] Measure baseline frame rate, memory, initial load, asset network requests, and frame-time spikes on desktop and a representative Android device.
- [ ] Use instancing/batching for repeated trees, grass, flowers, field plants, and other repeated props.
- [ ] Add distance/frustum culling and sensible LOD for trees, wildlife, flying animals, structures, particles, and distant landmarks.
- [ ] Use compressed textures/models where compatible; avoid oversized textures and duplicate copies of assets.
- [ ] Stream or lazily load distant regions and optional assets; the starting scene must remain playable if optional assets fail.
- [ ] Pool particles and transient effects; limit active wildlife, shadows, dynamic lights, transparent effects, and storm effects on mobile.
- [ ] Avoid per-frame allocations, repeated scene-wide scans, and expensive collision checks when cached/spatially indexed checks can be used safely.
- [ ] Keep collision and interaction spatial queries indexed and bounded; preserve ground/water correctness while optimizing.
- [ ] Add a low/medium/high graphics profile or adaptive mobile limits if needed, without hiding core gameplay features.
- [ ] Set practical performance acceptance targets, run repeatable desktop/mobile profiling, and record before/after results.
- [ ] Re-run collision, swimming, fishing, chest, and browser smoke tests after every optimization pass.

## P3 — Arena, then authentication integration tests

Do not shift focus to Arena until Jarrell's Peak's agreed world scope, stability, and performance gates are implemented and tested.

- [ ] Build the separate Arena map and its intended entrance/arena layout.
- [ ] Test Arena loading, collision, spawn/respawn, camera, controls, and desktop/mobile performance.
- [ ] Test wallet login/connect/disconnect and rejected/cancelled connection behavior; never expose seed phrases or private keys.
- [ ] Test X.com authentication using the supported official OAuth flow, redirect/callback handling, errors, and session logout.
- [ ] Test Google sign-in (the user's Gmail/Google account) using supported OAuth/OpenID Connect; Gmail is not a separate identity protocol.
- [ ] Test email login with secure verification/session handling and password reset if password-based authentication is offered.
- [ ] Verify account linking, duplicate identities, session expiry, logout, and clear error states across all sign-in methods.
- [ ] Keep all authentication secrets server-side; use environment secrets, never hard-code credentials in public client code.
- [ ] Run authentication tests in a safe test environment before enabling production account access.

## Commit and verification workflow

For each meaningful implementation batch:
1. Inspect current main/failed runs and relevant source before editing.
2. Diagnose from exact logs and reproduce the failure.
3. Fix the root cause without weakening valid tests.
4. Commit the smallest coherent change with a clear message.
5. Verify syntax, validation, desktop/mobile browser smoke, and deployment as relevant.
6. Update both this file and DEVELOPMENT_CHECKLIST.md with commit SHA, run URLs, and verified status.
7. Continue with the next unchecked blocker; do not stop after merely listing plans.

**Completion rule:** the requested world is not complete until each agreed feature has an implementation, license/source record where applicable, appropriate tests, and verified performance. Once the Jarrell's Peak scope and performance gate pass, proceed to Arena and then authentication testing.
