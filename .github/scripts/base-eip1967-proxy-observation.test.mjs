import test from "node:test";
import assert from "node:assert/strict";
import {
 EIP1967_SLOTS,decodeEip1967AddressWord,observeEip1967AtBaseBlock,
 compareEip1967Snapshots,corroborateBaseProxyControl
} from "../../dex/base-execution/eip1967-proxy-observation.mjs";

const token="0x"+"a".repeat(40),implementation="0x"+"b".repeat(40),admin="0x"+"c".repeat(40),beacon="0x"+"d".repeat(40);
const hash="0x"+"e".repeat(64),block="0x3b39f57",EMPTY="0x"+"0".repeat(64);
const ref=Object.freeze({token,block,hash});
const word=address=>"0x"+"0".repeat(24)+address.slice(2);
const snapshot=Object.freeze({
 chainId:8453,token,block,hash,
 implementation,admin,beacon:null,implementationCodeSha256:"1".repeat(64),beaconCodeSha256:null
});
test("canonical EIP-1967 slots are exact distinct 32-byte hex words",()=>{
 assert.equal(EIP1967_SLOTS.implementation,"0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");
 assert.equal(EIP1967_SLOTS.admin,"0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103");
 assert.equal(EIP1967_SLOTS.beacon,"0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50");
 assert.equal(new Set(Object.values(EIP1967_SLOTS)).size,3);
});
test("slot decoder accepts empty and canonical addresses, rejects packing, missing or dirty words",()=>{
 assert.equal(decodeEip1967AddressWord(EMPTY),null);
 assert.equal(decodeEip1967AddressWord(word(implementation).toUpperCase().replace("0X","0x")),implementation);
 for(const x of [undefined,null,{},[],true,"0x","0x"+"a".repeat(62),word(implementation)+"00","0x"+"g".repeat(64),
  "0x"+"1".repeat(64),"0x"+"0".repeat(23)+"1"+implementation.slice(2)])
  assert.throws(()=>decodeEip1967AddressWord(x),String(x));
});
test("matching proxy slot observations are risk only and never greenlight wallet signing",()=>{
 const x=compareEip1967Snapshots(snapshot,{...snapshot},ref);
 assert.equal(x.readOnly,true);assert.equal(x.executable,false);assert.equal(x.executionReady,false);
 assert.equal(x.providerIndependenceVerified,false);assert.equal(x.sourceBinaryParityVerified,false);
 assert.equal(x.transferSemanticsVerified,false);
 assert.equal(x.implementation,implementation);
 assert.equal(x.admin,admin);
 assert.ok(x.warnings.includes("ADMIN_SLOT_NONZERO_PRIVILEGED_CONTROL_REVIEW_REQUIRED"));
 assert.ok(x.warnings.includes("IMPLEMENTATION_SLOT_NONZERO_UPGRADEABILITY_REVIEW_REQUIRED"));
 assert.equal(Object.isFrozen(x),true);assert.equal(Object.isFrozen(x.warnings),true);
 assert.equal("transaction" in x,false);assert.equal("approval" in x,false);
});
test("no standard slot is UNKNOWN, not evidence token is non-upgradeable or safe",()=>{
 const x=compareEip1967Snapshots({...snapshot,implementation:null,admin:null,implementationCodeSha256:null},
  {...snapshot,implementation:null,admin:null,implementationCodeSha256:null},ref);
 assert.ok(x.warnings.includes("NO_EIP1967_IMPLEMENTATION_DETECTED_OTHER_PROXY_PATTERNS_UNCHECKED"));
 assert.equal(x.executionReady,false);
});
test("beacon plus implementation creates explicit conflict warning",()=>{
 const observed={...snapshot,beacon,beaconCodeSha256:"2".repeat(64)};
 const x=compareEip1967Snapshots(observed,{...observed},ref);
 assert.ok(x.warnings.includes("BEACON_SLOT_NONZERO_UPGRADEABILITY_REVIEW_REQUIRED"));
 assert.ok(x.warnings.includes("CONFLICTING_IMPLEMENTATION_AND_BEACON_SLOTS"));
});
test("strictly reject any cross-RPC slot, runtime, chain or block mismatch",()=>{
 for(const [key,value] of [
  ["implementation",null],["admin",null],["beacon",beacon],
  ["implementationCodeSha256","f".repeat(64)],["beaconCodeSha256","1".repeat(64)],
  ["chainId",1],["token",admin],["hash","0x"+"f".repeat(64)],["block","0x3b39f58"]
 ]){
  assert.throws(()=>compareEip1967Snapshots(snapshot,{...snapshot,[key]:value},ref),key);
 }
 for(const [key,value] of [
  ["implementation","0x"+"0".repeat(40)],["admin","0x"+"F".repeat(40)],
  ["implementationCodeSha256",null],
  ["beaconCodeSha256","0".repeat(64)]
 ])assert.throws(()=>compareEip1967Snapshots({...snapshot,[key]:value},snapshot,ref),key);
});
function fakeRpc({code="0x6001600055",slots={
 implementation:word(implementation),admin:word(admin),beacon:EMPTY
},badHash=false,chain="0x2105",failMethod=null}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  assert.equal(url,"https://mainnet.base.org");
  assert.equal(options.method,"POST");assert.equal(options.redirect,"error");assert.equal(options.credentials,"omit");
  const req=JSON.parse(options.body);calls.push(req);
  if(req.method===failMethod)return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,error:{code:-32000}}));
  let result;
  switch(req.method){
   case "eth_chainId":result=chain;break;
   case "eth_getBlockByNumber":
    assert.deepEqual(req.params,[block,false]);
    result={number:block,hash:badHash?"0x"+"f".repeat(64):hash};break;
   case "eth_getStorageAt":
    assert.equal(req.params[0],token);
    assert.deepEqual(req.params[2],{blockHash:hash,requireCanonical:true});
    result=slots[Object.entries(EIP1967_SLOTS).find(([,v])=>v===req.params[1])?.[0]];
    break;
   case "eth_getCode":
    assert.equal(req.params[0],implementation);
    assert.deepEqual(req.params[1],{blockHash:hash,requireCanonical:true});
    result=code;break;
   default: throw Error("Unexpected method "+req.method);
  }
  return new Response(JSON.stringify({jsonrpc:"2.0",id:req.id,result}),{headers:{"content-type":"application/json"}});
 };
 return {calls,fetchImpl};
}
test("actual probe RPC requests use canonical EIP-1898 hash for all storage/implementation reads",async()=>{
 const x=fakeRpc();const result=await observeEip1967AtBaseBlock(ref,{fetchImpl:x.fetchImpl});
 assert.equal(result.token,token);assert.equal(result.implementation,implementation);
 assert.equal(result.admin,admin);assert.equal(result.beacon,null);
 assert.match(result.implementationCodeSha256,/^[0-9a-f]{64}$/);
 assert.equal(result.beaconCodeSha256,null);
 assert.deepEqual(x.calls.map(v=>v.method),[
  "eth_chainId","eth_getBlockByNumber","eth_getStorageAt","eth_getStorageAt",
  "eth_getStorageAt","eth_getCode","eth_chainId","eth_getBlockByNumber"]);
 assert.equal(x.calls.every(v=>!["eth_sendTransaction","eth_sign","personal_sign","eth_sendRawTransaction"].includes(v.method)),true);
});
test("proxy probe rejects malformed slot words, missing implementation runtime, wrong chain and reorg without fallback",async()=>{
 for(const opts of [
  {slots:{implementation:"0x123",admin:EMPTY,beacon:EMPTY}},
  {slots:{implementation:"0x"+"f".repeat(64),admin:EMPTY,beacon:EMPTY}},
  {code:"0x"},{badHash:true},{chain:"0x1"},{failMethod:"eth_getStorageAt"}
 ]){
  const f=fakeRpc(opts);
  await assert.rejects(observeEip1967AtBaseBlock(ref,{fetchImpl:f.fetchImpl}));
  assert.ok(f.calls.length>0);
  assert.ok(!f.calls.some(v=>v.method==="eth_sendTransaction"));
 }
});
test("orchestrator requires two distinct public RPC roots before any network and compares same hash",async()=>{
 for(const host of [undefined,"https://mainnet.base.org","http://example.org","https://127.0.0.1"]){
  let used=0;
  await assert.rejects(corroborateBaseProxyControl({},{
   secondaryRpcUrl:host,allowanceImpl:async()=>{used++;return {};}
  }));
  assert.equal(used,0);
 }
 const visits=[];
 const sampleAllowance={chainId:8453,executable:false,observationOnly:true,matchedAcrossDistinctRpcHosts:true,
  providerIndependenceVerified:false,sellToken:token,observedBlock:block,observedBlockHash:hash};
 const allowed=await corroborateBaseProxyControl({},{
  secondaryRpcUrl:"https://base-rpc.publicnode.com",
  allowanceImpl:async()=>sampleAllowance,
  probeImpl:async(reference,{rpcUrl})=>{
   assert.deepEqual(reference,ref);visits.push(rpcUrl);return snapshot;
  }
 });
 assert.deepEqual(visits,["https://mainnet.base.org","https://base-rpc.publicnode.com"]);
 assert.equal(allowed.twoHostsAgreed,true);assert.equal(allowed.executionReady,false);
});
test("orchestrator does not proceed without validated dual allowance evidence",async()=>{
 for(const changed of [
  {providerIndependenceVerified:true},{executable:true},{matchedAcrossDistinctRpcHosts:false},
  {observedBlockHash:"0x123"},{sellToken:"bad"},{chainId:1}
 ]){
  let probes=0;
  await assert.rejects(corroborateBaseProxyControl({},{
   secondaryRpcUrl:"https://base-rpc.publicnode.com",
   allowanceImpl:async()=>({chainId:8453,executable:false,observationOnly:true,
    matchedAcrossDistinctRpcHosts:true,providerIndependenceVerified:false,
    sellToken:token,observedBlock:block,observedBlockHash:hash,...changed}),
   probeImpl:async()=>{probes++;return snapshot;}
  }));
  assert.equal(probes,0);
 }
});
