// Offline CI cross-check: actual Forge artifact and locally executed constructor,
// with mock RPC envelopes only. No network, credentials, signing or broadcast.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expectedRuntime,verifyCreatedBaseToken} from './verify-created-token.mjs';
import {TESTNET} from '../ntt-testnet-core.mjs';

assert.equal(process.argv.length,6);
const [artifactPath,runtimePath,binderPath,commit]=process.argv.slice(2);
const artifact=JSON.parse(readFileSync(artifactPath,'utf8'));
const runtime=readFileSync(runtimePath,'utf8').trim().toLowerCase();
const binder=readFileSync(binderPath,'utf8').trim().toLowerCase();
assert.match(runtime,/^0x(?:[0-9a-f]{2})+$/);
assert.match(binder,/^0x[0-9a-f]{40}$/);
assert.equal('0x'+expectedRuntime(artifact,binder).toString('hex'),runtime);
const token='0x'+'23'.repeat(20),tx='0x'+'34'.repeat(32),blockHash='0x'+'45'.repeat(32),finalHash='0x'+'56'.repeat(32);
const word=n=>'0x'+n.toString(16).padStart(64,'0');
const names=['decimals()','totalSupply()','binder()','manager()','TEST_CAP()'];
const values=[word(6n),word(0n),'0x'+'0'.repeat(24)+binder.slice(2),word(0n),word(1000000000n)];
const bySelector=new Map(names.map((name,i)=>['0x'+artifact.methodIdentifiers[name],values[i]]));
assert.equal(bySelector.size,5);
const calls=[];
const mock=async(url,options)=>{
 assert.equal(url,TESTNET.base.rpc);
 const {method,params}=JSON.parse(options.body);
 calls.push(method);
 const response={
  eth_chainId:TESTNET.base.chainId,
  eth_getTransactionReceipt:{status:'0x1',transactionHash:tx,contractAddress:token,from:binder,to:null,blockHash,blockNumber:'0x100'},
  eth_getTransactionByHash:{hash:tx,from:binder,to:null,blockHash,blockNumber:'0x100',value:'0x0',input:artifact.bytecode.object.toLowerCase()},
  eth_getCode:runtime,
  eth_getBlockByNumber:params[0]==='0x100'?{number:'0x100',hash:blockHash}:{number:'0x101',hash:finalHash},
  eth_call:bySelector.get(params[0]?.data)
 }[method];
 assert.notEqual(response,undefined);
 return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:response})};
};
const result=await verifyCreatedBaseToken(artifact,commit,token,binder,tx,mock);
assert.equal(result.runtimeMatchesBinderPatchedCompilerOutput,true);
assert.equal(result.bridgeRelease,'NO_GO');
assert.equal(calls.filter(x=>x==='eth_call').length,5);
assert.throws(()=>expectedRuntime(artifact,'0x'+'0'.repeat(40)),/NO_GO/);
assert.notEqual('0x'+expectedRuntime(artifact,'0x'+'ab'.repeat(20)).toString('hex'),runtime);
console.log(JSON.stringify({assessment:'LOCAL_COMPILER_RUNTIME_VERIFIER_MATCH',sourceCommit:commit,runtimeBytes:(runtime.length-2)/2,runtimeSha256:result.runtimeSha256,immutableGroups:Object.keys(artifact.deployedBytecode.immutableReferences).length,immutableLocations:Object.values(artifact.deployedBytecode.immutableReferences)[0].length,verifiedMockGetters:5,bridgeRelease:'NO_GO'},null,2));
