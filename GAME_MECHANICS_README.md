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

## 3. Deferred teleport-stone mechanics

Teleport-stone mechanics are **not part of the current launch build**. Work on any future stone item is deferred until the hero, terrain, collision, and swimming experience are in good shape. Do not present a teleport-stone item, button, cooldown, or solo/party teleport flow as implemented.

## 4. Current verified scope vs. production gates

Automated desktop/mobile browser smoke tests check that Jarrell’s Peak initializes, the riverside spawn and cache HUD appear, streamed cache/forest hooks initialize, tree collision is exercised, water-state entry/exit works, fishing can be used, inventory slots populate from local test loot, and mobile controls initialize. The test also guards against the retired teleport UI returning. This is browser automation, not a physical-device test or proof of multiplayer production readiness.

Still separate release gates:
- Persistent inventory and dropped-item recovery.
- Server-authoritative multiplayer, inventory, rewards, and anti-cheat.
- Published loot odds and funded $CLIMB reward rules.
- Physical-device audio, touch controls, camera, and performance checks.
- Any future teleport-stone design and implementation, after hero/map quality work.

## 5. Change log

- **2026-10-27 — Launch scope aligned:** Jarrell’s Peak is the only planned launch mountain; the ten normal expeditions and their death rules are deferred.
- **2026-10-28 — Teleport feature deferred:** Removed the premature teleport-item design from the current gameplay reference. Hero quality, terrain, collision, and swimming take priority.
- **2026-10-28 — Browser QA updated:** Desktop/mobile smoke coverage includes Jarrell’s Peak collision, swimming, fishing, treasure caches, inventory preview, and controls; regular-expedition music is kept separate from Jarrell’s Peak’s atmospheric score.

---
*Living reference: update the status when code and validation actually change.*
