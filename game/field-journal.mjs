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
  for (const { id } of landmarks) readVisit(id);
 }

 function readVisit(id) {
  if (seen.has(id)) return false;
  try {
   if (storage.getItem(key(id)) !== 'visited') return false;
  } catch {
   // Keep discoveries in memory when local storage is unavailable.
   return false;
  }
  seen.add(id);
  return true;
 }

 function syncVisitedKey(changedKey) {
  if (!activeScope || activeScope !== getScope()) return false;
  const landmark = landmarks.find(({ id }) => key(id) === changedKey);
  return landmark ? readVisit(landmark.id) : false;
 }

 function sample(position) {
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
  if (getScope() !== activeScope) refresh();
  if (!activeScope) return false;
  let changed = false;
  for (const { id, x, z, radius, elevation } of landmarks) {
   if (seen.has(id) || Math.hypot(position.x - x, position.z - z) > radius) continue;
   if (elevation !== undefined && (!Number.isFinite(position.y) || Math.abs(position.y - elevation) > 2)) continue;
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

 return { sample, entries, syncVisitedKey };
}
