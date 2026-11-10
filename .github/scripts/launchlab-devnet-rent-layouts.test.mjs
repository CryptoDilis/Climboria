import test from "node:test";
import assert from "node:assert/strict";
import { createDevnetLaunchRentAccountSpecs, DEVNET_LAUNCH_RENT_LAYOUTS, LAUNCHLAB_POOL_STATE_SPACE, METAPLEX_MAX_DATA_SIZE, METAPLEX_MAX_METADATA_LEN } from "./launchlab-devnet-rent-layouts.mjs";

test("records source-backed fixed SPL Token, LaunchLab PoolState, and Metaplex metadata sizes", () => {
  assert.equal(DEVNET_LAUNCH_RENT_LAYOUTS.base_mint.space, 82);
  assert.equal(DEVNET_LAUNCH_RENT_LAYOUTS.base_vault.space, 165);
  assert.equal(DEVNET_LAUNCH_RENT_LAYOUTS.quote_vault.space, 165);
  assert.equal(DEVNET_LAUNCH_RENT_LAYOUTS.pool_state.space, 421);
  assert.equal(DEVNET_LAUNCH_RENT_LAYOUTS.metadata_account.space, 607);
  assert.equal(LAUNCHLAB_POOL_STATE_SPACE, 421);
  assert.equal(METAPLEX_MAX_DATA_SIZE, 431);
  assert.equal(METAPLEX_MAX_METADATA_LEN, 607);
  for (const layout of Object.values(DEVNET_LAUNCH_RENT_LAYOUTS)) {
    assert.match(layout.sourceRef, /^https:\/\//);
    assert.ok(layout.verificationScope.length > 20);
  }
});

test("maps only the exact missing writable accounts to their source-backed layouts", () => {
  const specs = createDevnetLaunchRentAccountSpecs([
    { name: "base_mint", address: "Mint111111111111111111111111111111111111111" },
    { name: "pool_state", address: "Pool11111111111111111111111111111111111111" },
    { name: "base_vault", address: "BaseVault111111111111111111111111111111111" },
    { name: "quote_vault", address: "QuoteVault11111111111111111111111111111111" },
    { name: "metadata_account", address: "Metadata1111111111111111111111111111111111" },
  ]);
  assert.deepEqual(specs.map(x => x.space), [82, 421, 165, 165, 607]);
  assert.ok(specs.every(x => x.sourceRef && x.verificationScope));
  assert.equal(specs[4].supportingSourceRefs.length, 2);
});

test("refuses unknown writable account names instead of guessing account sizes", () => {
  assert.throws(
    () => createDevnetLaunchRentAccountSpecs([{ name: "payer", address: "FeePayer1111111111111111111111111111111111" }]),
    /No source-backed rent layout/,
  );
  assert.throws(
    () => createDevnetLaunchRentAccountSpecs([{ name: "future_account", address: "Future111111111111111111111111111111111111" }]),
    /No source-backed rent layout/,
  );
});

test("requires exact account identity and rejects duplicate addresses", () => {
  assert.throws(() => createDevnetLaunchRentAccountSpecs([{ name: "base_mint", address: "" }]), /exact public key/);
  assert.throws(() => createDevnetLaunchRentAccountSpecs([
    { name: "base_mint", address: "Same11111111111111111111111111111111111111" },
    { name: "base_vault", address: "Same11111111111111111111111111111111111111" },
  ]), /Duplicate missing writable account address/);
  assert.throws(() => createDevnetLaunchRentAccountSpecs(null), /Missing writable-account list/);
});
