# Base DEX live 0x price proof and disabled cloud staging — 2026-11-24

## Verified
- #693 preview merged f530244df7f38a0a8fa02276999761edeea692c5; #696 merged 18347f96fc2e1bf1da755478ae69a8c275a5add8 after four green CI checks, including local SQLite DO runtime https://github.com/CryptoDilis/Climboria/actions/runs/45342857639. Descendant/merged Pages deployment https://github.com/CryptoDilis/Climboria/actions/runs/45343028622 and production quote smoke https://github.com/CryptoDilis/Climboria/actions/runs/45343028469 passed. Public preview remains OFF.
- Owner confirmed free plan and environment secret configured. Actual authorized probe https://github.com/CryptoDilis/Climboria/actions/runs/45343281347 succeeded on main bf76e4ecb4eea70eb92e160853f2ead62113f6c2 at 06:49 UTC. Both Base 8453 directions returned indicativeOnly:true, executable:false. Buy: requested/reported 100000 raw USDC, estimated 58733120001805 raw WETH, minimum 58145788801787, provider fee 150 raw USDC, reported network fee 2469512719809. Sell: requested/reported 100000000000000 raw WETH, estimated 169696 raw USDC, minimum 167999, provider fee 255 raw USDC, reported network fee 2278262247394. These are historical observations, not current prices or executable quotes. No wallet or trade.

## New branch dex/base-price-disabled-cloud-staging-20261124
- 7179245e3aeb73a730b9e8e1f15b5dc4639cd145 and aec03bdfa92f44e516ead27ca2a195911b206e73: disabled-only health revision and bindings predicate, no credential disclosure, tests.
- 64f0b8ecb6938bf01d7e3bedadf6b67abe454e85: strict generated inactive staging config, distinct account namespace IDs from existing Solana, exact SHA, dedicated proposed hostname base-price.climboria.fun. Tracked config stays unrouted and zero budget.
- 2087fa8455aff71ef257867e396e7ccbebcf68f4: manual main-only Cloudflare staging deployment workflow; requires owner confirmation of available hostname and reserved IDs, existing Cloudflare credentials, dry-run and read-only domain ownership check. No 0x secret copied or provider calls.
- aea217d459989084574a1ae3ac9117d8ac51ddb3: verify exact deployed revision and disabled price route, CORS/POST refusal.
- 84e0748569990a53f6257071e933fc9bf8dc64be: offline generated config safety and duplicate ID regression.

## Exact next steps
1. Open PR, verify all applicable exact-head CI and merge only green. No deployed Worker yet.
2. Owner confirms hostname free of conflicting DNS/Worker and reserves two distinct unused account namespace IDs (2026112401 and 2026112402 are proposals, not verified). Confirm free Cloudflare resource limits. Run manual Base DEX Disabled Worker Staging workflow on main with DEPLOY_BASE_PRICE_DISABLED and the reserved IDs. If permissions/domain conflict or CI fails, stop and inspect. No changes to existing Solana Worker.
3. Verify actual disabled staging health, exact SHA and CORS. Then separately implement controlled enabled staging probe with server-side 0x secret and agreed attempt cap within confirmed provider quota, production runtime budget verification, public pricing activation separately. Do not enable UI or trading before those tests. No actual signing, approvals, execution or fee collection. DEX only.
