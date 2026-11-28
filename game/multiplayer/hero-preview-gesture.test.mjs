import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('game/index.html', 'utf8');
const start = html.indexOf('let previewDrag=null;');
const end = html.indexOf("document.getElementById('playGuestButton')", start);
assert.ok(start >= 0 && end > start);

function preview() {
 const handlers = new Map();
 const captures = [];
 const state = vm.createContext({
  previewAngle: 0, previewDistance: 4, previewTouchDistance: null,
  heroCanvas: {
   addEventListener: (type, listener) => handlers.set(type, listener),
   setPointerCapture: id => captures.push(id),
  },
 });
 vm.runInContext(html.slice(start, end), state);
 return {
  state, captures,
  event: (type, event) => handlers.get(type)(event),
 };
}

const pointer = (pointerId, clientX, options = {}) => ({ pointerId, clientX, button: 0, isPrimary: true, ...options });
const touches = (...xs) => ({ targetTouches: xs.map(clientX => ({ clientX, clientY: 0 })), preventDefault() {} });

test('only the captured primary pointer rotates and capture loss ends dragging', () => {
 const p = preview();
 p.event('pointerdown', pointer(1, 10));
 p.event('pointerdown', pointer(2, 50, { isPrimary: false }));
 p.event('pointermove', pointer(2, 100, { isPrimary: false }));
 p.event('pointerup', pointer(2, 100, { isPrimary: false }));
 p.event('pointermove', pointer(1, 20));
 assert.deepEqual(p.captures, [1]);
 assert.equal(p.state.previewAngle, 0.12);
 p.event('lostpointercapture', pointer(1, 20));
 p.event('pointermove', pointer(1, 30));
 p.event('pointerdown', pointer(3, 10, { button: 2 }));
 assert.deepEqual(p.captures, [1]);
 assert.equal(p.state.previewAngle, 0.12);
});

test('pinch changes zoom without rotation and cancellation clears its baseline', () => {
 const p = preview();
 p.event('pointerdown', pointer(1, 10));
 p.event('touchstart', touches(10, 30));
 p.event('pointermove', pointer(1, 15));
 p.event('touchmove', touches(5, 45));
 assert.equal(p.state.previewAngle, 0);
 assert.equal(p.state.previewDistance, 3.8);
 p.event('touchcancel', touches());
 p.event('touchstart', touches(10, 110));
 p.event('touchmove', touches(10, 110));
 assert.equal(p.state.previewDistance, 3.8);
});
