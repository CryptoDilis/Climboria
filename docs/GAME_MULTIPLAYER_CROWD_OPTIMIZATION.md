# Game crowd optimization — 50+ player readiness

2026-11-28 PHT. Game-only engineering workstream. Foundation candidate, not production capacity approval.

## Existing constraints (main inspected)
- game/play.html MAX_REMOTE_GLB = 2 mobile / 3 desktop; shared loading + resident counters. Remote entries currently capped at 32. Group visibility <350m, nameplates <65m, lightweight fallback <120m; loaded heavy models unload beyond 260m.
- Rendering all nearby silhouettes still costs multiple draw submissions per player. Heavy residents may occupy slots after moving away from the closest-player set. Raising the 32-entry limit alone will not solve either issue.
- Actual room/server capacity, total online count, authenticated admission, network fanout, combat and chat remain separate from renderer capacity. No 50+ concurrent-client or physical FPS proof exists from this work.

## Phase C1 — pure planning foundation
- Plan on at most 100 synthetic or already-authorized remote descriptors, sort by distance and stable ID. No new players are created, removed from presence, or granted authority. Keep existing heavy caps (2/3), proposed lightweight caps (8/12), proposed marker caps (16/24). Hide only the visual tier for remaining descriptors. The actual renderer has not adopted the policy.
- Ambient target by nearby real-player descriptors within 120m: 0 -> 5; 1–5 -> 3; 6–10 -> 2; 11–20 -> 1; 21+ -> 0. All are upper targets, not release-approved density; caller must supply the separately verified NPC cap. Constrained/critical pressure lowers visuals and NPC target. Real-player GLB reserve and actual resident/loading accounting remain mandatory. Pressure is an explicit input, not measured FPS yet.
- Unit stress inputs 10/25/50/100 clustered remote descriptors, deterministic ordering, caps, preservation of descriptor count, invalid inputs, pressure and NPC suppression. These are not 100 connected browsers.
- Proposed targets and marker counts are engineering defaults subject to physical measurement. Marker-only cannot replace close-range combat readability; do not ship until close-player gameplay acceptance passes.

## Next work (ordered)
1. Finish #1030 exact 9e428d774d6bc3131dd47bc385663a0bae04d861 (8/9 workflows green at checkpoint), #1031 benchmark (mobile passed, desktop pending), #1032 gait (foundation/chat passed, browser pending). Do not reset them.
2. Verify C1 unit CI; integrate pure policy separately on main without enabling live tiers. Add bounded render reconciler with hysteresis, nearest-player selection, async generation checks, safe unload/reuse and capped allocations; ensure nearby real players preempt NPCs. Keep 32 admission limit until audited.
3. Browser fixtures for 10/25/32 renderer entries with actual visible tiers, correct map/nearby interaction, draw counts, movement, repeated transitions, cleanup, no fake presence. Only after identity/room review, test 50/100 in a private capacity fixture. Test physical Android/desktop per GAME_NPC_PHYSICAL_DEVICE_ACCEPTANCE.md.
4. Inspect server/room membership and transport fanout; implement server-authorized interest sets, bounded distance-based updates with immediate combat/interaction events, reconnect/snapshot recovery, rate and resource limits. Never trust client-provided positions for authority or use rendering culling for combat denial. Global ONLINE must reflect verified real sessions, not local rendered count. Measure actual concurrent clients, bytes/sec, latency, memory and cost at 10/25/50/100. Release remains gated.
5. Trial 3–5 ambient NPCs only after measured pair/crowd acceptance, preserving current asset and financial gates. No production NPC spawn, token rewards or other workstream modifications.
