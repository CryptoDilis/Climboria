# Climboria Mountain World — Game Concept Baseline

Status: approved direction / design baseline (not yet fully implemented)
Visual direction: Rohan-inspired high-fantasy landscape; evoke broad green plains, dramatic mountain ridges, forests, and warm cinematic light without copying protected film assets.

## Core experience
- A large, continuous mountain expedition: players traverse on foot, climb difficult routes, and aim for the summit.
- Target a roughly one-hour-or-longer ascent for a capable solo player, created by real route length, traversal challenges, hazards, and weather—not artificial slow movement.
- Falling, slipping, and dying are possible. Build fair warnings, recovery, and safe respawn loops.
- Preserve consistent, reliable mobile and desktop controls; do not redesign controls as part of terrain/visual upgrades without testing.

## Mountain regions and terrain
Include varied regions:
- Tall-grass fields and meadows.
- Ravines, cliffs, exposed ledges, and difficult crossings.
- Rocky fields, loose rock, and climbable rock faces.
- Slippery terrain (wet stone, mud, and potentially ice at altitude).
- Ponds, lakes, and shoreline routes.
- Gardens, shrubs, wildflowers, and forests.
- Large trees and broad clearings suitable for multiplayer tent camps.

## Wildlife and environmental storytelling
- Wild animals inhabit appropriate regions; behaviors may include roaming, fleeing, or defensive/aggressive encounters.
- Skeletons, abandoned remains, old camps, and scattered clues appear in dangerous or forgotten places.

## Dynamic weather
- Weather changes on a 10-minute cycle, with gradual transitions rather than abrupt swaps.
- Possible states: clear/normal, overcast, rain, heavy rain, wind, and severe thunderstorm.
- Severe storms reduce visibility, make selected surfaces slippery, create strong wind on exposed ridges, and include thunder/lightning effects.
- Provide readable storm cues and opportunities to seek shelter; tune danger fairly.

## Safe zones, respawn, and social play
- Rohan-inspired safe settlements/camps at selected points along the ascent.
- Safe respawn areas after death, with rest and resupply.
- A black-market vendor in each designated safe zone.
- Wide clearings under large trees where groups can gather and place tents; multiplayer capacity and persistence require separate engineering.

## Implementation and performance principles
- Build and validate one playable region first, then expand toward the full mountain.
- Use terrain chunks, instancing, distance-based detail/LOD, and controlled effects so the world remains playable on mobile browsers.
- Treat multiplayer synchronization, tent placement/persistence, safe-zone rules, wildlife AI, and weather networking as separate systems to scope and test.
- Prioritize a playable, climbable route and stable performance over decorative detail.

## Milestone order
1. Reliable movement and climbing on mobile and desktop.
2. One complete playable region: terrain, grass, rocks/cliffs, a water feature, a safe camp, and weather cycle.
3. Add traversal hazards, checkpoints, and summit progression.
4. Expand biomes, wildlife, remains, safe zones/black markets, and camp/tent systems.
5. Optimize and test on mobile and desktop; then scope multiplayer persistence and synchronization.

This file is the agreed concept reference. Any future changes should be explicit revisions, not silent redesigns.
