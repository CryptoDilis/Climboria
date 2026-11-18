# Jupiter Plugin CDN snapshot verification — separate non-trading release

**Date:** 2026-11-18 (PH). **Scope:** read-only, operator-triggered comparison of the five official Jupiter Plugin v1.0.18 CDN assets already SHA-384-audited on 2026-11-15. This document belongs to an independent verifier-only PR; **it does not activate customer trading**.

## Why this is independent

The Swap-only ON release is separately staged as [draft PR #618](https://github.com/CryptoDilis/Climboria/pull/618). That PR's `.github/workflows/jupiter-plugin-asset-drift.yml` was new and not yet available on the default branch, while its manual live job explicitly requires `github.ref == 'refs/heads/main'`. Merging an ON-source Worker release just to make a **read-only** CDN check dispatchable would expose a customer-funds feature before its review. Instead, add the identical small script and workflow to `main` via this independent PR without editing the Worker, host, widget, config, fees, DEX Buy/Sell or ClimbX.

## Exactly what the operator can run after this verifier-only PR is safely merged

Go to [Jupiter Plugin Audited Asset Snapshot](https://github.com/CryptoDilis/Climboria/actions/workflows/jupiter-plugin-asset-drift.yml) → **Run workflow** → choose `main` → **Run workflow**.

- First job `Verify fixed official asset manifest offline` checks the allowlist and hash algorithm without an external CDN request.
- Second job `Compare exact live vendor bytes to Nov 15 audit (manual only)` makes **read-only GET** requests to five hard-coded `https://plugin.jup.ag` paths: `plugin-1.0.18.js`, `plugin-1.0.18-app.js`, `plugin-1.0.18-Tailwind.css`, `plugin-1.0.18-Jupiter.css`, and `scoped-preflight-v4.css`. No secrets, wallet, API write, order, execute, third-party script execution, redirect or user-provided URL.
- GitHub Actions must show **SUCCESS for the manual-live-snapshot job**; an offline-only PR check is **not** a live CDN comparison. Review the job logs, time, exact workflow run URL, and five file names, sizes and SHA-384 match results.
- A mismatch or failure **does not mean trading is safe**. It means the Nov 15 hash cannot be confirmed; investigate current official distribution and do not substitute unreviewed new hashes. An all-five match proves equality to a historical snapshot **at that retrieval time only**; the official bootstrap may still dynamically fetch unpinned JavaScript, CSS and Google Fonts when a user opens a wallet.

## Release outcome and limitations

**No customer-funded Swap or Signature DEX launch is authorized by this check.** A good snapshot does not settle current hosted Jupiter Plugin/API/brand/attribution terms, transitive vendor asset integrity, wallet min-received/slippage/fees approval, network/physical-device consent, or finalized production settlement. Those decisions remain in draft PR #618 and `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`.

Use the previously recorded two finalized Nov 15 owner-controlled staging swaps as historical evidence; don't repeat paid swaps just to reproduce those receipts. Do not change the disabled native signing/execution gates, Climboria fee collection or the separately disabled DEX Buy/Sell surface.

## If workflow dispatch is unavailable

Verify that this verifier-only workflow is actually merged into the default branch `main`. A workflow that exists only on a PR branch may not appear in the Actions manual-dispatch list. If a repository policy denies Actions dispatch or external GET, record that as a blocker; **do not merge the ON-source trading PR as a workaround**. The same read-only script can be executed in an operator-authorized Node.js 22 terminal from a reviewed checkout with `node .github/scripts/jupiter-plugin-asset-drift.mjs --check-live`, but do not mark it verified until observed logs have been recorded.
