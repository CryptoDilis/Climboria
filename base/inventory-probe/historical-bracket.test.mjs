import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHistoricalBracket,CANDIDATE_MS,bracketFailureCode} from './historical-bracket.mjs';
const A='https://a.invalid',B='https://b.invalid';
const lo=474168385,head=lo+200,target=Math.floor(CANDIDATE_MS/1000);
const present=s=>s!==lo+101;
const time=s=>target+s-lo-100;
const hash=s=>s%2===0?'A'.repeat(32):'B'.repeat(32);
function fixture(mutate=()=>{}){
 const calls=[];
 const fetchFn=async(url,opts)=>{
  const q=JSON.parse(opts.body);calls.push(q.method);
  const s=q.params[0];
  let result;
  switch(q.method){
   case 'getGenesisHash':result='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';break;
   case 'getSlot':result=head;break;
   case 'getBlockTime':result=time(s);break;
   case 'getBlocks':result=Array.from({length:q.params[1]-s+1},(_,i)=>s+i).filter(present);break;
   case 'getBlock':{const parentSlot=present(s-1)?s-1:s-2;result={blockTime:time(s),blockhash:hash(s),parentSlot,previousBlockhash:hash(parentSlot)};break;}
   default:throw Error('unexpected method');
  }
  const x={jsonrpc:'2.0',id:q.id,result};mutate(x,q,url);
  return new Response(JSON.stringify(x),{status:200});
 };return {calls,fetchFn};
}
test('two agreeing reported-time brackets across skipped slot, no eligibility',async()=>{
 const {calls,fetchFn}=fixture();const out=await observeHistoricalBracket(A,B,{fetchFn});
 assert.equal(out.before.slot,lo+100);assert.equal(out.after.slot,lo+102);
 assert.equal(out.authorization,false);assert.equal(out.eligibility,'NOT_CERTIFIED');assert.equal(out.providerIndependence,'NOT_VERIFIED');
 assert(calls.length<=128);assert(!calls.includes('getProgramAccounts'));
});
test('fail closed on provider disagreement, broken ancestry and RPC errors without leaks',async()=>{
 for(const mutate of [
  (x,q,url)=>{if(q.method==='getBlock'&&url===B)x.result.blockhash='C'.repeat(32);},
  (x,q)=>{if(q.method==='getBlock')x.result.previousBlockhash='C'.repeat(32);},
  (x,q)=>{if(q.method==='getBlockTime')x.error={message:'SECRET'};},
  (x,q)=>{if(q.method==='getBlocks')x.result=[];}
 ])await assert.rejects(observeHistoricalBracket(A,B,{fetchFn:fixture(mutate).fetchFn}),e=>e.message.includes('NO_GO')&&!e.message.includes('SECRET'));
});

test('fixed diagnostic distinguishes provider, history access and invalid block time',async()=>{
 const cases=[
  [(x,q,url)=>{if(q.method==='getBlockTime'&&url===B)x.error={code:-32004,message:'SECRET'};},'B_getBlockTime_RPC_HISTORY_UNAVAILABLE'],
  [(x,q,url)=>{if(q.method==='getBlockTime'&&url===A)x.result=null;},'A_BLOCK_TIME'],
  [(x,q,url)=>{if(q.method==='getBlock'&&url===B)x.result.blockhash='C'.repeat(32);},'B_PARENT_LINK'],
  [(x,q)=>{if(q.method==='getBlocks')x.result=[];},'A_EMPTY_WINDOW']
 ];
 for(const [mutate,code] of cases)await assert.rejects(observeHistoricalBracket(A,B,{fetchFn:fixture(mutate).fetchFn}),e=>bracketFailureCode(e)===code&&!e.message.includes('SECRET'));
 const {fetchFn}=fixture();
 await assert.rejects(observeHistoricalBracket(A,B,{fetchFn:async(url,opts)=>url===B?new Response('SECRET',{status:429}):fetchFn(url,opts)}),e=>bracketFailureCode(e)==='B_getGenesisHash_HTTP_429');
 assert.equal(bracketFailureCode({code:'A_BLOCK_TIME'}),'UNCLASSIFIED');
 assert.equal(bracketFailureCode(Error('SECRET')),'UNCLASSIFIED');
});

test('reject the previous mistyped genesis pin, accept the existing mainnet reference',async()=>{
 const {fetchFn}=fixture();
 assert.equal((await observeHistoricalBracket(A,B,{fetchFn})).authorization,false);
 for(const [target,code] of [[A,'A_GENESIS'],[B,'B_GENESIS']]){
  await assert.rejects(observeHistoricalBracket(A,B,{fetchFn:fixture((x,q,url)=>{if(q.method==='getGenesisHash'&&url===target)x.result='5eykt4UsFv8P8NJdTREpY1vzqKZKvdpKuc147dw2N9d';}).fetchFn}),e=>bracketFailureCode(e)===code);
 }
});
