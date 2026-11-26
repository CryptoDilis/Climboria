import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBurn,safeBurnError} from './verify-burn.mjs';
const sigs=['INITIAL_TEST_SUPPLY()','allowance(address,address)','approve(address,uint256)','balanceOf(address)','burn(uint256)','decimals()','decreaseAllowance(address,uint256)','increaseAllowance(address,uint256)','name()','symbol()','totalBurned()','totalSupply()','transfer(address,uint256)','transferFrom(address,address,uint256)'];
const artifact=()=>({abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'},...sigs.map(s=>{const [name,a]=s.slice(0,-1).split('(');return {type:'function',name,inputs:a?a.split(',').map(type=>({type})):[]};})],methodIdentifiers:Object.fromEntries(sigs.map((s,i)=>[s,s==='burn(uint256)'?'42966c68':(i+1).toString(16).padStart(8,'0')])),bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001'}});
const payer='0x'+'1'.repeat(40),token='0x'+'2'.repeat(40),creation='0x'+'3'.repeat(64),burn='0x'+'4'.repeat(64);
const word=n=>'0x'+n.toString(16).padStart(64,'0'),topic='0x'+'0'.repeat(24)+payer.slice(2),transfer='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const block=(number,hex,parentHash)=>({number,hash:'0x'+hex.repeat(64),parentHash});
function mock(change=()=>{}){
 const a=artifact(),created=block('0x10','5'),pre=block('0x11','6'),post=block('0x12','7',pre.hash),final=block('0x20','8');
 const receipt=(tx,b,from,to,ca,topics,amount)=>({status:'0x1',transactionHash:tx,contractAddress:ca,from,to,blockNumber:b.number,blockHash:b.hash,logs:[{address:token,removed:false,transactionHash:tx,blockHash:b.hash,blockNumber:b.number,topics,data:word(amount)}]});
 const c=receipt(creation,created,payer,null,token,[transfer,word(0n),topic],1000000000n),r=receipt(burn,post,payer,token,null,[transfer,topic,word(0n)],10000000n);
 const t={hash:burn,from:payer,to:token,blockNumber:post.number,blockHash:post.hash,value:'0x0',input:'0x42966c68'+word(10000000n).slice(2)};
 const values={eth_chainId:'0x14a34',eth_getTransactionReceipt:p=>p[0]===creation?c:r,eth_getTransactionByHash:p=>p[0]===creation?{hash:creation,from:payer,to:null,blockNumber:created.number,blockHash:created.hash,value:'0x0',input:'0x6000'}:t,eth_getBlockByNumber:p=>p[0]==='finalized'?final:[created,pre,post,final].find(x=>x.number===p[0]),eth_getCode:'0x6001',eth_call:p=>{const sig=sigs.find(s=>a.methodIdentifiers[s]===p[0].data.slice(2,10)),after=p[1]===post.number;return word(sig==='decimals()'?6n:sig==='INITIAL_TEST_SUPPLY()'?1000000000n:sig==='totalBurned()'?(after?10000000n:0n):(after?990000000n:1000000000n));}};
 change(values,r,t,post);
 return {a,fetch:async(url,opts)=>{assert.equal(url,'https://sepolia.base.org');const q=JSON.parse(opts.body);assert.ok(Object.hasOwn(values,q.method));const v=values[q.method];return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result:typeof v==='function'?v(q.params):v})};}};
}
const run=m=>verifyBurn(m.a,'fixture','a'.repeat(40),payer,token,creation,burn,m.fetch);
test('finalized burn event and supply delta match',async()=>{const r=await run(mock());assert.equal(r.beforeSupplyRaw,'1000000000');assert.equal(r.afterSupplyRaw,'990000000');assert.equal(r.afterBurnedRaw,'10000000');});
test('reject different calldata or event amount',async()=>{for(const f of [(v,r,t)=>t.input='0x42966c68'+word(1n).slice(2),(v,r)=>r.logs[0].data=word(1n)])await assert.rejects(run(mock(f)),/NO_GO: BURN_/);});
test('reject unfinalized receipt and wrong parent',async()=>{await assert.rejects(run(mock((v,r)=>r.blockNumber='0x21')),e=>safeBurnError(e)==='NO_GO: BURN_NOT_FINALIZED');await assert.rejects(run(mock((v,r,t,p)=>p.parentHash='0x'+'9'.repeat(64))),/BURN_BLOCK_MISMATCH/);});
test('reject supply not reduced and changed runtime',async()=>{await assert.rejects(run(mock(v=>{const old=v.eth_call;v.eth_call=p=>p[1]==='0x12'?word(1000000000n):old(p);})),/BURN_STATE_MISMATCH/);await assert.rejects(run(mock(v=>v.eth_getCode=p=>p[1]==='0x12'?'0x6002':'0x6001')),/BURN_RUNTIME_MISMATCH/);});
