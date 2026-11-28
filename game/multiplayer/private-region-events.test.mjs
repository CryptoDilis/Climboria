import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateRegionEvents } from './private-region-events.mjs';

function fixture() {
 let now = 1_000, state, writes = 0, ambiguous = false, tail = Promise.resolve();
 const storage = {
  transaction(operation) {
   const queued = tail.then(async () => {
    let draft = state;
    const result = await operation({ get: async () => draft, put: async (_key, value) => { draft = value; writes++; } });
    state = draft;
    if (ambiguous) throw new Error('unknown commit outcome');
    return result;
   });
   tail = queued.catch(() => {});
   return queued;
  },
 };
 const options = { roomId: 'preview-region-events-fixture', storage, clock: () => now, seed: 0,
  regions: ['sanctuary', 'cave'], intervalMs: 100, activeMs: 30 };
 return { options, make: () => createPrivateRegionEvents(options), at: value => { now = value; },
  writes: () => writes, setAmbiguous: value => { ambiguous = value; } };
}

test('concurrent readers share one seeded event and only its region sees it', async () => {
 const f = fixture();
 const [a, b, c] = await Promise.all([f.make().snapshot('cave'), f.make().snapshot('cave'), f.make().snapshot('sanctuary')]);
 assert.deepEqual(a, b);
 assert.deepEqual(a.event, { id: 'preview-region-events-fixture:1000:0', regionId: 'cave', kind: 'falling-star', startsAtMs: 1000, expiresAtMs: 1030 });
 assert.equal(c.event, null);
 assert.equal(f.writes(), 1);
});

test('expiry survives restart and missed slots are skipped without catch-up', async () => {
 const f = fixture();
 await f.make().snapshot('cave');
 f.at(1030);
 assert.equal((await f.make().snapshot('cave')).event, null);
 f.at(1029);
 assert.equal((await f.make().snapshot('cave')).event, null);
 assert.equal(f.writes(), 2);
 f.at(1400);
 const active = (await Promise.all(['cave', 'sanctuary'].map(region => f.make().snapshot(region)))).filter(r => r.event);
 assert.equal(active.length, 1);
 assert.equal(active[0].event.startsAtMs, 1400);
 assert.equal(active[0].event.id.endsWith(':4'), true);
 assert.equal(f.writes(), 3);
 f.at(1300);
 assert.equal((await f.make().snapshot('cave')).reason, 'stale-world-clock');
});

test('changed configuration and private scope boundaries fail closed', async () => {
 const f = fixture();
 await f.make().snapshot('cave');
 assert.throws(() => createPrivateRegionEvents({ ...f.options, roomId: 'jarrell-peak' }));
 assert.throws(() => createPrivateRegionEvents({ ...f.options, activeMs: 100 }));
 assert.equal((await f.make().snapshot('unknown')).reason, 'invalid-region');
 const changed = createPrivateRegionEvents({ ...f.options, seed: 1 });
 assert.equal((await changed.snapshot('cave')).reason, 'invalid-event-state');
});

test('ambiguous initialization never restarts the persisted event clock', async () => {
 const f = fixture(), first = f.make();
 f.setAmbiguous(true);
 assert.equal((await first.snapshot('cave')).reason, 'event-storage-unavailable');
 f.setAmbiguous(false);f.at(1010);
 assert.equal((await first.snapshot('cave')).reason, 'event-storage-unavailable');
 const fresh = await f.make().snapshot('cave');
 assert.equal(fresh.event.startsAtMs, 1000);
 assert.equal(f.writes(), 1);
});
