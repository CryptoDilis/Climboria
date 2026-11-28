import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync('game/play.html', 'utf8');
const start = html.indexOf('function maxSwimDepth(');
const end = html.indexOf('function caveFloorHeightAt(', start);
assert.ok(start >= 0 && end > start);
const updateWaterState = runInNewContext(html.slice(start, end) + '\nupdatePlayerWaterState');

test('stepping off a ledge enters descent without counting a jump', () => {
 const player = {
  y: 5, vy: 0, jumpState: 'grounded', jumpCount: 1, landCount: 1,
  jumpTrace: { jumpCount: 1, phases: ['takeoff', 'airborne', 'descent', 'land'], peakY: 7 },
 };
 updateWaterState(player, null, 0, 0.05);
 assert.equal(player.jumpState, 'descent');
 assert.equal(player.jumpTrace, null);
 assert.equal(player.jumpCount, 1);
 assert.ok(player.vy < 0);
 for (let i = 0; i < 20 && player.jumpState === 'descent'; i++) updateWaterState(player, null, 0, 0.05);
 assert.equal(player.y, 1.75);
 assert.equal(player.jumpState, 'land');
 assert.equal(player.landCount, 2);
 for (let i = 0; i < 10; i++) updateWaterState(player, null, 0, 0.05);
 assert.equal(player.jumpState, 'grounded');
 assert.equal(player.landCount, 2);
});

test('small height differences keep the player grounded and a real jump still takes off', () => {
 const player = { y: 1.8, vy: 0, jumpState: 'grounded', jumpCount: 0 };
 updateWaterState(player, null, 0, 0.05);
 assert.equal(player.jumpState, 'grounded');
 updateWaterState(player, null, 0, 0.05, 0, 1);
 assert.equal(player.jumpState, 'takeoff');
 assert.equal(player.jumpCount, 1);
 assert.ok(player.vy > 0);
});
