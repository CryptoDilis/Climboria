# Climboria 3D Physics Slice (prototype)

This is an isolated browser prototype on the `codex/free-3d-physics-slice` branch. It does not replace the production landing page.

## Run
Open `index.html` through a local static server or a GitHub Pages preview. It imports Three.js and Rapier from esm.sh, so the browser needs an internet connection.

## Controls
- WASD / arrow keys: move
- Space: jump
- Drag pointer: orbit camera
- On touch screens: onscreen movement pad and jump button

## Prototype scope
- Third-person camera
- Rapier capsule character body, gravity, collisions and jump
- Small stepped rock route, obstacles, distant low-poly mountain silhouettes
- Responsive touch controls and basic FPS/position readout

## Not production-ready yet
The character and environment are temporary primitive geometry. This is not final AAA art, full climbing/ledge-grab physics, a complete game loop, or a performance-certified mobile build. Next steps: run and test on target devices, tune movement/camera, then add a proper licensed/owned character rig, animation, PBR rock materials, terrain, and dedicated climbing mechanics.
