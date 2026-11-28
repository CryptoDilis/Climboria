import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync('game/play.html', 'utf8');
const start = html.indexOf('const isEditingText=');
const end = html.indexOf('// Input lifecycle cleanup', start);
assert.ok(start >= 0 && end > start);

function keyboard() {
 const events = new Map();
 const state = vm.createContext({
  keys: {}, P: { moveTarget: { x: 3, z: 6 } },
  takeOver() {}, requestVisualPunch() {}, interact() {},
  addEventListener: (type, callback) => events.set(type, callback),
 });
 vm.runInContext(html.slice(start, end), state);
 return {
  state,
  press(code, tag, options = {}) {
   const key = {
    code,
    target: { closest: selector => selector.split(',').includes(tag) ? {} : null },
    preventDefault() { this.defaultPrevented = true; },
    defaultPrevented: false,
    ...options,
   };
   events.get('keydown')(key);
   return key;
  },
  release: code => events.get('keyup')({ code }),
 };
}

test('Space on a focused button or disclosure preserves its native action', () => {
 for (const control of ['button', 'summary', '[role="button"]']) {
  const keyboardState = keyboard();
  const event = keyboardState.press('Space', control);
  assert.equal(event.defaultPrevented, false, control);
  assert.equal(keyboardState.state.keys.Space, undefined);
  assert.ok(keyboardState.state.P.moveTarget);
 }
});

test('a world Space still jumps and clears click-to-move', () => {
 const keyboardState = keyboard();
 assert.equal(keyboardState.press('Space', 'canvas').defaultPrevented, true);
 assert.equal(keyboardState.state.keys.Space, true);
 assert.equal(keyboardState.state.P.moveTarget, null);
 keyboardState.release('Space');
 assert.equal(keyboardState.state.keys.Space, false);
});

test('the world respects editable fields and already-consumed key events', () => {
 const keyboardState = keyboard();
 keyboardState.press('Space', 'input');
 keyboardState.press('Space', 'canvas', { defaultPrevented: true });
 assert.equal(keyboardState.state.keys.Space, undefined);
 assert.ok(keyboardState.state.P.moveTarget);
});
