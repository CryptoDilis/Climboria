import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync('game/play.html', 'utf8');
const start = html.indexOf('function maxSwimDepth(');
const end = html.indexOf('function caveFloorHeightAt(', start);
assert.ok(start >= 0 && end > start);
const { maxSwimDepth, swimTargetY, updatePlayerWaterState } = runInNewContext(
 html.slice(start, end) + '\n({ maxSwimDepth, swimTargetY, updatePlayerWaterState })',
);

const body = { id: 'pond', surfaceY: 3, depth: 6 };
const playerAtSurface = () => ({ y: swimTargetY(body), vy: 0, jumpState: 'grounded' });

test('diving on a shallow bank cannot move through the sampled bed', () => {
 const player = playerAtSurface();
 const bed = 2.5;
 for (let step = 0; step < 120; step++) {
  assert.equal(updatePlayerWaterState(player, body, bed, 0.05, 1, 0, step * 0.05), true);
  assert.ok(player.y >= bed + 1.75);
 }
 assert.ok(Math.abs(player.swimDepth - 0.47) < 1e-9);
});

test('deep dive keeps the nominal limit, then clamps on the first shallower step', () => {
 const player = playerAtSurface();
 for (let step = 0; step < 120; step++) updatePlayerWaterState(player, body, -3, 0.05, 1);
 assert.equal(player.swimDepth, maxSwimDepth(body));
 assert.ok(player.y < 0);
 updatePlayerWaterState(player, body, 2.5, 0.05, 1);
 assert.ok(player.y >= 4.25);
 assert.ok(player.swimDepth < 0.5);
 for (let step = 0; step < 60; step++) updatePlayerWaterState(player, body, 2.5, 0.05, 0, 1);
 assert.equal(player.swimDepth, 0);
 assert.ok(Math.abs(player.y - swimTargetY(body)) < 0.01);
 updatePlayerWaterState(player, null, 3, 0.05, 0, 1);
 assert.equal(player.waterBodyId, null);
 assert.equal(player.swim, false);
 assert.equal(player.jumpCount, undefined);
});
