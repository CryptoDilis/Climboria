# Climboria Chest GLB Import — World / Cave / Summit

**Status:** Game-only source wiring prepared; the user mentioned named Meshy chest models, but **no new chest GLB binaries were visible** in the current conversation uploads, File Library search, or GitHub `main` tree as of 2026-11-15. Do not imply they were uploaded/installed or are live.

## Required assets (five tiers, not four)

| Tier | Target path | World odds | Cave odds | Summit odds |
| --- | --- | ---: | ---: | ---: |
| Common | `assets/chests/common.glb` | 65% | 25% | 5% |
| Uncommon | `assets/chests/uncommon.glb` | 25% | 35% | 15% |
| Rare | `assets/chests/rare.glb` | 8% | 25% | 35% |
| Epic | `assets/chests/epic.glb` | 1.8% | 12% | 30% |
| Legendary | `assets/chests/legendary.glb` | 0.2% | 3% | 15% |

These odds are exactly the existing `CHEST_RARITY_ODDS` source configuration in `game/play.html`. No odds were changed.

## Already wired on the Game integration branch

- Existing **100** locations preserved: 84 World (including ruins), 15 Cave/Geode, 1 Summit.
- Reward tier is **rolled on chest spawn** and stored on the chest record; the tier-painted placeholder and the final reward now refer to the *same* rarity and reward. On timer respawn, roll again, refresh visual and loot.
- Five distinct fallback colors are available now with **zero chest-GLB downloads**, so incomplete assets do not cause 404 errors or extend initial Game loading.
- World map shows a small number of **nearby unopened chest** markers, color-coded by already-rolled tier, rather than rendering 100 large icons permanently.
- Optional, future released GLBs will load **once per tier after gameplay starts**, share geometry/materials via cloned instances, fit the original chest footprint and work through respawns. The procedural fallback remains until each tier is installed and verified.
- No player wallet, reward ledger or multiplayer ownership changes; this is still the current local prototype loot.

## How to finish real GLB art integration (BLOCKING)

1. Supply the five original user-named GLB files and confirm which one is Common / Uncommon / Rare / Epic / Legendary. If filename names are already descriptive, map those precisely; do not guess.
2. Inspect the original files' SHA-256, triangles, textures, material count, license and intended closed lid/pivot. Optimize each for browser/mobile. Aim for **under 1 MB each, 5k triangles and 1k textures** if visual quality permits. No automatic geometry decimation without reviewing the resulting shape.
3. Upload the five **actual** optimized GLBs on this Game branch into `assets/chests/` with target names. The connected GitHub tool can edit text but does not stream binary local files, so a GitHub UI upload or a verified binary-capable workflow may be needed. Never mark a nonexistent file as released.
4. Change only the corresponding `CHEST_MODEL_ASSETS[tier].released` to `true` **after** confirming the file exists and passes GLB integrity, mesh/texture and rights checks. Verify that all five tier visual models are visible in a screenshot and that failed loads still preserve colored fallbacks.
5. Run exact-head `Jarrell's Peak Gameplay Smoke`, `Browser Smoke`, hero model regressions and the dedicated chest-model browser smoke. Confirm no 404/JS errors and preserved spawn counts, rarity odds, chest respawns and player interactions.
6. Update `docs/GAME_DEVELOPMENT_RECORD.md` with commits, PR, specific test run IDs, screenshots, known omissions and exact next task. Merge only after checks; then verify GitHub Pages deployment and the actual `climboria.fun/game/` URL.

**Do not** touch Swap, DEX, Launchpad or ClimbX. Do not call this feature's named GLBs installed until the binaries are actually in GitHub.
