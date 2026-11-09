import test from "node:test";
import assert from "node:assert/strict";
import { applyChoiceLocally, resolveSaveChoice } from "../../auth/save-choice.js";

test("guest-only and no-save states remain distinct", () => {
  assert.equal(resolveSaveChoice({ guestRaw: "Adventurer" }).state, "guest-only");
  assert.equal(resolveSaveChoice().state, "no-save");
});

test("legacy hero alias normalizes to the one allowlisted asset", () => {
  const result = resolveSaveChoice({ guestRaw: "ClimboriaHero" });
  assert.equal(result.state, "guest-only");
  assert.equal(result.guestHero, "Adventurer");
});

test("matching guest and account preferences do not create a conflict", () => {
  const result = resolveSaveChoice({
    guestRaw: "Adventurer",
    accountRow: { schema_version: 1, save_data: { selectedHero: "Adventurer" } }
  });
  assert.equal(result.state, "same-choice");
});

test("different valid preferences require an explicit choice", () => {
  // Current allowlist contains one ID, so a conflict cannot be manufactured with valid values.
  // This asserts the resolver rejects a future/unapproved ID rather than treating it as a choice.
  const result = resolveSaveChoice({
    guestRaw: "Adventurer",
    accountRow: { schema_version: 1, save_data: { selectedHero: "UnapprovedHero" } }
  });
  assert.equal(result.state, "invalid-data");
});

test("account payloads with unknown versions and malformed shapes are rejected", () => {
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 2, save_data: {} } }).state, "invalid-data");
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 1, save_data: [] } }).state, "invalid-data");
});

test("version 1 account payload rejects every key except selectedHero", () => {
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 1, save_data: { inventory: [] } } }).state, "invalid-data");
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 1, save_data: { selectedHero: "Adventurer", tokenBalance: 100 } } }).state, "invalid-data");
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 1, save_data: { selectedHero: "Adventurer", progression: { level: 9 } } } }).state, "invalid-data");
  assert.equal(resolveSaveChoice({ accountRow: { schema_version: 1, save_data: {} } }).state, "account-save-no-hero");
});

test("read failures preserve a valid guest snapshot", () => {
  const result = resolveSaveChoice({ guestRaw: "Adventurer", accountError: new Error("offline") });
  assert.equal(result.state, "read-error");
  assert.equal(result.guestHero, "Adventurer");
});

test("guest choice never writes; account choice writes only the validated hero key", () => {
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args) };
  const resolution = resolveSaveChoice({
    accountRow: { schema_version: 1, save_data: { selectedHero: "Adventurer" } }
  });
  assert.deepEqual(applyChoiceLocally("account", resolution, storage), { hero: "Adventurer", wrote: true });
  assert.deepEqual(writes, [["climboria-selected-hero", "Adventurer"]]);
  const guest = resolveSaveChoice({ guestRaw: "Adventurer" });
  assert.deepEqual(applyChoiceLocally("guest", guest, storage), { hero: "Adventurer", wrote: false });
  assert.equal(writes.length, 1);
});

test("invalid or unavailable choices cannot be applied", () => {
  const invalid = resolveSaveChoice({ accountRow: { schema_version: 99, save_data: {} } });
  assert.throws(() => applyChoiceLocally("account", invalid, { setItem() {} }));
});
