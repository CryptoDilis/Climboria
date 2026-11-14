import test from "node:test";
import assert from "node:assert/strict";
import { decodeBase58,encodeBase58 } from "../src/transaction-validation.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import {
  UPGRADEABLE_BPF_LOADER, inspectFinalizedProgramProvenance,
  fetchMainnetUpgradeableProgramProvenance
} from "../src/upgradeable-program-provenance.mjs";

const key = n => encodeBase58(new Uint8Array(32).fill(n));
const pdJ=key(7), pdR=key(8);
function base64(bytes) { return [Buffer.from(bytes).toString("base64"),"base64"]; }
function program(programDataAddress) {
  const bytes=new Uint8Array(36);
  new DataView(bytes.buffer).setUint32(0,2,true);
  bytes.set(decodeBase58(programDataAddress),4);
  return {owner:UPGRADEABLE_BPF_LOADER,executable:true,data:base64(bytes),space:36};
}
function programData(slot,authority=key(9)) {
  const bytes=new Uint8Array(45);
  const view=new DataView(bytes.buffer);
  view.setUint32(0,3,true);
  view.setBigUint64(4,BigInt(slot),true);
  bytes[12]=authority===null?0:1;
  if(authority!==null)bytes.set(decodeBase58(authority),13);
  return {owner:UPGRADEABLE_BPF_LOADER,executable:false,data:base64(bytes),space:8192};
}
function fixture() {
  const original=[program(pdJ),program(pdR)];
  return {
    network:"mainnet-beta",bootstrapSlot:110,finalizedSlot:120,
    bootstrapAccounts:structuredClone(original),
    finalizedAccounts:[...structuredClone(original),programData(105),programData(108,null)]
  };
}
function rejects(mutate,reason) {
  const args=fixture();mutate(args);
  assert.throws(()=>inspectFinalizedProgramProvenance(args),/Read-only executable metadata/,reason);
}
test("read-only Jupiter/Raydium ProgramData metadata never approves executable CPI or bytecode",()=>{
  const proof=inspectFinalizedProgramProvenance(fixture());
  assert.equal(proof.network,"mainnet-beta");
  assert.equal(proof.bootstrapSlot,110);
  assert.equal(proof.finalizedSlot,120);
  assert.equal(proof.programs.jupiterV6.programId,JUPITER_V6_PROGRAM_ID);
  assert.equal(proof.programs.raydiumV4.programId,RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]);
  assert.equal(proof.programs.jupiterV6.programDataAddress,pdJ);
  assert.equal(proof.programs.raydiumV4.programDataAddress,pdR);
  assert.equal(proof.programs.jupiterV6.upgradeAuthority,key(9));
  assert.equal(proof.programs.jupiterV6.immutable,false);
  assert.equal(proof.programs.raydiumV4.upgradeAuthority,null);
  assert.equal(proof.programs.raydiumV4.immutable,true);
  assert.equal(proof.programs.raydiumV4.lastDeploySlot,108);
  for(const field of ["deployedProgramBytecodeVerified","jupiterCpiAccountMappingVerified","approvedForJupiterCpi"])assert.equal(proof[field],false);
});
test("reject executable owner mismatch, swapped ProgramData, wrong states and mutable ProgramData",()=>{
  rejects(x=>{x.bootstrapAccounts[0].owner=key(13)}, "wrong owner");
  rejects(x=>{x.bootstrapAccounts[1].executable=false}, "not executable");
  rejects(x=>{x.finalizedAccounts[1].data=program(pdJ).data}, "changed state between reads");
  rejects(x=>{x.finalizedAccounts[2].owner=key(12)}, "wrong ProgramData owner");
  rejects(x=>{x.finalizedAccounts[2].executable=true}, "ProgramData executable");
  rejects(x=>{const b=Buffer.from(x.finalizedAccounts[2].data[0],"base64");b.writeUInt32LE(1,0);x.finalizedAccounts[2].data=base64(b)}, "wrong tag");
  rejects(x=>{const b=Buffer.from(x.finalizedAccounts[2].data[0],"base64");b[12]=2;x.finalizedAccounts[2].data=base64(b)}, "bad authority option");
  rejects(x=>{x.finalizedAccounts[2].space=40}, "truncated executable payload");
});
test("reject duplicates, future deploy, malformed base64 and stale second contexts",()=>{
  rejects(x=>{x.bootstrapAccounts[1]=program(pdJ);x.finalizedAccounts[1]=program(pdJ)}, "aliased ProgramData");
  rejects(x=>{x.finalizedAccounts[2]=programData(121)}, "future deployed slot");
  rejects(x=>{x.finalizedAccounts[2].data=["bogus!","base64"]}, "bad base64");
  rejects(x=>{x.finalizedSlot=109}, "stale context");
  rejects(x=>{x.network="devnet"}, "wrong network");
  rejects(x=>{x.finalizedAccounts[3]=null}, "missing ProgramData");
});
test("bounded two-step RPC uses finalized, slices and minimum context slot",async()=>{
  const observed=[];
  const sample=fixture();
  const fakeFetch=async(url,options)=>{
    observed.push({url,options});
    const accounts=observed.length===1?sample.bootstrapAccounts:sample.finalizedAccounts;
    return new Response(JSON.stringify({
      jsonrpc:"2.0",id:"climboria-upgradeable-program-readonly",
      result:{context:{slot:observed.length===1?110:120},value:accounts}
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  const proof=await fetchMainnetUpgradeableProgramProvenance({
    network:"mainnet-beta",rpcUrl:"https://rpc.operator.example/rpc?key=HIDDEN_TOKEN",
    minContextSlot:108,fetchImpl:fakeFetch
  });
  assert.equal(observed.length,2);
  const first=JSON.parse(observed[0].options.body);
  const second=JSON.parse(observed[1].options.body);
  assert.equal(first.method,"getMultipleAccounts");
  assert.deepEqual(first.params[0],[JUPITER_V6_PROGRAM_ID,RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"]]);
  assert.deepEqual(second.params[0],[
    JUPITER_V6_PROGRAM_ID,RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"],pdJ,pdR
  ]);
  assert.deepEqual(first.params[1].dataSlice,{offset:0,length:45});
  assert.equal(first.params[1].commitment,"finalized");
  assert.equal(first.params[1].minContextSlot,108);
  assert.equal(second.params[1].minContextSlot,110);
  assert.equal(observed[0].options.redirect,"error");
  assert.equal(proof.approvedForJupiterCpi,false);
  assert.doesNotMatch(JSON.stringify(proof),/HIDDEN_TOKEN|rpc.operator.example/);
});
test("RPC response tampering or stale context fails closed",async()=>{
  for(const bad of ["wrong-id","stale","missing","http","rpc-error"]) {
    let count=0;
    await assert.rejects(fetchMainnetUpgradeableProgramProvenance({
      network:"mainnet-beta",rpcUrl:"https://rpc.operator.example",
      fetchImpl:async()=>{
        count++;
        const sample=fixture();
        const x={jsonrpc:"2.0",id:"climboria-upgradeable-program-readonly",
          result:{context:{slot:count===1?110:120},
            value:count===1?sample.bootstrapAccounts:sample.finalizedAccounts}};
        if(count===2){
          if(bad==="wrong-id")x.id="attacker";
          if(bad==="stale")x.result.context.slot=109;
          if(bad==="missing")x.result.value.pop();
          if(bad==="rpc-error")x.error={code:-1,message:"not-finalized"};
        }
        return new Response(JSON.stringify(x),{status:bad==="http"&&count===2?503:200});
      }
    }),/Read-only executable metadata/);
  }
});
test("does not allow devnet, untrusted private RPC or invalid context",async()=>{
  for(const args of [
    {network:"devnet",rpcUrl:"https://rpc.operator.example"},
    {network:"mainnet-beta",rpcUrl:"https://127.0.0.1"},
    {network:"mainnet-beta",rpcUrl:"https://rpc.operator.example",minContextSlot:-1}
  ]) await assert.rejects(fetchMainnetUpgradeableProgramProvenance(args));
});
