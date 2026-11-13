'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('./check_reproducible_build.cjs');
test('missing both prerequisites fails closed', () => {
  const r = inspect(() => false);
  assert.equal(r.status, 'BLOCKED');
  assert.deepEqual(r.missing, ['REVIEWED_CARGO_LOCK','PINNED_RUST_TOOLCHAIN']);
  assert.equal(r.safeForDeployment, false);
});
test('partial prerequisites remain blocked', () => {
  const r = inspect(p => p.endsWith('Cargo.lock'));
  assert.deepEqual(r.missing, ['PINNED_RUST_TOOLCHAIN']);
});
test('presence alone does not certify a build or execution', () => {
  const r = inspect(() => true);
  assert.equal(r.status, 'PREREQUISITES_PRESENT_UNVERIFIED');
  assert.equal(r.reproducibleBuildVerified, false);
  assert.equal(r.validatorTested, false);
  assert.equal(r.mayExecute, false);
});
