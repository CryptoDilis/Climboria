# Climboria guest-save audit and migration plan

**Status:** audit complete for the current browser game entry point; migration implementation intentionally not started.

## Audited legacy storage

The active game file `game/play.html` currently reads and writes the following gameplay-related local storage:

| Key | Current shape | Purpose | Migration decision |
|---|---|---|---|
| `climboria_jarrell_inventory_v1` | JSON array of objects `{ name: string, qty: positive number }` | Jarrell's Peak backpack inventory; UI limits the array to 50 entries | Do not promote to trusted inventory or reward state. Treat as an untrusted client snapshot only; migrate only if the product owner explicitly classifies these items as non-economic and accepts tamper risk. |
| `climboria-selected-hero` | string; defaults to `ClimboriaHero` | Local visual hero/GLB selection | Safe candidate for a small cosmetic preference field after allowlisting known asset IDs. |

The inventory loader filters malformed entries (requires a string `name`, finite positive `qty`) but does not enforce a maximum quantity, per-item allowlist, or total serialized-size bound when loading existing local data. The write path caps the number of distinct entries at 50, but quantity can grow without an upper bound. Therefore this payload is not safe to trust for ownership, rewards, marketplace listings, crafting, or token-related actions.

The audit also found separate local-only DEX data:
- `climboria:dex:watchlist:v1`: array of token mint/address strings, capped to 100 on write.
- `climboria:token-room:v1:<mint>`: per-token chat-history-like message array, capped to 500 messages on write.

These are feature preferences/history, not player progression, and should not be merged into the player save by default. Other unrelated local state (for example UI state) is outside this migration scope.

No IndexedDB usage or existing general-purpose player save object was found in the inspected game entry point. Player position/progression is not currently persisted by this inventory code.

## Existing cloud-save contract

The deployed migration foundation defines `public.player_saves` with:
- one row per authenticated `user_id`;
- `schema_version` (positive integer);
- `save_data` JSONB;
- a 65,536-byte serialized JSON size constraint;
- RLS for authenticated users to select/insert/update only their own row.

This table is suitable only for non-authoritative convenience data. Client-writable JSON must never determine token balances, NFT ownership, paid rewards, marketplace inventory, crafting outcomes, or reward claims. Any economic inventory must be derived from a trusted server-side ledger.

## Safe migration design (not yet implemented)

1. **Preserve first:** before account migration, read the guest values without deleting or rewriting them. Keep an exportable local backup; never clear guest storage on sign-in alone.
2. **Validate strictly:** parse defensively; reject malformed JSON, unexpected types, non-finite values, oversized payloads, unknown cosmetic IDs, and duplicate/invalid item records. Do not silently truncate data.
3. **Separate trust domains:** only allowlisted cosmetic preferences and explicitly approved non-economic progress may enter `player_saves`. Inventory remains excluded until its economic meaning and tamper policy are explicitly decided.
4. **Resolve conflicts explicitly:** if the account already has a save, show a clear choice to keep the account save or replace it with a validated guest snapshot. Do not silently merge quantities or overwrite either side. A merge requires a separately specified deterministic rule.
5. **Make writes idempotent:** attach a migration version/source marker and use a single authenticated upsert/transaction strategy so retries cannot duplicate progress. Enforce the 64 KiB limit before upload and rely on RLS as the final ownership boundary.
6. **Verify before cleanup:** read back the saved schema/version and compare a stable digest or normalized payload. Only after explicit confirmation and successful verification may the user choose to remove the local guest copy. Keep rollback/export available.
7. **Handle failure safely:** on network, validation, or RLS failure, retain the local guest data unchanged and explain how to retry. Never report migration success based only on a submitted request.

## Required decisions before implementation

- Are Jarrell's Peak backpack items purely cosmetic/non-economic, or can they be exchanged, crafted, minted, sold, or affect rewards? Until answered by the game's authoritative design, keep them out of cloud saves.
- Which hero IDs are officially supported? Build an explicit allowlist from the actual asset manifest before syncing the selected hero.
- Should an existing account save win by default, or should the player choose between account and guest snapshots? Recommended: explicit choice whenever both exist.
- Which other progression fields should become durable cloud-save data? They must be inventoried from actual game mechanics, not inferred from the current inventory array.

## Verification performed

- Inspected `game/play.html` on branch `codex/real-player-auth-foundation-20261109`, including the inventory key, parser, write path, and add-item behavior.
- Searched repository code for localStorage reads/writes and IndexedDB/save-game references. DEX watchlist and token-room history are separate feature-local storage; no general-purpose save object was identified in the inspected gameplay entry point.
- Confirmed the existing Supabase migration's row ownership/RLS and 65,536-byte JSON payload constraint.
- No application code or database schema was changed by this audit.
