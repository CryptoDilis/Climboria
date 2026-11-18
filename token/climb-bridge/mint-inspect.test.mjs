import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectMintReply, compareFinalizedMintReplies, assertDistinctRpcEndpoints,
  fetchFinalizedMint, inspectIndependentMints, CLIMB_SOLANA_MINT, SPL_TOKEN_PROGRAM
} from './mint-inspect.mjs';

const ADMIN = '11111111111111111111111111111111';
const mockReply = (overrides = {}) => ({
  context:{slot:471014649},
  value:{owner:SPL_TOKEN_PROGRAM,data:{program:'spl-token',parsed:{type:'mint',info:{
    supply:'1000000000000000',decimals:6,isInitialized:true,mintAuthority:null,freezeAuthority:null
  }}}},...overrides
});
function withInfo(changes) {
  const reply=mockReply();
  Object.assign(reply.value.data.parsed.info, changes);
  return reply;
}

test('canonical CLIMB mint is constant, not taken from user inputs', () => {
  assert.equal(CLIMB_SOLANA_MINT,'9eSDKvWPwLV3h94aacf1C8EBgftw1A69U4X88Sktpump');
});
test('correct finalized SPL account reports immutable authorities as observed, never bridge-ready',()=>{
  const out=compareFinalizedMintReplies(mockReply(), mockReply({context:{slot:471014700}}));
  assert.equal(out.assessment,'DUAL_RPC_FIELDS_MATCH_READ_ONLY');
  assert.equal(out.bridgeRelease,'NO_GO');
  assert.equal(out.supplyUi,'1000000000.000000');
  assert.equal(out.bothReportMintAuthorityRevoked,true);
  assert.equal(out.bothReportFreezeAuthorityRevoked,true);
});
test('present mint and freeze authorities remain visible instead of being assumed revoked',()=>{
  const r=withInfo({mintAuthority:ADMIN,freezeAuthority:ADMIN});
  const out=compareFinalizedMintReplies(r,r);
  assert.equal(out.bothReportMintAuthorityRevoked,false);
  assert.equal(out.bothReportFreezeAuthorityRevoked,false);
  assert.equal(out.mintAuthority,ADMIN);
});
test('reject unexpected Token-2022 or non-token owner',()=>{
  assert.throws(()=>inspectMintReply(mockReply({value:{...mockReply().value,owner:ADMIN}})),/NO_GO/);
  const r=mockReply();r.value.data.program='spl-token-2022';
  assert.throws(()=>inspectMintReply(r),/NO_GO/);
});
test('reject non-mint, wrong decimals and uninitialized account',()=>{
  const r=mockReply();r.value.data.parsed.type='account';
  assert.throws(()=>inspectMintReply(r),/NO_GO/);
  assert.throws(()=>inspectMintReply(withInfo({decimals:9})),/NO_GO/);
  assert.throws(()=>inspectMintReply(withInfo({isInitialized:false})),/NO_GO/);
});
test('reject absent authority fields rather than assuming null',()=>{
  const r=mockReply();delete r.value.data.parsed.info.mintAuthority;
  assert.throws(()=>inspectMintReply(r),/NO_GO/);
});
test('reject corrupted authority values',()=>{
  assert.throws(()=>inspectMintReply(withInfo({freezeAuthority:'not a pubkey'})),/NO_GO/);
});
test('reject invalid or nonfinalized context slot and decimal supply formats',()=>{
  assert.throws(()=>inspectMintReply(mockReply({context:{slot:0}})),/NO_GO/);
  assert.throws(()=>inspectMintReply(withInfo({supply:'1e15'})),/unsigned decimal/);
});
test('reject conflicting supply, mint authority or freeze authority across RPCs',()=>{
  assert.throws(()=>compareFinalizedMintReplies(mockReply(),withInfo({supply:'1000000000000001'})),/disagree on supplyRaw/);
  assert.throws(()=>compareFinalizedMintReplies(mockReply(),withInfo({mintAuthority:ADMIN})),/disagree on mintAuthority/);
  assert.throws(()=>compareFinalizedMintReplies(mockReply(),withInfo({freezeAuthority:ADMIN})),/disagree on freezeAuthority/);
});
test('reject stale finalized slot disagreement',()=>{
  assert.throws(()=>compareFinalizedMintReplies(mockReply(),mockReply({context:{slot:471030000}})),/slot freshness/);
});
test('RPC endpoint validation rejects same host and insecure transport',()=>{
  assert.equal(assertDistinctRpcEndpoints('https://rpc-a.example/rpc','https://rpc-b.example/rpc'),true);
  assert.throws(()=>assertDistinctRpcEndpoints('https://rpc-a.example/a','https://rpc-a.example/b'),/different RPC/);
  assert.throws(()=>assertDistinctRpcEndpoints('http://rpc-a.example','https://rpc-b.example'),/HTTPS/);
  assert.throws(()=>assertDistinctRpcEndpoints('https://u:p@rpc-a.example','https://rpc-b.example'),/HTTPS/);
});
test('RPC request is read-only finalized getAccountInfo of canonical mint and prevents redirect',async()=>{
  let calls=0;
  const fakeFetch=async (url, opts)=>{
    calls++;
    const body=JSON.parse(opts.body);
    assert.equal(opts.method,'POST');
    assert.equal(opts.redirect,'error');
    assert.equal(body.method,'getAccountInfo');
    assert.equal(body.params[0],CLIMB_SOLANA_MINT);
    assert.equal(body.params[1].commitment,'finalized');
    return {ok:true,json:async()=>({jsonrpc:'2.0',result:mockReply()})};
  };
  assert.equal((await fetchFinalizedMint('https://rpc-a.example',fakeFetch)).context.slot,471014649);
  assert.equal(calls,1);
});
test('dual RPC performs both read-only inspections without network access in tests',async()=>{
  let calls=0;
  const fakeFetch=async (_url,_opts)=>{calls++;return {ok:true,json:async()=>({result:mockReply()})};};
  const out=await inspectIndependentMints('https://first.example','https://second.example',fakeFetch);
  assert.equal(calls,2);
  assert.equal(out.bridgeRelease,'NO_GO');
});
test('HTTP/RPC errors fail closed',async()=>{
  await assert.rejects(fetchFinalizedMint('https://first.example',async()=>({ok:false})),/NO_GO/);
  await assert.rejects(fetchFinalizedMint('https://first.example',async()=>({ok:true,json:async()=>({error:{code:429,message:'rate limit'}})})),/NO_GO/);
});
