import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const play = readFileSync(new URL('../play.html', import.meta.url), 'utf8');
const start = play.indexOf('function canReachCampSite(');
const end = play.indexOf('function interact()', start);
assert.ok(start >= 0 && end > start);

function campfireFixture() {
 const roof = play.slice(play.indexOf('const SHELTER_ROOF='),play.indexOf('const expeditionShelter='));
 const context = {
  expeditionShelter: { x: 10, y: 0, z: 0, tent: { visible: false }, packed: { visible: true }, remaining: 0 },
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
 return { ...context, ...runInNewContext(roof+play.slice(start, end) +
  '\n({ canReachCampfire, setExpeditionFire, setExpeditionShelter, updateExpeditionCamp, underShelterRoof })', context) };
}

test('only a lit fire burns fuel while gameplay is visible and expiry hides its flame and light', () => {
 const f = campfireFixture();
 f.updateExpeditionCamp(1);
 assert.equal(f.expeditionFire.remaining, 2);
 f.setExpeditionFire(true);
 f.document.hidden = true;
 f.updateExpeditionCamp(1);
 assert.equal(f.expeditionFire.remaining, 2);
 f.document.hidden = false;
 f.updateExpeditionCamp(1);
 assert.equal(f.expeditionFire.remaining, 1);
 assert.equal(f.campfirePrompt.textContent, 'E · Extinguish campfire');
 f.updateExpeditionCamp(1);
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
 f.updateExpeditionCamp(0);
 assert.equal(f.campfirePrompt.hidden, true);
 f.chests[0].open = true;
 f.deathLootPrompt.style.display = 'block';
 f.updateExpeditionCamp(0);
 assert.equal(f.campfirePrompt.hidden, true);
});

test('pitch and expiry swap the tent and packed campsite while keeping fire state independent', () => {
 const f=campfireFixture();
 f.P.x=10;
 f.updateExpeditionCamp(0);
 assert.equal(f.campfirePrompt.textContent,'E · Pitch shelter');
 f.setExpeditionShelter(true);
 f.updateExpeditionCamp(299);
 assert.equal(f.expeditionShelter.tent.visible,true);
 assert.equal(f.expeditionShelter.packed.visible,false);
 assert.equal(f.campfirePrompt.textContent,'E · Pack shelter');
 f.updateExpeditionCamp(1);
 assert.equal(f.expeditionShelter.tent.visible,false);
 assert.equal(f.expeditionShelter.packed.visible,true);
 assert.equal(f.expeditionFire.remaining,2);
});

test('rain beneath the canvas roof is clipped within its deployed footprint', () => {
 const f=campfireFixture();
 assert.equal(f.underShelterRoof(10,1.75,0),true);
 assert.equal(f.underShelterRoof(10,3,0),false);
 assert.equal(f.underShelterRoof(10,1.75,2),false);
 assert.equal(f.underShelterRoof(11.6,1.75,0),false);
});
