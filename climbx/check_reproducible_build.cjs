'use strict';
// CLIMBX-only, non-deploying build prerequisite check.
// No network, wallet access, key generation or deployment.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'programs', 'climbx-authorization');
const lock = path.join(root, 'Cargo.lock');
const toolchain = path.join(root, 'rust-toolchain.toml');
function inspect(exists = fs.existsSync) {
  const missing = [];
  if (!exists(lock)) missing.push('REVIEWED_CARGO_LOCK');
  if (!exists(toolchain)) missing.push('PINNED_RUST_TOOLCHAIN');
  const lockfilePresent = exists(lock);
  const toolchainPinned = exists(toolchain);
  return {
    lockfilePresent,
    toolchainPinned,
    status: missing.length ? 'BLOCKED' : 'PREREQUISITES_PRESENT_UNVERIFIED',
    missing,
    reproducibleBuildVerified: false,
    validatorTested: false,
    safeForDeployment: false,
    mayExecute: false
  };
}
if (require.main === module) {
  const result = inspect();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (result.missing.length) process.exitCode = 1;
}
module.exports = { inspect };
