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
