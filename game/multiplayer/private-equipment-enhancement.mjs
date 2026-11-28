import { createPrivateCraftingLedger } from './private-crafting-ledger.mjs';
const ROOM = 'preview-equipment-fixture';
const ITEM = 'training-climbing-gloves';
const MATERIAL = 'training-repair-fiber';
const MAX_ENHANCEMENT = 10;
const MAX_DURABILITY = 100;
const WEAR_PER_USE = 10;
const REPAIR_KITS = 3;
const USES_PER_FULL_DURABILITY = MAX_DURABILITY / WEAR_PER_USE;
const MAX_CRAFTED_REPAIRS = 10;
const MAX_USE_SEQUENCE = (REPAIR_KITS + MAX_CRAFTED_REPAIRS + 1) * USES_PER_FULL_DURABILITY;
const MAX_MAINTENANCE_REVISION = MAX_USE_SEQUENCE + REPAIR_KITS + MAX_CRAFTED_REPAIRS;
const materialCostThrough = level => level * (level + 1) / 2;
const MAX_MATERIALS = materialCostThrough(MAX_ENHANCEMENT);
const idOk = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(value);
const within = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const deny = reason => ({ ok: false, reason });
const keyFor = accountId => 'game:preview:equipment:v1:' + ROOM + ':' + accountId;

const startingMaintenance = () => ({
  durability: MAX_DURABILITY, remainingRepairKits: REPAIR_KITS, maintenanceRevision: 0, lastUseSequence: 0,
});

function readRecord(record, accountId) {
  if (!record || record.accountId !== accountId || record.item !== ITEM || record.material !== MATERIAL ||
      !within(record.enhancement, MAX_ENHANCEMENT) || !within(record.startingMaterials, MAX_MATERIALS) ||
      !within(record.remainingMaterials, MAX_MATERIALS) ||
      record.remainingMaterials + materialCostThrough(record.enhancement) !== record.startingMaterials) return null;

  if (record.version === 1) return { ...record, version: 2, ...startingMaintenance() };
  if (![2, 3].includes(record.version) || !within(record.durability, MAX_DURABILITY) || record.durability % WEAR_PER_USE !== 0 ||
      !within(record.remainingRepairKits, REPAIR_KITS) || !within(record.lastUseSequence, MAX_USE_SEQUENCE) ||
      !within(record.maintenanceRevision, MAX_MAINTENANCE_REVISION)) return null;
  const craftedRepairs = record.version === 3 ? record.craftedRepairs : 0;
  if (!within(craftedRepairs, MAX_CRAFTED_REPAIRS)) return null;
  const repairs = REPAIR_KITS - record.remainingRepairKits + craftedRepairs;
  if (record.lastUseSequence > (repairs + 1) * USES_PER_FULL_DURABILITY) return null;
  const usesRepaired = record.lastUseSequence - (MAX_DURABILITY - record.durability) / WEAR_PER_USE;
  if (record.maintenanceRevision !== record.lastUseSequence + repairs ||
      usesRepaired < repairs || usesRepaired > repairs * USES_PER_FULL_DURABILITY) return null;
  return record;
}

function view(record) {
  return {
    ok: true,
    item: record.item,
    enhancement: record.enhancement,
    material: record.material,
    remainingMaterials: record.remainingMaterials,
    durability: record.durability,
    remainingRepairKits: record.remainingRepairKits,
    maintenanceRevision: record.maintenanceRevision,
  };
}

// The fixture room provisions synthetic inventory, resolves authenticated
// ownership, and accepts only an expected level from an enhancement intent.
export function createPrivateEquipmentEnhancement({ roomId, storage, resolveOwner, resolveUse = () => null, craftingOwner = null, craftingStation = null } = {}) {
  if (roomId !== ROOM || typeof storage?.transaction !== 'function' || typeof resolveOwner !== 'function' || typeof resolveUse !== 'function')
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
      const stored = await tx.get(key);
      if (accountFor(sessionId) !== accountId) return deny('unverified-equipment-owner');
      if (stored === undefined) return deny('equipment-not-provisioned');
      const record = readRecord(stored, accountId);
      if (!record) return deny('invalid-stored-equipment');
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
        return readRecord(prior, accountId) ? deny('equipment-already-provisioned') : deny('invalid-stored-equipment');
      const record = {
        version: 2, accountId, item: ITEM, material: MATERIAL, enhancement: 0,
        startingMaterials: materials, remainingMaterials: materials, ...startingMaintenance(),
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

  // The room resolves completed uses against this owner and fixture item.
  async function recordWear(sessionId, useId) {
    if (!idOk(useId)) return deny('invalid-equipment-intent');
    return readOwnedEquipment(sessionId, async (tx, key, record) => {
      const use = resolveUse(sessionId, useId, ROOM);
      if (!use || use.roomId !== ROOM || use.sessionId !== sessionId || use.useId !== useId ||
          use.accountId !== record.accountId || use.item !== ITEM ||
          !within(use.sequence, MAX_USE_SEQUENCE) || use.sequence === 0) return deny('unverified-equipment-use');
      if (use.sequence <= record.lastUseSequence) return deny('equipment-use-already-recorded');
      if (use.sequence !== record.lastUseSequence + 1) return deny('equipment-use-out-of-order');
      if (use.maintenanceRevision !== record.maintenanceRevision) return deny('equipment-maintenance-changed');
      if (record.durability === 0) return deny('equipment-broken');

      const updated = {
        ...record,
        durability: record.durability - WEAR_PER_USE,
        lastUseSequence: use.sequence,
        maintenanceRevision: record.maintenanceRevision + 1,
      };
      await tx.put(key, updated);
      return view(updated);
    });
  }

  async function repair(sessionId, expectedRevision) {
    if (!within(expectedRevision, MAX_MAINTENANCE_REVISION)) return deny('invalid-equipment-intent');
    return readOwnedEquipment(sessionId, async (tx, key, record) => {
      if (expectedRevision !== record.maintenanceRevision) return deny('equipment-maintenance-changed');
      if (record.durability === MAX_DURABILITY) return deny('equipment-fully-repaired');
      if (record.remainingRepairKits === 0) return deny('insufficient-repair-kits');

      const updated = {
        ...record,
        durability: MAX_DURABILITY,
        remainingRepairKits: record.remainingRepairKits - 1,
        maintenanceRevision: record.maintenanceRevision + 1,
      };
      await tx.put(key, updated);
      return view(updated);
    });
  }

  // Private crafted repairs consume earned stock and restore equipment in the
  // same transaction. The ordinary synthetic repair-kit stock is unchanged.
  if ((craftingOwner !== null || craftingStation !== null) &&
      (typeof craftingOwner !== 'function' || typeof craftingStation !== 'function'))
    throw Error('Both private crafting authorities required');
  const crafting = craftingOwner === null ? null : createPrivateCraftingLedger({
    roomId: 'preview-crafting-fixture', storage, resolveOwner: craftingOwner, resolveStation: craftingStation,
    async applyRepairKit(reader, sessionId, accountId, expectedRevision) {
      const revalidate = () => accountFor(sessionId) === accountId;
      if (unavailable || !revalidate()) return deny('unverified-equipment-owner');
      const key = keyFor(accountId), stored = await reader.get(key);
      if (!revalidate()) return deny('unverified-equipment-owner');
      if (stored === undefined) return deny('equipment-not-provisioned');
      const state = readRecord(stored, accountId);
      if (!state) return deny('invalid-stored-equipment');
      if (state.maintenanceRevision !== expectedRevision) return deny('equipment-maintenance-changed');
      if (state.durability === MAX_DURABILITY) return deny('equipment-fully-repaired');
      const craftedRepairs = (state.version === 3 ? state.craftedRepairs : 0) + 1;
      if (craftedRepairs > MAX_CRAFTED_REPAIRS) return deny('crafted-repair-limit');
      const next = { ...state, version: 3, craftedRepairs, durability: MAX_DURABILITY,
        maintenanceRevision: state.maintenanceRevision + 1 };
      if (!readRecord(next, accountId)) return deny('invalid-stored-equipment');
      return { ok: true, key, state: next, view: view(next), revalidate };
    }
  });
  async function repairWithCraftedKit(sessionId, expectedCraftingRevision, expectedMaintenanceRevision) {
    if (!idOk(sessionId) || !within(expectedMaintenanceRevision, MAX_MAINTENANCE_REVISION))
      return deny('invalid-equipment-intent');
    if (unavailable) return deny('equipment-storage-unavailable');
    if (!crafting) return deny('crafted-repair-disabled');
    const result = await crafting.consumeRepairKit(sessionId, expectedCraftingRevision, expectedMaintenanceRevision);
    if (result.reason === 'crafting-storage-unavailable') unavailable = true;
    return result;
  }
  return Object.freeze({ provision, inspect, enhance, recordWear, repair, repairWithCraftedKit, reviewedForProduction: false });
}
