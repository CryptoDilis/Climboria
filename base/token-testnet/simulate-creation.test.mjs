import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCreation} from './simulate-creation.mjs';
const sigs=['INITIAL_TEST_SUPPLY()','allowance(address,address)','approve(address,uint256)','balanceOf(address)','burn(uint256)','decimals()','decreaseAllowance(address,uint256)','increaseAllowance(address,uint256)','name()','symbol()','totalBurned()','totalSupply()','transfer(address,uint256)','transferFrom(address,address,uint256)'];
const artifact=()=>({abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'},...sigs.map(s=>{const [name,a]=s.slice(0,-1).split('(');return {type:'function',name,inputs:a?a.split(',').map(type=>({type})):[]};})],bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001'}});
const payer='0x'+'1'.repeat(40),block={number:'0x10',hash:'0x'+'2'.repeat(64),gasLimit:'0x100000'};
function mock(overrides={}){
 const calls=[];const values={eth_chainId:'0x14a34',eth_getBlockByNumber:block,eth_getBalance:'0x100000',eth_getCode:'0x',eth_gasPrice:'0x2',eth_estimateGas:'0x100',...overrides};
 return {calls,fetch:async(url,opts)=>{assert.equal(url,'https://sepolia.base.org');const q=JSON.parse(opts.body);calls.push(q);assert.ok(Object.hasOwn(values,q.method));const v=values[q.method];return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:typeof v==='function'?v(q.params):v})};}};
}
const run=(m,a=artifact(),p=payer)=>simulateCreation(a,'fixture','a'.repeat(40),p,m.fetch);
test('simulation uses exact creation bytes and pinned block, no broadcast',async()=>{const m=mock();const r=await run(m);assert.equal(r.illustrativeL2FeeWei,'512');assert.equal(r.status,'TEST_ONLY_CREATION_ESTIMATE_NO_GO');assert.deepEqual(m.calls.find(c=>c.method==='eth_estimateGas').params,[{from:payer,data:'0x6000',value:'0x0'},'0x10']);});
test('reject wrong chain before estimate',async()=>{const m=mock({eth_chainId:'0x2105'});await assert.rejects(run(m),/NO_GO/);assert.equal(m.calls.length,1);});
test('reject invalid artifact and zero payer before RPC',async()=>{const m=mock(),a=artifact();a.bytecode.object='0x';await assert.rejects(run(m,a),/NO_GO/);await assert.rejects(run(m,artifact(),'0x'+'0'.repeat(40)),/NO_GO/);assert.equal(m.calls.length,0);});
test('reject code-bearing payer, invalid gas and block reorg',async()=>{for(const changes of [{eth_getCode:'0x01'},{eth_estimateGas:'0x0'},{eth_estimateGas:'0x100001'},{eth_getBlockByNumber:p=>p[0]==='latest'?block:{...block,hash:'0x'+'3'.repeat(64)}}])await assert.rejects(run(mock(changes)),/NO_GO/);});
test('insufficient balance reported rather than called funded',async()=>{const r=await run(mock({eth_getBalance:'0x1'}));assert.equal(r.coversIllustrativeL2Fee,false);});
