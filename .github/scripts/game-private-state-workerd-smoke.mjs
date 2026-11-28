import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

const storageDirectory = await mkdtemp(join(tmpdir(), 'climboria-fixture-sqlite-'));
let runtime;
let fixture;

async function start() {
  runtime = new Miniflare({
    modules: true,
    modulesRoot: fileURLToPath(new URL('../../', import.meta.url)),
    scriptPath: fileURLToPath(new URL('./game-private-state-workerd-fixture.mjs', import.meta.url)),
    compatibilityDate: '2026-08-06',
    durableObjects: { FIXTURE: { className: 'PrivateFixture', useSQLite: true } },
    durableObjectsPersist: storageDirectory,
  });
  const namespace = await runtime.getDurableObjectNamespace('FIXTURE');
  fixture = namespace.get(namespace.idFromName('combined-private-fixture'));
}

async function request(path, now) {
  const url = new URL(path, 'https://private-fixture.internal/');
  url.searchParams.set('now', now);
  const response = await fixture.fetch(url);
  assert.equal(response.status, 200, path);
  return response.json();
}

try {
  await start();
  assert.equal((await runtime.dispatchFetch('http://localhost/open-drop?now=1000')).status, 404);
  assert.deepEqual(await request('open-drop', 1000), { ok: true, expiresAtMs: 91000 });

  const credits = await Promise.all([request('record-skill', 1000), request('record-skill', 1000)]);
  assert.equal(credits.filter(result => result.ok && result.rank === 'Apprentice').length, 1);
  assert.equal(credits.filter(result => result.reason === 'activity-already-recorded').length, 1);

  assert.equal((await request('provision-equipment', 1000)).enhancement, 0);
  const enhanced = await Promise.all([request('enhance-equipment', 1000), request('enhance-equipment', 1000)]);
  assert.equal(enhanced.filter(result => result.ok && result.enhancement === 1).length, 1);
  assert.equal(enhanced.filter(result => result.reason === 'equipment-level-changed').length, 1);
  assert.equal((await request('wear-equipment', 1000)).durability, 90);
  const repairs = await Promise.all([request('repair-equipment', 1000), request('repair-equipment', 1000)]);
  assert.equal(repairs.filter(result => result.ok && result.remainingRepairKits === 2).length, 1);
  assert.equal(repairs.filter(result => result.reason === 'equipment-maintenance-changed').length, 1);

  assert.equal((await runtime.dispatchFetch('http://localhost/survival-provision')).status, 404);
  assert.deepEqual(await request('survival-provision', 1000), { ok: true, food: 2, water: 1, revision: 0 });
  assert.equal((await request('survival-active', 1000)).hunger, 7000);
  const eaten = await Promise.all([request('survival-eat', 1000), request('survival-eat', 1000)]);
  assert.equal(eaten.filter(result => result.ok && result.hunger === 9000).length, 1);
  assert.equal(eaten.filter(result => result.reason === 'supplies-revision-changed').length, 1);
  assert.deepEqual(await request('survival-stock', 1000), { ok: true, food: 1, water: 1, revision: 1 });

  const first = await request('cave', 1000);
  assert.equal(first.event.startsAtMs, 1000);
  assert.equal((await request('cave', 1030)).event, null);

  await runtime.dispose();
  runtime = undefined;
  await start();

  assert.equal((await request('record-skill', 1031)).reason, 'activity-already-recorded');
  assert.equal((await request('cave', 1029)).event, null);
  assert.equal((await request('inspect-equipment', 1031)).remainingMaterials, 54);
  assert.equal((await request('enhance-equipment', 1031)).reason, 'equipment-level-changed');
  const equipment = await request('inspect-equipment', 1031);
  assert.equal(equipment.durability, 100);
  assert.equal(equipment.remainingRepairKits, 2);
  assert.equal((await request('wear-equipment', 1031)).reason, 'equipment-use-already-recorded');
  assert.equal((await request('repair-equipment', 1031)).reason, 'equipment-maintenance-changed');

  assert.deepEqual(await request('survival-inspect', 1000000000), { ok: true, hunger: 9000, thirst: 6400, maximum: 10000, sequence: 1 });
  assert.deepEqual(await request('survival-stock', 1000000000), { ok: true, food: 1, water: 1, revision: 1 });
  assert.equal((await request('survival-active', 1000000000)).reason, 'active-interval-already-recorded');
  assert.equal((await request('survival-eat', 1000000000)).reason, 'supplies-revision-changed');
  assert.equal((await request('survival-provision', 1000000000)).reason, 'supplies-already-provisioned');

  const claims = await Promise.all([request('claim-drop', 90999), request('claim-drop', 90999)]);
  assert.equal(claims.filter(result => result.ok).length, 1);
  assert.equal(claims.filter(result => result.reason === 'drop-already-claimed').length, 1);
  assert.equal((await request('claim-drop', 91000)).reason, 'drop-expired');
  assert.equal((await request('open-drop', 91000)).reason, 'drop-expired');

  console.log('Verified private drop expiry, mastery replay protection, equipment costs and repair, regional event expiry, and atomic survival consumption across a local workerd restart');
} finally {
  try {
    await runtime?.dispose();
  } finally {
    await rm(storageDirectory, { recursive: true, force: true });
  }
}
