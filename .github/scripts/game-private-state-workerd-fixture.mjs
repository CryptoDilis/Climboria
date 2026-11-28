import { createPrivateExpeditionCooking } from '../../game/multiplayer/private-expedition-cooking.mjs';
import { createPrivateCampsiteRegistry } from '../../game/multiplayer/private-campsite-registry.mjs';
import { createPrivateCraftingLedger } from '../../game/multiplayer/private-crafting-ledger.mjs';
import { createPrivateSurvivalLedger } from '../../game/multiplayer/private-survival-ledger.mjs';
import { createPrivateEquipmentEnhancement } from '../../game/multiplayer/private-equipment-enhancement.mjs';
import { createPrivateMasteryLedger } from '../../game/multiplayer/private-mastery-ledger.mjs';
import { createPrivateRegionEvents } from '../../game/multiplayer/private-region-events.mjs';
import { createWorldDropClaimPreview } from '../../game/multiplayer/world-drop-claim-preview.mjs';

// CI fixture reachable only through the local Durable Object binding.
export class PrivateFixture {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const now = Number(url.searchParams.get('now'));
    const sessionId = 'fixture_session_a';
    const accountId = 'fixture_account_a';
    const activityId = 'fixture_activity_1';
    const dropRoom = 'preview-world-drop-fixture';
    const masteryRoom = 'preview-mastery-fixture';

    switch (url.pathname) {
      case '/open-drop':
      case '/claim-drop': {
        const drop = createWorldDropClaimPreview({
          storage: this.storage,
          roomId: dropRoom,
          clock: () => now,
          resolveActor: () => ({
            serverId: sessionId,
            accountId,
            roomId: dropRoom,
            health: 500,
            observedAtMs: now,
            position: { x: 200, y: 0, z: 20 },
          }),
          clearPath: () => true,
        });
        const result = url.pathname === '/open-drop'
          ? await drop.openDrop()
          : await drop.claim(sessionId, 'preview-world-drop-1');
        return Response.json(result);
      }
      case '/record-skill': {
        const mastery = createPrivateMasteryLedger({
          storage: this.storage,
          roomId: masteryRoom,
          thresholds: [1, 2, 3, 4],
          resolveActivity: () => ({
            sessionId, accountId, activityId, skill: 'climbing', sequence: 1, roomId: masteryRoom,
          }),
        });
        return Response.json(await mastery.record(sessionId, activityId));
      }
      case '/provision-equipment':
      case '/inspect-equipment':
      case '/enhance-equipment':
      case '/wear-equipment':
      case '/repair-equipment': {
        const equipmentRoom = 'preview-equipment-fixture';
        const useId = 'training_equipment_use_1';
        const equipment = createPrivateEquipmentEnhancement({
          storage: this.storage,
          roomId: equipmentRoom,
          resolveOwner: () => ({ sessionId, accountId, roomId: equipmentRoom }),
          resolveUse: () => ({
            sessionId, accountId, roomId: equipmentRoom, item: 'training-climbing-gloves', useId, sequence: 1, maintenanceRevision: 0,
          }),
        });
        if (url.pathname === '/provision-equipment') return Response.json(await equipment.provision(accountId));
        if (url.pathname === '/inspect-equipment') return Response.json(await equipment.inspect(sessionId));
        if (url.pathname === '/enhance-equipment') return Response.json(await equipment.enhance(sessionId, 0));
        if (url.pathname === '/wear-equipment') return Response.json(await equipment.recordWear(sessionId, useId));
        return Response.json(await equipment.repair(sessionId, 1));
      }
      case '/prepare-refuel':
      case '/refuel-camp':
      case '/inspect-camp':
      case '/inspect-fuel': {
        const slot = 'forest-camp';
        const owner = (id, roomId) => id === sessionId ? { sessionId, accountId, roomId } : null;
        const crafting = createPrivateCraftingLedger({
          roomId: 'preview-crafting-fixture', storage: this.storage, resolveOwner: owner,
          resolveStation: (id, room) => ({ ...owner(id, room), station: 'campfire', inRange: true }),
        });
        const camps = createPrivateCampsiteRegistry({
          roomId: 'preview-campsite-fixture', storage: this.storage, clock: () => now, resolveOwner: owner,
          resolvePlacement: (id, site, room) => ({
            ...owner(id, room), slot: site, inRange: true, grounded: true, clear: true, inCombat: false,
          }),
          planCampfireRefuel: crafting.planCampfireRefuel,
        });
        if (url.pathname === '/inspect-fuel') return Response.json(await crafting.inspect(sessionId));
        if (url.pathname === '/inspect-camp') return Response.json(await camps.inspect(sessionId));
        if (url.pathname === '/refuel-camp') return Response.json(await camps.refuel(sessionId, slot, 3, 0));
        const stock = await crafting.provision(accountId, {
          fiber: 0, wood: 1, 'raw-fish': 0, 'repair-kit': 0, 'cooked-fish': 0,
        });
        const placed = await camps.place(sessionId, slot, 0);
        const lit = await camps.ignite(sessionId, slot, 1);
        const extinguished = await camps.extinguish(sessionId, slot, 2);
        return Response.json({ ok: stock.ok && placed.ok && lit.ok && extinguished.ok });
      }
      case '/expedition-prepare':
      case '/expedition-cook':
      case '/expedition-extinguish':
      case '/expedition-refuel':
      case '/expedition-stock':
      case '/expedition-camp': {
        // Separate local DO identity in the smoke driver; no production routing.
        // Reconstruct the private authored approach on every request, while
        // durable campsite and inventory state remain in the same SQLite DO.
        if (!Number.isSafeInteger(now) || now < 400) return Response.json({ ok: false, reason: 'invalid-fixture-time' });
        let tickTime = now - 400;
        const owner = (id, roomId) => id === sessionId ? { sessionId, accountId, roomId } : null;
        const expedition = createPrivateExpeditionCooking({
          roomId: 'preview-crafting-fixture', storage: this.storage, clock: () => tickTime, resolveOwner: owner,
        });
        if (!expedition.join(sessionId).ok) throw Error('Expedition fixture join failed');
        for (let sequence = 0; sequence < 4; sequence++) {
          if (!expedition.input(sessionId, { x: 1, z: 0, sequence }).ok) throw Error('Expedition fixture input failed');
          tickTime += 100;
          if (!expedition.tick().ok) throw Error('Expedition fixture tick failed');
        }
        const revision = Number(url.searchParams.get('revision'));
        if (url.pathname === '/expedition-stock') return Response.json(await expedition.inspectStock(sessionId));
        if (url.pathname === '/expedition-camp') return Response.json(await expedition.inspectCamp(sessionId));
        if (url.pathname === '/expedition-cook') return Response.json(await expedition.cook(sessionId, revision));
        if (url.pathname === '/expedition-extinguish') return Response.json(await expedition.extinguish(sessionId, revision));
        if (url.pathname === '/expedition-refuel') return Response.json(await expedition.refuel(sessionId, revision, Number(url.searchParams.get('inventoryRevision'))));
        const stock = await expedition.provision(accountId, { fiber: 0, wood: 4, 'raw-fish': 3, 'repair-kit': 0, 'cooked-fish': 0 });
        const placed = await expedition.place(sessionId, 0);
        const lit = await expedition.ignite(sessionId, 1);
        return Response.json({ ok: stock.ok && placed.ok && lit.ok });
      }
      case '/survival-inspect':
      case '/survival-stock':
      case '/survival-provision':
      case '/survival-active':
      case '/survival-eat': {
        const roomId = 'preview-survival-fixture';
        const intervalId = 'fixture_interval_1';
        const survival = createPrivateSurvivalLedger({
          storage: this.storage, roomId, hungerRate: 50, thirstRate: 60,
          resolveOwner: () => ({ sessionId, accountId, roomId }),
          resolveActiveInterval: () => ({ sessionId, accountId, roomId, intervalId, sequence: 1, activeSeconds: 60 }),
        });
        if (url.pathname === '/survival-inspect') return Response.json(await survival.inspect(sessionId));
        if (url.pathname === '/survival-stock') return Response.json(await survival.inspectSupplies(sessionId));
        if (url.pathname === '/survival-provision') return Response.json(await survival.provisionSupplies(accountId, 2, 1));
        if (url.pathname === '/survival-active') return Response.json(await survival.recordActiveInterval(sessionId, intervalId));
        return Response.json(await survival.consumeSupply(sessionId, 'food', 0));
      }
      case '/cave': {
        const events = createPrivateRegionEvents({
          storage: this.storage,
          roomId: 'preview-region-events-fixture',
          clock: () => now,
          seed: 0,
          regions: ['sanctuary', 'cave'],
          intervalMs: 100,
          activeMs: 30,
        });
        return Response.json(await events.snapshot('cave'));
      }
      default:
        return new Response(null, { status: 404 });
    }
  }
}

export default {
  fetch: () => new Response(null, { status: 404 }),
};
