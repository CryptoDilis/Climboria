import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decodeBase58, encodeBase58 } from "../src/transaction-validation.mjs";
import { UPGRADEABLE_BPF_LOADER } from "../src/upgradeable-program-provenance.mjs";
import { JUPITER_V6_PROGRAM_ID } from "../src/jupiter-v6-policy.mjs";
import { RAYDIUM_V4_PROGRAM_IDS } from "../src/raydium-v4-direct-evidence.mjs";
import { hashPinnedProgramsJointFinalizedSnapshot } from "../src/upgradeable-program-joint-snapshot-digest.mjs";

const key = n => encodeBase58(new Uint8Array(32).fill(n));
const pda = {
  jupiterV6: "4Ec7ZxZS6Sbdg5UGSLHbAnM7GQHp2eFd4KYWRexAipQT",
  raydiumV4: "A7ZG7ByDi8DpzT9Ab7CiXhvgYTJQmaDPJkMDoPitaCQV"
};
const rpcUrl = "https://operator.example/rpc?token=SECRET_NEVER_PRINT";
const payload = {
  jupiterV6: Buffer.from(Array.from({length:66011}, (_,i)=>i%251)),
  raydiumV4: Buffer.from(Array.from({length:50003}, (_,i)=>i%239))
};
const sha = data => createHash("sha256").update(data).digest("hex");
function image(role) {
  const header=Buffer.alloc(45);
  header.writeUInt32LE(3,0);
  header.writeBigUInt64LE(100n,4);
  if (role==="jupiterV6") {
    header[12]=1;
    header.set(decodeBase58(key(9)),13);
  }
  return Buffer.concat([header,payload[role]]);
}
function proof() {
  return {
    network:"mainnet-beta", finalizedSlot:120,
    approvedForJupiterCpi:false,programDataPdaIndependentlyVerified:true,
    programs:{
      jupiterV6:{
        programId:JUPITER_V6_PROGRAM_ID,programDataAddress:pda.jupiterV6,
        programDataPdaBump:254,programDataPdaIndependentlyVerified:true,
        loaderMetadataVerified:true,deployedProgramBytecodeVerified:false,
        lastDeploySlot:100,upgradeAuthority:key(9)
      },
      raydiumV4:{
        programId:RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"],
        programDataAddress:pda.raydiumV4,programDataPdaBump:255,
        programDataPdaIndependentlyVerified:true,loaderMetadataVerified:true,
        deployedProgramBytecodeVerified:false,lastDeploySlot:100,upgradeAuthority:null
      }
    }
  };
}
function provider(tamper) {
  const requests=[];
  const fetchImpl=async(url,opts)=>{
    const request=JSON.parse(opts.body);
    requests.push({url,opts,request});
    const data={
      jsonrpc:"2.0",id:request.id,
      result:{context:{slot:137},value:["jupiterV6","raydiumV4"].map(role=>{
        const raw=image(role);
        return {owner:UPGRADEABLE_BPF_LOADER,executable:false,
          space:raw.length,data:[raw.toString("base64"),"base64"]};
      })}
    };
    const options={status:200,headers:{"content-type":"application/json"}};
    tamper?.({data,options,request,requests});
    return new Response(JSON.stringify(data),options);
  };
  return {fetchImpl,requests};
}
const args=(fetchImpl,overrides={})=>({
  provenanceProof:proof(),rpcUrl,fetchImpl,
  expectedJupiterSha256:sha(payload.jupiterV6),
  expectedRaydiumSha256:sha(payload.raydiumV4),...overrides
});

test("both full ProgramData payloads use exactly ONE genuine finalized getMultipleAccounts response",async()=>{
  const {fetchImpl,requests}=provider();
  const result=await hashPinnedProgramsJointFinalizedSnapshot(args(fetchImpl));
  assert.equal(requests.length,1,"no extra network requests");
  const {request,opts}=requests[0];
  assert.equal(request.method,"getMultipleAccounts");
  assert.deepEqual(request.params[0],[pda.jupiterV6,pda.raydiumV4]);
  assert.equal(request.params[1].commitment,"finalized");
  assert.equal(request.params[1].encoding,"base64");
  assert.equal(request.params[1].minContextSlot,120);
  assert.equal(Object.hasOwn(request.params[1],"dataSlice"),false);
  assert.equal(opts.redirect,"error");
  assert.equal(result.finalizedContextSlot,137);
  assert.equal(result.programs.jupiterV6.sha256,sha(payload.jupiterV6));
  assert.equal(result.programs.raydiumV4.sha256,sha(payload.raydiumV4));
  assert.equal(result.programs.jupiterV6.firstFinalizedSlot,137);
  assert.equal(result.programs.raydiumV4.lastFinalizedSlot,137);
  assert.equal(result.bothProgramImagesInOneFinalizedRpcResponse,true);
  assert.equal(result.providerReportedSameFinalizedContextForBothPrograms,true);
  for(const flag of ["independentlyAuthenticatedLedgerSnapshot",
    "independentlyTrustedRpc","independentlyAuditedReferenceDigests",
    "sourceCodeParityVerified","jupiterCpiAccountMappingVerified","approvedForJupiterCpi"]) {
    assert.equal(result[flag],false,flag);
  }
  assert.doesNotMatch(JSON.stringify(result),/SECRET_NEVER_PRINT|operator.example/);
});
test("both independently supplied digests validated before network I/O",async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;throw Error("should not be reached");};
  await assert.rejects(hashPinnedProgramsJointFinalizedSnapshot(
    args(fetchImpl,{expectedRaydiumSha256:"bad-hash"})
  ),/operator expected SHA-256/);
  assert.equal(calls,0);
});
test("forged ProgramData public key or bump fails BEFORE any RPC",async()=>{
  for(const mutate of [
    p=>{p.programs.jupiterV6.programDataAddress=key(7);},
    p=>{p.programs.raydiumV4.programDataPdaBump=254;},
    p=>{p.programDataPdaIndependentlyVerified=false;},
    p=>{p.programs.jupiterV6.loaderMetadataVerified=false;},
    p=>{p.programs.raydiumV4.programId=key(4);}
  ]) {
    const altered=proof();mutate(altered);
    let calls=0;
    await assert.rejects(hashPinnedProgramsJointFinalizedSnapshot(args(
      async()=>{calls++;throw Error("unexpected network access");},
      {provenanceProof:altered}
    )));
    assert.equal(calls,0);
  }
});
test("wrong first or second deployed payload SHA256 denies combined evidence",async()=>{
  for(const role of ["jupiterV6","raydiumV4"]){
    const {fetchImpl,requests}=provider();
    const overrides=role==="jupiterV6"
      ? {expectedJupiterSha256:"0".repeat(64)}
      : {expectedRaydiumSha256:"0".repeat(64)};
    await assert.rejects(hashPinnedProgramsJointFinalizedSnapshot(args(fetchImpl,overrides)),
      /does not match independently pinned SHA-256/);
    assert.equal(requests.length,1);
  }
});
test("malformed account or altered authority in either image is refused",async()=>{
  for(const index of [0,1]){
    const mutators=[
      a=>{a.owner=key(8);},
      a=>{a.executable=true;},
      a=>{a.space++;},
      a=>{a.data=["***","base64"];},
      a=>{a.data=["","base64"];},
      a=>{const raw=Buffer.from(a.data[0],"base64");raw.writeBigUInt64LE(103n,4);a.data=[raw.toString("base64"),"base64"];}
    ];
    for(const mutate of mutators){
      const {fetchImpl}=provider(({data})=>mutate(data.result.value[index]));
      await assert.rejects(hashPinnedProgramsJointFinalizedSnapshot(args(fetchImpl)));
    }
  }
});
test("wrong joint response ID/slot/count, partial missing account and HTTP error fail closed",async()=>{
  for(const mutate of [
    ({data})=>{data.id="wrong-request-id";},
    ({data})=>{data.result.context.slot=119;},
    ({data})=>{data.result.value.pop();},
    ({data})=>{data.result.value[1]=null;},
    ({data})=>{data.error={code:-32000,message:"sensitive"};},
    ({options})=>{options.status=503;},
    ({options})=>{options.headers["content-length"]="999999999";}
  ]){
    const {fetchImpl}=provider(mutate);
    await assert.rejects(hashPinnedProgramsJointFinalizedSnapshot(args(fetchImpl)),
      /Read-only joint ProgramData snapshot invalid or unavailable|Read-only full ProgramData snapshot invalid or unavailable/);
  }
});
test("transport exceptions, including sensitive URLs, are sanitized in errors",async()=>{
  let caught;
  try{
    await hashPinnedProgramsJointFinalizedSnapshot(args(
      async()=>{throw new Error("internal https://operator.example/?token=SECRET_NEVER_PRINT");}
    ));
  }catch(e){caught=e;}
  assert.ok(caught);
  assert.doesNotMatch(caught.message,/SECRET_NEVER_PRINT|operator.example/);
});
