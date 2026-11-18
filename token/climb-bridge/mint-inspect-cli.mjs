// Read-only, independent finalized Solana mint authority cross-check. No wallet needed.
// Do not use CI secrets, paste private RPC URLs in issues or publish raw endpoint responses.
import {inspectIndependentMints} from './mint-inspect.mjs';
try {
  const first = process.env.CLIMB_SOLANA_RPC_A_URL;
  const second = process.env.CLIMB_SOLANA_RPC_B_URL;
  if (!first || !second) throw new Error('NO_GO: set two distinct CLIMB_SOLANA_RPC_A_URL / CLIMB_SOLANA_RPC_B_URL environment variables');
  const report = await inspectIndependentMints(first,second);
  console.log(JSON.stringify(report,null,2));
  console.log('NO_GO: mint authority verification alone does not establish bridge compatibility or authorize mainnet deployment.');
} catch (error) {
  // Network exception may contain endpoint URL; avoid revealing API keys even in logs.
  const message = typeof error.message === 'string' && error.message.startsWith('NO_GO:')
    ? error.message : 'NO_GO: mint verification request failed or timed out (endpoint details redacted)';
  console.error(message);
  process.exitCode = 1;
}
