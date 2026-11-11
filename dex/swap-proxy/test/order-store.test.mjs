import test from "node:test";
import assert from "node:assert/strict";
import { SwapOrderStore } from "../src/order-store.mjs";
import { makeFixture } from "./solana-v0-fixture.mjs";

function createStore() {
  const values = new Map();
  const storage = {
    kv: {
      get(key) { return values.get(key); },
      put(key, value) { values.set(key, value); }
    },
    transactionSync(callback) { return callback(); },
    async get(key) { return values.get(key); },
    async put(key, value) { values.set(key, value); },
    async setAlarm(value) { this.alarmAt = value; },
    async deleteAll() { values.clear(); }
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
      tokenAccountEvidence: {
        contextSlot: 99,
        requestedAmount: "1000",
        source: { address: "SysvarRent111111111111111111111111111111111", mint: "So11111111111111111111111111111111111111112", owner: fixture.taker, amount: "1500", native: true },
        destination: { address: "SysvarC1ock11111111111111111111111111111111", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", owner: fixture.taker, amount: "0", native: false },
        inputMint: { address: "So11111111111111111111111111111111111111112", decimals: 9, supply: "1000000", mintAuthority: null, freezeAuthority: null },
        outputMint: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, supply: "1000000", mintAuthority: null, freezeAuthority: null }
      },
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


test("persists finalized account evidence and rejects stale or inconsistent evidence", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  const accepted = await storeOrder(object, fixture, { lookupContextSlot: 98 });
  assert.equal(accepted.status, 201);
  const record = await storage.get("order");
  assert.equal(record.tokenAccountEvidence.contextSlot, 99);
  assert.equal(record.tokenAccountEvidence.source.amount, "1500");

  const staleStore = createStore();
  const stale = await storeOrder(staleStore.object, fixture, { lookupContextSlot: 100 });
  assert.equal(stale.status, 400);

  const ownerStore = createStore();
  const ownerEvidence = {
    contextSlot: 99,
    requestedAmount: "1000",
    source: { address: "SysvarRent111111111111111111111111111111111", mint: "So11111111111111111111111111111111111111112", owner: "11111111111111111111111111111111", amount: "1500", native: true },
    destination: { address: "SysvarC1ock11111111111111111111111111111111", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", owner: fixture.taker, amount: "0", native: false },
    inputMint: { address: "So11111111111111111111111111111111111111112", decimals: 9, supply: "1000000", mintAuthority: null, freezeAuthority: null },
    outputMint: { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, supply: "1000000", mintAuthority: null, freezeAuthority: null }
  };
  const wrongOwner = await storeOrder(ownerStore.object, fixture, { tokenAccountEvidence: ownerEvidence });
  assert.equal(wrongOwner.status, 400);

  const balanceStore = createStore();
  const lowBalance = {
    ...ownerEvidence,
    source: { ...ownerEvidence.source, owner: fixture.taker, amount: "999" }
  };
  const insufficient = await storeOrder(balanceStore.object, fixture, { tokenAccountEvidence: lowBalance });
  assert.equal(insufficient.status, 400);
});

test("rejects stored orders without finalized token-account and mint evidence", async () => {
  const { object } = createStore();
  const fixture = makeFixture(1);
  const missing = await storeOrder(object, fixture, { tokenAccountEvidence: null });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /token-account and mint evidence/i);
});

test("rejects a tampered signed message without consuming the valid order", async () => {
  const fixture = makeFixture(2);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const changedMessage = fixture.message.slice();
  changedMessage[changedMessage.length - 2] ^= 1;
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


test("concurrent claims atomically allow exactly one execution", async () => {
  const fixture = makeFixture(2);
  const { object } = createStore();
  assert.equal((await storeOrder(object, fixture)).status, 201);
  const results = await Promise.all([
    claimOrder(object, fixture.signed),
    claimOrder(object, fixture.signed)
  ]);
  assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
});


test("does not persist an order when cleanup scheduling fails", async () => {
  const fixture = makeFixture(1);
  const { object, storage } = createStore();
  storage.setAlarm = async () => { throw new Error("alarm unavailable"); };
  const response = await storeOrder(object, fixture);
  assert.equal(response.status, 503);
  assert.equal(await storage.get("order"), undefined);
});
