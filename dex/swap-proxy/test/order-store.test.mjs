import test from "node:test";
import assert from "node:assert/strict";
import { SwapOrderStore } from "../src/order-store.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";

function createStore() {
  const values = new Map();
  let transactionQueue = Promise.resolve();
  const storage = {
    async get(key) { return values.get(key); },
    async put(key, value) { values.set(key, value); },
    async setAlarm(value) { this.alarmAt = value; },
    async deleteAll() { values.clear(); },
    transaction(callback) {
      const run = transactionQueue.then(() => callback({
        get: async key => values.get(key),
        put: async (key, value) => values.set(key, value)
      }));
      transactionQueue = run.catch(() => {});
      return run;
    }
  };
  const object = new SwapOrderStore({ storage });
  return { object, storage };
}

async function storeOrder(object, fixture, overrides = {}) {
  return object.fetch(new Request("https://order-store/store", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestId: "jupiter-request-123",
      transaction: fixture.original,
      taker: fixture.taker,
      lastValidBlockHeight: 12345,
      expiresAt: Date.now() + 60_000,
      ...overrides
    })
  }));
}

async function claimOrder(object, signedTransaction) {
  return object.fetch(new Request("https://order-store/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction })
  }));
}

test("stores a verified unsigned order and atomically permits only one claim", async () => {
  const fixture = makeFixture(2);
  const { object, storage } = createStore();
  const stored = await storeOrder(object, fixture);
  assert.equal(stored.status, 201);
  assert.deepEqual(await stored.json(), { ok: true, state: "ready" });
  assert.ok(storage.alarmAt > Date.now());

  const claimed = await claimOrder(object, fixture.signed);
  assert.equal(claimed.status, 200);
  assert.deepEqual(await claimed.json(), {
    ok: true,
    record: { requestId: "jupiter-request-123", lastValidBlockHeight: 12345 }
  });
  const replay = await claimOrder(object, fixture.signed);
  assert.equal(replay.status, 409);
  assert.match((await replay.json()).error, /already been claimed/i);
});

test("rejects a tampered signed message without consuming the valid order", async () => {
  const fixture = makeFixture(2);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const changedMessage = fixture.message.slice();
  changedMessage[changedMessage.length - 1] ^= 1;
  const tampered = Buffer.from([
    2, ...fixture.signedSlots.flatMap(slot => [...slot]), ...changedMessage
  ]).toString("base64");
  const rejected = await claimOrder(object, tampered);
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /message differs/i);
  const valid = await claimOrder(object, fixture.signed);
  assert.equal(valid.status, 200);
});

test("rejects an order whose static fee payer is not the requested taker", async () => {
  const fixture = makeFixture(1);
  const { object } = createStore();
  const stored = await storeOrder(object, fixture, { taker: "11111111111111111111111111111111" });
  assert.equal(stored.status, 422);
  assert.match((await stored.json()).error, /fee payer does not match/i);
});

test("rejects a duplicate store operation for the same order object", async () => {
  const fixture = makeFixture(1);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const duplicate = await storeOrder(object, fixture);
  assert.equal(duplicate.status, 409);
});

test("refuses to claim an expired stored order", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  await storage.put("order", {
    requestId: "jupiter-request-123",
    transaction: fixture.original,
    taker: fixture.taker,
    lastValidBlockHeight: null,
    expiresAt: Date.now() - 1,
    state: "ready"
  });
  const response = await claimOrder(object, fixture.signed);
  assert.equal(response.status, 410);
});

test("settles only a claimed order and preserves terminal replay protection", async () => {
  const fixture = makeFixture(1);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  assert.equal((await claimOrder(object, fixture.signed)).status, 200);
  const settled = await object.fetch(new Request("https://order-store/settle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state: "completed", signature: "5".repeat(88) })
  }));
  assert.equal(settled.status, 200);
  const replay = await claimOrder(object, fixture.signed);
  assert.equal(replay.status, 409);
});
