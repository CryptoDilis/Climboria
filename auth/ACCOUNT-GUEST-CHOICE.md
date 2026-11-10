# Account vs Guest Save Choice — Implementation Contract

Status: design approved for implementation; no cloud preference writes are enabled by this document.

## Current observed state

- The homepage account modal supports email/password, Google, X, EVM, and Solana sign-in.
- The gameplay page creates the shared Supabase client and emits `climboria:auth-session` events.
- Gameplay currently reads `climboria-selected-hero` from localStorage (legacy fallback: `ClimboriaHero`) and immediately loads that hero.
- The only current gameplay persistence key found in the audit is `climboria_jarrell_inventory_v1`; it is client-writable and must remain outside account save migration.
- `player_saves` is a per-user JSONB row with a 65,536-byte limit and own-row RLS. It is not an economic ledger.

## Required UX flow

1. **Guest only:** continue playing exactly as today. Never require account creation. A sign-in invitation may be shown, but it must not block play or change local data.
2. **Signed-in, no account save:** explain that the local hero preference remains on this device. Offer an explicit future action to back up approved preferences only; do not write anything automatically.
3. **Signed-in, account save exists and guest preference exists:** show a blocking *decision panel*, not a blocking game. Clearly show:
   - **Keep this device's choice** — retain the guest hero preference; do not overwrite the account save.
   - **Use account choice on this device** — apply the account hero preference locally only after strict validation; do not write the guest preference to the cloud.
   - **Decide later** — leave both untouched and continue with the currently loaded hero.
4. **Signed-in, account save exists but no guest preference:** use the validated account hero preference for this session only; preserve the original localStorage state and do not create a cloud write.
5. **Read/query/validation failure:** preserve local state, show a retryable neutral message, and let the player continue with the currently loaded hero.

## Data contract (first version)

- Only `selectedHero` may be considered, and only after an explicit asset-manifest allowlist is defined and tested.
- Current legacy local fallback `ClimboriaHero` is not proof that this ID is valid. Normalize only against the explicit allowlist.
- Never include `climboria_jarrell_inventory_v1`, balances, rewards, crafted items, marketplace state, NFT state, chest contents, or other economic/progression claims.
- Account save reads must be scoped to the authenticated user and use the existing RLS-protected `player_saves` table.
- A malformed, oversized, unknown-version, or unknown-hero payload is invalid; never silently truncate or repair it.

## Non-negotiable safety rules

- No automatic merge.
- No automatic guest-to-cloud upload on sign-in.
- No cloud write as a side effect of auth/session refresh.
- No local cleanup/deletion during choice resolution.
- No inventory migration.
- Any future upload must require a separate explicit confirmation, validate the allowlist and 64 KiB limit, use an idempotent versioned upsert, read back and verify, and retain rollback data on failure.

## Browser test matrix before enabling any write path

- Guest session with no hero key.
- Guest session with valid legacy hero key.
- Signed-in account with no cloud save.
- Signed-in account save only (valid and invalid payload).
- Both local and account hero values present and equal.
- Both present and different; each of the three user choices.
- Account read failure / offline.
- Unknown hero ID and malformed JSON.
- Verify inventory key is byte-for-byte unchanged in every scenario.
- Verify no `player_saves` insert/update/upsert request occurs in any choice-resolution scenario.

## Exact next implementation sequence

1. Inspect the actual hero asset manifest and derive a small explicit ID allowlist; do not guess from the legacy key.
2. Implement a pure, dependency-light resolver for local/account save states and validation.
3. Add an accessible, mobile-safe decision panel to gameplay; its three choices must be local/session-only.
4. Add mocked Playwright coverage for every state above and assert zero write requests.
5. Run Validate and Browser Smoke. If a run fails, diagnose the exact failing assertion/log before editing.
6. Only after this read-only UX is verified, separately design and request approval for any cloud write flow.

