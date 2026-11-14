import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58 } from "../src/transaction-validation.mjs";
import {
  canonicalExpectedGenesisHash, verifyExpectedRpcGenesis, verifyOperatorRpcGenesisSet
} from "../src/raydium-v4-rpc-genesis-preflight.mjs";
import { safeRaydiumOperatorError } from "../tools/raydium-v4-safe-error.mjs";

const GENESIS = encodeBase58(Uint8Array.from({length:32},(_,i)=>i+1));
const WRONG = encodeBase58(Uint8Array.from({length:32},(_,i)=>i+2));
const endpoint = "https://rpc-one.example/rpc?api-key=SECRET_1";
const second = "https://rpc-two.example/rpc?api-key=SECRET_2";
function makeResponse(value, {status=200, id="climboria-raydium-rpc-genesis-preflight", jsonrpc="2.0", error}={}) {
  return new Response(JSON.stringify({jsonrpc,id,...(error?{error}:{result:value})}),{
    status,headers:{"content-type":"application/json"}
  });
}
test("operator must supply canonical 32-byte expected genesis hash", () => {
  assert.equal(canonicalExpectedGenesisHash(GENESIS),GENESIS);
  for(const value of ["", "not-base58!", "11111111111111111111", null, "  "+GENESIS])
    assert.throws(()=>canonicalExpectedGenesisHash(value),/preflight failed/);
});
test("matching pinned genesis supports read-only public evidence only",async()=>{
  const calls=[];
  const result=await verifyExpectedRpcGenesis({
    rpcUrl:endpoint,expectedGenesisHash:GENESIS,
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      return makeResponse(GENESIS);
    }
  });
  assert.equal(calls.length,1);
  assert.equal(JSON.parse(calls[0].options.body).method,"getGenesisHash");
  assert.equal(calls[0].options.redirect,"error");
  assert.equal(result.genesisHash,GENESIS);
  assert.equal(result.matchesOperatorExpectedGenesis,true);
  assert.equal(result.independentlyAuditedRpcSource,false);
  assert.equal(result.approvedForJupiterCpi,false);
  assert.doesNotMatch(JSON.stringify(result),/SECRET_1|rpc-one/);
});
test("wrong network, corrupt RPC protocol, non-200, missing result all fail closed",async()=>{
 const options=[
  makeResponse(WRONG),makeResponse(null),makeResponse(GENESIS,{id:"wrong"}),
  makeResponse(GENESIS,{jsonrpc:"1.0"}),makeResponse(GENESIS,{status:503}),
  makeResponse(null,{error:{code:-32000,message:"not ready"}})
 ];
 for(const response of options){
   await assert.rejects(verifyExpectedRpcGenesis({
     rpcUrl:endpoint,expectedGenesisHash:GENESIS,fetchImpl:async()=>response
   }),/preflight failed/);
 }
});
test("malformed JSON or network errors do not leak private RPC credentials",async()=>{
 for(const fetchImpl of [
   async()=>new Response("not-json",{status:200}),
   async()=>{throw new Error("secret https://rpc-one.example/?api-key=SECRET_1");}
 ]){
   let error;
   try{await verifyExpectedRpcGenesis({rpcUrl:endpoint,expectedGenesisHash:GENESIS,fetchImpl});}
   catch(e){error=e;}
   assert.ok(error);
   assert.doesNotMatch(error.message,/SECRET_1|rpc-one|api-key/);
 }
});
test("both operator RPC endpoints must return externally specified genesis hash",async()=>{
 const visited=[];
 const result=await verifyOperatorRpcGenesisSet({
   primaryRpcUrl:endpoint,secondaryRpcUrl:second,expectedGenesisHash:GENESIS,
   fetchImpl:async(url)=>{visited.push(url);return makeResponse(GENESIS);}
 });
 assert.equal(visited.length,2);
 assert.equal(result.witnessedRpcCount,2);
 assert.equal(result.approvedForJupiterCpi,false);
 assert.doesNotMatch(JSON.stringify(result),/SECRET_1|SECRET_2/);
});
test("second provider mismatch prevents any successful dual-source report",async()=>{
 let calls=0;
 await assert.rejects(verifyOperatorRpcGenesisSet({
   primaryRpcUrl:endpoint,secondaryRpcUrl:second,expectedGenesisHash:GENESIS,
   fetchImpl:async()=>{calls++;return makeResponse(calls===1?GENESIS:WRONG);}
 }),/preflight failed/);
 assert.equal(calls,2);
});
test("same provider hostname or private RPC cannot be presented as dual witnesses",async()=>{
 for(const secondaryRpcUrl of ["https://rpc-one.example/other?key=other",
   "https://127.0.0.1/rpc"]){
   let calls=0;
   await assert.rejects(verifyOperatorRpcGenesisSet({
     primaryRpcUrl:endpoint,secondaryRpcUrl,expectedGenesisHash:GENESIS,
     fetchImpl:async()=>{calls++;return makeResponse(GENESIS);}
   }));
   assert.equal(calls,0);
 }
});
test("missing expected genesis env diagnostic cannot reveal credentials",()=>{
 const text=safeRaydiumOperatorError(new Error(
   "CLIMBORIA_SOLANA_EXPECTED_GENESIS_HASH must be configured in the operator environment"));
 assert.match(text,/EXPECTED_GENESIS_HASH/);
 assert.doesNotMatch(safeRaydiumOperatorError(new Error("RPC "+endpoint)),/SECRET_1/);
});
