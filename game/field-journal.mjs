const keyPrefix = 'climboria:jarrell-field-journal:v1:';

export function createFieldJournal({ landmarks, storage, getScope }) {
 let activeScope;
 let seen = new Set();

 function key(id) {
  return keyPrefix + encodeURIComponent(activeScope) + ':' + id;
 }

 function refresh() {
  const scope = getScope();
  if (scope !== activeScope) {
   activeScope = scope;
   seen = new Set();
  }
  if (!scope) return;
  for (const { id } of landmarks) {
   try {
    if (storage.getItem(key(id)) === 'visited') seen.add(id);
   } catch {
    // Keep discoveries in memory when local storage is unavailable.
   }
  }
 }

 function sample(position) {
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
  if (getScope() !== activeScope) refresh();
  if (!activeScope) return false;
  let changed = false;
  for (const { id, x, z, radius } of landmarks) {
   if (seen.has(id) || Math.hypot(position.x - x, position.z - z) > radius) continue;
   seen.add(id);
   changed = true;
   try {
    storage.setItem(key(id), 'visited');
   } catch {
    // The journal remains usable for the current session.
   }
  }
  return changed;
 }

 function entries() {
  refresh();
  return landmarks.filter(({ id }) => seen.has(id));
 }

 return { sample, entries };
}
