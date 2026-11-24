import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {TESTNET,inspectTestnetCorePresence,inspectTestnetImplementations,IMPLEMENTATION_SLOT} from './ntt-testnet-core.mjs';
function fixture(overrides={}){
 const calls=[];
 const fetchFn=async(url,opts)=>{
  const {method,params}=JSON.parse(opts.body);calls.push({url,method,params});
  assert.equal(opts.redirect,'error');
  assert([TESTNET.solana.rpc,TESTNET.base.rpc].includes(url));
  const result=({getGenesisHash:TESTNET.solana.genesis,eth_chainId:TESTNET.base.chainId,getSlot:1000,eth_getBlockByNumber:{number:'0x123',hash:'0x'+'a'.repeat(64)},getAccountInfo:{context:{slot:1001},value:{executable:true,owner:'BPFLoaderUpgradeab1e11111111111111111111111',data:['AQID','base64']}},eth_getCode:'0x6001',...overrides})[method];
  assert.notEqual(result,undefined);
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
 return {calls,fetchFn};
}
test('pinned testnet identities, finalized core presence and NO_GO only',async()=>{
 const f=fixture(),r=await inspectTestnetCorePresence(f.fetchFn);
 assert.equal(r.bridgeRelease,'NO_GO');assert.equal(r.base.chainId,84532);assert.equal(r.base.wormholeChainId,10004);
 assert.equal(r.solana.slot,1001);assert.equal(f.calls.length,6);
 assert.deepEqual(f.calls.find(x=>x.method==='eth_getCode').params,[TESTNET.base.core,'0x123']);
 assert.deepEqual(f.calls.find(x=>x.method==='getAccountInfo').params,[TESTNET.solana.core,{encoding:'base64',commitment:'finalized',minContextSlot:1000}]);
});
test('wrong network, missing code or stale/nonexecutable core fail closed',async()=>{
 for(const override of [{eth_chainId:'0x2105'},{getGenesisHash:'wrong'},{eth_getCode:'0x'},{getAccountInfo:{context:{slot:999},value:{executable:true}}},{getAccountInfo:{context:{slot:1001},value:{executable:false}}}]){
  await assert.rejects(inspectTestnetCorePresence(fixture(override).fetchFn),/NO_GO/);
 }
});

function implementationFixture({badWord=false,badPair=false,badBlock=false,badElf=false}={}){
 const loader='BPFLoaderUpgradeab1e11111111111111111111111';
 const header=Buffer.alloc(36);header.writeUInt32LE(2);header.fill(7,4);
 const data=Buffer.alloc(53);data.writeUInt32LE(3);data.writeBigUInt64LE(900n,4);data[12]=1;data.fill(8,13,45);Buffer.from([0x7f,0x45,0x4c,0x46]).copy(data,45);if(badElf)data[45]=0;
 const account=(b,executable)=>({owner:loader,executable,data:[b.toString('base64'),'base64']});
 const report={assessment:'PUBLIC_TESTNET_CORE_PRESENCE_ONLY',bridgeRelease:'NO_GO',solana:{slot:1000,accountDataSha256:createHash('sha256').update(header).digest('hex')},base:{finalizedBlock:'0x123',blockHash:'0x'+'a'.repeat(64)}};
 const calls=[];
 const fetchFn=async(url,opts)=>{
  const {method,params}=JSON.parse(opts.body);calls.push({url,method,params});
  let result;
  if(method==='getAccountInfo')result={context:{slot:1001},value:account(header,true)};
  if(method==='getMultipleAccounts')result={context:{slot:1002},value:[account(badPair?Buffer.alloc(36):header,true),account(data,false)]};
  if(method==='eth_getStorageAt')result=badWord?'0x'+'0'.repeat(64):'0x'+'0'.repeat(24)+'1'.repeat(40);
  if(method==='eth_getCode')result='0x6002';
  if(method==='eth_getBlockByNumber')result={number:'0x123',hash:badBlock?'0x'+'b'.repeat(64):report.base.blockHash};
  assert.notEqual(result,undefined);return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
 return {report,fetchFn,calls};
}
test('linked ProgramData and EIP-1967 implementation evidence remains NO_GO',async()=>{
 const f=implementationFixture(),r=await inspectTestnetImplementations(f.report,f.fetchFn);
 assert.equal(r.solana.deploymentSlot,'900');assert.equal(r.solana.allocatedImageBytes,8);
 assert.equal(r.solana.programDataPdaIndependentlyVerified,false);
 assert.equal(r.base.reportedImplementation,'0x'+'1'.repeat(40));
 assert.equal(r.sourceBinaryParityVerified,false);assert.equal(r.bridgeRelease,'NO_GO');
 assert.deepEqual(f.calls.find(x=>x.method==='eth_getStorageAt').params,[TESTNET.base.core,IMPLEMENTATION_SLOT,'0x123']);
 assert.equal(f.calls.find(x=>x.method==='getMultipleAccounts').params[1].minContextSlot,1001);
});
test('missing implementation, mismatched ProgramData link, changed block and non-ELF payload fail',async()=>{
 for(const options of [{badWord:true},{badPair:true},{badBlock:true},{badElf:true}]){
  const f=implementationFixture(options);await assert.rejects(inspectTestnetImplementations(f.report,f.fetchFn),/NO_GO/);
 }
});
