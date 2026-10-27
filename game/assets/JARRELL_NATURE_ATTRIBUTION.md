# Jarrell's Peak — nature model attribution

Jarrell's Peak loads a small selection of stylized nature models from the public asset set in [The Wild Between](https://github.com/anandin/the-wild-between), which includes models from the **Quaternius Stylized Nature MegaKit**.

- **Models used:** `CommonTree_3`, `Bush_Common`, and `Fern_1`.
- **Asset license:** CC0 1.0 Universal / public-domain dedication, as stated in the source repository's `assets/quaternius-nature/LICENSE.txt`.
- **Source asset directory:** https://github.com/anandin/the-wild-between/tree/main/assets/quaternius-nature
- **CC0 license:** https://creativecommons.org/publicdomain/zero/1.0/

The models are instanced in Climboria's Jarrell's Peak environment to reduce draw calls. At runtime, the GLTF files and their relative binary/texture sidecars are requested from the source repository's `raw.githubusercontent.com` asset URLs. If those remote requests fail, the existing procedural environment remains as a fallback.

The Wild Between's game code is a separate project; Climboria adapts the instanced nature-model technique rather than copying its game implementation.

## Camp tent model

- **Model:** `tent.glb`, loaded from the public [8th Wall Studio Physics Playground example](https://github.com/8thwall/studio-physics-playground-example/tree/main/src/assets/models/environment).
- **Original asset family:** Quaternius Pirate Kit (identified in the example project's asset attribution).
- **License note:** The example project credits the Pirate Kit, but this individual file's license/redistribution terms have not been independently verified in the source tree. Confirm the asset's original pack license before shipping; replace it with a verified CC0 model if that cannot be confirmed.
