// Read-only CLIMB finalized mint authority evidence; no wallet, keys or signing.
// Requires TWO private independently operated HTTPS RPC URLs plus an independently sourced
// public mainnet genesis reference. No RPC credentials are printed or saved.
import {inspectFreshIndependentMints, verifyExpectedGenesis} from './mint-freshness.mjs';

try {
  const first=process.env.CLIMB_SOLANA_RPC_A_URL;
  const second=process.env.CLIMB_SOLANA_RPC_B_URL;
  const expectedGenesis=process.env.CLIMB_SOLANA_MAINNET_GENESIS_HASH;
  if(!first || !second) {
    throw new Error('NO_GO: two independently operated RPC endpoints must be configured privately');
  }
  if(!expectedGenesis) {
    throw new Error('NO_GO: trusted mainnet genesis reference must be configured');
  }
  const report=await inspectFreshIndependentMints(first,second);
  const genesis=verifyExpectedGenesis(expectedGenesis,report.observedChainGenesisHash);
  console.log(JSON.stringify({
    ...report,
    configuredMainnetGenesisReferenceMatched:genesis.referenceMatched,
    configuredReferenceProvenance:genesis.referenceProvenance,
    providerIndependence:'NOT_CONFIRMED_AUTOMATICALLY',
    bridgeRelease:'NO_GO'
  },null,2));
  console.log('NO_GO: no proof of provider independence, bridge support or safe customer transfers. No tokens moved.');
} catch(error) {
  // Do not echo any unknown upstream text; it could include API keys in private URLs.
  const allow=new Set([
    'NO_GO: two independently operated RPC endpoints must be configured privately',
    'NO_GO: trusted mainnet genesis reference must be configured',
    'NO_GO: reported genesis does not match configured mainnet reference',
    'NO_GO: use two different RPC hostname providers',
    'NO_GO: RPC endpoints must use HTTPS without embedded user credentials',
    'NO_GO: independent RPC finalized heads diverge',
    'NO_GO: RPC providers report different chain genesis identities',
    'NO_GO: stale mint context relative to finalized RPC head',
    'NO_GO: inconsistent finalized RPC head/context',
    'NO_GO: invalid finalized slot head',
    'NO_GO: invalid chain genesis identity'
  ]);
  const candidate=String(error?.message||'');
  console.error(allow.has(candidate)?candidate:'NO_GO: finalized mint verification failed (RPC details redacted)');
  process.exitCode=1;
}
