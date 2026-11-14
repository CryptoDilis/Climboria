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

### GitHub-hosted realistic rock candidate — 2026-11-14 (not integrated)

- **Candidate:** `rock_moss_set_01.glb` in the GitHub-hosted [Papyszoo/CC0-Public-Domain-Models](https://github.com/Papyszoo/CC0-Public-Domain-Models) `polyhaven-nature-rocks` pack. The catalog identifies it as a Poly Haven nature-rock asset and lists a **5.8 MB GLB**.
- **License evidence:** the repository declares its bundled assets CC0 1.0, and the original [Poly Haven API/license documentation](https://github.com/Poly-Haven/Public-API) states the assets themselves are CC0. The mirror is a convenience source; the original Poly Haven record remains the authority at import time.
- **Decision:** **not imported.** A 5.8 MB opaque GLB has no verified triangle budget, LODs, texture dimensions, scale, collision bounds, or Redmi 14 5G result. It must be downloaded to a staging workspace, inspected and simplified before it can be bundled or requested at runtime.
- **Current implementation:** the map-polish branch uses only deterministic, locally generated mineral color/bump maps on the existing decorative terrain-rock instances. It adds no network asset dependency, no terrain/collision change and no third-party bytes.


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


## Expanded cave asset research — 2026-11-02

| Priority | Asset/source | License and verified specifications | Integration requirements |
|---|---|---|---|
| A — modular cave network candidate | [Cave and Crystal Caverns — 3DAssets.dev](https://3dassets.dev/packs/cave-and-crystal-networks) | Official pack page states CC0 1.0, 94 self-contained GLB models, 4.1 MB total model payload, 76,614 triangles, metres/+Y up, and Three.js GLTFLoader compatibility without extra decoders. Includes straight/bent/rising/descending tunnels, T/four-way junctions, wide galleries, large chambers, shafts, flooded tunnels/chambers, and mineral formations. The starter scene is a separate 407.1 KB download. | Strong candidate for a connected large cave with maze branches and underwater pockets. Inspect the starter scene and selected individual GLBs locally before integration; author collision/navigation, traps, light sources, water surfaces, safe rest areas, and valid exits. Do not assume the models include gameplay colliders. |
| B — modular cave kit alternative | [Kenney Modular Cave Kit](https://kenney.nl/assets/modular-cave-kit) | Official Kenney pack previously recorded as CC0 with 40 pieces. | Compare style and actual GLB/GLTF files against the 3DAssets.dev kit before choosing; do not mix incompatible scale/material styles without art-direction review. |

Research evidence: the 3DAssets.dev pack page documents the 94-model count, 4.1 MB model total, CC0 1.0 license, metric units, GLTFLoader compatibility, and flooded tunnel/chamber variants. Source: https://3dassets.dev/packs/cave-and-crystal-networks. This is a verified source/license candidate, **not yet downloaded, integrated, or gameplay-tested**. The pack page also states colliders, navigation, and gameplay scripts must be supplied by the game.


## Ruined castle and fortress asset candidates — 2026-11-02

| Priority | Asset/source | Verified license and specifications | Integration requirements |
|---|---|---|---|
| A — modular fortress construction candidate | [Medieval Castle Construction — 3DAssets.dev](https://3dassets.dev/packs/medieval-castle-construction) | CC0 1.0; 149 GLB models, 2.4 MB total, 47,140 triangles, metres/+Y up, Three.js GLTFLoader compatible. Includes limestone curtain walls, corners, gate/entrance, stairs, keep and courtyard assemblies. | Strong lightweight modular candidate. Inspect individual GLBs and starter scene; author believable damage variants, ground placement, collision, accessible interiors/exits and route-clearance tests. Do not treat static geometry as a navmesh or physics setup. |
| B — complete castle silhouette | [Castle with Keep — Innerscene](https://www.innerscene.com/tools/library/3d-parts/castle-with-keep-1a75a9e1) | CC0; GLB, 17.1 MB; approximately 49.3 × 49.7 × 29.1 m. Detailed outer curtain wall, four round towers, gatehouse and keep. Source explicitly notes no interior rooms. | Use only as a distant/landmark candidate unless an explorable interior is authored. Optimize textures/mesh and inspect model bounds before runtime. |
| B — broken stone wall detail | [Low-poly Medieval Wall Broken — Innerscene](https://www.innerscene.com/tools/library/3d-parts/low-poly-medieval-wall-broken-edf52637) | CC0; GLB, 26 KB; approximately 2.0 × 0.512 × 1.81 m. | Useful as a small rubble/breached-wall dressing piece; inspect style match and collision before placement. |
| B — tower detail | [Low-poly Medieval Tower — Innerscene](https://www.innerscene.com/tools/library/3d-parts/low-poly-medieval-tower-2097246b) | CC0; GLB, 26 KB; approximately 2.8 × 2.786 × 4.625 m. | Candidate for modular silhouette variation; inspect scale, material style and broken-state suitability. |
| C — broad medieval kit | [Free Low-Poly Medieval Collection — Avramania](https://avramania.itch.io/free-collection) | CC0; 189 models across nature, village, castle/siege, interiors and dungeon/ruins; GLB and FBX formats; 8.4 MB archive. | Style is explicitly low-poly/flat-shaded. Use only if visual review confirms it fits Climboria; do not mix styles blindly. |

Research evidence: the linked source pages list the stated CC0 terms, formats and specifications. These are candidates only; no castle asset has been downloaded, integrated, collision-tested or visually accepted yet.
