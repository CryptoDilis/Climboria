import test from 'node:test';
import assert from 'node:assert/strict';
import {observeBoundaryBlocks,boundaryFailureCode} from './boundary-blocks.mjs';
import {CLIMB_SOLANA_MINT} from '../../token/climb-bridge/mint-inspect.mjs';
const A='https://a.invalid',B='https://b.invalid';
const headers=[
 {blockTime:1795765942,parentSlot:474473088,blockhash:'Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip',previousBlockhash:'8vzSTRse9S6ghJorV9aKXmCF3mFm8EcBbB4bLdFWUADB'},
 {blockTime:1795765943,parentSlot:474473089,blockhash:'HPh9zhR5mvsZv7nkoFEhjGM3i2U8jrcJ6KX7ifknxxqQ',previousBlockhash:'Pg3nSMoABAGRGxN7Jex97A3MgD98EhqZg4QpSbnYmip'}
];
const tx=(ch,keys=[],meta={err:null,preTokenBalances:[],postTokenBalances:[]})=>({transaction:{signatures:[ch.repeat(64)],message:{accountKeys:keys}},meta});
function mock(mutate=()=>{}){
 const calls=[];
 const fetchFn=async(url,options)=>{
  const q=JSON.parse(options.body);calls.push(q);
  let result=q.method==='getGenesisHash'?'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':{...headers[q.params[0]-474473089],transactions:[
   tx('A',[CLIMB_SOLANA_MINT]),
   tx('B',[],{err:{InstructionError:[0,'Custom']},preTokenBalances:[{mint:CLIMB_SOLANA_MINT}],postTokenBalances:[]}),
   tx('C',[],null),
   tx('D',[],{err:null,preTokenBalances:[],postTokenBalances:[],loadedAddresses:{writable:[CLIMB_SOLANA_MINT],readonly:[]}})
  ]};
  const x={jsonrpc:'2.0',id:q.id,result};mutate(x,q,url);return new Response(JSON.stringify(x),{status:200});
 };return {fetchFn,calls};
}
test('six pinned read-only calls; detect explicit, failed and loaded mint mentions without leaking signatures',async()=>{
 const {fetchFn,calls}=mock();const out=await observeBoundaryBlocks(A,B,{fetchFn});
 assert.equal(calls.length,6);assert.deepEqual(calls.map(q=>q.method),['getGenesisHash','getBlock','getBlock','getGenesisHash','getBlock','getBlock']);
 assert.deepEqual(calls[1].params,[474473089,{commitment:'finalized',encoding:'json',transactionDetails:'full',rewards:false,maxSupportedTransactionVersion:0}]);
 const block=out.blocks[0];assert.equal(block.transactionCount,4);assert.equal(block.missingMeta,1);assert.equal(block.missingTokenBalanceFields,1);assert.equal(block.failed,1);
 assert.deepEqual(block.mintMentionCandidates.map(x=>[x.index,x.outcome]),[[0,'SUCCESS'],[1,'FAILED'],[3,'SUCCESS']]);
 assert.match(block.transactionsSha256,/^[0-9a-f]{64}$/);assert(!JSON.stringify(out).includes('A'.repeat(64)));assert.equal(out.authorization,false);assert.equal(out.eligibility,'NOT_CERTIFIED');
});
test('reject incorrect header, duplicate tx, divergent data, malformed provider replies and rate limits',async()=>{
 for(const [mutate,code] of [
  [(x,q)=>{if(q.method==='getBlock')x.result.blockhash='wrong';},'A_getBlock_HEADER'],
  [(x,q)=>{if(q.method==='getBlock')x.result.transactions.push(x.result.transactions[0]);},'A_getBlock_TRANSACTION_SHAPE'],
  [(x,q,url)=>{if(q.method==='getBlock'&&url===B)x.result.transactions[0].extra='different';},'SOURCE_DISAGREEMENT'],
  [(x,q)=>{if(q.method==='getBlock')x.error={message:'SECRET'};},'A_getBlock_RPC_ERROR']
 ])await assert.rejects(observeBoundaryBlocks(A,B,{fetchFn:mock(mutate).fetchFn}),e=>boundaryFailureCode(e)===code&&!e.message.includes('SECRET'));
 const {fetchFn}=mock();await assert.rejects(observeBoundaryBlocks(A,B,{fetchFn:async(u,o)=>u===B?new Response('SECRET',{status:429}):fetchFn(u,o)}),e=>boundaryFailureCode(e)==='B_getGenesisHash_HTTP_429');
});

test('allowlisted historical block error classes never reveal provider text',async()=>{
 for(const [code,kind] of [[-32004,'RPC_HISTORY_UNAVAILABLE'],[-32015,'RPC_UNSUPPORTED_VERSION'],[-32602,'RPC_INVALID_PARAMS'],[-32601,'RPC_METHOD_UNAVAILABLE'],[-32005,'RPC_NODE_UNHEALTHY'],[429,'RPC_RATE_LIMIT'],['SECRET','RPC_ERROR']]){
  await assert.rejects(observeBoundaryBlocks(A,B,{fetchFn:mock((x,q,url)=>{if(q.method==='getBlock'&&url===B)x.error={code,message:'SECRET',data:'SECRET'};}).fetchFn}),e=>boundaryFailureCode(e)==='B_getBlock_'+kind&&!e.message.includes('SECRET'));
 }
});
