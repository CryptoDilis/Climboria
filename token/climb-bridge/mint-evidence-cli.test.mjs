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

// Verify the manual bridge action uses the existing repository configuration without exposing it to PR jobs.
import {readFileSync} from 'node:fs';
test('manual evidence workflow reuses existing RPC settings and remains main-only',()=>{
  const source=readFileSync(new URL('../../.github/workflows/climb-mint-mainnet-evidence-manual.yml',import.meta.url),'utf8');
  assert.match(source,/^on:\n  workflow_dispatch:\npermissions:\n  contents: read$/m);
  assert.match(source,/if: github\.ref == 'refs\/heads\/main'/);
  for (const [env,scope,name] of [
    ['CLIMB_SOLANA_RPC_A_URL','secrets','CLIMBORIA_SOLANA_RPC_URL'],
    ['CLIMB_SOLANA_RPC_B_URL','secrets','CLIMBORIA_SOLANA_RPC_URL_SECONDARY'],
    ['CLIMB_SOLANA_MAINNET_GENESIS_HASH','vars','CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH'],
  ]) {
    const mapping=env+': $'+'{{ '+scope+'.'+name+' }}';
    assert.equal(source.split(mapping).length-1,2);
  }
  assert.match(source,/node token\/climb-bridge\/mint-inspect-cli\.mjs/);
});
