import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync('game/play.html', 'utf8');
const start = html.indexOf("cv.addEventListener('mousedown'");
const end = html.indexOf('/* ---------- gameplay layer', start);
assert.ok(start >= 0 && end > start);

function world() {
 const canvasEvents = new Map(), windowEvents = new Map(), documentEvents = new Map();
 const cv = { addEventListener: (type, fn) => canvasEvents.set(type, fn) };
 const state = vm.createContext({
  cv, drag: false, locked: false, cameraYaw: 0, cameraPitch: 0,
  P: { x: 0, z: 0, mode: 'walk' },
  cam: {}, innerWidth: 1000, innerHeight: 700, groundAt: () => 8,
  T3: {
   Raycaster: class {
    setFromCamera() {}
    ray = { intersectPlane: (_plane, hit) => { Object.assign(hit, { x: 12, z: 14 }); return hit; } };
   },
   Vector2: class {}, Vector3: class {}, Plane: class {},
  },
  addEventListener: (type, fn) => windowEvents.set(type, fn),
  document: { addEventListener: (type, fn) => documentEvents.set(type, fn) },
 });
 vm.runInContext(html.slice(start, end), state);
 return {
  state,
  down: button => canvasEvents.get('mousedown')({ target: cv, button, clientX: 400, clientY: 300 }),
  up: button => windowEvents.get('mouseup')({ button }),
  move: buttons => windowEvents.get('mousemove')({ buttons, movementX: 100, movementY: 0 }),
  lock() { state.document.pointerLockElement = cv; documentEvents.get('pointerlockchange')(); },
 };
}

test('left click sets the walk destination without starting orbit', () => {
 const scene = world();
 scene.down(0);
 assert.equal(scene.state.P.moveTarget.x, 12);
 assert.equal(scene.state.P.moveTarget.z, 14);
 scene.move(1);
 assert.equal(scene.state.cameraYaw, 0);
});

test('right orbit survives another button release and stops if the right release is lost', () => {
 const scene = world();
 scene.down(2);
 scene.down(0);
 scene.up(0);
 scene.move(2);
 assert.ok(scene.state.cameraYaw < 0);
 const yaw = scene.state.cameraYaw;
 scene.move(0);
 scene.move(2);
 assert.equal(scene.state.cameraYaw, yaw);
 scene.lock();
 scene.move(0);
 assert.ok(scene.state.cameraYaw < yaw);
});
