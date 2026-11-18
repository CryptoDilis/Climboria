// No-wallet, no-signing CLIMB finalized mint authority check across two RPC providers.
// Requires operator to independently verify provider companies and canonical Solana network.
// Do NOT paste endpoint keys or private RPC URLs into GitHub, issues, chats or logs.
import {inspectFreshIndependentMints} from './mint-freshness.mjs';
try {
  const first=process.env.CLIMB_SOLANA_RPC_A_URL;
  const second=process.env.CLIMB_SOLANA_RPC_B_URL;
  if(!first || !second) throw new Error('NO_GO: two independently operated RPC endpoints must be configured privately');
  const report=await inspectFreshIndependentMints(first,second);
  console.log(JSON.stringify(report,null,2));
  console.log('NO_GO: operator identity and provider support are not verified by this read-only check; do not move funds.');
} catch(error) {
  // Avoid logging arbitrary remote provider error messages which may include RPC tokens.
  const safeMessages=[
    'two independently operated RPC endpoints must be configured privately',
    'use two different RPC hostname providers',
    'RPC endpoints must use HTTPS without embedded user credentials',
    'independent RPC finalized heads diverge',
    'RPC providers report different chain genesis identities',
    'stale mint context relative to finalized RPC head',
    'inconsistent finalized RPC head/context',
    'invalid finalized slot head',
    'invalid chain genesis identity'
  ];
  const candidate=String(error?.message||'');
  const message=safeMessages.some(m=>candidate.includes(m))?candidate:'NO_GO: finalized mint verification failed (RPC details redacted)';
  console.error(message);
  process.exitCode=1;
}
