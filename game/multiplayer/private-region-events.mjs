const ROOM = 'preview-region-events-fixture';
const KEY = 'game:preview:region-events:v1:' + ROOM;
const KINDS = Object.freeze(['falling-star', 'lost-expedition', 'secret-passage', 'wandering-merchant']);
const timeOk = value => Number.isSafeInteger(value) && value >= 0;
const deny = reason => ({ ok: false, reason });

// Pull-based private schedule. A trusted room supplies the current region and
// clock. There are no timers, client messages, player effects or reward grants.
export function createPrivateRegionEvents({ roomId, storage, clock, seed, regions, intervalMs, activeMs } = {}) {
 const regionIds = Array.isArray(regions) ? [...regions].sort() : [];
 if (roomId !== ROOM || typeof storage?.transaction !== 'function' || typeof clock !== 'function' ||
     !timeOk(seed) || seed > 0xffffffff || !timeOk(intervalMs) || !timeOk(activeMs) ||
     activeMs === 0 || activeMs >= intervalMs || regionIds.length === 0 || regionIds.length > 16 ||
     new Set(regionIds).size !== regionIds.length ||
     !regionIds.every(region => typeof region === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(region)))
  throw new Error('Explicit private event regions, timing and storage required');

 const configuration = JSON.stringify([seed, regionIds, intervalMs, activeMs]);
 let unavailable = false;

 async function snapshot(regionId) {
  if (!regionIds.includes(regionId)) return deny('invalid-region');
  if (unavailable) return deny('event-storage-unavailable');
  try {
   return await storage.transaction(async tx => {
    const prior = await tx.get(KEY);
    const now = clock();
    if (!timeOk(now) || !timeOk(now + activeMs)) return deny('invalid-server-time');
    if (prior !== undefined && (!prior || prior.version !== 1 || prior.configuration !== configuration ||
        !timeOk(prior.anchorMs) || !timeOk(prior.slot) || typeof prior.expired !== 'boolean'))
     return deny('invalid-event-state');

    const anchorMs = prior?.anchorMs ?? now;
    if (now < anchorMs) return deny('stale-world-clock');
    const slot = Math.floor((now - anchorMs) / intervalMs);
    if (prior && slot < prior.slot) return deny('stale-world-clock');
    const startsAtMs = anchorMs + slot * intervalMs;
    const expiresAtMs = startsAtMs + activeMs;
    const expired = now >= expiresAtMs || (slot === prior?.slot && prior.expired);

    // Persist only at initialization and slot or expiry transitions.
    if (!prior || slot !== prior.slot || expired !== prior.expired)
     await tx.put(KEY, { version: 1, configuration, anchorMs, slot, expired });
    if (expired) return { ok: true, event: null };

    const mixed = Math.imul(seed ^ slot, 0x9e3779b1) >>> 0;
    const region = regionIds[(mixed >>> 10) % regionIds.length];
    if (region !== regionId) return { ok: true, event: null };
    return { ok: true, event: { id: ROOM + ':' + anchorMs + ':' + slot,
     regionId: region, kind: KINDS[mixed % KINDS.length], startsAtMs, expiresAtMs } };
   });
  } catch {
   unavailable = true;
   return deny('event-storage-unavailable');
  }
 }

 return Object.freeze({ snapshot, reviewedForProduction: false });
}
