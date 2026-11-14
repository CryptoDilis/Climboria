import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import {
  deriveUpgradeableProgramDataPda, UPGRADEABLE_BPF_LOADER_ID
} from "../src/upgradeable-programdata-pda.mjs";

test("independent vector: Jupiter V6 upgradeable ProgramData PDA skips on-curve bump 255",async()=>{
  const result=await deriveUpgradeableProgramDataPda(JUPITER_V6_PROGRAM_ID);
  assert.equal(UPGRADEABLE_BPF_LOADER_ID,"BPFLoaderUpgradeab1e11111111111111111111111");
  assert.equal(result.programId,JUPITER_V6_PROGRAM_ID);
  assert.equal(result.bump,254);
  assert.equal(result.programDataAddress,"4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT");
  assert.equal(result.independentlyDerivedOffCurvePda,true);
  assert.equal(result.deployedProgramBytecodeVerified,false);
  assert.equal(result.approvedForJupiterCpi,false);
});

test("independent vector: Raydium V4 upgradeable ProgramData PDA bump 255",async()=>{
  const result=await deriveUpgradeableProgramDataPda(RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]);
  assert.equal(result.bump,255);
  assert.equal(result.programDataAddress,"A7ZG7ByDi8DpzT9Ab7CiXhvgYTJQmaDPJkMDoPitaCQV");
  assert.equal(result.approvedForJupiterCpi,false);
});

test("malformed keys and wrong-length inputs cannot trigger a trusted PDA derivation",async()=>{
  for(const value of [undefined,null,"", "not:base58", "O0Il", 123,
    encodeBase58(new Uint8Array(31).fill(1)),
    encodeBase58(new Uint8Array(33).fill(1)),
    " "+JUPITER_V6_PROGRAM_ID]) {
    await assert.rejects(deriveUpgradeableProgramDataPda(value),/Read-only ProgramData PDA/);
  }
});

test("the result is immutable and contains no RPC/provider approval",async()=>{
  const result=await deriveUpgradeableProgramDataPda(JUPITER_V6_PROGRAM_ID);
  assert.equal(Object.isFrozen(result),true);
  assert.deepEqual(Object.keys(result).sort(),[
    "approvedForJupiterCpi","bump","deployedProgramBytecodeVerified",
    "independentlyDerivedOffCurvePda","programDataAddress","programId"
  ].sort());
});
