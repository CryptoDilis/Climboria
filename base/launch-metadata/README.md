# CLIMB Base launch preparation — draft only

2026-11-27 UTC. Workstream: new Base token, separate from legacy evidence. No production deployment, public sale, claim activation or listing authorized. The existing testnet token is not official CLIMB. The [V3 release spec](../V3_PRODUCTION_RELEASE_SPEC.md) and [release handoff](../CLIMB_BASE_CURRENT_RELEASE_HANDOFF.md) remain controlling; separating workstreams does not waive any gate.

## Identity and branding
- Proposed production name **Climboria**, ticker **CLIMB**, Base mainnet chain 8453, ERC-20, six decimals, initial 888,888,888 under V3. Confirm exact name with owner and independently review exact production constructor before release. Existing successor contract is explicitly CLIMB V3 Successor Test Only / CLIMBV3NEXTTEST; do not rename or publish the fixture as production.
- Existing official logo sources: `assets/climb-token-official-cutout.avif` (Git blob c7b9e84d539e1159327d073c0bde23c2e6ca97e6), `assets/climb-token-official-hd.webp` (2c35ef9206caf904dda4254a95b827bad9b0c467). Preserve art; inspect actual dimensions and alpha, export square transparent PNG in required sizes without stretching or redrawing. Verified draft PNGs from [run 45971569046](https://github.com/CryptoDilis/Climboria/actions/runs/45971569046), artifact 15184758269 (expires 2026-12-11 UTC). The original is 256×256; 512×512 is upscaled, not native HD. Both retain transparency and were visually inspected and hash-checked in the preceding cycle. Reproduce using export-logo.py and Pillow 12.0.0 if artifact expires; do not substitute art. No public hosting or approved logo URI. Do not claim platform-specific size acceptance before verifying current requirements.
- [Draft metadata](climb-base-draft.json) records exact proposed allocation, official links, and null address, supply circulation and token-list fields. It is NOT a standard public token list and must not be consumed by trading or wallets. Logo URI and token-list entry become valid only after reviewed finalized CA, chain/code verification and asset hosting checks. Keep all existing website safety notices.

## Release sequence and external gates
1. Confirm exact production identity, code, restricted reserve/custody configuration and actual signers; resolve independent review issue #881, clean build, testnet lifecycle and retired pin. Do not use inert test fixtures or accelerate real schedules. Obtain explicit authorization for exact mainnet artifact, recipients and fees.
2. Deploy only via reviewed process; verify finalized chain 8453, runtime/source, constructor arguments, name/symbol/decimals/supply, all seven reserve balances and authority restrictions. Record transaction, verified explorer links and actual contract address. Do not prefill a testnet or legacy CA.
3. Publish verified CA and metadata to existing homepage Base section/whitepaper; retain legacy notice and distinguish proposed utility from active features. Publish ERC-20 token-list entry with chainId/address/name/symbol/decimals/logoURI only after evidence. BaseScan source verification and token information submission are separate; use current official instructions. Wallet logos depend on independent directories; no guarantee of display.
4. Trading separate: evaluate Uniswap and Aerodrome on Base, exact supported contracts and LP custody, actual paired ETH or USDC funding, launch float, price and slippage. No funded quote asset verified; keep trading deferred if zero. Proposed 25% reserve is not funded LP. No deposit, price or lock guarantee. Explicit approval of exact venue, amounts, lock and policy required.
5. After actual funded trading and verification, apply for market directories (DEX Screener, CoinGecko) as applicable; eligibility, fees and current forms not independently checked. Never represent listing as approved or guaranteed. Climboria DEX integration remains gated independently.
6. Legacy compensation remains a separate, disabled workflow: preserve 1% maximum segregated reserve in reviewed bounded mechanism; no claim or release before verified snapshot/terms/review. This draft does not change production gate status or authorize a launch without legacy safeguards.

## Checklist
| Item | Status |
| --- | --- |
| Existing logo source located | Verified pinned original and exported artwork |
| Identity/description/links | Draft prepared |
| Allocation arithmetic | Draft matches V3 |
| PNG export | Verified draft; 256 native, 512 upscaled |
| Hosting and platform checks | Pending |
| Production exact artifact and signer/custody review | Blocked |
| Base mainnet CA | None verified |
| Funded pool | None verified |
| Listings and claims | Disabled / pending |

No current web verification in this session. No gas, signatures, financial actions, new token address or external submission.
