# Climboria

Climboria is a browser-first, multiplayer 3D mountain-climbing adventure with dangerous expeditions, meaningful loot, player cooperation, and the possibility of betrayal. **The game comes first**; any token, Launchpad, or DEX features are separate products and are not assumed to be live.

## Core game structure

### The 10 normal mountain levels
- The main climb is a sequence of **10 substantial, challenging mountain levels**. Each level is intended to take **more than five hours to complete**, not a short, quick stage. This is a design target; actual duration must be validated through playtesting.
- The normal mountain is a dangerous climb: players can lose carried loot when they die, and the climb should create real tension around risk, teamwork, and recovery.
- **Level 10 is distinct:** it includes a recovery opportunity and a safe zone. Do not apply the endless-farming rules of Jarrell's Peak to this final normal level. The precise recovery interaction, safe-zone boundaries, and protections still need implementation and balancing.

### Jarrell's Peak — separate endless/farming area
- Jarrell's Peak is a separate, **endless** high-risk area for continued climbing, farming, and treasure hunting; it is not the 10th normal level.
- The farther/higher players push, the more difficult and dangerous the run becomes.
- Loot dropped there can be at risk of decay and can be taken by other players before it decays. Decay timing, loot ownership rules, and exact recovery mechanics need playtesting and final specification.

## Risk, loot, and player interaction

- **Loot loss and theft:** death can leave loot behind for other players to find or take. Looting another player's dropped items is part of the intended risk/reward loop, subject to final rules and safeguards.
- **Loot decay:** dropped loot may expire/decay, creating urgency to recover it. The decay timer and whether different item classes decay differently are not finalized.
- **Safe zones:** safe-zone protection is specifically part of **normal Level 10**, alongside a recovery opportunity. Other safe-zone placements and the exact PvP restrictions are not yet settled.
- **Traps and combat (“bugbugan”):** the design includes dangerous traps and player-versus-player conflict. Traps should create tactical risk rather than cheap, unavoidable deaths; details such as damage, warning, placement, and counterplay require balancing.
- **Team betrayal:** groups may face betrayal—such as a teammate turning hostile, sabotaging a route, or exploiting trust. The exact permitted actions, warnings, penalties, and anti-griefing limits are not finalized. Cooperation should be valuable, but betrayal should be a deliberate gameplay risk, not an uncontrolled exploit.
- **Recovery:** recovery is a core mechanic, and Level 10 normal has a specifically intended recovery feature. Do not claim that all deaths are safely recoverable; rules differ by area and must be made clear in-game.

## Treasure and progression

- Treasure/chests may contain useful materials, equipment, rare cosmetics/skins, or other rewards. Discovery, rarity, and reward tables require implementation and balancing.
- Non-crypto players should be able to play and progress without connecting a wallet. Wallet-dependent claims or NFT actions, if built, must be optional and clearly separated from ordinary gameplay.
- The game should remain playable as a game; token speculation must not be required to climb.

## Product and implementation status

This README records the intended game direction; it is **not a feature-completion claim**. Gameplay systems described above may still be design-only or prototype-stage. Confirm implementation and browser/mobile testing before presenting a feature as live.

Launchpad, DEX, token, NFT, marketplace, and reward-economy details are separate planned work. Fees, taxes, tokenomics, reward funding, and launch timing are not finalized unless documented and officially announced. Do not imply a token launch, wallet flow, swap, or on-chain reward is operational without verified implementation.

## Safety and transparency

Any smart contracts, token launch, transaction fees, or on-chain asset-handling features require implementation, testing, and appropriate security review. Mockups and plans are not live financial products.

## Terms of Use

- [Read Climboria Terms of Use](./terms.html) (preliminary, pre-launch draft; not legal-reviewed).
- The terms page is informational and does not imply planned game, swap, token-launch, or financial features are live or legally authorized.
