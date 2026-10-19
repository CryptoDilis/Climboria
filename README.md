# Climboria

**More than a game. It’s a climb.**

Climboria is a browser-first project combining a mountain survival game with a planned creator Launchpad and decentralized exchange (DEX). The guiding principle is **game first, speculation later**: the game should be enjoyable without a crypto wallet or purchases.

- **Website:** https://climboria.fun
- **X:** https://x.com/ClimboriaHQ
- **Repository:** https://github.com/CryptoDilis/Climboria

## Project status

Climboria is under active development. Website sections and product demos are previews—not confirmation that the corresponding service is production-ready.

- The **Launchpad** and **DEX** are planned ecosystem products; any UI marked Demo is illustrative.
- **$CLIMB has not been announced as launched.** Verify launch details and contract addresses through official Climboria channels before trusting a token or connecting a wallet.
- Multiplayer survival gameplay, on-chain marketplace transactions, NFT minting, token rewards, and the reward treasury described below are design goals and require implementation, testing, and security review.
- Roadmap dates and feature plans may change.

## Game direction

The core game is evolving toward a multiplayer mountain survival and exploration experience:

- Ten planned long-form expedition mountains, with a starting safe zone on each normal mountain.
- Players manage health, stamina, weather, supplies, gear durability, and the risks of climbing.
- Teamwork, rescue, exploration, crafting, and player encounters are intended to be meaningful.
- **Jarrell’s Peak** is envisioned as an endless, high-risk survival mode without a map or safe zone. Its treasure and PvP systems are concepts until implemented.
- The game is intended to support browser play on desktop and mobile, with accessibility for players who do not use crypto.

## Planned rewards and economy

The following are the current design direction, **not live or guaranteed payouts**:

- One shared summit-rewards treasury for the ten normal mountains, funded by **5% of gross completed marketplace sales**.
- Weekly rewards are intended to be proportional to eligible points:  
  `player eligible points / total eligible points × funded weekly treasury`.
- The weekly competition is planned to close **Friday at 03:00 UTC**. Weekly points reset; a permanent, non-transferable achievement emblem/record is intended to remain.
- The planned on-chain marketplace uses **$CLIMB** for ingredient and crafted-gear trades. A **5% buy/sell marketplace tax** is proposed; its final destination and contract rules must be published before launch.
- Items are intended to be mintable as NFTs without a Climboria mint charge; the player pays the blockchain network fee.
- Random chests may contain tokens, ingredients, gear, and NFTs. Exact locations are intended to remain hidden until discovery, then be announced and publicly recorded.
- Players may participate without a wallet, but a compatible wallet will be required to claim on-chain rewards.

Final rules, eligibility, fees, odds, treasury accounting, token conversion, and anti-cheat protections must be documented and reviewed before these systems go live. Optional Jarrell’s Peak donations are envisioned in SOL; any conversion to $CLIMB must use a verified process and be disclosed.

## Run the website locally

The website is a static HTML experience. From the repository root, start a local static server:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can also use another static file server. Keep the project’s relative paths and assets intact when previewing or deploying.

## Contributing and safety

- Check the current implementation before assuming a feature is operational.
- Do not publish private keys, seed phrases, API secrets, or wallet credentials.
- Treat smart contracts, token launch mechanics, custody, and reward distribution as security-sensitive. They require independent review before handling real assets.
- Report bugs and propose improvements through the repository’s GitHub issues.

## Official links

Use the website and [@ClimboriaHQ](https://x.com/ClimboriaHQ) for official project updates. Be cautious of impersonators and unofficial token addresses.
