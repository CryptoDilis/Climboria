# Climboria Game Notes — Level 01

Updated: 2026-10-23

## Visual direction (working plan)
- Use the user's uploaded mountain-map image as broad inspiration only; do not reproduce its exact composition, assets, characters, or artwork.
- Aim for a colorful, stylized alpine expedition map: winding dirt paths, distinct grassy shelves, layered rocky ridges/cliffs, a small base camp, streams/bridges/flowers/trees, and a readable summit route.
- The mountain should feel larger and reveal more detail as the camera/player approaches (multi-scale detail / level-of-detail, where practical).
- Polish the environment after basic traversal and collision are reliable.

## Gameplay and camera
- Add touch camera orbit: press/drag on the gameplay view to rotate the camera, while preserving joystick/button interaction. Define and test touch zones so dragging the movement stick or HUD buttons does not orbit the camera.
- Keep the existing mobile controls until replacement behavior is verified; do not remove controls blindly.

## Critical bug queue (verify before calling fixed)
1. Player must not pass through the main mountain/cone or rock meshes.
2. Player must be able to approach rock faces and pass through intended gaps; avoid overly broad invisible blockers.
3. Collision and visible terrain/platform geometry must agree. Prefer collision derived from the same authored geometry or validated collider shapes rather than mismatched height approximations.
4. Test Level 01 on mobile browser: approach a boulder, walk along a cliff, enter a gap, try a slope, and orbit camera by touch.
5. Remove temporary diagnostics/review-mode bypasses only after normal traversal is confirmed; make sure no debug overlay is left on.

## Workflow rule
- Commit meaningful plans/specs and each implementation/fix separately with descriptive messages.
- In reports, distinguish committed code from browser/device-tested behavior. Never say a bug is fixed without a verification result.
