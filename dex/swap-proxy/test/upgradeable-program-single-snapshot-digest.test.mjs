import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import { UPGRADEABLE_BPF_LOADER } from "../src/upgradeable-program-provenance.mjs";
import {
  hashPinnedProgramSingleSnapshot, hashPinnedProgramsSingleSnapshots
} from "../src/upgradeable-program-single-snapshot-digest.mjs";

const key=n=>encodeBase58(new Uint8Array(32).fill(n));
const pdJ="4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT";
const pdR="A7ZG7ByDi8DpzT9Ab7CiXhvgYTJQmaDPJkMDoPitaCQV";
const endpoint="https://rpc.example.org/secure?token=SUPER_SECRET";
const payloads={
  jupiterV6:Buffer.from(Array.from({length:64*1024+3},(_,i)=>i%251)),
  raydiumV4:Buffer.from(Array.from({length:123},(_,i)=>i%211))
};
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
function image(role){
  const header=Buffer.alloc(45);
  header.writeUInt32LE(3,0);
  header.writeBigUInt64LE(100n,4);
  if(role==="jupiterV6"){
    header[12]=1;
    header.set(decodeBase58(key(9)),13);
  }
  return Buffer.concat([header,payloads[role]]);
}
function proof(){
  return {
    network:"mainnet-beta",finalizedSlot:120,
    programDataPdaIndependentlyVerified:true,approvedForJupiterCpi:false,
    programs:{
      jupiterV6:{
        programId:JUPITER_V6_PROGRAM_ID,programDataAddress:pdJ,
        programDataPdaBump:254,programDataPdaIndependentlyVerified:true,
        loaderMetadataVerified:true,deployedProgramBytecodeVerified:false,
        lastDeploySlot:100,upgradeAuthority:key(9)
      },
      raydiumV4:{
        programId:RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"],programDataAddress:pdR,
        programDataPdaBump:255,programDataPdaIndependentlyVerified:true,
        loaderMetadataVerified:true,deployedProgramBytecodeVerified:false,
        lastDeploySlot:100,upgradeAuthority:null
      }
    }
  };
}
function makeProvider(tamper){
  const requests=[];
  const fetchImpl=async(url,opts)=>{
    const request=JSON.parse(opts.body);
    requests.push({url,opts,request});
    const role=request.params[0]===pdJ?"jupiterV6":"raydiumV4";
    const raw=image(role);
    const data={
      jsonrpc:"2.0",id:request.id,
      result:{context:{slot:role==="jupiterV6"?130:131},value:{
        owner:UPGRADEABLE_BPF_LOADER,executable:false,
        space:raw.length,data:[raw.toString("base64"),"base64"]
      }}
    };
    const options={status:200,headers:{"content-type":"application/json"}};
    tamper?.({role,request,data,options,requests});
    return new Response(JSON.stringify(data),options);
  };
  return {requests,fetchImpl};
}
const args=(role,fetchImpl,expectedSha256=digest(payloads[role]))=>({
  role,provenanceProof:proof(),rpcUrl:endpoint,expectedSha256,fetchImpl
});
test("full Jupiter image is captured in ONE finalized RPC response and hashed with reviewed chunk validator",async()=>{
  const {requests,fetchImpl}=makeProvider();
  const result=await hashPinnedProgramSingleSnapshot(args("jupiterV6",fetchImpl));
  assert.equal(requests.length,1);
  assert.equal(requests[0].request.method,"getAccountInfo");
  assert.deepEqual(requests[0].request.params[0],pdJ);
  assert.equal(requests[0].request.params[1].commitment,"finalized");
  assert.equal(requests[0].request.params[1].encoding,"base64");
  assert.equal(requests[0].request.params[1].minContextSlot,120);
  assert.equal(Object.hasOwn(requests[0].request.params[1],"dataSlice"),false);
  assert.equal(requests[0].opts.redirect,"error");
  assert.equal(result.sha256,digest(payloads.jupiterV6));
  assert.equal(result.firstFinalizedSlot,130);
  assert.equal(result.lastFinalizedSlot,130);
  assert.equal(result.oneFinalizedRpcResponseForWholeProgram,true);
  assert.equal(result.perChunkFinalizedSlotsMayDiffer,false);
  assert.equal(result.singleSlotBytecodeSnapshotVerified,false);
  assert.equal(result.sourceCodeParityVerified,false);
  assert.equal(result.approvedForJupiterCpi,false);
  assert.doesNotMatch(JSON.stringify(result),/SUPER_SECRET|rpc.example.org/);
});
test("each program uses one RPC response, but different programs can use different finalized slots",async()=>{
  const {requests,fetchImpl}=makeProvider();
  const result=await hashPinnedProgramsSingleSnapshots({
    provenanceProof:proof(),rpcUrl:endpoint,fetchImpl,
    expectedJupiterSha256:digest(payloads.jupiterV6),
    expectedRaydiumSha256:digest(payloads.raydiumV4)
  });
  assert.equal(requests.length,2);
  assert.equal(result.programs.jupiterV6.firstFinalizedSlot,130);
  assert.equal(result.programs.raydiumV4.firstFinalizedSlot,131);
  assert.equal(result.bothMatchOperatorPinnedSha256,true);
  assert.equal(result.eachProgramReadInOneFinalizedRpcResponse,true);
  assert.equal(result.sameFinalizedSlotAcrossBothProgramsVerified,false);
  assert.equal(result.independentlyTrustedRpc,false);
  assert.equal(result.approvedForJupiterCpi,false);
});
test("wrong pinned digest fails closed; BOTH hash pins are checked before I/O",async()=>{
  const {requests,fetchImpl}=makeProvider();
  await assert.rejects(hashPinnedProgramSingleSnapshot(args(
    "jupiterV6",fetchImpl,"a".repeat(64)
  )),/does not match independently pinned SHA-256/);
  assert.equal(requests.length,1);
  let calls=0;
  await assert.rejects(hashPinnedProgramsSingleSnapshots({
    provenanceProof:proof(),rpcUrl:endpoint,expectedJupiterSha256:digest(payloads.jupiterV6),
    expectedRaydiumSha256:"unverified",fetchImpl:async()=>{calls++;throw Error("should not fetch");}
  }),/operator expected SHA-256/);
  assert.equal(calls,0);
});
test("forged PDA or incorrect bump fails before full-account RPC",async()=>{
  for(const change of [
    p=>{p.programs.jupiterV6.programDataAddress=key(7);},
    p=>{p.programs.jupiterV6.programDataPdaBump=255;},
    p=>{p.programDataPdaIndependentlyVerified=false;},
    p=>{p.programs.jupiterV6.programId=key(4);}
  ]){
    const p=proof();change(p);
    let calls=0;
    await assert.rejects(hashPinnedProgramSingleSnapshot({
      role:"jupiterV6",provenanceProof:p,rpcUrl:endpoint,
      expectedSha256:digest(payloads.jupiterV6),
      fetchImpl:async()=>{calls++;throw Error("should not fetch");}
    }));
    assert.equal(calls,0);
  }
});
test("malformed, partial and oversized full-account response cannot pass",async()=>{
  const cases=[
    ({data})=>{data.result.value.data=["not!base64","base64"];},
    ({data})=>{data.result.value.data=["", "base64"];},
    ({data})=>{data.result.value.owner=key(5);},
    ({data})=>{data.result.value.executable=true;},
    ({data})=>{data.result.value.space+=1;},
    ({data})=>{data.result.value.space=10*1024*1024+46;},
    ({data})=>{data.result.context.slot=119;},
    ({data})=>{data.id="wrong-id";},
    ({data})=>{data.error={code:-32000,message:"secret"};},
    ({data})=>{data.result.value=null;},
    ({options})=>{options.status=503;}
  ];
  for(const tamper of cases){
    const {fetchImpl}=makeProvider(tamper);
    await assert.rejects(hashPinnedProgramSingleSnapshot(args("jupiterV6",fetchImpl)));
  }
});
test("metadata mismatches to previously verified ProgramData are denied",async()=>{
  for(const tamper of [
    ({data})=>{const b=Buffer.from(data.result.value.data[0],"base64");b.writeBigUInt64LE(102n,4);data.result.value.data=[b.toString("base64"),"base64"];},
    ({data})=>{const b=Buffer.from(data.result.value.data[0],"base64");b[13]^=1;data.result.value.data=[b.toString("base64"),"base64"];},
    ({data})=>{const b=Buffer.from(data.result.value.data[0],"base64");b.writeUInt32LE(2,0);data.result.value.data=[b.toString("base64"),"base64"];}
  ]){
    const {fetchImpl}=makeProvider(tamper);
    await assert.rejects(hashPinnedProgramSingleSnapshot(args("jupiterV6",fetchImpl)));
  }
});
test("oversized declared content-length and credential-bearing fetch errors never leak",async()=>{
  const oversized=async()=>new Response("{}",{
    status:200,headers:{"content-length":"999999999"}
  });
  await assert.rejects(hashPinnedProgramSingleSnapshot(args("raydiumV4",oversized)));
  let error;
  try {
    await hashPinnedProgramSingleSnapshot(args("raydiumV4",
      async()=>{throw Error("RPC failure "+endpoint);}
    ));
  } catch(e){error=e;}
  assert.ok(error);
  assert.doesNotMatch(error.message,/SUPER_SECRET|rpc.example.org/);
});
test("second program failure cannot yield a misleading combined success",async()=>{
  const {requests,fetchImpl}=makeProvider(({role,data})=>{
    if(role==="raydiumV4")data.result.value.space++;
  });
  await assert.rejects(hashPinnedProgramsSingleSnapshots({
    provenanceProof:proof(),rpcUrl:endpoint,fetchImpl,
    expectedJupiterSha256:digest(payloads.jupiterV6),
    expectedRaydiumSha256:digest(payloads.raydiumV4)
  }));
  assert.equal(requests.length,2);
});
