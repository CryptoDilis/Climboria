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
