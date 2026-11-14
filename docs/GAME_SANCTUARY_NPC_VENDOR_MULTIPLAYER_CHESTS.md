# Jarrell's Peak — Sanctuary decor, chest styles, and real multiplayer handoff

**Status 2026-11-15:** Design + scoped Game implementation work, not proof that new decor, multiplayer, PvP, or loot theft is live. Never touch DEX/Swap/Launchpad/ClimbX.

## Two new starting-area visual assets

| Role | Original | Optimized candidate | Rig / animation | Release path |
| --- | --- | --- | --- | --- |
| Sanctuary visitor (decor-only) | `Climboria. hero.glb` on `main`, 23,178,884 bytes, 30,628 tris | 5,465,860 bytes (local reference, textures 2K basecolor/1K normals and roughness), unchanged geometry | 0 / 0 | `assets/characters/Climboria_Starting_Tambay_NPC_optimized.glb` |
| Black Market merchant display | `Meshy_AI_The_Arcane_Cart_Merch_1114073048_texture(1).glb`, 72,398,504 bytes, 1,609,854 tris (uploaded in ChatGPT, NOT in GitHub) | 5,719,576 bytes, 120,738 tris, 2K basecolor, source decimated with VTK/quadric simplification | 0 / 0 | `assets/characters/Climboria_Arcane_Cart_optimized.glb` |

The visitor candidate SHA-256 locally: `f070a77cbc4505676feb75dc7def96dc3a55ec7861f30b9f23fb877e15c00e84`; raw GitHub source Git blob `f7f5c1555d243a23a5f1773a001450a75065c865` and SHA-256 `b44e65a0c3781cb52dbafa3d610f35f875959d2730c21590fd4e2a13b28b95fe`. The cart candidate SHA-256 `99ef9b9d50c4afeb64a20d6f4858452928581532339f61797968841c34a13b65`.

Placement in `game/play.html`: static visitor x=-12,z=-24 on a side of the Sanctuary start (spawn x=0,z=-30), no added collision/body blocking the main path; cart x=36,z=-52 replaces the **visual** placeholder at the existing Black Market facility while preserving existing market collision, inventory placeholder status and interaction rules. Neither is an actual rigged NPC, combat target, player avatar or item owner.

Assets load asynchronously **after the game is playable**, so a slow vendor download cannot block game readiness. Missing optimized visitor falls back to existing raw model `Climboria. hero.glb` (higher network cost); missing optimized cart keeps original visible market stall. Once installed, the static asset remains a single copy; no continuous GLB reload and no NPC AI simulation. Browser audit `sanctuaryDecorAudit()` gives honest `pending/loading/loaded/unavailable` state and source.

A Game PR workflow can rebuild and commit the optimized visitor directly from the verified original in GitHub using `game/scripts/optimize-starting-npc.py`; it never overwrites the original. If bot permissions block the write, upload the locally optimized output manually, then rerun exact-head CI. The cart's **source bytes exist only in ChatGPT**, so the `Climboria_Arcane_Cart_optimized.glb` binary still needs to be transferred to GitHub; merely committing a loader path does NOT make it appear live.

## Chest drop odds (existing source, not newly invented)

| Tier | World | Cave / geode | Summit |
| --- | ---: | ---: | ---: |
| Common | 65% | 25% | 5% |
| Uncommon | 25% | 35% | 15% |
| Rare | 8% | 25% | 35% |
| Epic | 1.8% | 12% | 30% |
| Legendary | 0.2% | 3% | 15% |

Source: `CHEST_RARITY_ODDS` in `game/play.html`. Currently rarity is rolled when a chest is opened, and every tier uses a basic generic model. To attach 5 meaningful visual rarity chest variants, roll/fix the rarity once per chest spawn and preserve it until collected; do **not** display "Legendary" on a chest that could roll common. Decide whether players should visually know the reward tier before opening; if not, use same neutral crate silhouette and reserve colored VFX for reveal. **Do not change the odds silently.**

Search/model prompts for Meshy (one separately exported GLB per chest):
- Common: "worn expedition supply chest, timber and rope, iron corners, matte materials, low-poly PBR game prop, no lettering, closed, centered"
- Uncommon: "well-crafted ranger supply chest, polished wood, bronze fittings, faded green cloth, exploration game, no lettering, centered"
- Rare: "ancient explorer treasure chest, engraved silver-blue steel, subtle sapphire inset, sturdy realistic fantasy PBR, no lettering"
- Epic: "ornate mountain relic chest, purple mineral crystal inlays, dark copper engravings, elegant restrained glow, no lettering"
- Legendary: "royal mountain summit relic chest, luminous gold details, deep crimson accents, precious gemstone locking plate, impressive but not oversized, no lettering"

Targets per asset: **under 5k triangles**, one material, textures <=1024px, <=1MB GLB preferred, correct closed pose + pivot at base, no built-in brand logos or copyrighted game props. Do not upload 5 huge 50-100MB meshes. License check required.

## Multiplayer, PvP, and grab — real implementation plan, not fake player ghosts

Currently **single-player only**. A static HTML GitHub Pages frontend cannot validate player movement, damage, robbery or loot authority on its own. Real online gameplay requires a trusted real-time room server, persistent authenticated identities or securely issued guest session IDs, and server-side anti-cheat.

Recommended controlled sequence:

1. **Presence first:** one real shared Jarrell's Peak room per shard, WebSocket transport, server-authoritative join/leave IDs, minimum update rate, distance/culling and interpolation. Display only actual connected players; never synthetic bots posing as people. Verify 2 independent browsers see one another, leave cleanup, 10-player soak test, rate limits and server resource budgets.
2. **Safe interactions:** player-to-player invite, chat opt-in and short-range emotes / consensual physical grab of *unowned world objects* only. Sanctuary spawn, vendors and starter path are PvP-free. Handle disconnected players and lag without teleport exploits.
3. **Combat:** attacks only in explicitly enabled PvP areas or consenting duels; server validates attack timing, distance, facing, damage cap, cooldown and health; client animations merely display server-decided outcomes. Never let clients authoritatively update other players' health.
4. **Steal/grab system:** begin with collectible **in-game dropped items** expressly marked lootable and temporary arena pickups. Never steal account credentials, wallet assets, on-chain tokens, purchased assets or persistent hero inventory. If player inventory theft is ever added, it needs clear opt-in, rules, cooldown, victim protection and server transaction logs.
5. **Trust and abuse controls:** token/session binding, idempotent item transfer, replay protection, authoritative drop ownership, separate permissions, mute/report/block, anti-spam and anti-grief safeguards, spawn immunity and audit logs. Add player toggles for PvP and grab, ensure mobile controls accessible.
6. **Release gates:** isolated 2-browser multiplayer integration, disconnection/reconnect, latency/jitter, 10+ real test sessions, PVP safety and collision tests, production endpoint TLS/auth/CORS, capacity/load validation and real deployment proof. **No live multiplayer/PvP claims before all gates.**

External services are not presently configured in this Game workstream; do not invent a server URL, fake users or promise a live fight/steal mechanic until backend deployment and security checks have evidence.

## Exact next actions

1. Check PR for visual visitor integration and automatic asset generation. Confirm the **binary is actually present on the branch**, then run desktop/mobile Game smoke and inspect images; don't merge if missing optimized visitor.
2. Upload `Climboria_Arcane_Cart_optimized.glb` binary (5,719,576 bytes) to the expected asset path on the same Game PR branch, then verify market replacement and that original collision/interaction stays intact. If not available, retain the placeholder honestly.
3. Keep existing main Jarrell/Lheiz/Adventurer play safe; Ella replacement is independently staged in draft PR #435 and cannot merge until its exact 14,714,996-byte optimized binary is uploaded and tested.
4. Only after the Game static props pass, plan a separate *Game-only* real-time presence backend PR. Then add combat/loot in later gated increments.
5. Select five small Meshy chests with rights and inspect one sample before changing current chest visuals or reward odds. Record every merge SHA, CI run and deployment status in `docs/GAME_DEVELOPMENT_RECORD.md`.

