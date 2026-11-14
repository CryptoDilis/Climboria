# Climboria GAME — Owner Meshy optimized assets (DRAFT)

**Important:** This PR does **not** contain the optimized GLB binary files yet, and changing the loader code is **not** proof of a live release.

## Offline optimization completed 2026-11-15 PHT
- User supplied **46 original Meshy GLB files**, including **2 byte-for-byte duplicated uploads** (Azure Spear Guardian and Fisherman Dock House).
- **44 distinct optimized models** were produced, totaling **87,664,552 bytes** versus **3,442,830,008 original bytes** for those 44 unique sources (97.45% bytes reduced).
- Source face counts **79,955,276 → 1,499,174** on the unique models (98.12% reduction).
- **44/44** passed structural GLB 2.0 validation, reloading, finite-geometry checks, <=100K polygon budgets and per-archive SHA-256 checks. This **does not imply** attractive textures, acceptable geometry at near distance, accepted commercial art rights or good browser/mobile FPS.
- The four multi-million-triangle source trees (Crimson Maple, Elder Skywillow, Luminous Worldroot, Hero Tree) were downsampled using spatial vertex clustering and nearest-source UVs; treat those **only as distant LOD proxies** until visual QA confirms no severe UV seams or collapsed foliage.

## Import steps (owner)
1. Download the five files `Climboria_Meshy_Assets_Pack_01.zip` through `Pack_05.zip` from the ChatGPT artifact message, **not** the old raw models.
2. On GitHub, open branch `game/meshy-asset-pipeline-2026-11-15` and upload each ZIP to **`assets/game/new_optimized/`**, without renaming.
3. Workflow `Game Import Verified Optimized Meshy GLB Packs` validates bounded GLB assets and imports the individual GLB files, deleting the ZIPs from GitHub. Its bot pushes may not retrigger default PR CI; add a manual docs checkpoint commit afterward if needed.
4. Check the Game-only PR #466 against exact-head Validate, Browser Smoke, full Jarrell's Peak gameplay, guard/source visual QA, all needed new biome snapshots, cave/shore route, 100 chests and 12 Sanctuary pillars.
5. Confirm proper art rights and physical Android FPS/thermals. Only then change `manifest.json.enabled` to true on the reviewed branch and merge when full Game CI and Pages acceptance pass. Never force release on merely green static checks.

## Design / performance
- The new loader is **off** until `manifest.json.enabled` is intentionally true; originals remain as fallback.
- Existing procedural soldier groups retain behavior, location and animation timing. Their visible appearance may be replaced by lightweight static Medieval Guards/Warrior models after binary and visual QA. No imported guard has a verified rig.
- Optional decor is distance-loaded (max 2 resident scenery GLBs mobile, 4 desktop), and out-of-range models are disposed to keep memory bounded.
- Sample curated placements: park/forest trees, camp teepee, summit rock, separate mystical grove, coastal docks/ship. Placement **not accepted until screenshots and no-block testing**.
- Other optimized assets remain in the downloadable packages but do **not** auto-appear in the world. Deliberately exclude off-theme/difficult-to-place objects (T-Rex, Titanic liner, ambiguous exports) unless a cohesive zone is explicitly approved.
- No changes whatsoever to DEX, Swap, Launchpad or ClimbX; no original Hero GLB, chest GLBs or existing map-collision logic overwritten.

## Release status
**NOT LIVE / NOT INTEGRATED**, because no binary ZIP has been transferred into GitHub and no production/browser/device acceptance has passed.
Tracking: issue #463, draft PR #466, `docs/GAME_DEVELOPMENT_RECORD.md`.
