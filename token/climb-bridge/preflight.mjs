// Run locally after independently verifying and completing config.json.
import {readFile} from 'node:fs/promises';
import {auditLive, requireConfigured} from './supply-audit.mjs';
const config = JSON.parse(await readFile(new URL('./config.json', import.meta.url), 'utf8'));
try {
  requireConfigured(config);
  if (!process.env.CLIMB_SOLANA_RPC_URL || !process.env.CLIMB_BASE_RPC_URL) throw new Error('NO_GO: missing CLIMB_SOLANA_RPC_URL / CLIMB_BASE_RPC_URL');
  const result = await auditLive(config, process.env.CLIMB_SOLANA_RPC_URL, process.env.CLIMB_BASE_RPC_URL);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} catch (error) {
  process.stderr.write('CLIMB bridge preflight: ' + error.message + '\n');
  process.exitCode = 1;
}
