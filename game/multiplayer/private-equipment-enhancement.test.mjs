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
  const uses = new Map();
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
  const options = {
    roomId,
    storage,
    resolveOwner: sessionId => ({ roomId, sessionId, accountId: owners.get(sessionId) }),
    resolveUse: (_sessionId, useId) => uses.get(useId),
  };
  return {
    options,
    records,
    owners,
    uses,
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
    durability: 100, remainingRepairKits: 3, maintenanceRevision: 0,
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

function trustUse(f, sequence, accountId = account, suffix = '') {
  const useId = 'training_equipment_use_' + sequence + suffix;
  const key = 'game:preview:equipment:v1:' + roomId + ':' + accountId;
  const maintenanceRevision = f.records.get(key)?.maintenanceRevision ?? 0;
  f.uses.set(useId, {
    roomId, sessionId: session, accountId, item: 'training-climbing-gloves', sequence, useId, maintenanceRevision,
  });
  return useId;
}

test('verified use is applied once and one repair consumes a kit atomically', async () => {
  const f = fixture();
  await f.make().provision(account);
  const useId = trustUse(f, 1);
  const wear = await Promise.all([f.make().recordWear(session, useId), f.make().recordWear(session, useId)]);
  assert.equal(wear.filter(result => result.durability === 90).length, 1);
  assert.equal(wear.filter(result => result.reason === 'equipment-use-already-recorded').length, 1);
  const repairs = await Promise.all([f.make().repair(session, 1), f.make().repair(session, 1)]);
  assert.equal(repairs.filter(result => result.durability === 100 && result.remainingRepairKits === 2).length, 1);
  assert.equal(repairs.filter(result => result.reason === 'equipment-maintenance-changed').length, 1);
  assert.equal((await f.make().inspect(session)).remainingMaterials, 55);
  assert.equal((await f.make().repair(session, 2)).reason, 'equipment-fully-repaired');
  const [stored] = f.records.values();
  stored.durability = 90;
  assert.equal((await f.make().inspect(session)).reason, 'invalid-stored-equipment');
});

test('ownership and use sequence must qualify before wear; broken items can be repaired', async () => {
  const f = fixture();
  const equipment = f.make();
  await equipment.provision(account);
  assert.equal((await equipment.recordWear(session, trustUse(f, 2))).reason, 'equipment-use-out-of-order');
  assert.equal((await equipment.recordWear(session, trustUse(f, 1, other))).reason, 'unverified-equipment-use');
  for (let sequence = 1; sequence <= 10; sequence++) {
    const worn = await equipment.recordWear(session, trustUse(f, sequence));
    assert.equal(worn.durability, 100 - 10 * sequence);
  }
  const stale = trustUse(f, 11);
  assert.equal((await equipment.recordWear(session, stale)).reason, 'equipment-broken');
  assert.equal((await equipment.repair(session, 10)).durability, 100);
  assert.equal((await equipment.recordWear(session, stale)).reason, 'equipment-maintenance-changed');
  assert.equal((await equipment.recordWear(session, trustUse(f, 11, account, '_fresh'))).durability, 90);
});

test('a legacy equipment record preserves enhancement and receives initial maintenance stock once', async () => {
  const f = fixture();
  f.records.set('game:preview:equipment:v1:' + roomId + ':' + account, {
    version: 1, accountId: account, item: 'training-climbing-gloves', material: 'training-repair-fiber',
    enhancement: 1, startingMaterials: 55, remainingMaterials: 54,
  });
  const equipment = f.make();
  assert.equal((await equipment.inspect(session)).enhancement, 1);
  assert.equal((await equipment.inspect(session)).durability, 100);
  for (let sequence = 1; sequence <= 4; sequence++) {
    const worn = await equipment.recordWear(session, trustUse(f, sequence));
    const repair = await equipment.repair(session, worn.maintenanceRevision);
    if (sequence < 4) assert.equal(repair.remainingRepairKits, 3 - sequence);
    else assert.equal(repair.reason, 'insufficient-repair-kits');
  }
  const record = [...f.records.values()][0];
  assert.equal(record.version, 2);
  assert.equal(record.enhancement, 1);
  assert.equal(record.remainingMaterials, 54);
});
