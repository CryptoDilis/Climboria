import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { PROGRAMS, LOADER, parseProgramDataAddress, parseProgramDataAccount, runProvenanceCheck } from "./launchlab-provenance.mjs";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encode58(input) {
  const bytes=[...input]; let zeros=0; while(zeros<bytes.length&&bytes[zeros]===0)zeros++;
  const digits=[0];
  for(const byte of bytes){let carry=byte;for(let i=0;i<digits.length;i++){carry+=digits[i]<<8;digits[i]=carry%58;carry=Math.floor(carry/58);}while(carry){digits.push(carry%58);carry=Math.floor(carry/58);}}
  while(digits.length>1&&digits.at(-1)===0)digits.pop();
  return "1".repeat(zeros)+digits.reverse().map(d=>B58[d]).join("");
}
function accountData(bytes) { return { owner: LOADER, data: [Buffer.from(bytes).toString("base64"), "base64"] }; }
function programAccount(programDataBytes) {
  const data=Buffer.alloc(36); data.writeUInt32LE(2,0); Buffer.from(programDataBytes).copy(data,4);
  return { ...accountData(data), executable:true, lamports:1000 };
}
function programDataAccount(authorityBytes, slot=123456n, payload=Buffer.alloc(0)) {
  const headerLength = authorityBytes ? 45 : 13;
  const data=Buffer.alloc(headerLength + payload.length); data.writeUInt32LE(3,0); data.writeBigUInt64LE(slot,4);
  if(authorityBytes){data[12]=1;Buffer.from(authorityBytes).copy(data,13);} else data[12]=0;
  Buffer.from(payload).copy(data,headerLength);
  return accountData(data);
}
test("published program identifiers are stable and cluster-specific", () => {
  assert.notEqual(PROGRAMS.mainnet.launchpad, PROGRAMS.devnet.launchpad);
  assert.equal(Object.keys(PROGRAMS.mainnet).length, 3);
  assert.equal(Object.keys(PROGRAMS.devnet).length, 3);
});
test("decodes Program -> ProgramData address and ProgramData upgrade authority", () => {
  const pda=Uint8Array.from({length:32},(_,i)=>i+1);
  const authority=Uint8Array.from({length:32},(_,i)=>255-i);
  const address=parseProgramDataAddress(programAccount(pda));
  assert.equal(address,encode58(pda));
  const parsed=parseProgramDataAccount(programDataAccount(authority,987654321n));
  assert.equal(parsed.slot,987654321);
  assert.equal(parsed.upgradeAuthority,encode58(authority));
  assert.equal(parsed.immutable,false);
});
test("fingerprints deployed ProgramData payload bytes after the optional authority header", () => {
  const authority = Uint8Array.from({length:32},(_,i)=>i+33);
  const payload = Buffer.from([1,2,3,4,5,6]);
  const parsed = parseProgramDataAccount(programDataAccount(authority, 123n, payload));
  assert.equal(parsed.programDataPayloadLength, payload.length);
  assert.equal(parsed.programDataPayloadSha256, createHash("sha256").update(payload).digest("hex"));
});
test("recognizes immutable ProgramData accounts", () => {
  const parsed=parseProgramDataAccount(programDataAccount(null,42n));
  assert.equal(parsed.slot,42);
  assert.equal(parsed.upgradeAuthority,null);
  assert.equal(parsed.immutable,true);
});
test("rejects malformed loader layouts and owner mismatches", () => {
  assert.throws(()=>parseProgramDataAddress({owner:LOADER,data:[Buffer.alloc(8).toString("base64"),"base64"]}),/layout/);
  assert.throws(()=>parseProgramDataAccount({owner:"11111111111111111111111111111111",data:[Buffer.alloc(45).toString("base64"),"base64"]}),/Upgradeable Loader/);
});
test("live verifier reads ProgramData accounts and reports authority metadata", async () => {
  const pda=Uint8Array.from({length:32},(_,i)=>i+1), authority=Uint8Array.from({length:32},(_,i)=>i+33);
  const pdaAddress=encode58(pda);
  const fetchMock=async(url,init={})=>{
    if(init.method!=="POST") return new Response(JSON.stringify({success:true,data:{}}));
    const body=JSON.parse(init.body), address=body.params[0];
    const cluster=url.includes("devnet")?"devnet":"mainnet";
    assert.equal(body.method,"getAccountInfo"); assert.equal(body.params[1].commitment,"finalized");
    let value;
    if(Object.values(PROGRAMS[cluster]).includes(address)) value={...programAccount(pda),lamports:1000};
    else { assert.equal(address,pdaAddress); value=programDataAccount(authority); }
    return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{value}}));
  };
  const report=await runProvenanceCheck(fetchMock);
  assert.equal(report.readOnly,true); assert.equal(report.transactionSubmitted,false); assert.equal(report.pass,true);
  for(const result of report.results) for(const program of Object.values(result.programs)) {
    assert.equal(program.programData.upgradeAuthority,encode58(authority));
    assert.equal(program.programData.immutable,false);
  }
});
test("missing program accounts fail the provenance gate", async()=>{
  const fetchMock=async(url,init={})=>init.method==="POST"
    ?new Response(JSON.stringify({jsonrpc:"2.0",id:"x",result:{value:null}}))
    :new Response(JSON.stringify({success:true}));
  const report=await runProvenanceCheck(fetchMock);
  assert.equal(report.pass,false);
  assert.equal(report.results.every(x=>x.blockers.length===3),true);
});
test("API and RPC failures are surfaced as blockers", async()=>{
  const fetchMock=async()=>new Response("unavailable",{status:503});
  const report=await runProvenanceCheck(fetchMock);
  assert.equal(report.pass,false); assert.match(report.results[0].blockers[0],/HTTP 503/);
});
