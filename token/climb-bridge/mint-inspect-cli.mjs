// Read-only CLIMB finalized mint authority evidence; no wallet, keys or signing.
// Requires TWO private independently operated HTTPS RPC URLs plus an independently sourced
// public mainnet genesis reference. No RPC credentials are printed or saved.
import {inspectFreshIndependentMints, verifyExpectedGenesis, safeMintEvidenceError, inspectRawClimbExtensions} from './mint-freshness.mjs';

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
  const raw=await inspectRawClimbExtensions(first,second,report);
  console.log(JSON.stringify({
    ...report,
    ...raw,
    configuredMainnetGenesisReferenceMatched:genesis.referenceMatched,
    configuredReferenceProvenance:genesis.referenceProvenance,
    providerIndependence:'NOT_CONFIRMED_AUTOMATICALLY',
    bridgeRelease:'NO_GO'
  },null,2));
  console.log('NO_GO: no proof of provider independence, bridge support or safe customer transfers. No tokens moved.');
} catch(error) {
  console.error(safeMintEvidenceError(error));
  process.exitCode=1;
}
