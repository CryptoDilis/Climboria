import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import { verifyPrivateDualRpcConnectivity } from "../src/operator-private-rpc-connectivity.mjs";

const GENESIS = encodeBase58(Uint8Array.from({ length: 32 }, (_, i) => i + 1));
const WRONG_GENESIS = encodeBase58(Uint8Array.from({ length: 32 }, (_, i) => i + 2));
const FIRST = "https://rpc-first.example/api?token=FAKE_PRIMARY_SECRET";
const SECOND = "https://rpc-second.example/api?token=FAKE_SECONDARY_SECRET";

function fakeRpc({
  primaryGenesis = GENESIS, secondaryGenesis = GENESIS,
  primarySlot = 300000, secondarySlot = 300040,
  failSecondarySlot = false, transportError = false
} = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const payload = JSON.parse(options.body);
    const second = new URL(url).hostname === "rpc-second.example";
    calls.push({ method: payload.method, second, options });
    if (transportError && second) throw Error("FAKE_SECONDARY_SECRET: upstream outage");
    if (payload.method === "getGenesisHash") {
      return Response.json({
        jsonrpc: "2.0", id: payload.id,
        result: second ? secondaryGenesis : primaryGenesis
      });
    }
    if (payload.method === "getSlot") {
      if (failSecondarySlot && second) {
        return new Response("FAKE_SECONDARY_SECRET", { status: 503 });
      }
      return Response.json({
        jsonrpc: "2.0", id: payload.id,
        result: second ? secondarySlot : primarySlot
      });
    }
    throw Error("Unexpected RPC method");
  };
  return { calls, fetchImpl };
}

const options = fixture => ({
  primaryRpcUrl: FIRST, secondaryRpcUrl: SECOND,
  expectedGenesisHash: GENESIS, fetchImpl: fixture.fetchImpl
});

test("two distinct configured RPC hosts report matching pinned genesis and finalized slots, no secret output", async () => {
  const fixture = fakeRpc();
  const result = await verifyPrivateDualRpcConnectivity(options(fixture));
  assert.deepEqual(fixture.calls.map(call => call.method), [
    "getGenesisHash", "getGenesisHash", "getSlot", "getSlot"
  ]);
  assert.equal(result.twoConfiguredDistinctRpcHostnames, true);
  assert.equal(result.bothProviderReportedGenesisMatchesOperatorPin, true);
  assert.equal(result.finalizedSlotDifference, 40);
  assert.equal(result.approvedForProductionExecution, false);
  assert.equal(result.independentlyAuthenticatedLedgerFinality, false);
  assert.equal(result.submittedTransaction, false);
  assert.doesNotMatch(JSON.stringify(result), /FAKE_PRIMARY_SECRET|FAKE_SECONDARY_SECRET|rpc-first|rpc-second/);
  for (const call of fixture.calls) {
    assert.equal(call.options.redirect, "error");
    if (call.method === "getSlot") {
      assert.deepEqual(JSON.parse(call.options.body).params, [{ commitment: "finalized" }]);
    }
  }
});

test("absent, same-host and private-network endpoints reject before network calls", async () => {
  for (const secondaryRpcUrl of [
    undefined, "https://rpc-first.example/different?token=another",
    "https://127.0.0.1", "http://rpc-other.example", "https://user:pass@rpc-other.example"
  ]) {
    const fixture = fakeRpc();
    await assert.rejects(verifyPrivateDualRpcConnectivity({
      ...options(fixture), secondaryRpcUrl
    }), /preflight failed securely/);
    assert.equal(fixture.calls.length, 0);
  }
});

test("unmatched or unpinned genesis stops before finalized-slot lookups", async () => {
  for (const fixture of [fakeRpc({ secondaryGenesis: WRONG_GENESIS }), fakeRpc()]) {
    await assert.rejects(verifyPrivateDualRpcConnectivity({
      ...options(fixture),
      expectedGenesisHash: fixture.calls === undefined ? WRONG_GENESIS : WRONG_GENESIS
    }), /preflight failed securely/);
    assert.equal(fixture.calls.some(call => call.method === "getSlot"), false);
  }
});

test("provider errors and RPC URL tokens never leak in thrown errors", async () => {
  for (const fixture of [fakeRpc({ failSecondarySlot: true }), fakeRpc({ transportError: true })]) {
    let failure;
    try { await verifyPrivateDualRpcConnectivity(options(fixture)); }
    catch (error) { failure = error; }
    assert.ok(failure);
    assert.equal(failure.message, "Private dual-RPC connectivity preflight failed securely");
    assert.doesNotMatch(failure.message, /SECRET|rpc-second|token|upstream/);
  }
});

test("large provider finalized slot discrepancy fails closed", async () => {
  const fixture = fakeRpc({ primarySlot: 100, secondarySlot: 10000 });
  await assert.rejects(verifyPrivateDualRpcConnectivity(options(fixture)), /preflight failed securely/);
});
