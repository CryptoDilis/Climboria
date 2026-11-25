import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedRuntime,verifyCreatedBaseToken} from './testnet-base/verify-created-token.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
const binder='0x'+'1'.repeat(40),token='0x'+'2'.repeat(40),tx='0x'+'3'.repeat(64),blockHash='0x'+'4'.repeat(64),finalHash='0x'+'5'.repeat(64),commit='a'.repeat(40);
const methods=['decimals()','totalSupply()','binder()','manager()','TEST_CAP()'];
const fixture=()=>({bytecode:{object:'0x6000'},deployedBytecode:{object:'0x60'+'00'.repeat(32)+'01',immutableReferences:{'1':[{start:1,length:32}]}},methodIdentifiers:Object.fromEntries(methods.map((n,i)=>[n,(i+1).toString(16).padStart(8,'0')]))});
const word=n=>'0x'+n.toString(16).padStart(64,'0');
function mock(overrides={}){
 const a=fixture(),calls=[];
 return {a,calls,fetchFn:async(url,o)=>{
  assert.equal(url,TESTNET.base.rpc);assert.equal(o.redirect,'error');
  const {method,params}=JSON.parse(o.body);calls.push({method,params});
  const val={eth_chainId:TESTNET.base.chainId,eth_getTransactionReceipt:{status:'0x1',transactionHash:tx,contractAddress:token,from:binder,to:null,blockHash,blockNumber:'0x100'},eth_getTransactionByHash:{hash:tx,from:binder,to:null,blockHash,blockNumber:'0x100',value:'0x0',input:'0x6000'},eth_getCode:'0x'+expectedRuntime(a,binder).toString('hex'),eth_getBlockByNumber:params[0]==='0x100'?{number:'0x100',hash:blockHash}:{number:'0x101',hash:finalHash},eth_call:[word(6n),word(0n),'0x'+'0'.repeat(24)+binder.slice(2),word(0n),word(1000000000n)][parseInt(params[0]?.data?.slice(2)||'0',16)-1],...overrides}[method];
  assert.notEqual(val,undefined);return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:val})};
 }};
}
test('exact creation, immutable binder patch, zero supply and unbound manager at finalized block',async()=>{
 const f=mock(),r=await verifyCreatedBaseToken(f.a,commit,token,binder,tx,f.fetchFn);
 assert.equal(r.runtimeMatchesBinderPatchedCompilerOutput,true);assert.equal(r.manager,null);assert.equal(r.bridgeRelease,'NO_GO');
 assert.equal(f.calls.filter(c=>c.method==='eth_call').length,5);
 assert.ok(f.calls.filter(c=>c.method==='eth_call').every(c=>c.params[1]==='0x101'));
});
test('reject wrong network, runtime mismatch, nonzero supply/incorrect getter and unfinalized creation',async()=>{
 for(const o of [{eth_chainId:'0x2105'},{eth_getCode:'0x6000'},{eth_call:word(1n)},{eth_getTransactionReceipt:{status:'0x1',transactionHash:tx,contractAddress:token,from:binder,to:null,blockHash,blockNumber:'0x102'}}]){
  const f=mock(o);await assert.rejects(verifyCreatedBaseToken(f.a,commit,token,binder,tx,f.fetchFn),/NO_GO/);
 }
});
test('immutable references must be a single nonoverlapping 32 byte zero-placeholder group',()=>{
 const a=fixture();a.deployedBytecode.immutableReferences['2']=[{start:1,length:32}];assert.throws(()=>expectedRuntime(a,binder),/NO_GO/);
 const b=fixture();b.deployedBytecode.immutableReferences['1'].push({start:1,length:32});assert.throws(()=>expectedRuntime(b,binder),/NO_GO/);
 const c=fixture();c.deployedBytecode.immutableReferences['1'][0].start=0;assert.throws(()=>expectedRuntime(c,binder),/NO_GO/);
});
