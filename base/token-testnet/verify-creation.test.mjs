import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCreation,safeCreationError} from './verify-creation.mjs';
const sigs=['INITIAL_TEST_SUPPLY()','allowance(address,address)','approve(address,uint256)','balanceOf(address)','burn(uint256)','decimals()','decreaseAllowance(address,uint256)','increaseAllowance(address,uint256)','name()','symbol()','totalBurned()','totalSupply()','transfer(address,uint256)','transferFrom(address,address,uint256)'];
const artifact=()=>({abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'},...sigs.map(s=>{const [name,a]=s.slice(0,-1).split('(');return {type:'function',name,inputs:a?a.split(',').map(type=>({type})):[]};})],methodIdentifiers:Object.fromEntries(sigs.map((s,i)=>[s,(i+1).toString(16).padStart(8,'0')])),bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001'}});
const payer='0x'+'1'.repeat(40),token='0x'+'2'.repeat(40),tx='0x'+'3'.repeat(64),blockHash='0x'+'4'.repeat(64),block={number:'0x10',hash:blockHash},final={number:'0x20',hash:'0x'+'5'.repeat(64)};
const word=n=>'0x'+n.toString(16).padStart(64,'0');
function mock(change=()=>{}){
 const a=artifact(),r={status:'0x1',transactionHash:tx,contractAddress:token,from:payer,to:null,blockHash,blockNumber:block.number,logs:[{address:token,removed:false,transactionHash:tx,blockHash,blockNumber:block.number,topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',word(0n),'0x'+'0'.repeat(24)+payer.slice(2)],data:word(1000000000n)}]},t={hash:tx,from:payer,to:null,blockHash,blockNumber:block.number,value:'0x0',input:'0x6000'};
 const values={eth_chainId:'0x14a34',eth_getTransactionReceipt:r,eth_getTransactionByHash:t,eth_getBlockByNumber:p=>p[0]==='finalized'||p[0]===final.number?final:block,eth_getCode:'0x6001',eth_call:p=>{const data=p[0].data.slice(2,10),sig=sigs.find(s=>a.methodIdentifiers[s]===data);return word(sig==='decimals()'?6n:sig==='totalBurned()'?0n:1000000000n);}};
 change(values,r,t);
 return {a,fetch:async(url,opts)=>{assert.equal(url,'https://sepolia.base.org');const q=JSON.parse(opts.body);assert.ok(Object.hasOwn(values,q.method));const v=values[q.method];return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:typeof v==='function'?v(q.params):v})};}};
}
const run=m=>verifyCreation(m.a,'fixture','a'.repeat(40),payer,token,tx,m.fetch);
test('exact creation, mint event, runtime and historical getters match',async()=>{const r=await run(mock());assert.equal(r.status,'TEST_ONLY_FINALIZED_CREATION_OBSERVATION_NO_GO');assert.equal(r.endOfDeploymentBlockSupplyRaw,'1000000000');});
test('wrong chain, failed receipt or unfinalized block rejected',async()=>{for(const f of [v=>v.eth_chainId='0x2105',(v,r)=>r.status='0x0',(v,r)=>r.blockNumber='0x21'])await assert.rejects(run(mock(f)),/NO_GO/);});
test('wrong creation input, runtime or mint event rejected',async()=>{for(const f of [(v,r,t)=>t.input='0x6002',v=>v.eth_getCode='0x6002',(v,r)=>r.logs[0].data=word(1n)])await assert.rejects(run(mock(f)),/NO_GO/);});
test('unexpected state or canonical block disagreement rejected',async()=>{for(const f of [v=>v.eth_call=()=>word(1n),v=>v.eth_getBlockByNumber=p=>p[0]==='finalized'?final:{...block,hash:'0x'+'6'.repeat(64)}])await assert.rejects(run(mock(f)),/NO_GO/);});

test('safe diagnostics distinguish pending finality from mismatched receipt',async()=>{await assert.rejects(run(mock((v,r)=>r.blockNumber='0x21')),e=>safeCreationError(e)==='NO_GO: NOT_FINALIZED');await assert.rejects(run(mock((v,r)=>r.status='0x0')),e=>safeCreationError(e)==='NO_GO: RECEIPT_MISMATCH');});
test('safe diagnostics distinguish runtime mismatch and hide provider errors',async()=>{await assert.rejects(run(mock(v=>v.eth_getCode='0x6002')),e=>safeCreationError(e)==='NO_GO: RUNTIME_MISMATCH');const m=mock();m.fetch=async()=>{throw new Error('untrusted provider detail');};await assert.rejects(run(m),e=>safeCreationError(e)==='NO_GO: RPC_UNAVAILABLE');assert.equal(safeCreationError(new Error('untrusted detail')),'NO_GO: test-only creation verification failed (details redacted)');});
