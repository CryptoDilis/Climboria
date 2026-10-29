# Climboria — Realistic Environment Asset Sources

This file records candidate assets before integration. The source page is authoritative for license and download formats; re-check it when importing a file. Do not mark an asset integrated until its actual model/texture is in the game, its file size and license are recorded, and desktop/mobile loading is tested.

## Photorealistic rocks and cliffs

| Use | Asset | Source | License / notes |
|---|---|---|---|
| Hero boulders, trail-side rocks | Boulder 01 | https://polyhaven.com/a/boulder_01 | CC0. Weathered jagged surface with lichen/mineral streaks. Source lists 124K triangles and ~63 MB download, so reduce/retopologize and generate LODs before scattering. |
| Medium trail/forest boulders | Rock 07 | https://polyhaven.com/a/rock_07 | CC0. Weathered erosion-worn boulder; source lists 28K triangles and ~34 MB download. Preferred first candidate for a simplified GLB + LOD. |
| Large cliff faces | Mountainside | https://polyhaven.com/a/mountainside | CC0. Photogrammetry-style weathered cliff; source lists 288K triangles and ~64 MB download. Use only as a carefully optimized landmark, not repeated across the map. |
| Sandstone cliffs / stratified rock | Rock Face 02 | https://polyhaven.com/a/rock_face_02 | CC0. Layered weathered sandstone cliff; verify final format and size before import. |
| Shoreline formations | Coast Land Rocks 03 | https://polyhaven.com/a/coast_land_rocks_03 | CC0. Coastal boulders/pebbles; source lists about 2M triangles, requiring strong decimation before use. |

## Photorealistic surface materials

- Poly Haven Rock 3 (weathered seaside rock surface): https://polyhaven.com/a/rock_3
- Poly Haven Rock Boulder Dry (cracked, eroded stone PBR surface): https://polyhaven.com/a/rock_boulder_dry
- License terms for all Poly Haven assets: https://polyhaven.com/license — assets are CC0 and can be used commercially; attribution is appreciated but not required.

## Existing lightweight assets

- The Wild Between nature asset references used in-game: https://github.com/anandin/the-wild-between
- CC0Tree low-poly filler asset library: https://github.com/SkywolfGameStudios/CC0Tree — useful for distant filler only; not the target for photoreal foreground rocks.
- Poly Haven assets are the preferred source for hero rocks and PBR materials. Keep high-poly scans out of the main runtime until decimated, compressed, and tested.

## Integration / quality gates

- [ ] Download the chosen model in a browser-compatible GLB/glTF format and include required textures locally or through a stable, CORS-compatible host.
- [ ] Optimize mesh density, texture resolution, and LODs for mobile.
- [ ] Replace visibly toy-like rocks in the riverbank, trails, caves, and dry zones with optimized realistic models.
- [ ] Keep rocks grounded to terrain and align scale to the existing world units.
- [ ] Preserve collision behavior and test movement around/over each rock class.
- [ ] Record actual file sizes and license/source URLs in this manifest.
- [ ] Check desktop and mobile visual quality and performance before marking complete.

## Additional high-quality candidates verified — 2026-10-29

| Use | Asset | Source | License / notes |
|---|---|---|---|
| Natural broadleaf canopy | Jacaranda Tree | https://polyhaven.com/a/jacaranda_tree | CC0; natural branching and wide canopy. Source is very large (~584 MB at listed full download; 312K tris), so select a lower-resolution download and optimize before runtime use. |
| Desert tree / succulent | Quiver Tree 01 | https://polyhaven.com/a/quiver_tree_01 | CC0; photoreal drought-adapted tree. Source lists ~270K tris / ~313 MB; use a decimated LOD and low-resolution textures. |
| Desert ground | Sand 01 | https://polyhaven.com/a/sand_01 | CC0; dry compacted sand-clay with subtle footprints/cracks. |
| Dry soil / desert transition | Dirt Aerial 03 | https://polyhaven.com/a/dirt_aerial_03 | CC0; compacted dirt, gravel and small rock fragments; useful for broad dry terrain. |
| Forest floor | Forest Floor | https://polyhaven.com/a/forest_floor | CC0; leaf litter, twigs and granular soil; available resolutions include 1K/2K. |
| Sparse vegetation ground | Sparse Grass | https://polyhaven.com/a/sparse_grass | CC0; thin tufts over rough soil, useful as a forest-to-dryland transition. |

Use the 1K/2K maps for mobile, pack local texture files, and avoid loading full 8K/8K model downloads at runtime. Official license: https://polyhaven.com/license.


## Mountain and cave candidates for Jarrell's Peak — 2026-10-29

| Priority | Asset/source | License and fit | Integration/collision requirements |
|---|---|---|---|
| A — terrain landmark prototype | [Innerscene Mountain Peak (GLB)](https://www.innerscene.com/tools/library/3d-parts/mountain-peak-8437c866) | Listed as CC0; ~10.6 MB GLB; approximately 3.6 km × 3.6 km footprint with ridges, spurs, branching valleys and steep slopes. Good candidate to test as a distant/landmark mountain rather than blindly replacing the whole world. | Download and inspect the actual file, units, material and triangle count. GLB does **not** guarantee Three.js physics/collision is included. Generate a simplified collision mesh or authored collider from the static mesh, retain walkable routes, and test slope/edge/fall behavior before use. Confirm current source page/license again before import. |
| A — cave passages | [Kenney Modular Cave Kit](https://kenney.nl/assets/modular-cave-kit) | Official Kenney page identifies the pack as CC0 and lists 40 pieces; suitable for modular tunnels and chambers. | Pieces must be assembled into multiple separated cave regions around the map, not stacked into one cave hub. Add collision per passage/wall, open walkable floors, torch lighting, nav/route checks and cave-specific loading. The asset pack itself does not wire up gameplay physics. |
| B — lightweight cave geometry reference | [Cave and Crystal Caverns](https://3dassets.dev/packs/cave-and-crystal-networks) | CC0 1.0 pack with modular tunnel/bend/junction examples and small stated triangle counts. Stylized geometry may not match the photoreal target without material/art-direction work. | Treat as a prototype/reference option only. Verify visual style and individual files before integration; add collision and lighting in the game. |
| A — realistic rocky trail dressing | [Verdant Trail Props CC0 pack](https://hydethebooty98.itch.io/verdant-trail-props) | Photoreal CC0 models sourced from Poly Haven; includes rock faces, boulders, mountainside, roots, dead trunks, shrubs and grass. Pack is listed at ~268 MB, so do not import the whole pack blindly. | Select only necessary models; downscale textures, decimate heavy meshes, build LODs and colliders, and distribute assets by biome/region. |

### World layout rules for integration

- Jarrell's Peak must remain an endless-feeling exploration world with no summit or final level; mountain meshes are regional landmarks and traversable terrain, not a level-ending goal.
- Distribute mountains, cave entrances, ponds, ruins, forest clearings, fields, coastline and treasure regions across separate map zones with believable travel distances and transition terrain. Do not put every feature in one cluster.
- Replace broad flat ground with a coherent height field: rolling lowlands, ridges, gullies, sloped foothills, ravines, terraces, and distinct mountain masses. Visible terrain and player ground-height/collision queries must use the same height data.
- A static visual model is not automatically climbable. For every imported mountain, author or derive a collision surface, keep the collision aligned with the visible mesh, and validate reachable slope/path routes plus blocked cliff faces.
- Cave kits need explicit floor/wall collision, connected walkable passages, entrances that meet exterior terrain, and torches placed in several separate regions. Avoid invisible collision lids across entrances.
- Asset status remains **candidate / not integrated** until actual local files, license notes, optimized size, collision tests, desktop/mobile loading, and workflow results are recorded.

## GitHub terrain/world repositories audited — 2026-10-30

These repositories were reviewed as asset or implementation candidates. A repository-level software license does not automatically cover bundled art; per-asset terms remain authoritative. No files from these repositories have been imported by this audit.

| Repository | License evidence | Compatibility and useful scope | Decision / remaining checks |
|---|---|---|---|
| [anandin/the-wild-between](https://github.com/anandin/the-wild-between) | Root `LICENSE` is MIT for code. Its `assets/quaternius-nature/LICENSE.txt` separately identifies the bundled Standard Stylized Nature MegaKit portion as CC0 1.0 (68/116 pack models); the README describes the repo's curated 30 models and 15 textures. | Static Three.js r160 game; reports one `InstancedMesh` per nature model, 30 draw calls, adaptive DPR/LOD, day/night, lighting shafts, wildlife and mobile controls. This project is stylistically toon/stylized, not a realistic foreground-art match. The game repo currently loads Three.js 0.180.0. | Consider only specifically selected CC0 files after verifying each file's format, size, texture dependencies, orientation and collision bounds. No individual file format/size was verified in this audit. Reused code needs the MIT notice and a compatibility review. |
| [ZyFou/ProceduralTerrains](https://github.com/ZyFou/ProceduralTerrains) | Root `LICENSE` and `packages/procedural-terrains/package.json` identify MIT. Package README documents caller-owned Three.js ESM use and GLB/OBJ/heightmap/collision-map exports. | Strong terrain, mountain, water/cloud and performance-tooling candidate. Runtime peer dependency is Three.js `~0.185.1`; Climboria currently imports `three@0.180.0`. The package uses WebGL2 and has its own render pipeline for water/cloud effects, while the game has a custom renderer/loop and terrain/collision heightfield. | Do not add as a runtime dependency yet. Prototype exports offline first; check GLB/map coordinates, scale, file size, height samples against Climboria's `terrainHeightAt`, collision alignment, and mobile loading before integration. |
| [yusufmalikul/simple-3d-open-world](https://github.com/yusufmalikul/simple-3d-open-world) | README states MIT, but no root `LICENSE` file was present at the reviewed default-branch path. Treat source-code permission as unconfirmed until a license file or maintainer confirmation is available. | Three.js/Vite project (`three` `^0.169.0`) with seeded low-poly woods, instanced vegetation, hills, ponds/lakes, collision and a frame-time HUD. Climboria is a single-page Three.js game on 0.180.0, so the app is not a drop-in; features offer reference points for instancing and profiling. | Do not copy its code or treat its procedural meshes as cleared assets until license terms are made explicit. Visual style is low-poly and does not meet the realistic foreground target. |

### Audit-driven integration order

1. Prototype realistic mountain relief as a static heightmap/mesh export and compare the exact sampled surface against the existing game collision heightfield before using it in-world.
2. Select individual licensed vegetation/rock models only after file-level format, size, attribution and performance checks; keep stylized CC0 vegetation for distant filler if it fits art direction.
3. Extend the same prototype gates to pond/shore geometry, sanctuary/cave/campsite prop collision, wildlife rigs/animation, cinematic lighting and mobile frame-time budgets.
4. Keep all candidates in this register as **not integrated** until the actual local file, exact license, dimensions, file size, loading, collision and desktop/mobile evidence are recorded.

## Integration register update — 2026-10-30

- Pond basins, water sheets, rice-paddy vegetation, and the sanctuary shrine in the latest increment use existing/generated Three.js geometry and materials. No external model, texture, source code, or asset from the candidate repositories was copied or integrated, so the per-file license register above remains unchanged.
- Browser Smoke Test [run 40972540070](https://github.com/CryptoDilis/Climboria/actions/runs/40972540070) and Validate [run 40972540160](https://github.com/CryptoDilis/Climboria/actions/runs/40972540160) passed on `00fa18e`; these checks establish gameplay placement and regression coverage, not asset-license clearance or a Pages deployment.
- Next integration gate remains the mountain relief prototype: inspect mesh/collision alignment, file size, format, performance, and the exact license before any external asset is added.
