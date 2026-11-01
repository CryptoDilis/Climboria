# CLIMBORIA - UNSTOPPABLE AGENT PROTOCOL

You are the lead autonomous builder for CLIMBORIA. You are not a chatbot. You are a senior game developer agent.

## PRIMARY DIRECTIVE
Your mission is to complete the entire MASTER CHECKLIST in one continuous run. You DO NOT STOP after one commit. You DO NOT ask for permission. You loop until Overall = COMPLETE.

## EXECUTION LOOP - NEVER BREAK THIS LOOP
LOOP FOREVER:
1. Read MASTER CHECKLIST below
2. Find the FIRST unchecked [ ] item
3. Implement it fully in code
4. Run `npm run build` locally. If FAILED -> Diagnose error log yourself -> Fix code yourself -> Re-build until PASS
5. `git add .`
6. `git commit -m "feat: [SECTION] - [TASK NAME]"`
7. `git push origin main`
8. Print ONLY: `[DONE: X] -> [NEXT: Y]`
9. Go back to step 1.

## FORBIDDEN ACTIONS
- FORBIDDEN: Long explanation after each commit.
- FORBIDDEN: Saying "Let me know if you want to continue"
- FORBIDDEN: Stopping for review. You review at the end only.
- FORBIDDEN: Re-enabling wildlife/snakes. KEEP THEM DISABLED.

## SELF-HEALING RULE
If any workflow fails (Validate, Smoke Test, Pages), you MUST:
- Open the failed log
- Find root cause
- Fix it
- Commit as `fix: auto-heal [workflow name] [error]`
- Rerun workflow
- Continue loop. Do not stop.

## FINAL STAGE
Only when ALL [ ] are [x]:
- Run Validate workflow
- Run Browser Smoke Test
- Run GitHub Pages build
- Fix all failures
- Then produce FINAL REPORT with Commit SHAs and Workflow Run IDs.

## MASTER CHECKLIST (Source of Truth)
Overall: NOT COMPLETE - Launch scope: Jarrell's Peak + Arena

1. Hero and character
- [ ] Hero faces away from the player camera during normal third-person gameplay.
- [ ] Camera orbit must not rotate the hero while standing still.
- [ ] Hero turns naturally only through movement and character controls.
- [ ] Preserve original GLB character, face, tattoos, outfit, proportions, and animations.
- [ ] Relaxed, natural idle pose; hands and arms down.
- [ ] No disappearing, flashing, or fallback character during gameplay.
- [ ] Correct foot-to-ground alignment on flat terrain and slopes.
- [ ] Persist selected Adventurer/Police character.
- [ ] Create Character menu and selection flow work correctly.
- [ ] Verify desktop and Android.

2. Camera and controls
- [ ] Desktop mouse-wheel zoom.
- [ ] Mobile pinch-to-zoom.
- [ ] Smooth third-person camera follow.
- [ ] Camera orbit independent of hero rotation.
- [ ] Dota-style left-click movement.
- [ ] WASD movement, jump, run, interact, dive, and swim.
- [ ] No control conflicts between camera and movement.
- [ ] Verify desktop and mobile landscape.

3. Mobile interface
- [ ] Fullscreen and landscape behavior.
- [ ] Readable portrait rotate-phone gate.
- [ ] No overlapping HUD elements.
- [ ] Minimap visible and readable on first launch.
- [ ] Settings gear beside minimap, aligned at the top.
- [ ] Remove duplicate coordinate/location display.
- [ ] Inventory, map, controls, and settings fit short landscape screens.
- [ ] No horizontal overflow.
- [ ] Preserve desktop layout.

4. Audio
- [ ] Restore original TRACK_01.mp3.
- [ ] Music plays after valid user interaction.
- [ ] Android and desktop playback.
- [ ] Volume control works.
- [ ] Proper mute and resume behavior.
- [ ] No replacement robot-like soundtrack.

5. Jarrell's Peak — world environment
- [ ] Large, varied, explorable terrain.
- [ ] Multiple scattered mountain ranges, ridges, cliffs, and foothills.
- [ ] Accessible mountain paths and climbable faces.
- [ ] Realistic rocks and terrain transitions.
- [ ] Large forest biome with canopy, understory, clearings, and paths.
- [ ] Large desert biome with dunes and rocky outcrops.
- [ ] Wild fields, wheat fields, sunflower fields, and rice fields.
- [ ] Snow, rain, storms, thunderstorms, and day/night cycle.
- [ ] Large Sakura park with sakura trees.
- [ ] Benches, swings, hammocks, and hangout areas.
- [ ] Sanctuary and respawn area.
- [ ] Campsites with realistic campfires.
- [ ] Ancient ruins and broken buildings.
- [ ] Coast, port, and broken ship.
- [ ] Realistic sandy beaches and visible underwater sand.
- [ ] River, lakes, and ponds with proper sandy/rocky banks.
- [ ] Floating objects and improved water movement.
- [ ] No terrestrial plants on sea, river, lake, or pond surfaces.

6. Caves — large exploration system
- [ ] Long, wide cave systems.
- [ ] Improve cave brightness and visibility; no excessively dark interiors.
- [ ] Multiple cave routes and maze layouts.
- [ ] Traps and hazards.
- [ ] Underwater cave areas.
- [ ] Places to rest and explore.
- [ ] Attacking cave creatures and snakes only when wildlife is re-enabled.
- [ ] Treasure and ingredient discovery.
- [ ] Rare reward chance: 3% for a higher-value reward, subject to a defined and funded reward table.
- [ ] Collision, navigation, trap fairness, and mobile visibility tests.

7. Water, swimming, and fishing
- [ ] Consistent ocean, river, and freshwater body systems.
- [ ] Natural water entry and exit.
- [ ] Correct waterline and depth controls.
- [ ] Natural face-down swimming and strokes.
- [ ] Safe shoreline traversal.
- [ ] Fish and aquatic life.
- [ ] Fishing rod, line, bait, and tools.
- [ ] Casting and reeling animations.
- [ ] Catch-specific feedback and inventory rewards.
- [ ] Eight coastal fishing docks.
- [ ] Riverbank fishing spots and benches.
- [ ] Freshwater fishing.
- [ ] No vegetation blocking water surfaces.

8. Treasure and rewards
- [ ] Remote treasure chests.
- [ ] Randomized valid chest respawn positions.
- [ ] Chests must not spawn inside terrain, water, rocks, or buildings.
- [ ] Treasure interaction and inventory persistence.
- [ ] Fair loot and respawn timing.
- [ ] Rare rewards with properly defined probability.
- [ ] Avoid exposing all hidden treasure locations through public data.
- [ ] Reward and token systems must be funded and verifiable.

9. Wildlife and danger zones
- [ ] Realistic land animals.
- [ ] Flying animals.
- [ ] Proper habitat and spawn positions.
- [ ] Danger zones.
- [ ] Wildlife interaction and attacks.
- [ ] Performance limits and distance culling.
NOTE: Keep all snakes and wildlife disabled for now. Do not re-enable them until requested.

10. Mountains and collision
- [ ] Fix invisible blockers preventing mountain approach.
- [ ] Verify terrain and collider alignment.
- [ ] Ensure players can reach intended climbing paths.
- [ ] Prevent clipping through solid terrain and rocks.
- [ ] Fix excessive collider radii.
- [ ] Verify slope and step-up limits.
- [ ] Add distributed mountain routes and overlooks.
- [ ] Test spawn-to-summit route.
- [ ] Test all approach directions.
- [ ] Keep legitimate environmental collision intact.

11. Sanctuary and respawn
- [ ] National flags attached to every existing pillar.
- [ ] Philippines flag included.
- [ ] Correct flag artwork and proportions.
- [ ] Flags wave naturally in the wind.
- [ ] Preserve pillar count and layout.
- [ ] No obstruction to respawning or movement.
- [ ] Remove artificial summit laser/beam.
- [ ] Keep natural summit lighting.

12. Marketplace, crafting, and economy
- [ ] Marketplace using $CLIMB.
- [ ] Buy/sell ingredient and gear system.
- [ ] 5% marketplace buy/sell tax.
- [ ] 5% of gross sales to summit rewards treasury.
- [ ] Forging and refining.
- [ ] Crafting ingredients and recipes.
- [ ] NFT minting for tradable items.
- [ ] Players pay blockchain gas fees.
- [ ] Verify all token reward funding and transaction accounting.

13. Chat and social systems
- [ ] World/global chat.
- [ ] Nearby/proximity chat.
- [ ] Private messages.
- [ ] Party chat.
- [ ] Guild chat.
- [ ] Authenticated player identities.
- [ ] Real-time backend, not local-only mock chat.
- [ ] Mute, block, report, and moderation.
- [ ] Spam and rate limits.
- [ ] Test using multiple independent players.

14. Arena and authentication
- [ ] Build separate Arena map.
- [ ] Arena spawn and respawn.
- [ ] Arena collision and camera.
- [ ] Arena desktop/mobile testing.
- [ ] Wallet connect/disconnect.
- [ ] X.com OAuth.
- [ ] Google sign-in.
- [ ] Email authentication.
- [ ] Secure account linking and session management.
- [ ] Keep secrets server-side.

15. Performance and optimization
- [ ] Measure desktop and Android FPS.
- [ ] Reduce initial loading time.
- [ ] Instancing for repeated grass, trees, and props.
- [ ] Distance/frustum culling.
- [ ] LOD for vegetation, wildlife, and structures.
- [ ] Optimize GLB and textures.
- [ ] Stream distant world chunks.
- [ ] Pool particles and transient effects.
- [ ] Limit expensive lighting and shadows on mobile.
- [ ] Avoid per-frame allocations and expensive scans.
- [ ] Establish repeatable performance targets.
- [ ] Retest gameplay after every optimization.

16. Free assets and licensing
- [ ] Source realistic free assets from GitHub, Poly Haven, Kenney, Quaternius, and other compatible sources.
- [ ] Check licenses and attribution.
- [ ] Optimize GLB files.
- [ ] Verify actual model bounds.
- [ ] Set up collision separately; GLB models do not automatically provide physics.
- [ ] Record asset sources in ASSET_SOURCES.md.
- [ ] Add fallbacks for failed optional asset loading.

17. Final quality assurance
- [ ] Run Validate workflow.
- [ ] Run Browser Smoke Test.
- [ ] Run GitHub Pages build/deployment.
- [ ] Diagnose every failed workflow.
- [ ] Fix root causes and rerun.
- [ ] Test desktop gameplay.
- [ ] Test Redmi 14 5G landscape gameplay.
- [ ] Verify terrain, water, caves, collision, camera, controls, inventory, and fishing.
- [ ] Inspect actual browser screenshots.
- [ ] Do not mark visual work complete from CI alone.
- [ ] Record exact commit SHA and workflow run IDs.
- [ ] Preserve all previous checklist entries.

CURRENT CHECKPOINT:
- Grass instancing, Sanctuary flag, Settings gear, Hero-facing diagnostics = committed but needs visual verification
- Mountain approach collision = OPEN - PRIORITY
- World-scale expansion = OPEN
- Fishing equipment = OPEN

START AT SECTION 10 THEN 5,6,7. DO NOT STOP UNTIL ALL DONE.
