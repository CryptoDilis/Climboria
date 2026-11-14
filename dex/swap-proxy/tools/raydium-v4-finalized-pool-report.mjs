#!/usr/bin/env node
/**
 * Operator-only, public-data-only, read-only Raydium V4 pool evidence CLI.
 *
 * Run locally, not in public CI:
 *   CLIMBORIA_SOLANA_RPC_URL=<operator HTTPS endpoint> node \
 *     dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs \
 *     --network mainnet-beta --pool <independently verified Raydium V4 pool ID>
 *
 * Never commit/log the RPC URL if it includes an access token. This program
 * neither prints the URL nor builds/signs/submits an on-chain transaction.
 * A single public pool address supplied by a trusted operator is required.
 */
import { fetchRaydiumV4EvidenceFromPoolAddress } from "../src/raydium-v4-pool-discovery.mjs";
import { fetchRaydiumV4DualRpcPublicEvidence } from "../src/raydium-v4-dual-rpc-evidence.mjs";
import { safeRaydiumOperatorError } from "./raydium-v4-safe-error.mjs";
import { fetchMainnetUpgradeableProgramProvenance } from "../src/upgradeable-program-provenance.mjs";
import { verifyOperatorRpcGenesisSet } from "../src/raydium-v4-rpc-genesis-preflight.mjs";

const USAGE = "Usage: node dex/swap-proxy/tools/raydium-v4-finalized-pool-report.mjs --network mainnet-beta|devnet --pool <verified-public-pool-address> [--min-slot <nonnegative-slot>]";

async function main(argv) {
  if (!Array.isArray(argv) || argv.length < 4 || argv.length > 6 || argv.length % 2 !== 0) {
    throw new Error(USAGE);
  }
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1];
    if (!["--network", "--pool", "--min-slot"].includes(flag) ||
        flags.has(flag) || !value || value.startsWith("--")) {
      throw new Error(USAGE);
    }
    flags.set(flag, value);
  }
  if (!flags.has("--network") || !flags.has("--pool")) throw new Error(USAGE);
  const minSlotRaw = flags.get("--min-slot");
  const minContextSlot = minSlotRaw === undefined ? null :
    (/^(?:0|[1-9][0-9]*)$/.test(minSlotRaw) && Number.isSafeInteger(Number(minSlotRaw))
      ? Number(minSlotRaw) : NaN);
  if (Number.isNaN(minContextSlot)) throw new Error("Invalid --min-slot");
  const rpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error("CLIMBORIA_SOLANA_RPC_URL must be configured in the operator environment");
  // Require an operator independently corroborated genesis hash before pool RPC
  // evidence is ever fetched, so an accidental wrong-cluster provider fails closed.
  const expectedGenesisHash = process.env.CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH;
  if (!expectedGenesisHash) throw new Error("CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH must be configured in the operator environment");
  // An optional second independently configured operator hostname provides a
  // second read-only view. A mismatch fails closed; no fallback as corroborated.
  const secondaryRpcUrl = process.env.CLIMBORIA_SOLANA_RPC_URL_SECONDARY;
  const preflight = await verifyOperatorRpcGenesisSet({
    primaryRpcUrl: rpcUrl, secondaryRpcUrl, expectedGenesisHash
  });
  // Read-only finalized Upgradeable Loader evidence for BOTH Jupiter V6 and
  // Raydium V4. This is a strict mainnet-beta-only evidence boundary, not
  // bytecode verification and not permission to execute any transaction.
  const programProof = await fetchMainnetUpgradeableProgramProvenance({
    network: flags.get("--network"), rpcUrl, minContextSlot
  });
  const result = secondaryRpcUrl
    ? await fetchRaydiumV4DualRpcPublicEvidence({
        network: flags.get("--network"), poolAddress: flags.get("--pool"),
        primaryRpcUrl: rpcUrl, secondaryRpcUrl, minContextSlot
      })
    : await fetchRaydiumV4EvidenceFromPoolAddress({
        network: flags.get("--network"), poolAddress: flags.get("--pool"),
        rpcUrl, minContextSlot
      });

  // Output ONLY public addresses and safety metadata. Do NOT reveal RPC
  // endpoint/query secrets, raw token account bytes, or wallet material.
  process.stdout.write(JSON.stringify({
    kind: "RAYDIUM_V4_READ_ONLY_POOL_EVIDENCE",
    genesisHash: preflight.genesisHash,
    matchesOperatorExpectedGenesis: preflight.matchesOperatorExpectedGenesis,
    genesisWitnessedRpcCount: preflight.witnessedRpcCount,
    executableLoaderMetadataVerified: true,
    executableMetadataPrimaryRpcOnly: true,
    jupiterProgramData: programProof.programs.jupiterV6,
    raydiumProgramData: programProof.programs.raydiumV4,
    network: result.network,
    programId: result.programId,
    pool: result.poolAddress,
    bootstrapSlot: result.poolDiscoveryContextSlot,
    finalizedContextSlot: result.contextSlot,
    coinMint: result.pool.coinMint,
    pcMint: result.pool.pcMint,
    coinVault: result.pool.coinVault,
    pcVault: result.pool.pcVault,
    market: result.pool.market,
    marketProgram: result.pool.marketProgram,
    openOrders: result.pool.openOrders,
    authority: result.expectedAuthority,
    vaultMintBindingsChecked: result.finalizedSnapshotRelationshipsChecked,
    authorityPdaMathChecked: result.ammAuthorityPdaIndependentlyVerified,
    poolRawImageStableAcrossFinalizedReads: result.poolStateStableAcrossFinalizedReads,
    twoConfiguredRpcHostsCompared: result.twoConfiguredRpcHostsCompared === true,
    matchingPublicPoolConfiguration: result.matchingPublicPoolConfiguration === true,
    secondaryFinalizedContextSlot: result.secondaryFinalizedContextSlot ?? null,
    independentlyCorroboratedPoolSelection: result.poolAddressIndependentlyCorroborated,
    independentlyAuditedRpcSource: result.rpcSourceIndependentlyAudited,
    jupiterCpiAccountMappingVerified: result.jupiterCpiAccountMappingVerified,
    deployedProgramBytecodeVerified: result.deployedProgramBytecodeVerified,
    approvedForJupiterCpi: false
  }, null, 2) + "\n");
}

main(process.argv.slice(2)).catch(error => {
  // The underlying security functions emit controlled messages without
  // including the RPC URL. Avoid stack traces/serialization of request
  // objects which could leak operator HTTPS query-string credentials.
  process.stderr.write("Read-only Raydium pool evidence FAILED: " +
    safeRaydiumOperatorError(error) + "\n");
  process.exitCode = 1;
});
