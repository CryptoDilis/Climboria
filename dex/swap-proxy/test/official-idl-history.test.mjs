import test from "node:test";
import assert from "node:assert/strict";
import { buildOfficialIdlHistoryRevisions } from "../tools/official-idl-history.mjs";

const content = (version, instruction = "route_v2") => JSON.stringify({
  version,
  instructions: [{ name: instruction, discriminator: [0x21, 0x2d, 0x3a, 0x4c, 0x5e, 0x6f, 0x70, 0x81] }],
});

test("reconstructs ordered distinct IDL revisions and exclusive active ranges", () => {
  const snapshots = [
    { slot: 300n, blockTime: 3000n, decodedContent: content("3.0.0"), instruction: "write", signature: "sig-3", state: {} },
    { slot: 100n, blockTime: 1000n, decodedContent: content("1.0.0"), instruction: "create", signature: "sig-1", state: {} },
    { slot: 200n, blockTime: 2000n, decodedContent: content("2.0.0"), instruction: "write", signature: "sig-2", state: {} },
    { slot: 250n, blockTime: 2500n, decodedContent: content("2.0.0"), instruction: "set-authority", signature: "sig-2b", state: {} },
  ];
  const revisions = buildOfficialIdlHistoryRevisions(snapshots);
  assert.deepEqual(revisions.map((item) => item.version), ["1.0.0", "2.0.0", "3.0.0"]);
  assert.deepEqual(revisions[0].activeTo, { slot: "200", time: "1970-01-01 00:33:20" });
  assert.deepEqual(revisions[1].activeFrom, { slot: "200", time: "1970-01-01 00:33:20" });
  assert.equal(revisions[2].activeTo, "current");
  assert.equal(revisions[0].contentSha256.length, 64);
});

test("uses the account-close slot as the final revision's exclusive end", () => {
  const revisions = buildOfficialIdlHistoryRevisions([
    { slot: 10n, blockTime: 100n, decodedContent: content("1.0.0"), state: {} },
    { slot: 20n, blockTime: 200n, decodedContent: null, state: null },
  ]);
  assert.deepEqual(revisions[0].activeTo, { slot: "20", time: "1970-01-01 00:03:20" });
});

test("keeps a current revision open when later snapshots do not close the account", () => {
  const revisions = buildOfficialIdlHistoryRevisions([
    { slot: 10n, blockTime: 100n, decodedContent: content("1.0.0"), state: {} },
    { slot: 20n, blockTime: 200n, decodedContent: null, state: {} },
  ]);
  assert.equal(revisions[0].activeTo, "current");
});

test("returns no revisions for history with no decodable IDL content", () => {
  assert.deepEqual(buildOfficialIdlHistoryRevisions([
    { slot: 10n, blockTime: 100n, decodedContent: null, state: {} },
  ]), []);
});

test("rejects malformed snapshot input instead of fabricating a slot", () => {
  assert.throws(() => buildOfficialIdlHistoryRevisions([{ slot: "not-a-slot", decodedContent: content("1.0.0") }]), /Invalid revision slot/);
  assert.throws(() => buildOfficialIdlHistoryRevisions(null), /must be an array/);
});
