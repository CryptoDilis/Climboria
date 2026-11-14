# Climboria Game — offline optimized Meshy GLB visual QA (2026-11-15)

**Scope: GAME ONLY. All selected props are candidates, not deployed.** 46 uploaded sources led to 44 unique optimized GLBs. Candidate textures, materials and geometry were inspected in local VTK GLTF 2.0 offscreen previews from the actual optimized binaries (single fixed camera per model). This checks obvious silhouette/texture failures but is NOT in-game Three.js lighting/animation QA, a commercial license audit, or desktop/mobile FPS measurement.

## Guard replacement visual review
- **Azure Spear Guardian**: one armored spear/shield character, appears coherent in offline preview; original optimized file 1,182,140 bytes and 4,999 triangles. Recommended first NPC appearance candidate.
- **Medieval Warrior**: one armored spear-bearing character, appears coherent; optimized 521,924 bytes and 4,999 triangles. Recommended second NPC appearance candidate.
- **Medieval Guards**: visually **TWO soldiers together in one GLB**; cloning it over every existing soldier would double visual headcount and overcrowd the camp. Do not use as the 1:1 NPC replacement.
- Warrior in Armor, Heavy Armor Warrior, Plains Warrior: attractive but 18K+ triangles each; reserve for distinct future characters, not 17 copied basic guards. No owner guard models have verified skeletal animation.
- Ancient Guardian is a stylized tree figure in the actual render, not a human guard. Stone Guardian is a large stone/foliage statue; neither belongs in every soldier slot.

## Forest and mountain visual review
- **Accepted as proposed scenery only:** Apple Tree (lush, fruit visible), Elder Skywillow (near pond; desktop-only), Whispering Branches (dry branch atmosphere), Axio Tree, Lanterned Heart, Crimson Maple (distinct red foliage, desktop-only), Luminous Worldroot (large focal tree, desktop-only) and Icebound Summit (rock prop).
- **Do NOT automatically place:** Red Lauan has sparse/missing-looking canopy after optimization; Mushroom Tree looks overly cartoonish versus the requested realistic biome. Other trees with extreme clustering are distant-LOD candidates until real in-game close-range imagery is accepted. Vinebound Forest Corridor looks coherent but has >72K triangles, beyond the 65K desktop cap, so excluded from runtime selection.
- Gothic Stone Church looks like an abandoned ruin and can be reserved as an isolated desktop-only landmark, not a populated central camp building.

## Camp, cave and coast visual review
- **Proposed:** Nordic Teepee as one isolated camp structure; Primitive Cave Rock as a small off-route formation; Rustic Dock, Wooden Pier and Fisherman Dock House along separated coastal points; Sails of Midnight as a distant desktop-only silhouette.
- **Excluded for now:** Galleon Odyssey appears fragmented/distorted after polygon reduction; Mystic Crystal is visually cluttered and clashes with the realistic cave; Fireside Teepee Camp is a full multi-tent group and risks doubling existing camp density; Titanic and T-Rex are off-theme. Rainforest Stairway needs actual walkable collision/navigation work and is not safe as purely visual stairs.
- Landmark props are **noncolliding preview decor** in the optional loader. No new stage may obstruct the 100 chests, 12 pillars, cave mouth, 263m cave-to-coast path or player spawn.

## Staged safe runtime design

`assets/game/new_optimized/manifest.json`: **enabled=false**; 15 selected placement candidates, two approved single-figure guard candidates. `game/meshy-world-assets.js` enforces mobile max 2 active scenic GLBs, desktop max 4; mobile scenery geometry cap 35K triangles, desktop 65K; `desktopOnly` removes high-detail candidates from mobile request queue. No content or performance success on live website is claimed.

**Exact next:** owner uploads all five ZIP packs unchanged onto branch `game/meshy-asset-pipeline-2026-11-15` under `assets/game/new_optimized/`; importer verifies and commits all 44 binaries without enabling any; re-run exact-head CI, then capture real 3D desktop/mobile scene screenshots including guard spacing and shoreline approach, measure browser/Android FPS, draw calls and downloads, approve only visually coherent assets, retain fallback, then enable in a separately reviewed release change. Record all evidence and next actions in `docs/GAME_DEVELOPMENT_RECORD.md` and Game issue #463. No DEX/Swap/Launchpad/ClimbX modifications.
