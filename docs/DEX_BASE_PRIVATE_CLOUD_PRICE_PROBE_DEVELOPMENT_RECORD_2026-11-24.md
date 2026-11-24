# Base DEX private cloud pricing probe — 2026-11-24

## Verified disabled cloud deployment
- #702 merged b0d2c25f1fe369e2d3c531b458e94a6439f3c6d7. Owner manually ran [disabled staging deployment 45349083887](https://github.com/CryptoDilis/Climboria/actions/runs/45349083887); all steps passed. Actual custom domain base-price.climboria.fun, namespace IDs 2026112401 and 2026112402, disabled exact revision, bindings, CORS, GET 503, POST refusal and zero budget verified at 07:35 UTC. No upstream requests. [Post-merge Base safety](https://github.com/CryptoDilis/Climboria/actions/runs/45348479579) and [Pages](https://github.com/CryptoDilis/Climboria/actions/runs/45348478003) passed.
- Existing direct authorized provider probe [45343281347](https://github.com/CryptoDilis/Climboria/actions/runs/45343281347) passed both Base directions. The cloud Worker itself has not yet returned live price data.

## New branch dex/base-private-cloud-price-probe-20261124
Base 2ee411f9722e3470b3aa39c7cbcb2e33a169841e.
- 03c763af558ceed2a8e2c5fe488aa5350e091a42: enabled handler is private-only, exact two-attempt daily cap, maximum 15-minute accepted expiry, random 64-hex secret header authentication, denies unauthenticated/expired requests before upstream and budget use. No public pricing release.
- 134d7f54063cd1d83334500404d69defc900ccca: offline regression tests for unauthorized, invalid and expired stage.
- c5fa43ce597a878f327ce2f644bc2855ba77b253: generate temporary 10-minute private staging config from verified disabled baseline. No secrets in generated config.
- 20f21e90204dad803e9fbafbafabe19ed267b82c: actual cloud probe checks unauthenticated denial, two exact Base indicative prices validated by UI parser, and third request rejected by actual Durable Object daily cap (no upstream call). No wallet/approval/executable data.
- 27e1b84e3efed7e909ed332e009d0f7723932ca5: manual main-only workflow, existing protected environment credentials, fresh random masked private token, disabled baseline verification, two controlled requests, always-attempt disabled restoration and exact verification. If workflow cancellation prevents rollback, private gate expires; manual disabled staging redeploy still required to verify cleanup. Provider key and token may remain stored in disabled Worker; no public access. No claim that deployed cloud pricing has passed.
- 3f37000972a55724ec91ae4108bb238dcef411dd: offline CI config and syntax assertions. Tests pending.

## Exact next steps
1. Open PR, verify exact-head safety, runtime and all other applicable CI; fix failures then merge only green.
2. Owner confirms remaining free quota for two requests, manually dispatches Base DEX Private Cloud Price Probe from main with VERIFY_BASE_CLOUD_PRICE. Never rerun blind if quota used; persistent UTC daily budget may deny repeat same-day attempts. Check actual probe and rollback logs. If rollback not verified, manually restore disabled staging with known namespaces. No public price activation.
3. On successful end-to-end evidence, separately review approved daily/monthly cap vs provider plan and Worker quotas, public release gate, rate limits and rollback; explicitly enable indicative UI only after production smoke. Trading/wallet signatures/allowances/fee collection are separate release work.
4. DEX-only scope; existing Solana Worker, Swap, Game, ClimbX, Launchpad and bridge unchanged.

## CI repair
- Initial exact head 4d90aa9396c01d629a2aead05b9e4f9a54769986 passed local runtime 45349572304 and Validate 45349572361. Safety workflow 45349563637 failed before any jobs because the generated YAML had a truncated expiry grep and duplicated trailing step. 42fd7d73cfd23028703ac363f8f1f152ff0938c1 restores valid YAML and retains all config checks and Solana gate assertions. Recheck exact head. Verified previewIntent and previewLabels exports are present in current source. No provider call or deployment performed during repair.
