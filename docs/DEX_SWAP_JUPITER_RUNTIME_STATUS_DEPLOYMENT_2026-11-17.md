# Jupiter embedded Swap + DEX runtime-status — safe Cloudflare deployment workflow

**Prepared:** 2026-11-17 PH. **Scope:** Swap + Signature DEX only. **Default:** DENY; no trading activated by this workflow.

## Operational gap closed by this PR

The independent Cloudflare Worker at `dex/runtime-status/index.mjs` is the live no-store kill switch for the third-party on-site Jupiter Plugin. It has historically returned `{"enabled":false}` and was not covered by the repository's `Deploy Climboria API` workflow (which deploys a **different** quote-only Worker).

This PR adds dedicated `.github/workflows/deploy-jupiter-runtime-status.yml` with two separate jobs:

- On **pull_request** touching this workflow or Worker source, **verify-disabled** runs `node --test dex/runtime-status/test/*.test.mjs` and pins the exact worker name, source and Cloudflare route. It never sees Cloudflare credentials and never deploys.
- On **main push** of the Worker or workflow and on **main-only workflow_dispatch**, the deploy job re-runs the same source-denial tests and publishes only the disabled Worker with `npx wrangler@4.36.0 deploy`, using the **existing GitHub Actions secrets** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It verifies live `https://climboria.fun/swap-runtime-status.json` is HTTP 200 with body exactly `{"enabled":false}` and `Cache-Control:no-store`, retrying briefly for edge propagation. Failure is reported, not silently accepted.
- The Worker route must remain exactly `climboria.fun/swap-runtime-status.json`; no `workers.dev` preview, broad root route, environment override or HTTP write endpoint is authorized.
- There are no Jupiter API keys, Solana private keys, signing, trade execution or Climboria fee collection steps here.

## Deployment caveats and rollback

This workflow is intentionally a **disabled-only** deployment tool; simply dispatching it cannot enable Jupiter. This is a functional safety feature. A later separate owner-reviewed provider-enable PR must explicitly coordinate the verified public Plugin source/permission and bootstrap SRI, Swap/DEX surface flags and the independent runtime-status Worker state under a monitored release/rollback plan. Its deployment process must be separately reviewed; do **not** weaken the disabled-only checks here for convenience.

Existing Cloudflare secrets and route permissions are **required but not proven** by adding this workflow. The actual Actions result and edge HTTP response must be checked before claiming it has deployed. On failure the existing Cloudflare Worker is left to the provider's own state; consult the Cloudflare dashboard or prior route config rather than assuming a rollback occurred.

## Next exact

1. Review this PR and require green PR-head Worker no-funds tests. Merge only if scoped and green.
2. Verify main-push deployment workflow and public disabled/no-store endpoint, or record exact permissions/secret error; do not infer success from a merged YAML file.
3. Record exact branch/PR/SHA/run/edge status, remaining vendor runtime/terms and next owner acceptance steps in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.
4. Prepare the **separate** Jupiter-managed customer-trading activation review, with the old Climboria-native swap order/execute source gates and integrator fees remaining disabled. Reuse prior two finalized mainnet staging swaps as completed historical evidence, not as current production approval.
