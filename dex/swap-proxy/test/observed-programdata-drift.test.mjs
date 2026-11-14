import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNoObservedProgramUpgradeDrift } from "../tools/observed-programdata-drift.mjs";

const baseline = JSON.parse(readFileSync(
  new URL("../tools/observed-programdata-baseline.json", import.meta.url), "utf8"
));
function evidence(){
  return {
    network:"mainnet-beta",
    expectedGenesisHash:baseline.expectedGenesisHash,
    bothProviderReportedUpgradeableProgramMetadataAgree:true,
    bothProviderReportedGenesisMatchedOperatorPin:true,
    primaryProviderReportedFinalizedSlot:469433818,
    secondaryProviderReportedFinalizedSlot:469433818,
    approvedForProductionExecution:false,
    programs:structuredClone(baseline.programs)
  };
}
test("reviewed public observed baseline is stable and never authorizes trades",()=>{
  const result=assertNoObservedProgramUpgradeDrift(evidence(),baseline);
  assert.equal(result.observedReferenceUnchangedAcrossBothRpcHosts,true);
  assert.equal(result.approvedForProductionExecution,false);
  assert.equal(result.sourceToBinaryParityVerified,false);
  assert.equal(result.independentlyAuditedReferenceDigestAvailable,false);
  assert.equal(result.transactionSubmitted,false);
});
test("unexpected Jupiter/Raydium slot, ProgramData, authority, bump, immutability or ID fails closed",()=>{
  for(const role of ["jupiterV6","raydiumV4"]){
    for(const [field,value] of [
      ["lastDeploySlot",baseline.programs[role].lastDeploySlot+1],
      ["programDataAddress","ChangedUnknownPublicAccount"],
      ["upgradeAuthority",null],
      ["programDataPdaBump",1],
      ["immutable",true],
      ["programId","DifferentProgram"]
    ]){
      const modified=evidence();modified.programs[role][field]=value;
      assert.throws(()=>assertNoObservedProgramUpgradeDrift(modified,baseline),/baseline mismatch/,role+" "+field);
    }
  }
});
test("missing, stale and unreviewed reference evidence cannot accidentally pass",()=>{
  for(const modified of [
    null,
    {...evidence(),expectedGenesisHash:"incorrect"},
    {...evidence(),bothProviderReportedUpgradeableProgramMetadataAgree:false},
    {...evidence(),approvedForProductionExecution:true},
    {...evidence(),primaryProviderReportedFinalizedSlot:100},
    {...evidence(),secondaryProviderReportedFinalizedSlot:100},
    {...evidence(),programs:{}}
  ]){
    assert.throws(()=>assertNoObservedProgramUpgradeDrift(modified,baseline),/baseline mismatch/);
  }
  for(const changed of [
    {...baseline,approvedForProductionExecution:true},
    {...baseline,independentlyAuditedReferenceDigestAvailable:true},
    {...baseline,sourceToBinaryParityVerified:true},
    {...baseline,observationSource:{...baseline.observationSource,providerReportedFinalizedSlot:0}},
    {...baseline,programs:{}}
  ]){
    assert.throws(()=>assertNoObservedProgramUpgradeDrift(evidence(),changed),/baseline mismatch/);
  }
});
test("do not print provider secrets from a corrupted metadata blob",()=>{
  const bad=evidence();bad.programs.jupiterV6.upgradeAuthority="PRIVATE-KEY-API-TOKEN";
  let error;
  try{assertNoObservedProgramUpgradeDrift(bad,baseline);}catch(e){error=e;}
  assert.equal(error?.message,"Observed Jupiter/Raydium ProgramData baseline mismatch or invalid reference; operator review required");
  assert.doesNotMatch(error.message,/PRIVATE-KEY|API-TOKEN/);
});
