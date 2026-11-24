# Base DEX 0x indicative price integration — 2026-11-24

## Verified previous release
- #685 merged 06bf3752cf1259f6584f57ee59c2f5c125fd9365; all eight post-merge workflows succeeded, including Pages https://github.com/CryptoDilis/Climboria/actions/runs/45338224040 and production quote smoke https://github.com/CryptoDilis/Climboria/actions/runs/45338223845.
- #688 actual production RPC and public balance test https://github.com/CryptoDilis/Climboria/actions/runs/45338337994 passed desktop 1365px (contract block 0x3ab37fb, balance block 0x3ab3800) and mobile 390px (contract block 0x3ab3806, balance block 0x3ab3809). Merged ed6daeeeabda22670abfa219056cfc66dc6876ab.
- No Base trading is enabled.

## Provider candidate and evidence
Official 0x examples repository pinned at 3b296df0c46f31298b631442e14d67a16be2f97d:
- https://github.com/0xProject/0x-examples/blob/3b296df0c46f31298b631442e14d67a16be2f97d/swap-v2-allowance-holder-next-app/app/api/price/route.ts
- https://github.com/0xProject/0x-examples/blob/3b296df0c46f31298b631442e14d67a16be2f97d/swap-v2-allowance-holder-headless-example/README.md
These examples demonstrate Base 8453 indicative price GET with 0x-version v2 and API key. They are demos, not audited production integration. In the example, reported sellAmount 99850 differs from requested 100000 because 150 is a provider fee. Do not confuse gross and net. Current commercial terms, pricing, quotas, production eligibility and live credential availability are not verified.

## This branch
- adff73d2106019b4bf685d314f4f224652e0c770: isolated server-side adapter dex/base-price-provider/zeroex-indicative.mjs, default disabled, exact Base ERC-20 contracts and uint256 amounts, fixed GET price endpoint, timeout and bounded response, token/amount/fee checks, allowlisted output with executable:false. No wallet/taker, transaction payload, allowance or fee recipient forwarded. No API key embedded, no HTTP handler, no public UI wiring.
- 623136489f0994c4330170dbe986757fcdcf279a: synthetic positive/negative tests, no live requests.
- 6dc0607429aaf6e1884bb4b942fabcc45f348336: isolated CI and Solana release gate checks.
- CI pending. No deployment or signing change. No changes to Swap, Game, ClimbX, Launchpad, bridge or existing Worker.

## Exact next tasks
1. Open PR and check exact-head safety/Validate workflows; fix any failures and merge only green.
2. Confirm provider commercial terms and obtain an authorized server-side 0x API credential (never place it in public repo, browser JS, screenshots, or chat). Verify current API schema against real read-only Base price response using a controlled server test. If schema differs, fail closed and adjust validated semantics without enabling trades.
3. Design separate default-off rate-limited read-only DEX endpoint with secret storage, origin policy, abuse limits and public response schema. Wire Base Buy/Sell indicative UI only after live smoke and explicitly distinguish provider estimate, fees and gross/net amounts. No native ETH sentinel in this phase.
4. Separate wallet/chain validation, firm quote integrity, allowance and spender validation, simulation, transaction review, settlement, fee review and release decision before any trading. Never approve Settler, never grant unlimited allowance. All execution remains disabled.
