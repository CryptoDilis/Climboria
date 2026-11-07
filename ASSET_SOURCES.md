# Climboria — Realistic Environment Asset Sources

> **CURRENT ACCEPTANCE RULE — STRICT:** New or replacement 3D models/props must be downloadable as the exact asset file from a public GitHub repository at a pinned immutable commit. The exact file must have a verifiable license permitting commercial use, modification, and redistribution. A GitHub repository that merely links to an off-GitHub download does **not** qualify. Poly Haven website downloads, Kenney packs, Quaternius/stylized packs, marketplace links, and other non-GitHub-hosted downloads are not approved for new imports under this rule, even if free or CC0. Existing references below are historical research only unless the exact distributable file is independently verified against this rule.

> **Visual acceptance:** No generic, low-poly, toy-like, or cartoon substitutes. Prefer realistic/photogrammetry-quality assets with PBR materials. Do not integrate an asset until its actual file and preview are inspected; record repository URL, immutable commit SHA, exact file path, license/NOTICE, file size, triangle count, texture dimensions, and runtime optimization. Vendor locally; no runtime hotlinks. Build collision separately where needed, and test loading/performance on desktop and mobile. Never claim an asset is integrated or visually accepted until that exact asset is present in-game and reviewed.


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


## 2026-11-06 — owner realism directive and GitHub-only source screening

The target art direction is realistic / photogrammetry-inspired PBR, not low-poly, flat-shaded, faceted, toy-like or cartoon assets. GitHub repository hosting alone does not prove the individual asset is redistributable. Verify exact file license, commercial use, modification and redistribution before copying.

### Screened, not approved for import
- `anandin/the-wild-between`: tree/plant/rock GLTF files are from a Quaternius nature pack; repository metadata returns `NOASSERTION`. Reject as a realism replacement unless each original source file and license are separately verified; visual style is not the requested photoreal target.
- `petroulacl/fps-buildings-env-kit`: README claims CC0 for listed packs but includes Quaternius stylized nature assets. May be useful for matching industrial/urban prop classes only after exact file/source/license inspection; not approved for forest/rock realism.
- `cktang88/3d-fps`: screenshots demonstrate a photoreal browser environment and the README identifies Poly Haven / ambientCG sources for several assets. Repository tree contains local GLBs and WebP PBR maps, but no top-level LICENSE file was found in the inspected root. It mixes CC0 and CC-BY assets. Do not copy a file until its individual `SOURCE.md` and original source license are checked. Its industrial props may be candidates for port/black-market/camp dressing, not generic forest assets.

### Import acceptance gates (every batch)
1. Exact GitHub repository + immutable commit SHA + exact asset path.
2. Exact original creator/source and file-specific license; commercial use, modifications and redistribution allowed. Keep required attribution and notices.
3. Inspect model and texture visually; reject low-poly, flat-shaded, visibly faceted, toy-like, broken UVs, missing maps, or wrong scale.
4. Vendor locally; no runtime hotlinks. Record source, revision, file size, license, texture resolution, triangle count, material count, collision/LOD status.
5. Optimize GLB with mesh/texture compression only when visual quality survives. Use 1K/2K PBR maps for mobile, LODs, instancing/batching, region-based loading and disposal.
6. Verify grounding, collision, walkability and camera clipping in the game.
7. Run desktop and mobile Browser Smoke, compare average FPS and p95/p99 frame times, draw calls, triangles, geometry/texture counts and memory. Inspect before/after screenshots. Reject/rework any batch that introduces visible lag, stutter, crashes or collision regression.
8. Physical Redmi 14 5G test is a separate release gate; browser mobile emulation does not count as device acceptance.

### Visual target
- Foreground/hero assets: high-detail PBR or photogrammetry-inspired, realistic proportions, natural roughness/normal detail and non-repeating surface variation.
- Midground: optimized realistic LODs with matching materials.
- Distant background: lower-detail silhouettes are allowed only where they do not read as low-poly close to the camera.
- No replacement by another low-poly pack just because it is free or lightweight.


## 2026-11-06 — first realistic PBR surface files vendored

<badge>Imported locally; visual/performance verification pending</badge>

Source repository: [npmiaman/game-forge](https://github.com/npmiaman/game-forge), immutable source commit `2b25427358dbfb6badd47f658ba71a6de748e548`. Its `assets/LICENSES.md` explicitly identifies these Poly Haven materials as CC0 and states commercial use and redistribution are allowed.

- `game/assets/pbr/rocky_terrain_02/diff.jpg` — 843,188 bytes, base colour
- `game/assets/pbr/rocky_terrain_02/nor.jpg` — 993,692 bytes, normal
- `game/assets/pbr/rocky_terrain_02/rough.jpg` — 437,094 bytes, roughness
- `game/assets/pbr/sand_01/diff.jpg` — 485,088 bytes, base colour
- `game/assets/pbr/sand_01/nor.jpg` — 877,821 bytes, normal
- `game/assets/pbr/sand_01/rough.jpg` — 189,667 bytes, roughness

Exact source asset pages: [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) and [Sand 01](https://polyhaven.com/a/sand_01). Provenance is copied into `game/assets/pbr/ASSET_LICENSES.md`. No off-GitHub runtime requests are used.

Initial integration in `game/play.html`: replace the dodecahedron flat-shaded rock instances with irregular subdivided icosahedral rock geometry, smooth normals, and locally loaded PBR rock colour/normal/roughness maps. This is a first visual improvement, not a complete photogrammetry asset replacement. The PBR sand maps are vendored for the next shoreline integration pass; they are not yet applied to the coast.


## 2026-11-06 — cardboard soldier placeholder removal

- Removed the camp's primitive soldier generator (boxes, spheres, cylinders and cone) and disabled the 12 placeholder patrol spawns.
- This is a deliberate quality hold, **not** a completed soldier replacement. The camp no longer displays those unacceptable figures.
- Do not substitute another low-poly soldier pack. The existing `assets/expedition-crests/The_Police_Officer_Nigeria.glb` is not yet approved as a soldier: inspect its actual appearance, rig/animation suitability, provenance and redistribution license before reuse.
- Next gate: vendor a visually approved realistic rigged soldier GLB from a verifiable GitHub source, add required license/attribution, then restore patrol placement with instancing/animation and collision/performance checks.


## 2026-11-06 — primitive rice huts removed; fish asset screening

- Removed the five box/cone rice-field hut stand-ins from `game/play.html`. The rice biome remains; the fake huts will not be presented as finished structures.
- Realistic structures remain pending a visually inspected, license-verified GitHub-hosted model. Do not replace these with another stylized/low-poly hut pack.

### Fish candidate — screened, not integrated

- [KhronosGroup/glTF-Sample-Assets — BarramundiFish](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish)
- Model page identifies the asset as CC0 1.0 Universal; upstream README lists Microsoft for Everything. The repository tree contains a binary GLB (12,488,144 bytes) and a Draco glTF variant with separate geometry and texture maps.
- This is a plausible textured specimen for the freshwater/ocean visual pass, but the full GLB is too large to blindly duplicate across mobile fish schools. It has **not** been imported or visually accepted. Next gate: inspect its screenshot/model, reduce texture payload and instantiate/clone one shared model; confirm actual file provenance and CC0 notice in the vendored manifest before use.
- Do not substitute Kenney Survival Kit or Quiet Lake Fishing fish as the realism solution: those sources are explicitly low-poly/stylized and fail the current art direction.

### Remaining visible placeholder audit

- Soldier primitive generator and both spawn sites: removed.
- Wolf/deer primitive wildlife: disabled.
- Rice-field hut boxes/cones: removed.
- Fish: still the simple procedural low-poly silhouettes; replacement pending. Do not mark fish realism complete.
- Camp fire, shrine/statue, treasure chests, torches, and some cave rock formations still use primitive geometry. These are separate audit targets; inspect in-game before deciding whether they need replacement or can remain as functional/simple set dressing.


## 2026-11-06 follow-up — primitive wildlife code removal

- Removed the unused procedural deer/wolf-style animal mesh generator and its placement helper from `game/play.html`. The world still exports an empty wildlife collection for interface stability; no realistic wildlife replacement is claimed or rendered yet.
- Wildlife remains blocked pending properly licensed, visually inspected realistic animal models. Do not reintroduce the old sphere/cylinder placeholder generator.
- The fish schools remain a known low-poly visual placeholder. The Khronos BarramundiFish candidate is CC0 but its full GLB is approximately 12.5 MB; it is not integrated and is not approved for repeated mobile school instances until optimized, visually inspected, and benchmarked.


## 2026-11-06 — pinned fish source and Poly Haven container candidate

### Barramundi Fish — source revision pinned, still not integrated

- Archived upstream: [KhronosGroupArchives/glTF-Sample-Models](https://github.com/KhronosGroupArchives/glTF-Sample-Models), commit `d7a3cc8e51d7c573771ae77a57f16b0662a905c6` (immutable revision).
- Exact model folder: `2.0/BarramundiFish/`. Its upstream README explicitly states CC0 1.0 and says Microsoft waived copyright and related rights for the asset.
- The non-Draco glTF geometry buffer is 128,208 bytes; the separate texture maps are 4,985,099 bytes (base colour), 3,050,432 bytes (normal), and 4,355,820 bytes (occlusion/roughness/metallic). These source-resolution maps are not suitable to ship unmodified for many mobile instances.
- The model has not been vendored, visually accepted, or integrated. Next gate: inspect the official screenshot/model, create a mobile-sized texture variant, confirm exact glTF/material compatibility, then load one shared model for school instances and run the desktop/mobile visual and performance audits.

### Treasure chest — Poly Haven candidate, not a confirmed treasure chest

- [Poly Haven Wooden Crate 01](https://polyhaven.com/a/wooden_crate_01) is a free CC0 maritime/colonial prop. The Poly Haven public model catalogue describes it as a weathered wooden crate/chest with rope handles and metal rivets; catalogue count is 6,576 polygons and source textures are available up to 8K.
- This is **not** a purpose-built fantasy treasure chest and must not be passed off as one. It may be suitable as a secondary supply crate only after preview, low-resolution texture download, and in-world scale check. No integration is claimed.
- The existing 100 gameplay chests remain functional but their visible dodecahedron geometry is still a placeholder. Keep this issue open until an authentic, suitable chest model is found and integrated; do not silently substitute the crate.


## 2026-11-07 — latest cave/pond screenshot audit: current procedural art rejected

Reviewed all ten screenshots from Browser Smoke run [42277972370](https://github.com/CryptoDilis/Climboria/actions/runs/42277972370), artifact [13535045712](https://github.com/CryptoDilis/Climboria/actions/runs/42277972370/artifacts/13535045712), tested commit `de7afc4661b5587397634d6e1486e821bb7e49dd`.

- Cave entrance: the portal is small in the composition and separated from the player by a broad empty foreground. The entrance is not visually accepted.
- Cave interior: the player can be captured inside the chamber, but a bright exterior opening remains visible behind the player. Large procedural rock planes, angular ceiling pieces and simple floor patches still read as a stylized blockout. The chamber is not visually accepted.
- Woodland Pond: fish are visible as pale flat silhouettes, but the sphere/shape-geometry fish do not read as natural, detailed fish. Fish realism is not accepted.
- These screenshots demonstrate that the existing PBR rock maps alone do not solve the cave's silhouette, geometry, lighting or composition problems. Do not label the procedural cave as photorealistic.
- Do not import Kenney Modular Cave Kit or another low-poly/stylized cave pack as a substitute; that would violate the current visual target.
- No new cave model is approved by this audit. Continue searching for an actual GitHub-hosted distributable file with exact provenance and commercial/redistribution rights. Inspect the model preview and file before importing. GitHub hosting or a repository-level CC0 claim is not enough when the exact asset source/license is unclear.
- Any future cave asset batch must be vendored locally, have immutable source revision and exact file path recorded, include license/NOTICE, use collision meshes independent from decorative geometry, and pass screenshot plus desktop/mobile performance checks. Physical Redmi 14 5G acceptance remains separate.

### Latest CI performance evidence (not a device benchmark)

- Desktop SwiftShader: 199,971 triangles, 103 draw calls, 78 geometries, 18 textures, 2.5 FPS mean over 2.2 seconds.
- Mobile-emulation SwiftShader: 166,067 triangles, 81 draw calls, 64 geometries, 10 textures, 0.8 FPS mean over 2.2 seconds.
- Treat these as software-renderer warning signals only. Profile main-thread update work, terrain chunk generation, draw-call/geometry cost and GPU frame time separately on representative hardware before changing world density or claiming performance is fixed.


## 2026-11-07 — BarramundiFish source/license re-verification

- [x] Re-fetched the exact upstream README from pinned revision `KhronosGroupArchives/glTF-Sample-Models@d7a3cc8e51d7c573771ae77a57f16b0662a905c6`, path `2.0/BarramundiFish/README.md`.
- [x] README explicitly links CC0 1.0 and states Microsoft waived copyright and related/neighbouring rights to the asset. This verifies the candidate's stated license at the pinned source revision.
- [x] Re-confirmed the model directory contains separate `glTF-Binary`, `glTF-Draco`, `glTF`, and screenshot folders at that revision.
- [ ] Visual preview/model geometry has not yet been successfully inspected in this environment. Do not integrate or claim visual acceptance until the actual model and screenshot are inspected.
- [ ] Still required: choose the compatible GLB/Draco variant, verify exact binary and texture payload, produce mobile texture variants, vendor locally with source/license notice, share one loaded model across instances, and benchmark desktop/mobile.
- [ ] Current primitive fish remain in-game until replacement passes all import, performance and visual gates. Do not leave the pond empty or substitute another low-poly model.


## 2026-11-07 — BarramundiFish geometry and runtime-weight inspection

- [x] Parsed the pinned uncompressed glTF JSON at KhronosGroupArchives/glTF-Sample-Models commit `d7a3cc8e51d7c573771ae77a57f16b0662a905c6`.
- [x] Confirmed one mesh / one primitive, 2,188 vertices, 11,592 unsigned-short indices, and POSITION/NORMAL/TANGENT/TEXCOORD_0 attributes.
- [x] Confirmed three external PBR maps: base color 4,985,099 bytes, normal 3,050,432 bytes, ORM 4,355,820 bytes; combined texture payload is 12,391,351 bytes before compression/runtime overhead. The GLB variant is 12,521,196 bytes.
- [x] Confirmed the glTF scene has a single BarramundiFish node and material with base-color, metallic-roughness, normal and occlusion texture references.
- [ ] The 2,138-byte screenshot/model preview is still not visually inspected; GitHub binary fetch rejected the JPEG. Do not integrate or approve on metadata alone.
- [ ] Next gate: retrieve/inspect the actual preview and compatible binary, check visual scale/orientation/rigging and triangle/texture budget, then prepare an optimized local mobile variant with attribution/CC0 notice. No runtime hotlink.
