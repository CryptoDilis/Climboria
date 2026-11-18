// Offline process-level checks: no real RPCs, no secrets or chain requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('./mint-inspect-cli.mjs',import.meta.url));
function run(env={}) {
  return spawnSync(process.execPath,[cli],{env,encoding:'utf8',timeout:3000});
}
test('CLI fails before requests without GitHub Actions RPC secrets',()=>{
  const p=run();
  assert.equal(p.status,1);
  assert.match(p.stderr,/NO_GO: two independently operated RPC endpoints/);
  assert.equal(p.stdout,'');
});
test('CLI fails before requests when trusted public genesis reference is missing',()=>{
  const sentinel='https://very-sensitive-api-key-do-not-log.invalid/abc123';
  const p=run({
    CLIMB_SOLANA_RPC_A_URL:sentinel,
    CLIMB_SOLANA_RPC_B_URL:'https://other-secret-url-do-not-log.invalid',
  });
  assert.equal(p.status,1);
  assert.match(p.stderr,/trusted mainnet genesis reference/);
  assert(!p.stderr.includes(sentinel));
  assert(!p.stdout.includes(sentinel));
});
