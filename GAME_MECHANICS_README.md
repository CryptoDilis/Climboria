# Climboria — Game Mechanics Reference

**Status:** Design draft; update as rules are approved or implemented.
**Launch scope:** Jarrell’s Peak only. The ten previously proposed normal expeditions are deferred until after token launch and a budget review.
**Important:** This file distinguishes design rules from implementation. A written rule does not prove the feature is live, persistent, secure, or production-ready.

## 1. Future regular expeditions (deferred): death and respawn

The following are design rules for any future regular expeditions, not current launch promises:

- The first death/respawn has no penalty.
- After the first death, subsequent deaths may progressively cause random items to fall out of the player's Bag.
- Respawn at the player's last checkpoint.
- The progression/rate of item loss and any cap must be finalized before those expeditions launch.

## 2. Jarrell’s Peak: high-risk death rules

Jarrell’s Peak has no safe zone, summit, or final level. The current prototype returns a fallen player to the trailhead and shows a death/respawn state. The following carried-loot recovery rules remain design requirements unless verified in the live game:

1. On death, the player returns to the Starting Point.
2. A random item drops from the player's Bag at the death location.
3. Other climbers who pass by can pick up the dropped item.
4. The dropped item has a 90-second decay timer; if not recovered before expiry, it disappears.
5. These loot-loss and recovery rules need persistent inventory, reliable item ownership, and anti-exploit checks before production use.

## 3. Death Stones (Jarrell’s Peak)

The design includes two single-use Death Stone types. The current browser smoke test verifies that the Death Stone control initializes and starts a persistent 90-second cooldown. It does **not** prove that the full solo or party teleport/recovery flow is production-ready.

### Solo Death Stone
- Intended to teleport the individual user back to their own recorded death spot.
- One use.
- Requires a reliable saved death location and valid destination.

### Party Death Stone
- Intended to teleport every eligible party member to the exact death spot of the party member being recovered, regardless of their current location.
- One use.
- Exact destination is part of the intended risk; any hazards at the location remain hazards.
- Requires server-authoritative party membership, consent/eligibility rules, cooldown enforcement, and teleport validation.

## 4. Current verified scope vs. production gates

Recent automated desktop/mobile browser smoke tests verify that the Jarrell’s Peak page initializes its renderer, riverside spawn metrics, cache HUD, Death Stone control, streamed cache/forest hooks, tree collision test, water-state transitions, fishing interaction, and mobile controls. This is browser automation, not a physical-device test or proof of multiplayer production readiness.

Still separate release gates:
- Persistent inventory and dropped-item recovery.
- Reliable solo/party Death Stone teleport.
- Server-authoritative multiplayer, inventory, rewards, and anti-cheat.
- Published loot odds and funded $CLIMB reward rules.
- Physical-device audio, touch controls, camera, and performance checks.

## 5. Change log

- **2026-10-27 — Launch scope aligned:** Jarrell’s Peak is the only planned launch mountain; the ten normal expeditions and their death rules are deferred.
- **2026-10-27 — Browser QA expanded:** Desktop/mobile smoke coverage added for Jarrell’s Peak collision, swimming state, fishing, treasure caches, Death Stone control/cooldown, and controls. Audio routing is intended to keep the original Jarrell’s Peak score separate from the regular-expedition MP3.

---
*Living reference: update the status when code and validation actually change.*
