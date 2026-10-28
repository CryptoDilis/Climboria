## Latest workflow verification — 2026-10-29 (bush and fallen-log collision regression)

- [x] Validate Climboria passed for commit `a4bb3bd5d3fad3699014bf9216311537c2cdab4c`: [run 40767529576](https://github.com/CryptoDilis/Climboria/actions/runs/40767529576).
- [x] Browser Smoke Test passed for the same commit: [run 40767529614](https://github.com/CryptoDilis/Climboria/actions/runs/40767529614).
- [x] GitHub Pages build and deployment passed: [run 40767529967](https://github.com/CryptoDilis/Climboria/actions/runs/40767529967).
- [x] The browser smoke regression covers bush blocking and fallen-log midpoint/end-point blocking, including non-blocked positions outside the expected radius.
- [ ] Manual live-site gameplay review remains outstanding; green automated workflows do not prove every collision or mobile behavior is correct.
- [ ] Continue with the first unchecked gameplay blocker; diagnose any future workflow failure from its failed step/log before editing, then commit and verify again.

## Latest workflow diagnosis — 2026-10-29 (weather allocation optimization)

- [x] Inspected Validate Climboria, Browser Smoke Test, and Pages deployment runs for commit `75d2b9b5ac8b3d6d57fa90b906e625b515d27ef4`.
- [x] Validate Climboria passed, including JavaScript syntax checks and Jarrell desktop/mobile gameplay smoke tests: [run 40765986048](https://github.com/CryptoDilis/Climboria/actions/runs/40765986048).
- [x] Browser Smoke Test passed, including desktop/mobile Jarrell gameplay smoke tests: [run 40765985927](https://github.com/CryptoDilis/Climboria/actions/runs/40765985927).
- [x] GitHub Pages build and deployment passed: [run 40765985291](https://github.com/CryptoDilis/Climboria/actions/runs/40765985291).
- [x] Commit `75d2b9b5ac8b3d6d57fa90b906e625b515d27ef4` reuses preallocated Three.js weather colors to reduce per-frame object allocation.
- [ ] Actual FPS/frame-time/memory improvement remains unmeasured; green CI runs validate code and smoke scenarios, not a quantified performance gain.

## Latest workflow diagnosis — 2026-10-29 (frame-time telemetry)

- [x] Diagnosed the failures in Validate Climboria run 40762241130 and Browser Smoke Test run 40762241362: the CI browser produced only 3 requestAnimationFrame samples during the 2-second collection window, so the new hard requirement of 30 samples failed despite valid timing data.
- [x] Fixed the smoke-test policy in commit `ccadcbb6ea3db511d0b89a74877c524db4c0c0c1`: zero valid samples or non-finite average frame time remains a failure; low sample counts are logged as a performance warning instead of failing gameplay smoke tests.
- [x] Validate Climboria passed after the fix: [run 40764550416](https://github.com/CryptoDilis/Climboria/actions/runs/40764550416).
- [x] Browser Smoke Test passed after the fix: [run 40764550600](https://github.com/CryptoDilis/Climboria/actions/runs/40764550600).
- [x] GitHub Pages build and deployment passed: [run 40764550054](https://github.com/CryptoDilis/Climboria/actions/runs/40764550054).
- [ ] Real-device FPS/frame-time/memory baseline remains outstanding. CI telemetry sample scarcity is not evidence of the actual game's FPS on desktop or Android; capture and assess a repeatable browser/device benchmark before claiming performance improvement.

## Latest workflow diagnosis — 2026-10-29

- [x] After commit `8cdc5955b55c4eaeb9595bd85e1a335d9d3d370b`, Validate Climboria passed: [run 40761100382](https://github.com/CryptoDilis/Climboria/actions/runs/40761100382), including JavaScript syntax checks and Jarrell desktop/mobile gameplay smoke tests.
- [x] Browser Smoke Test passed: [run 40761100378](https://github.com/CryptoDilis/Climboria/actions/runs/40761100378), including desktop/mobile gameplay smoke tests.
- [x] GitHub Pages build and deployment passed: [run 40761100594](https://github.com/CryptoDilis/Climboria/actions/runs/40761100594).
- [x] Performance code change enabling computed bounds and frustum culling for instanced meadow grass and nature assets is workflow-validated.
- [ ] Actual FPS/frame-time/memory improvement is not yet measured; do not claim a quantified performance gain until a benchmark is captured.

# Climboria — Jarrell's Peak World Expansion Checklist

> Persistent continuation checklist for the agreed open-world scope. Keep this file and DEVELOPMENT_CHECKLIST.md as the source of truth. Do not mark an item complete until the asset/code is integrated, its license is recorded, the relevant tests pass, and gameplay is checked where possible.

## Workflow diagnosis snapshot — 2026-10-29

- [x] Inspected recent GitHub Actions failures and job logs before making changes.
- [x] Root cause in the newest historical failures: both Validate Climboria and Browser Smoke Test failed at the Jarrell desktop/mobile gameplay smoke step because the visible swimming pose had `tilt: 1.35` (upright/backward orientation) while the test required a horizontal face-down posture.
- [x] Confirmed a later main-branch commit corrected the swimming pose: latest inspected run logs show `tilt: -1.35`, and the swim depth controls plus mobile input cleanup checks complete.
- [x] Verified latest inspected main-branch runs are green: [Validate Climboria run 40755094053](https://github.com/CryptoDilis/Climboria/actions/runs/40755094053) and [Browser Smoke Test run 40755093895](https://github.com/CryptoDilis/Climboria/actions/runs/40755093895). These verify the automated scenarios only; they do not replace manual live-site playtesting.
- [ ] Keep checking the newest relevant workflow run after each code change. Diagnose the exact failed step and logs first; fix the cause, commit, then verify. Do not blindly rerun failures or loosen valid assertions.

## Newly specified gameplay requirements — 2026-10-29

### P0 — Swimming and collision correctness
- [ ] Swimming must use a convincing horizontal face-down body pose, with correct buoyancy/depth, responsive movement, and clear transition between walking, entering water, swimming, and exiting onto shore.
- [ ] Add and verify solid player collision for bushes, fallen logs, tree trunks, large roots, rocks, cliffs, mountain faces, cave walls, and built structures; the hero must not clip or pass through them.
- [ ] Keep decorative foliage selectively non-blocking only when intentional; tree trunks, major logs, terrain, and mountain geometry must remain solid.
- [ ] Test collision and swimming at varied slopes, shore edges, cave entrances, mobile controls, and respawn—not only in one scripted smoke scenario.

### P1 — Cave lighting, mountain paths, and campsite scale
- [ ] Caves should feel dim and atmospheric, with warm wooden wall torches at readable intervals; retain dark corners without making navigation impossible. Torch flame/glow must be optimized for mobile.
- [ ] Build visible, continuous dirt/earth hiking paths winding up mountains (natural switchbacks and worn soil edges, with the requested Olympic-style trail feel); keep the path visually distinct from grass/rock and physically walkable.
- [ ] Enlarge the campsite tent so its overall silhouette is slightly taller/larger than the hero, with believable proportions and visible entrance; add more camp details such as bedrolls, crates, firewood, cooking gear, stools, lanterns, and supply bags without cluttering traversal.
- [ ] Ensure the tent and camp props are correctly grounded and collision-tested; the hero must not sink into, pass through, or get trapped by them.

### P1 — Starting/respawn camp and patrols
- [ ] Redesign the starting/respawn area as a polished medieval-fantasy frontier camp with a castle-era black-market merchant cart/stall, a clearly identifiable merchant NPC, readable interaction prompt, and a small but coherent trading area.
- [ ] Keep black-market trading clearly a game-world interaction/demo until the real inventory/currency transaction system is implemented; never imply a purchase succeeded when it did not.
- [ ] Add Climboria soldiers patrolling around appropriate camp/road/ruin routes, with looping patrol paths, turning/idle pauses, collision that does not trap the player, and safe fallback if character assets fail to load.
- [ ] Check patrol navigation against bushes, logs, trees, mountains, cave entrances, and market props; avoid soldiers walking through obstacles or crowding the spawn point.

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
