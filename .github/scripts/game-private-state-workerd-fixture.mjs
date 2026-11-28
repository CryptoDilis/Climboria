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
      case '/enhance-equipment': {
        const equipmentRoom = 'preview-equipment-fixture';
        const equipment = createPrivateEquipmentEnhancement({
          storage: this.storage,
          roomId: equipmentRoom,
          resolveOwner: () => ({ sessionId, accountId, roomId: equipmentRoom }),
        });
        if (url.pathname === '/provision-equipment') return Response.json(await equipment.provision(accountId));
        if (url.pathname === '/inspect-equipment') return Response.json(await equipment.inspect(sessionId));
        return Response.json(await equipment.enhance(sessionId, 0));
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
