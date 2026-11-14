/**
 * Read-only guard against silent changes from an earlier GitHub-observed
 * Jupiter V6/Raydium V4 Upgradeable Loader metadata snapshot.
 * Baseline is NOT a trusted independently audited executable payload pin.
 * Never import this operator tool into production Wallet/Worker code.
 */
const FIELDS = Object.freeze([
  "programId","programDataAddress","programDataPdaBump",
  "lastDeploySlot","upgradeAuthority","immutable"
]);
const ROLES = Object.freeze(["jupiterV6","raydiumV4"]);
function fail() {throw new Error("Observed Jupiter/Raydium ProgramData baseline mismatch or invalid reference; operator review required");}
export function assertNoObservedProgramUpgradeDrift(evidence, baseline) {
  try {
    if(!evidence||!baseline||
       baseline.kind!=="CLIMBORIA_OBSERVED_PROGRAMDATA_METADATA_BASELINE_NOT_AUDITED"||
       baseline.network!=="mainnet-beta"||
       evidence.network!=="mainnet-beta"||
       baseline.expectedGenesisHash!==evidence.expectedGenesisHash||
       !baseline.observationSource?.githubActionsRun?.startsWith("https://github.com/CryptoDilis/Climboria/actions/runs/")||
       !Number.isSafeInteger(baseline.observationSource.providerReportedFinalizedSlot)||
       baseline.observationSource.providerReportedFinalizedSlot<=0||
       evidence.bothProviderReportedUpgradeableProgramMetadataAgree!==true||
       evidence.bothProviderReportedGenesisMatchedOperatorPin!==true||
       evidence.approvedForProductionExecution!==false||
       baseline.approvedForProductionExecution!==false||
       baseline.independentlyAuditedReferenceDigestAvailable!==false||
       baseline.sourceToBinaryParityVerified!==false||
       !evidence.programs||!baseline.programs)fail();
    if(ROLES.some(role=>{
      const prior=baseline.programs[role], current=evidence.programs[role];
      return !prior||!current||
        FIELDS.some(field=>!Object.hasOwn(prior,field)||
          !Object.hasOwn(current,field)||prior[field]!==current[field])||
        !Number.isSafeInteger(prior.lastDeploySlot)||
        prior.lastDeploySlot>baseline.observationSource.providerReportedFinalizedSlot||
        current.lastDeploySlot>evidence.primaryProviderReportedFinalizedSlot||
        current.lastDeploySlot>evidence.secondaryProviderReportedFinalizedSlot;
    }))fail();
    return Object.freeze({
      observedReferenceUnchangedAcrossBothRpcHosts:true,
      observedReferenceRun:baseline.observationSource.githubActionsRun,
      alertOnProgramUpgradeOrAuthorityChange:true,
      independentlyAuditedReferenceDigestAvailable:false,
      sourceToBinaryParityVerified:false,
      approvedForJupiterCpi:false,
      approvedForProductionExecution:false,
      transactionSubmitted:false
    });
  }catch{fail();}
}
