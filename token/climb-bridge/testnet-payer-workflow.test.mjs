import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../../.github/workflows/climb-testnet-payer-preflight.yml',import.meta.url),'utf8');
test('testnet payer workflow is main-only, manual and public-input-only',()=>{
 assert.match(workflow,/on:\s*\n  workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^  (push|pull_request|schedule):/m);
 assert.match(workflow,/if: github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/permissions:\s*\n  contents: read/);
 assert.match(workflow,/persist-credentials: false/);
 assert.doesNotMatch(workflow,/secrets\.|private_key|seed_phrase/);
 assert.match(workflow,/SOLANA_PUBLIC_ADDRESS: \$\{\{ inputs\.solana_address \}\}/);
 assert.match(workflow,/BASE_PUBLIC_ADDRESS: \$\{\{ inputs\.base_address \}\}/);
 const run=workflow.split('        run: |')[1];
 assert.doesNotMatch(run,/\$\{\{/);
 assert.match(run,/node token\/climb-bridge\/testnet-payer-preflight\.mjs "\$SOLANA_PUBLIC_ADDRESS" "\$BASE_PUBLIC_ADDRESS"/);
});
