# Jarrell's Peak — nature model attribution

Jarrell's Peak loads a small selection of stylized nature models from the public asset set in [The Wild Between](https://github.com/anandin/the-wild-between), which includes models from the **Quaternius Stylized Nature MegaKit**.

- **Models used:** `CommonTree_3`, `Bush_Common`, and `Fern_1`.
- **Asset license:** CC0 1.0 Universal / public-domain dedication, as stated in the source repository's `assets/quaternius-nature/LICENSE.txt`.
- **Source asset directory:** https://github.com/anandin/the-wild-between/tree/main/assets/quaternius-nature
- **CC0 license:** https://creativecommons.org/publicdomain/zero/1.0/

The models are instanced in Climboria's Jarrell's Peak environment to reduce draw calls. At runtime, the GLTF files and their relative binary/texture sidecars are requested from the source repository's `raw.githubusercontent.com` asset URLs. If those remote requests fail, the existing procedural environment remains as a fallback.

The Wild Between's game code is a separate project; Climboria adapts the instanced nature-model technique rather than copying its game implementation.

## Camp tent models

- **Models:** `tent-detailedopen.glb` and `tent-detailedclosed.glb` from Kenney's Nature Kit.
- **Source pack:** https://kenney.nl/assets/nature-kit
- **Runtime model files:** https://github.com/Hidencod/tge-assets/tree/main/packs/nature-kit
- **License:** The source catalog lists the Nature Kit pack as **CC0-1.0**; the catalog entry for these files is in [`catalog.json`](https://github.com/Hidencod/tge-assets/blob/main/catalog.json). The pack's CC0 license allows use and modification without attribution; credit is retained here for traceability.


## Wildlife replacement research — pending integration

The original wolves and deer in `game/play.html` were built from primitive spheres, cones, and cylinders. They looked like placeholders and were removed in commit `ce9916f5`; do not restore them as final wildlife.

### Candidate sources checked

- [Gobkit free CC0 3D assets](https://github.com/Ariescar/gobkit-free-assets) — the repository documents a CC0 1.0 animal pack in GLB with bat, duck, hippo, shark, and other stylized low-poly creatures, plus baked animation segments. Commercial use is allowed and attribution is not required according to its README. **Not selected as the realism solution:** the stated art style is low-poly and does not cover all requested species (notably snake, chicken, and monkey). It may be useful only for a deliberate stylized variant after a visual review.
- [3DAssets.dev — Jungle and Rainforest Fauna](https://3dassets.dev/packs/rainforest-and-jungle-fauna) — candidate CC0 1.0 pack listing forest mammals, primates, birds, reptiles, and habitat props. This is not a GitHub-hosted source, so use only if the model files, direct download URLs, license, and redistribution rules can be verified before integration.
- [danwahl/animasim](https://github.com/danwahl/animasim) — documents Quaternius Ultimate Animated Animals models/animations under CC0. The checked repository tree's GLB paths appear to be tiny pointer files rather than self-contained model binaries, so do not use those paths as runtime model URLs without resolving the actual source-pack files.

### Integration gate

No candidate above is yet integrated as the replacement wildlife. Before changing the game, preview actual models and verify exact file availability, species, scale, orientation, animation clips, commercial-use license, total transfer size, and mobile rendering. Prefer locally vendored/reliable assets when practical over depending on third-party runtime URLs. Target species: birds, monkeys/macaques, chickens/roosters, snakes, plus believable deer and wolves; add boar, civets, monitor lizards, frogs, bats, butterflies, and suitable freshwater fish only where assets and performance allow. The final target is believable real-world proportions, not primitive placeholder shapes or falsely labeled low-poly “realism.”


## 3DAssets.dev rainforest hero props — 2026-11-02

These models are CC0 1.0 Universal; attribution is not required. The entries are retained for source traceability.

- **Buttress Root Tree** — 8 instances; 8.788 × 10.733 × 7.947 m; approximately 4,956 triangles; [asset page](https://3dassets.dev/assets/jungle-temple-and-stone-city-buttress-root-tree-44607ba7); runtime GLB: https://cdn.3dassets.dev/assets/36137/v1/model.glb.
- **Undergrowth Patch** — 24 instances; 2.6 × 1.226 × 2.666 m; approximately 1,724 triangles; [asset page](https://3dassets.dev/assets/jungle-temple-and-stone-city-undergrowth-patch-dc35043c); runtime GLB: https://cdn.3dassets.dev/assets/36145/v1/model.glb.
- **Fallen Log** — 8 instances; 6.87 × 1.451 × 1.843 m; approximately 1,794 triangles; [asset page](https://3dassets.dev/assets/jungle-temple-and-stone-city-fallen-log-b1bcdf2f); runtime GLB: https://cdn.3dassets.dev/assets/36143/v1/model.glb.

All are static, metre-scale GLBs loaded with the existing Three.js r128 GLTFLoader. The placement code samples valid forest terrain and adds simple authored trunk/log collision circles; the source models themselves contain no collision or navigation data. The procedural instanced vegetation remains active as the fallback if a remote GLB fails to load. Manual visual, collision, mobile-performance, and remote-CDN checks are still required before treating the forest dressing as fully accepted.


### Density expansion — 2026-11-02

The same three cached CC0 GLBs are now placed more broadly across eligible forest clearings: 8 buttress-root trees, 24 undergrowth patches, and 8 fallen logs. Placement remains terrain-aware and avoids POIs, water/shore exclusions, desert, steep ground, and overlapping prop footprints. This expands visual coverage without loading additional unique GLB files or multiplying download size. All props remain static and require authored collision; vegetation ground patches intentionally have no blocking collider. Validate visually and on mobile before further density increases.


## Real 3D rainforest canopy replacement — 2026-11-02

- **Jungle Canopy Tree** — https://3dassets.dev/assets/jungle-temple-and-stone-city-jungle-canopy-tree-6e668f41
- Runtime GLB: https://cdn.3dassets.dev/assets/36136/v1/model.glb
- CC0 1.0 Universal; 5,336 triangles; 163.4 KB; 10.699 × 16.057 × 9.962 m; solid geometry, no alpha cards, no animation, no built-in collision.
- Integrated as a second rainforest canopy species beside the existing Buttress Root Tree. The generated primitive trunk/cone/icosahedron tree stand-ins are removed; terrain rocks remain procedural.
- Tree collision is authored as a conservative ground-level circle. Asset spots are terrain-aware, exclude mapped water, shore clearances, POIs, desert and steep ground.
- The GLB remains CDN-loaded with the existing fallback behaviour; manual CDN, desktop/mobile visual, collision and performance acceptance remain open.
