import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { encodeBase58, decodeBase58 } from "../src/transaction-validation.mjs";
import { UPGRADEABLE_BPF_LOADER } from "../src/upgradeable-program-provenance.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import {
  validatePinnedSha256, hashPinnedUpgradeableProgramPayload,
  hashPinnedJupiterRaydiumPayloads
} from "../src/upgradeable-program-bytecode-digest.mjs";

const key = byte => encodeBase58(new Uint8Array(32).fill(byte));
const rpcUrl = "https://trusted-operator.example/rpc?token=TOP_SECRET";
function image(payload, authority = key(9), deploySlot = 100) {
  const header = Buffer.alloc(45);
  header.writeUInt32LE(3, 0);
  header.writeBigUInt64LE(BigInt(deploySlot), 4);
  header[12] = authority === null ? 0 : 1;
  if (authority !== null) header.set(decodeBase58(authority), 13);
  return Buffer.concat([header, payload]);
}
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const jupiterPayload = Buffer.from(Array.from({length:65_539},(_,i)=>i%251));
const raydiumPayload = Buffer.from(Array.from({length:61},(_,i)=>i+1));
const images = Object.freeze({
  jupiterV6: image(jupiterPayload),
  raydiumV4: image(raydiumPayload,null)
});
const evidence = Object.freeze({
  jupiterV6: {
    programId: JUPITER_V6_PROGRAM_ID, programDataAddress: key(3),
    lastDeploySlot: 100, upgradeAuthority: key(9),
    programDataPdaIndependentlyVerified: true,
    loaderMetadataVerified: true, deployedProgramBytecodeVerified:false
  },
  raydiumV4: {
    programId: RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"], programDataAddress:key(4),
    lastDeploySlot:100, upgradeAuthority:null,
    programDataPdaIndependentlyVerified: true,
    loaderMetadataVerified: true, deployedProgramBytecodeVerified:false
  }
});
function proof() {
  return {
    network:"mainnet-beta",finalizedSlot:120,
    programDataPdaIndependentlyVerified:true,
    approvedForJupiterCpi:false,
    programs:structuredClone(evidence)
  };
}
function fakeFetch({tamper, onCall}={}) {
  let count=0;
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    count++;
    const data=JSON.parse(opts.body);
    const role=data.params[0]===key(3)?"jupiterV6":"raydiumV4";
    const raw=images[role];
    const {offset,length}=data.params[1].dataSlice;
    const response={
      jsonrpc:"2.0",id:data.id,
      result:{
        context:{slot:121+count},
        value:{
          owner:UPGRADEABLE_BPF_LOADER,
          executable:false,space:raw.length,
          data:[raw.subarray(offset,offset+length).toString("base64"),"base64"]
        }
      }
    };
    if(tamper)tamper({response,data,role,count,raw,offset,length});
    calls.push({url,opts,data,role,offset,length});
    if(onCall)onCall(calls.at(-1));
    return new Response(JSON.stringify(response),{status:200,headers:{"content-type":"application/json"}});
  };
  return {fetchImpl,calls};
}
const hashArgs=(role,fetchImpl,expectedSha256=sha256(images[role].subarray(45)))=>({
  role,provenanceProof:proof(),rpcUrl,expectedSha256,fetchImpl
});

test("hashes ALL 32KiB payload slices excluding 45-byte header and preserves no approval",async()=>{
  const {fetchImpl,calls}=fakeFetch();
  const result=await hashPinnedUpgradeableProgramPayload(hashArgs("jupiterV6",fetchImpl));
  assert.equal(result.sha256,sha256(jupiterPayload));
  assert.equal(result.programPayloadBytes,jupiterPayload.length);
  assert.equal(result.programDataAccountBytes,jupiterPayload.length+45);
  assert.equal(result.matchesOperatorPinnedSha256,true);
  assert.equal(result.singleSlotBytecodeSnapshotVerified,false);
  assert.equal(result.sourceCodeParityVerified,false);
  assert.equal(result.approvedForJupiterCpi,false);
  assert.deepEqual(calls.map(x=>[x.offset,x.length]),[
    [0,45],[45,32*1024],[45+32*1024,32*1024],[45+2*32*1024,3],[0,45]
  ]);
  for(let i=0;i<calls.length;i++){
    const request=calls[i].data.params[1];
    assert.equal(request.commitment,"finalized");
    assert.equal(request.encoding,"base64");
    assert.equal(request.minContextSlot,i===0?120:120+i+1);
    assert.equal(calls[i].opts.redirect,"error");
  }
  assert.doesNotMatch(JSON.stringify(result),/TOP_SECRET|trusted-operator/);
});

test("requires exact independently pinned digest: cannot simply report observed hash as verified",async()=>{
  for(const digest of ["",null,"d".repeat(63),"D".repeat(64),"g".repeat(64),123]){
    assert.throws(()=>validatePinnedSha256(digest),/operator expected SHA-256/);
  }
  const {fetchImpl}=fakeFetch();
  await assert.rejects(hashPinnedUpgradeableProgramPayload(
    hashArgs("raydiumV4",fetchImpl,"0".repeat(64))
  ),/does not match independently pinned SHA-256/);
});

test("Jupiter and Raydium both require distinct matching pinned byte images",async()=>{
  const {fetchImpl}=fakeFetch();
  const result=await hashPinnedJupiterRaydiumPayloads({
    provenanceProof:proof(),rpcUrl,fetchImpl,
    expectedJupiterSha256:sha256(jupiterPayload),
    expectedRaydiumSha256:sha256(raydiumPayload)
  });
  assert.equal(result.bothMatchOperatorPinnedSha256,true);
  assert.equal(result.deployedProgramBytecodeIndependentlyAudited,false);
  assert.equal(result.approvedForJupiterCpi,false);
  assert.equal(result.programs.raydiumV4.programDataLastDeploySlot,100);
  assert.doesNotMatch(JSON.stringify(result),/TOP_SECRET/);
});

test("rejects missing preflight PDA, unreviewed metadata or forged executable roles before I/O",async()=>{
  for(const alter of [
    p=>{p.programDataPdaIndependentlyVerified=false;},
    p=>{p.programs.jupiterV6.programDataPdaIndependentlyVerified=false;},
    p=>{p.programs.raydiumV4.loaderMetadataVerified=false;},
    p=>{p.approvedForJupiterCpi=true;},
    p=>{p.network="devnet";},
    p=>{p.programs.jupiterV6.programId=key(8);},
    p=>{p.programs.raydiumV4.deployedProgramBytecodeVerified=true;}
  ]){
    const p=proof();alter(p);
    let calls=0;
    await assert.rejects(hashPinnedJupiterRaydiumPayloads({
      provenanceProof:p,rpcUrl,
      expectedJupiterSha256:sha256(jupiterPayload),
      expectedRaydiumSha256:sha256(raydiumPayload),
      fetchImpl:async()=>{calls++;throw Error("should not fetch");}
    }),/Read-only deployed program digest/);
    assert.equal(calls,0);
  }
});

test("rejects wrong upgrade-authority bytes and mutated final ProgramData headers",async()=>{
  for(const tamper of [
    ({response,offset})=>{if(offset===0){const data=Buffer.from(response.result.value.data[0],"base64");data[13]^=1;response.result.value.data=[data.toString("base64"),"base64"];} },
    ({response,count,offset})=>{if(offset===0&&count>1){const data=Buffer.from(response.result.value.data[0],"base64");data.writeBigUInt64LE(109n,4);response.result.value.data=[data.toString("base64"),"base64"];} }
  ]){
    const {fetchImpl}=fakeFetch({tamper});
    await assert.rejects(hashPinnedUpgradeableProgramPayload(
      hashArgs("raydiumV4",fetchImpl)
    ),/Read-only deployed program digest/);
  }
});

test("changed account size, incomplete chunks and bad account owner fail closed",async()=>{
  for(const tamper of [
    ({response,offset})=>{if(offset>0)response.result.value.space++;},
    ({response,offset})=>{if(offset>0)response.result.value.data=["","base64"];},
    ({response})=>{response.result.value.owner=key(8);},
    ({response})=>{response.result.value.space=10*1024*1024+46;},
    ({response})=>{response.result.value.executable=true;}
  ]){
    const {fetchImpl}=fakeFetch({tamper});
    await assert.rejects(hashPinnedUpgradeableProgramPayload(
      hashArgs("jupiterV6",fetchImpl)
    ),/Read-only deployed program digest/);
  }
});

test("stale slots, wrong JSON request ID and RPC upstream errors fail closed",async()=>{
  for(const tamper of [
    ({response})=>{response.id="other";},
    ({response})=>{response.result.context.slot=2;},
    ({response})=>{response.error={code:-32000,message:"provider unreachable"};},
    ({response})=>{response.result.value=null;}
  ]){
    const {fetchImpl}=fakeFetch({tamper});
    await assert.rejects(hashPinnedUpgradeableProgramPayload(
      hashArgs("raydiumV4",fetchImpl)
    ),/Read-only deployed program digest/);
  }
  await assert.rejects(hashPinnedUpgradeableProgramPayload(hashArgs(
    "raydiumV4",async()=>{throw new Error("token "+rpcUrl);}
  )),/RPC chunk fetch unavailable/);
});

test("a failure on second program returns no misleading combined approval",async()=>{
  const {fetchImpl}=fakeFetch();
  await assert.rejects(hashPinnedJupiterRaydiumPayloads({
    provenanceProof:proof(),rpcUrl,fetchImpl,
    expectedJupiterSha256:sha256(jupiterPayload),
    expectedRaydiumSha256:"f".repeat(64)
  }),/does not match independently pinned SHA-256/);
});
