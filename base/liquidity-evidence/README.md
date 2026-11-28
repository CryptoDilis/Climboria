# Read-only Base LP dependency evidence
Status: REVIEW_ONLY / NO_GO. No adapter or live release. Addresses come from the pinned Uniswap source documentation in ../CLIMB_BASE_PRODUCTION_LIQUIDITY_DECISION.md, not an approved allowlist.

Supported explicit combinations: `8453 v2`, `8453 v3`, `84532 v3`. Base Sepolia V2 is deliberately unsupported: the inspected official V2 table does not list it. Two distinct HTTPS RPC endpoints for the selected chain must already be provided privately in environment variables CLIMB_BASE_RPC_URL and CLIMB_BASE_RPC_URL_SECONDARY. Do not paste them in chat, commit them, or put them in command-line arguments. Verify provider ownership/independence separately.

From the repo root, with Node 20+:
```sh
node --test base/liquidity-evidence/observe-dependencies.test.mjs
# After separately approving a read-only observation and configuring env variables:
node base/liquidity-evidence/observe-dependencies.mjs 84532 v3
```
Example combination is a testnet dependency observation, not protocol selection. Mainnet observation also reads only, but may use provider quota. No paid request or run is assumed authorized. Successful run performs 8 requests per provider, 16 total; no retries, no signing, no writes. Uses chain ID, lower of two finalized-reported heads, exact common block hash and timestamp, EIP-1898 canonical block-hash selectors for all code and calls, exact runtime byte comparison, factory and WETH/WETH9 getter checks. A provider unable to serve these calls fails closed; do not weaken to latest or ignore one source. SHA-256 fingerprints identify returned runtime bytes, not EVM Keccak codehashes. No endpoint URL or raw provider errors in reports. Same endpoint strings rejected; different strings do not prove independent providers. No on-chain data collected by ordinary PR CI.

A passing observation is only a corroborated dependency snapshot. Independently authenticate chain/finality and source/runtime provenance, proxy and governance risk, and actual paired-asset configuration. Preserve both reports/role identities and compare reproducible deployed source. No CLIMB pair yet; no funding, trading or release authorization. Never treat this output as a production allowlist or replace existing NO_GO gates.
