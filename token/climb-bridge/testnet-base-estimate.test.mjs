import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {estimateTestTokenCreation} from './testnet-base/estimate-creation.mjs';
import {TESTNET} from './ntt-testnet-core.mjs';
const payer='0x'+'1'.repeat(40),hash='0x'+'a'.repeat(64);
const report={assessment:'UNSIGNED_TESTNET_CONTRACT_CREATION_ONLY',bridgeRelease:'NO_GO',chainId:84532,creationBytes:2,creationSha256:createHash('sha256').update(Buffer.from('6000','hex')).digest('hex'),unsigned:{chainId:84532,to:null,value:'0x0',data:'0x6000'}};
function mock(overrides={}){
 const calls=[];
 const fetchFn=async(url,o)=>{
  assert.equal(url,TESTNET.base.rpc);assert.equal(o.redirect,'error');
  const {method,params}=JSON.parse(o.body);calls.push({method,params});
  const result=({eth_chainId:TESTNET.base.chainId,eth_getBlockByNumber:{number:'0x123',hash,gasLimit:'0x1000000'},eth_getBalance:'0x100000',eth_getCode:'0x',eth_gasPrice:'0x2',eth_estimateGas:'0x10000',...overrides})[method];
  assert.notEqual(result,undefined);return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };return {calls,fetchFn};
}
test('creation estimate pins observed block and exact unsigned bytecode; no broadcast',async()=>{
 const f=mock(),r=await estimateTestTokenCreation(report,payer,f.fetchFn);
 assert.equal(r.illustrativeL2ExecutionFeeWei,'131072');assert.equal(r.coversIllustrativeL2ExecutionFee,true);assert.equal(r.bridgeRelease,'NO_GO');
 assert.deepEqual(f.calls.find(x=>x.method==='eth_estimateGas').params,[{from:payer,value:'0x0',data:'0x6000'},'0x123']);
});
test('wrong chain, corrupted bytecode, contract payer and invalid estimate fail closed',async()=>{
 const f=mock();await assert.rejects(estimateTestTokenCreation({...report,creationSha256:'bad'},payer,f.fetchFn),/NO_GO/);assert.equal(f.calls.length,0);
 for(const o of [{eth_chainId:'0x2105'},{eth_getCode:'0x6000'},{eth_estimateGas:'0x0'},{eth_gasPrice:'0x0'}])await assert.rejects(estimateTestTokenCreation(report,payer,mock(o).fetchFn),/NO_GO/);
});
