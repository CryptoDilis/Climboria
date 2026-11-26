import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {estimateV3} from './estimate-creation.mjs';
const source='a'.repeat(40),payer='0x'+'b'.repeat(40);
const artifact={bytecode:{object:'0x6000'},abi:[{type:'constructor',inputs:['address','address','uint256','address[5]'].map(type=>({type}))}]};
const manifest={sourceSha:source,chainId:84532,status:'TEST_ONLY_BUILD_TEMPLATE_NO_DEPLOYMENT',contracts:[{name:'ClimbV3IntegratedTestToken',creationBytes:2,creationSha256:createHash('sha256').update(Buffer.from('6000','hex')).digest('hex')}]};
const block={number:'0x10',timestamp:'0x100',gasLimit:'0x1c9c380',hash:'0x'+'c'.repeat(64)};
function mock(overrides={}){
 const calls=[];
 return {calls,fetchFn:async(url,opts)=>{
  assert.equal(url,'https://sepolia.base.org');
  const {method,params}=JSON.parse(opts.body);calls.push({method,params});
  const defaults={eth_chainId:'0x14a34',eth_getBlockByNumber:block,eth_getBalance:'0x100000000000000',eth_getCode:'0x',eth_gasPrice:'0x10',eth_estimateGas:'0x100000'};
  assert.ok(Object.hasOwn(defaults,method));
  const value=overrides[method]??defaults[method],result=typeof value==='function'?value(params):value;
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 }};
}
test('binds synthetic constructor and reports L2-only estimate',async()=>{
 const m=mock(),v=await estimateV3(artifact,manifest,source,payer,m.fetchFn);
 assert.equal(v.status,'SYNTHETIC_ROLES_ESTIMATE_ONLY_NO_DEPLOYMENT');
 assert.equal(v.executionGas,'1048576');assert.equal(v.illustrativeL2FeeWei,'16777216');
 assert.equal(v.syntheticRoles.start,'605056');assert.equal(new Set([v.syntheticRoles.founder,v.syntheticRoles.distributor,...v.syntheticRoles.signers]).size,7);
 const tx=m.calls.find(x=>x.method==='eth_estimateGas').params;
 assert.equal(tx[0].data.length,2+4+512);assert.equal(tx[0].value,'0x0');assert.equal(tx[1],block.number);
 assert.equal(Object.hasOwn(v,'data'),false);
});
test('reject wrong chain before estimate',async()=>{const m=mock({eth_chainId:'0x2105'});await assert.rejects(estimateV3(artifact,manifest,source,payer,m.fetchFn));assert.equal(m.calls.length,1);});
test('reject mismatched source and artifact digest without network',async()=>{const m=mock();await assert.rejects(estimateV3(artifact,manifest,'b'.repeat(40),payer,m.fetchFn));await assert.rejects(estimateV3({...artifact,bytecode:{object:'0x6001'}},manifest,source,payer,m.fetchFn));assert.equal(m.calls.length,0);});
test('reject contract or delegated payer',async()=>{const m=mock({eth_getCode:'0xef0100'});await assert.rejects(estimateV3(artifact,manifest,source,payer,m.fetchFn));assert.ok(!m.calls.some(x=>x.method==='eth_estimateGas'));});
test('reject changing block hash',async()=>{const m=mock({eth_getBlockByNumber:p=>p[0]==='latest'?block:{...block,hash:'0x'+'d'.repeat(64)}});await assert.rejects(estimateV3(artifact,manifest,source,payer,m.fetchFn));});
test('flag insufficient balance without declaring authorization',async()=>{const m=mock({eth_getBalance:'0x0'});const v=await estimateV3(artifact,manifest,source,payer,m.fetchFn);assert.equal(v.coversIllustrativeL2Fee,false);});

test('diagnose EIP-7702 delegation without relaxing payer restriction',async()=>{
 const m=mock({eth_getCode:'0xef0100'+'a'.repeat(40)});
 await assert.rejects(estimateV3(artifact,manifest,source,payer,m.fetchFn),{code:'PAYER_DELEGATED_EIP7702'});
 assert.ok(!m.calls.some(x=>x.method==='eth_estimateGas'));
});
test('diagnose ordinary contract code separately',async()=>{
 const m=mock({eth_getCode:'0x6000'});
 await assert.rejects(estimateV3(artifact,manifest,source,payer,m.fetchFn),{code:'PAYER_CODE_NOT_EMPTY'});
});
test('diagnose RPC response failure without exposing provider details',async()=>{
 const m=mock();const fetchFn=async(url,opts)=>{
  if(JSON.parse(opts.body).method==='eth_estimateGas')return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,error:{code:-32000,message:'private upstream details'}})};
  return m.fetchFn(url,opts);
 };
 await assert.rejects(estimateV3(artifact,manifest,source,payer,fetchFn),{code:'RPC_RESPONSE_eth_estimateGas'});
});
test('diagnose RPC transport failure with fixed label',async()=>{
 await assert.rejects(estimateV3(artifact,manifest,source,payer,async()=>{throw new Error('private upstream details');}),{code:'RPC_TRANSPORT_eth_chainId'});
});
