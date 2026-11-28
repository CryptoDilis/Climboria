import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const play = readFileSync(new URL('../play.html', import.meta.url), 'utf8');
const start = play.indexOf('function canReachCampfire(');
const end = play.indexOf('function interact()', start);
assert.ok(start >= 0 && end > start);

function campfireFixture() {
 const context = {
  expeditionFire: { flame: { visible: false }, light: { visible: false }, remaining: 2 },
  P: { mode: 'walk', x: 0, z: 0, y: 1.75, swim: false },
  POI: { camp: { x: 0, z: 0 } },
  document: { hidden: false },
  FACILITY_USE_RANGE: 5,
  groundAt: () => 0,
  campfirePrompt: { hidden: true, textContent: '' },
  deathLootPrompt: { style: {} },
  chests: [],
  MOB: false,
 };
 return { ...context, ...runInNewContext(play.slice(start, end) +
  '\n({ canReachCampfire, setExpeditionFire, updateExpeditionFire })', context) };
}

test('only a lit fire burns fuel while gameplay is visible and expiry hides its flame and light', () => {
 const f = campfireFixture();
 f.updateExpeditionFire(1);
 assert.equal(f.expeditionFire.remaining, 2);
 f.setExpeditionFire(true);
 f.document.hidden = true;
 f.updateExpeditionFire(1);
 assert.equal(f.expeditionFire.remaining, 2);
 f.document.hidden = false;
 f.updateExpeditionFire(1);
 assert.equal(f.expeditionFire.remaining, 1);
 assert.equal(f.campfirePrompt.textContent, 'E · Extinguish campfire');
 f.updateExpeditionFire(1);
 assert.equal(f.expeditionFire.remaining, 0);
 assert.equal(f.expeditionFire.flame.visible, false);
 assert.equal(f.expeditionFire.light.visible, false);
 assert.equal(f.campfirePrompt.textContent, 'Campfire · Out of fuel');
});

test('campfire interaction requires ground and yields its prompt to chest and death loot', () => {
 const f = campfireFixture();
 assert.equal(f.canReachCampfire(), true);
 f.P.x = 5;
 assert.equal(f.canReachCampfire(), false);
 f.P.x = 0;
 f.P.y = 3;
 assert.equal(f.canReachCampfire(), false);
 f.P.y = 1.75;
 f.P.swim = true;
 assert.equal(f.canReachCampfire(), false);
 f.P.swim = false;
 f.chests.push({ x: 0, z: 0, open: false });
 f.updateExpeditionFire(0);
 assert.equal(f.campfirePrompt.hidden, true);
 f.chests[0].open = true;
 f.deathLootPrompt.style.display = 'block';
 f.updateExpeditionFire(0);
 assert.equal(f.campfirePrompt.hidden, true);
});
