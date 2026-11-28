import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateEquipmentEnhancement } from './private-equipment-enhancement.mjs';

const roomId = 'preview-equipment-fixture';
const account = 'equipment_account_a';
const other = 'equipment_account_b';
const session = 'equipment_session_a';
const otherSession = 'equipment_session_b';

function fixture() {
  const records = new Map();
  const owners = new Map([[session, account], [otherSession, other]]);
  let tail = Promise.resolve();
  let onRead;
  let ambiguous = false;
  const storage = {
    transaction(operation) {
      const queued = tail.then(async () => {
        const draft = new Map(structuredClone([...records]));
        const result = await operation({
          get: async key => {
            onRead?.();
            return draft.get(key);
          },
          put: async (key, value) => draft.set(key, structuredClone(value)),
        });
        for (const [key, value] of draft) records.set(key, value);
        if (ambiguous) throw new Error('unknown commit outcome');
        return result;
      });
      tail = queued.catch(() => {});
      return queued;
    },
  };
  const options = { roomId, storage, resolveOwner: sessionId => ({ roomId, sessionId, accountId: owners.get(sessionId) }) };
  return {
    options,
    records,
    owners,
    make: () => createPrivateEquipmentEnhancement(options),
    onRead: callback => { onRead = callback; },
    setAmbiguous: value => { ambiguous = value; },
  };
}

test('material costs advance one level at a time from +0 through +10', async () => {
  const f = fixture();
  const equipment = f.make();
  assert.equal((await equipment.inspect(session)).reason, 'equipment-not-provisioned');
  assert.deepEqual(await equipment.provision(account), {
    ok: true, item: 'training-climbing-gloves', enhancement: 0, material: 'training-repair-fiber', remainingMaterials: 55,
  });
  let remaining = 55;
  for (let level = 0; level < 10; level++) {
    const upgraded = await equipment.enhance(session, level);
    remaining -= level + 1;
    assert.equal(upgraded.enhancement, level + 1);
    assert.equal(upgraded.remainingMaterials, remaining);
  }
  assert.equal((await equipment.enhance(session, 10)).reason, 'equipment-max-level');
  assert.equal((await equipment.provision(account)).reason, 'equipment-already-provisioned');
  assert.equal((await f.make().inspect(session)).remainingMaterials, 0);
});

test('concurrent requests for one level charge once and stale requests cannot advance it', async () => {
  const f = fixture();
  await f.make().provision(account, 2);
  const results = await Promise.all([f.make().enhance(session, 0), f.make().enhance(session, 0)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => result.reason === 'equipment-level-changed').length, 1);
  assert.equal((await f.make().enhance(session, 1)).reason, 'insufficient-materials');
  assert.equal((await f.make().inspect(session)).remainingMaterials, 1);
  assert.equal((await f.make().enhance(otherSession, 1)).reason, 'equipment-not-provisioned');
});

test('account reassignment during storage read and corrupted balances fail closed', async () => {
  const f = fixture();
  const equipment = f.make();
  await equipment.provision(account);
  f.onRead(() => f.owners.set(session, other));
  assert.equal((await equipment.enhance(session, 0)).reason, 'unverified-equipment-owner');
  f.onRead(undefined);
  f.owners.set(session, account);
  assert.equal((await equipment.inspect(session)).enhancement, 0);
  const [stored] = f.records.values();
  stored.remainingMaterials--;
  assert.equal((await equipment.enhance(session, 0)).reason, 'invalid-stored-equipment');
});

test('ambiguous commit does not produce a second charge after recreation', async () => {
  const f = fixture();
  const equipment = f.make();
  await equipment.provision(account);
  f.setAmbiguous(true);
  assert.equal((await equipment.enhance(session, 0)).reason, 'equipment-storage-unavailable');
  f.setAmbiguous(false);
  assert.equal((await equipment.enhance(session, 0)).reason, 'equipment-storage-unavailable');
  const restored = f.make();
  assert.equal((await restored.enhance(session, 0)).reason, 'equipment-level-changed');
  assert.equal((await restored.inspect(session)).remainingMaterials, 54);
});

test('production rooms, malformed intents, and excess fixture stock are rejected', async () => {
  const f = fixture();
  assert.throws(() => createPrivateEquipmentEnhancement({ ...f.options, roomId: 'jarrell-peak' }));
  const equipment = f.make();
  assert.equal((await equipment.provision(account, 56)).reason, 'invalid-equipment-fixture');
  assert.equal((await equipment.enhance(session, '0')).reason, 'invalid-equipment-intent');
  assert.equal((await equipment.enhance('anonymous', 0)).reason, 'invalid-equipment-intent');
  assert.equal(f.records.size, 0);
});
