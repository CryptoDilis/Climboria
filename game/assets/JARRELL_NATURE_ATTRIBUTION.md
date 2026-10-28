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

The current wolves and deer in `game/play.html` are built from primitive spheres, cones, and cylinders. They are placeholders, not acceptable final wildlife models; do not treat them as shipped-quality assets.

### Candidate sources checked

- [Gobkit free CC0 3D assets](https://github.com/Ariescar/gobkit-free-assets) — the repository documents a CC0 1.0 animal pack in GLB with bat, duck, hippo, shark, and other stylized low-poly creatures, plus baked animation segments. Commercial use is allowed and attribution is not required according to its README. **Not selected as the realism solution:** the stated art style is low-poly and does not cover all requested species (notably snake, chicken, and monkey). It may be useful only for a deliberate stylized variant after a visual review.
- [3DAssets.dev — Jungle and Rainforest Fauna](https://3dassets.dev/packs/rainforest-and-jungle-fauna) — candidate CC0 1.0 pack listing forest mammals, primates, birds, reptiles, and habitat props. This is not a GitHub-hosted source, so use only if the model files, direct download URLs, license, and redistribution rules can be verified before integration.
- [danwahl/animasim](https://github.com/danwahl/animasim) — documents Quaternius Ultimate Animated Animals models/animations under CC0. The checked repository tree's GLB paths appear to be tiny pointer files rather than self-contained model binaries, so do not use those paths as runtime model URLs without resolving the actual source-pack files.

### Integration gate

No candidate above is yet integrated as the replacement wildlife. Before changing the game, preview actual models and verify exact file availability, species, scale, orientation, animation clips, commercial-use license, total transfer size, and mobile rendering. Prefer locally vendored/reliable assets when practical over depending on third-party runtime URLs. Target species: birds, monkeys/macaques, chickens/roosters, snakes, plus believable deer and wolves; add boar, civets, monitor lizards, frogs, bats, butterflies, and suitable freshwater fish only where assets and performance allow. The final target is believable real-world proportions, not primitive placeholder shapes or falsely labeled low-poly “realism.”
