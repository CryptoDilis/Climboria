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

  const first = await request('cave', 1000);
  assert.equal(first.event.startsAtMs, 1000);
  assert.equal((await request('cave', 1030)).event, null);

  await runtime.dispose();
  runtime = undefined;
  await start();

  assert.equal((await request('record-skill', 1031)).reason, 'activity-already-recorded');
  assert.equal((await request('cave', 1029)).event, null);

  const claims = await Promise.all([request('claim-drop', 90999), request('claim-drop', 90999)]);
  assert.equal(claims.filter(result => result.ok).length, 1);
  assert.equal(claims.filter(result => result.reason === 'drop-already-claimed').length, 1);
  assert.equal((await request('claim-drop', 91000)).reason, 'drop-expired');
  assert.equal((await request('open-drop', 91000)).reason, 'drop-expired');

  console.log('Verified private drop expiry, mastery replay protection, and regional event expiry across a local workerd restart');
} finally {
  try {
    await runtime?.dispose();
  } finally {
    await rm(storageDirectory, { recursive: true, force: true });
  }
}
