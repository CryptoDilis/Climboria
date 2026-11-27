import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHistoricalBracket,CANDIDATE_MS} from './historical-bracket.mjs';
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
   case 'getGenesisHash':result='5eykt4UsFv8P8NJdTREpY1vzqKZKvdpKuc147dw2N9d';break;
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
