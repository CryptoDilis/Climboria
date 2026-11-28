import assert from 'node:assert/strict';
import test from 'node:test';
import { createFieldJournal } from './field-journal.mjs';

const landmarks = [
 { id: 'park', x: 0, z: 0, radius: 5 },
 { id: 'camp', x: 30, z: 5, radius: 5 },
];

test('records only nearby landmarks once and restores the same scope on reload', () => {
 const data = new Map();
 const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
 const options = { landmarks, storage, getScope: () => 'user:a' };
 const journal = createFieldJournal(options);
 assert.equal(journal.sample({ x: NaN, z: 0 }), false);
 assert.equal(journal.sample({ x: 5.01, z: 0 }), false);
 assert.equal(journal.sample({ x: 3, z: 4 }), true);
 assert.equal(journal.sample({ x: 0, z: 0 }), false);
 assert.equal(data.size, 1);
 assert.deepEqual(createFieldJournal(options).entries(), [landmarks[0]]);
});

test('new scopes start separately and independent tabs retain both discoveries', () => {
 const data = new Map();
 const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
 let scope = null;
 const options = { landmarks, storage, getScope: () => scope };
 const first = createFieldJournal(options);
 const second = createFieldJournal(options);
 assert.equal(first.sample({ x: 0, z: 0 }), false);
 scope = 'user:a';
 assert.deepEqual(second.entries(), []);
 first.sample({ x: 0, z: 0 });
 second.sample({ x: 30, z: 5 });
 assert.deepEqual(first.entries(), landmarks);
 scope = 'user:b';
 assert.deepEqual(first.entries(), []);
 scope = 'user:a';
 assert.deepEqual(second.entries(), landmarks);
});

test('unavailable local storage still permits a session-only discovery', () => {
 const storage = {
  getItem() { throw Error('blocked'); },
  setItem() { throw Error('blocked'); },
 };
 const journal = createFieldJournal({ landmarks, storage, getScope: () => 'guest' });
 assert.equal(journal.sample({ x: 0, z: 0 }), true);
 assert.deepEqual(journal.entries(), [landmarks[0]]);
});

test('an underground landmark rejects missing elevation and the surface above it', () => {
 const underground = { id: 'chamber', x: 5, z: 5, radius: 7, elevation: 12 };
 const journal = createFieldJournal({
  landmarks: [underground],
  storage: { getItem: () => null, setItem: () => {} },
  getScope: () => 'guest',
 });
 assert.equal(journal.sample({ x: 5, z: 5 }), false);
 assert.equal(journal.sample({ x: 5, y: 32, z: 5 }), false);
 assert.equal(journal.sample({ x: 5, y: 12, z: 5 }), true);
 assert.deepEqual(journal.entries(), [underground]);
});

test('an open journal can pick up a persisted visit from another tab in the current scope', () => {
 const data = new Map(), writes = [];
 const storage = { getItem: key => data.get(key), setItem(key, value) { data.set(key, value); writes.push(key); } };
 let scope = 'user:a';
 const reader = createFieldJournal({ landmarks, storage, getScope: () => scope });
 const firstWriter = createFieldJournal({ landmarks, storage, getScope: () => 'user:a' });
 const secondWriter = createFieldJournal({ landmarks, storage, getScope: () => 'user:b' });
 assert.deepEqual(reader.entries(), []);
 secondWriter.sample({ x: 30, z: 5 });
 assert.equal(reader.syncVisitedKey(writes.at(-1)), false);
 assert.deepEqual(reader.entries(), []);
 firstWriter.sample({ x: 0, z: 0 });
 const visitKey = writes.at(-1);
 assert.equal(reader.syncVisitedKey(visitKey), true);
 assert.equal(reader.syncVisitedKey(visitKey), false);
 assert.deepEqual(reader.entries(), [landmarks[0]]);
 scope = 'user:b';
 assert.equal(reader.syncVisitedKey(visitKey), false);
 assert.deepEqual(reader.entries(), [landmarks[1]]);
});
