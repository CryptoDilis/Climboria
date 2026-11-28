const ROOM = 'preview-equipment-fixture';
const ITEM = 'training-climbing-gloves';
const MATERIAL = 'training-repair-fiber';
const MAX_ENHANCEMENT = 10;
const materialCostThrough = level => level * (level + 1) / 2;
const MAX_MATERIALS = materialCostThrough(MAX_ENHANCEMENT);
const idOk = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(value);
const within = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const deny = reason => ({ ok: false, reason });
const keyFor = accountId => 'game:preview:equipment:v1:' + ROOM + ':' + accountId;

function validRecord(record, accountId) {
  return record?.version === 1 && record.accountId === accountId &&
    record.item === ITEM && record.material === MATERIAL &&
    within(record.enhancement, MAX_ENHANCEMENT) &&
    within(record.startingMaterials, MAX_MATERIALS) &&
    within(record.remainingMaterials, MAX_MATERIALS) &&
    record.remainingMaterials + materialCostThrough(record.enhancement) === record.startingMaterials;
}

function view(record) {
  return {
    ok: true,
    item: record.item,
    enhancement: record.enhancement,
    material: record.material,
    remainingMaterials: record.remainingMaterials,
  };
}

// The fixture room provisions synthetic inventory, resolves authenticated
// ownership, and accepts only an expected level from an enhancement intent.
export function createPrivateEquipmentEnhancement({ roomId, storage, resolveOwner } = {}) {
  if (roomId !== ROOM || typeof storage?.transaction !== 'function' || typeof resolveOwner !== 'function')
    throw new Error('Explicit private equipment storage and owner authority required');

  let unavailable = false;
  async function transact(operation) {
    if (unavailable) return deny('equipment-storage-unavailable');
    try {
      return await storage.transaction(operation);
    } catch {
      // A fresh instance must read the persisted level before accepting retries.
      unavailable = true;
      return deny('equipment-storage-unavailable');
    }
  }

  function accountFor(sessionId) {
    const owner = resolveOwner(sessionId, ROOM);
    return owner?.sessionId === sessionId && owner.roomId === ROOM && idOk(owner.accountId)
      ? owner.accountId : null;
  }

  function readOwnedEquipment(sessionId, operation) {
    if (!idOk(sessionId)) return deny('invalid-equipment-intent');
    return transact(async tx => {
      const accountId = accountFor(sessionId);
      if (!accountId) return deny('unverified-equipment-owner');
      const key = keyFor(accountId);
      const record = await tx.get(key);
      if (accountFor(sessionId) !== accountId) return deny('unverified-equipment-owner');
      if (record === undefined) return deny('equipment-not-provisioned');
      if (!validRecord(record, accountId)) return deny('invalid-stored-equipment');
      return operation(tx, key, record);
    });
  }

  // Room-side setup only. Repeated provisioning never replenishes materials.
  async function provision(accountId, materials = MAX_MATERIALS) {
    if (!idOk(accountId) || !within(materials, MAX_MATERIALS)) return deny('invalid-equipment-fixture');
    return transact(async tx => {
      const key = keyFor(accountId);
      const prior = await tx.get(key);
      if (prior !== undefined)
        return validRecord(prior, accountId) ? deny('equipment-already-provisioned') : deny('invalid-stored-equipment');
      const record = {
        version: 1, accountId, item: ITEM, material: MATERIAL, enhancement: 0,
        startingMaterials: materials, remainingMaterials: materials,
      };
      await tx.put(key, record);
      return view(record);
    });
  }

  async function inspect(sessionId) {
    return readOwnedEquipment(sessionId, (_tx, _key, record) => view(record));
  }

  async function enhance(sessionId, expectedLevel) {
    if (!within(expectedLevel, MAX_ENHANCEMENT)) return deny('invalid-equipment-intent');
    return readOwnedEquipment(sessionId, async (tx, key, record) => {
      if (record.enhancement !== expectedLevel) return deny('equipment-level-changed');
      if (record.enhancement === MAX_ENHANCEMENT) return deny('equipment-max-level');
      const nextLevel = record.enhancement + 1;
      if (record.remainingMaterials < nextLevel) return deny('insufficient-materials');
      const updated = { ...record, enhancement: nextLevel, remainingMaterials: record.remainingMaterials - nextLevel };
      await tx.put(key, updated);
      return view(updated);
    });
  }

  return Object.freeze({ provision, inspect, enhance, reviewedForProduction: false });
}
