# Swap/DEX — late Jupiter init visibility guard (2026-11-18 PH)

## Scope and status
Swap / Signature DEX provider-loader only. **PR candidate, not merged or deployed; production third-party provider approval remains OFF.** No Game, ClimbX or Launchpad changes.

## Evidence from current main
Baseline `3d1d6d87e860837148f5f30aad5dd8fd3424560b` already stages the official version-pinned Jupiter Plugin candidate, while the API Worker constant `THIRD_PARTY_JUPITER_WIDGET_APPROVED = false` blocks public wallet trading. Native transaction signing and execute gates remain false. Historical Nov 15 two finalized mainnet staging swaps remain valid historical proof, not current production activation.

## Change
- `dex/provider-managed-swap.mjs`: after awaiting provider `Jupiter.init()`, if a close/revoke invalidated the request or the first-party panel is now hidden, call vendor `Jupiter.close()` best-effort and return without marking that stale initialization mounted. This prevents an async vendor-owned overlay from remaining visible behind a hidden panel where `Jupiter.close()` works.
- `.github/scripts/dex-swap-managed-provider-shell.test.mjs`: assert one vendor close when async initialization completes after a user close; the hidden panel status remains intact, and a new explicit user click may retry.
- Limits: vendor `close()` merely hides a widget; it **cannot cancel existing wallet popups, signed or broadcast transactions**. Third-party close may throw, so it is best effort, not a wallet cancellation guarantee. The vendor SDK is not mocked as a security boundary for already-granted wallet permissions.

## Validation pending
The branch commits were created through GitHub; automated PR-head Validate/Browser Smoke/regression are not yet evidenced. Do not declare pass or production live until actual exact-head checks and real vendor behavior are verified. In particular, assess whether Jupiter Plugin supports reinitializing after a stale init is hidden. If not, design explicit reload/recovery and keep gates OFF.

## Exact next steps
1. Run PR exact-head Validate, Browser Smoke, and DEX/Swap regression and fix any failures; inspect real Jupiter Plugin late-init/reinit behavior rather than inferring correctness from the stub.
2. If safe, merge and separately record SHA/CI proof in `docs/DEX_SWAP_LAUNCHPAD_DEVELOPMENT_RECORD.md`. This small supplementary record does not replace that main log.
3. Reconcile published official vendor usage/API/attribution terms and dynamically injected JS/CSS/font risks; bring in pre-sign wallet/device evidence already completed in Codex/Work instead of repeating funded swaps.
4. Prepare separately reviewed operator approval PR for Swap-only API approval ON, while keeping native signing/execute and Climboria fees OFF. Verify actual production wallet interaction/rollback and finality before calling Swap live; approve DEX Buy/Sell independently after its own acceptance.
