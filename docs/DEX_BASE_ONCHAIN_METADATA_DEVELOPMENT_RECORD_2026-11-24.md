# Base DEX on-chain metadata development checkpoint — 2026-11-24

Scope: DEX only. Starting main c508bd340c98d5c076a6015dc1afd1c239219374. No Swap or execution release modifications, wallet access, Game, Launchpad, bridge or ClimbX changes.

## Prior work
PR #679 (head e36815217e2366c2f0ecae3d39c62146c8b6e927) remains open. Base Safety https://github.com/CryptoDilis/Climboria/actions/runs/45336274490, Validate https://github.com/CryptoDilis/Climboria/actions/runs/45336274438, Quote State https://github.com/CryptoDilis/Climboria/actions/runs/45336274394, Graduation and ClimbX visibility passed. Browser Smoke https://github.com/CryptoDilis/Climboria/actions/runs/45336274370 failed on Solana pool Forward restoration: four navigation hops retained pool A URL, row and chart. Failed job rerun requested successfully; do not merge until verified green. Do not assume this is a flaky test or weaken the assertion.

## New branch
Branch dex/base-onchain-metadata-20261124:
- 484187845b9d05b86d201586ff03aa7612d38a47 — dex/base-token-metadata.mjs, explicit user-requested read-only RPC chain ID, block reference, contract bytecode and ERC-20 metadata reads; strict address, bounded response, ABI decoding, timeout, stale result cancellation.
- 911718e05a18465267484269958d4c901c678b3d — dex/index.html, visible inspector with no-wallet disclosure, text-only result rendering and fixed BaseScan link.
- f0a45955759679adfd151de0509a253cbd42ebec — .github/scripts/base-token-metadata.test.mjs, synthetic chain/address/ABI/size/UI tests.
- 36aa295b6041b90329f843902431a39aad6c7d4d — .github/workflows/base-swap-market-safety.yml, includes metadata suite.

RPC URL https://mainnet.base.org is a configured public endpoint; actual reachability, browser CORS and rate limit behavior are not verified. Single-provider observation is not independent proof, token provenance, finalized state, audited code, price, allowance, or trade authorization. No balances, wallet access, transaction signing, approvals or execution. Provider sees queried public address. Unsupported ERC-20 methods or RPC errors can yield unavailable data. No live claim yet.

## Exact next steps
1. Open PR, verify exact head tests; inspect #679 rerun and fix actual Solana history regression separately if repeated.
2. Merge #679 only on green, then recheck metadata PR against new main and rerun applicable checks. Do not merge conflicting or failed PRs.
3. Verify post-merge Pages and production desktop/mobile inspector with independently identified Base ERC-20 contract, wrong/empty address, RPC failure and stale responses. Confirm no wallet or execution requests. If public RPC blocks browser, design limited read-only proxy separately.
4. Then design optional read-only Base wallet balance lookup, and official provider evaluation separately. Base trade release OFF and Solana operator rollout parked. No fee or wallet authorization changes.
5. Preserve oversized cumulative record (connector returned empty); use existing Base record and this checkpoint rather than overwriting it.
