# Climboria Game — Five Owner-Supplied Rarity Chests

**Game-only status (2026-11-15 PHT):** Exact optimized binaries were generated and validated from five owner-uploaded Meshy GLB files **in ChatGPT**, but the connected GitHub text-file API cannot stream their binary bytes from the local container into this PR. This PR intentionally stays DRAFT, **NOT LIVE** until all five optimized GLBs are uploaded and exact-head tests pass.

Use these names and paths in this directory. Do **not** upload the ZIP as the game asset; extract it first and upload the five individual GLBs to the same Game branch `game/chest-rarity-glb-models-2026-11-15`.

| Tier | Owner upload | Release GLB | Original size | Optimized bytes | Optimized triangles | SHA-256 (optimized) |
|---|---|---|---:|---:|---:|---|
| Common | `common chest.glb` | `Climboria_Chest_Common.glb` | 35,109,024 | **1,358,448** | 25,999 (from 864,318) | `ef18bfd30eee4da3f6df06144c04acd0fc277089fbd729706b3c57d9caeefc7b` |
| Uncommon | `uncommon chest.glb` | `Climboria_Chest_Uncommon.glb` | 1,625,016 | **559,748** | 4,996 | `cacc85ac63792556c5907076fbcb1ce99b1be79c558ccc48f4b0d2fc67c08bdb` |
| Rare | `rarechest.glb` | `Climboria_Chest_Rare.glb` | 13,368,996 | **1,581,236** | 30,754 (from 197,888) | `96c8a4911312efdf1cbab974a4ec21b9f66b70c8556b645c7a502b83e7424d6f` |
| Epic | `epicchest.glb` | `Climboria_Chest_Epic.glb` | 3,891,296 | **1,208,104** | 17,000 (from 46,144) | `d74a80d50402458c5e2202c2d22d3d4fe413423aa1d70814a6312b6009d4ac60` |
| Legendary | `legendary chest.glb` | `Climboria_Chest_Legendary.glb` | 3,997,476 | **746,592** | 7,058 | `53a9e94a16db3977347981caad6aa7e8f213ee52cfb7166afd165744466a7fb4` |

Total optimized five-GLB payload: **5,454,128 bytes** (~5.45 MB), down from **57,991,808 bytes** (~58.0 MB) of source files. No rigging/animation (correct for stationary, closed chest props). All GLBs validated by glTF 2.0 structural parser and Trimesh (one mesh each, finite geometry and embedded textures). Face and UV simplification was applied only where needed; Common and Rare had large reductions. Base-color textures resized to 1024px, PBR maps to 768px or below, embedded into the optimized GLBs.

**Important visual QA caveat:** model geometry was algorithmically simplified, not manually re-sculpted; inspect screenshots for seam/shading/detail regressions before public shipping. The Rare source has unstable near-singular UV quadrics and therefore was optimized with topology-preserving vtkDecimatePro, not a UV-unstable quadric metric.

## Existing Game chest mechanics (no odds changed)

Exactly **100 existing spawn sites** are retained (84 world including ruins, 15 cave/geode, 1 summit). Their visual GLB is assigned by the same rarity as the **pre-rolled reward at spawn**, then stays consistent until opened. **Each respawn** re-rolls a new reward rarity using the original probabilities. This is a per-client single-player prototype; a genuine shared multiplayer economy needs a trusted server-side chest claim ledger to prevent replay/spoofing.

| Reward rarity | World | Cave/geode | Summit |
|---|---:|---:|---:|
| Common | 65% | 25% | 5% |
| Uncommon | 25% | 35% | 15% |
| Rare | 8% | 25% | 35% |
| Epic | 1.8% | 12% | 30% |
| Legendary | 0.2% | 3% | 15% |

In `game/play.html`, the five GLBs are loaded once only **after the game becomes interactive**, then GPU geometry/material references are shared across the chest scene clones. No new chest locations, collision solids, paid inventory, shop, or token logic were introduced. If a GLB fails to load, the old wooden placeholder stays visible; **but the release PR must not merge with an absent optimized asset**.

## Release gate and exact next action

1. Obtain the ZIP `Climboria_Five_Rarity_Chests_Optimized.zip` supplied in the ChatGPT conversation. Extract and upload **all five .glb files** under `assets/chests/` to **the PR branch**, not `main`.
2. Execute `node game/scripts/verify-rarity-chests.mjs`. This fails on any missing or altered GLB; its SHA-256 checks prevent substituting wrong source files.
3. Run `Climboria Rarity Chest GLB Acceptance` workflow (desktop/mobile browser checks for exact models, 100 existing locations, unchanged chances, reward/visual match, geode opening and respawn, screenshots). Verify the normal Game Validate, Browser Smoke, Jarrell/Lheiz, and full Jarrell's Peak Gameplay Smoke workflows also pass on the exact PR HEAD.
4. Manually review five source shapes, in-game screenshot scale, normals and textures, all rarity variants (legendary may not naturally spawn in a 100-chest sample), impact on mobile WebGL, and the owners' commercial permission for submitted artwork.
5. Only after passing, ready/merge the **Game-only PR**, verify successful GitHub Pages deployment and actual hosted Game, and write the merge SHA, CI IDs, live evidence, issues and next task to `docs/GAME_DEVELOPMENT_RECORD.md`.

Do not modify Swap, DEX, Launchpad, ClimbX, Jarrell/Lheiz hero binaries, or the separate unfinished Ella/NPC/multiplayer PRs.
