import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectFreshIndependentMints, sampleFinalizedMint, validateMintFreshness,compareFreshSamples
} from './mint-freshness.mjs';
import {CLIMB_SOLANA_MINT,SPL_TOKEN_PROGRAM} from './mint-inspect.mjs';

const GENESIS='11111111111111111111111111111111'; // MOCK GENESIS, NOT Solana mainnet proof
const genesisB='22222222222222222222222222222222'; // synthetic
const MINT_SLOT=471014700;
const HEAD_SLOT=471014750;
function mintReply(slot=MINT_SLOT,info={}){
 return {context:{slot},value:{
   owner:SPL_TOKEN_PROGRAM,
   data:{program:'spl-token',parsed:{type:'mint',info:{
     supply:'1000000000000000',decimals:6,isInitialized:true,
     mintAuthority:null,freezeAuthority:null,...info
   }}}
 }};
}
function fixture(options={}){
 const calls=[];
 const mockFetch=async(url,opts)=>{
   const input=JSON.parse(opts.body);calls.push({url,method:input.method,params:input.params,opts});
   const isB=url.includes('rpc-b');
   let result;
   if(input.method==='getSlot') result = isB?(options.headB ?? HEAD_SLOT+5):(options.headA ?? HEAD_SLOT);
   else if(input.method==='getGenesisHash') result=isB?(options.genesisB ?? GENESIS):(options.genesisA ?? GENESIS);
   else if(input.method==='getAccountInfo') result=isB?(options.replyB ?? mintReply(MINT_SLOT+5)):(options.replyA ?? mintReply());
   else throw new Error('unexpected mock method');
   if(options.failMethod===input.method) return {ok:false};
   return {ok:true,json:async()=>({result})};
 };
 return {mockFetch,calls};
}
const A='https://rpc-a.example/api-key-hidden';
const B='https://rpc-b.example/api-key-hidden';

test('fresh dual-RPC evidence is sanitized and still NO_GO for funds',async()=>{
  const {mockFetch,calls}=fixture();
  const result=await inspectFreshIndependentMints(A,B,mockFetch,()=> '2026-11-19T00:00:00.000Z');
  assert.equal(result.assessment,'DUAL_RPC_FIELDS_MATCH_READ_ONLY');
  assert.equal(result.bridgeRelease,'NO_GO');
  assert.equal(result.providerIdentity,'UNVERIFIED_OPERATOR_INDEPENDENCE');
  assert.equal(result.checkedAtUtc,'2026-11-19T00:00:00.000Z');
  assert.deepEqual(result.finalizedHeads,[HEAD_SLOT,HEAD_SLOT+5]);
  assert.equal(result.supplyRaw,'1000000000000000');
  assert.equal(result.bothReportMintAuthorityRevoked,true);
  assert.equal(calls.length,6);
  assert.deepEqual(calls.map(x=>x.method).sort(),[
    'getAccountInfo','getAccountInfo','getGenesisHash','getGenesisHash','getSlot','getSlot'
  ]);
  const accountCalls=calls.filter(x=>x.method==='getAccountInfo');
  for(const c of accountCalls){
    assert.equal(c.params[0],CLIMB_SOLANA_MINT);
    assert.equal(c.params[1].commitment,'finalized');
    assert.equal(c.params[1].minContextSlot,c.url===A?HEAD_SLOT-128:HEAD_SLOT+5-128);
    assert.equal(c.opts.redirect,'error');
  }
  assert(!JSON.stringify(result).includes('api-key-hidden'));
});
test('reject stale finalized mint context even with matching supply and authorities',async()=>{
  const {mockFetch}=fixture({replyA:mintReply(HEAD_SLOT-129)});
  await assert.rejects(inspectFreshIndependentMints(A,B,mockFetch),/stale mint context/);
});
test('reject future or inconsistent finalized account context',()=>{
  assert.throws(()=>validateMintFreshness(HEAD_SLOT,mintReply(HEAD_SLOT+129)),/inconsistent/);
});
test('reject mismatched finalized chain head heights',async()=>{
  const {mockFetch}=fixture({headB:HEAD_SLOT+257});
  await assert.rejects(inspectFreshIndependentMints(A,B,mockFetch),/heads diverge/);
});
test('reject different genesis identities instead of silently assuming mainnet',async()=>{
  const {mockFetch}=fixture({genesisB});
  await assert.rejects(inspectFreshIndependentMints(A,B,mockFetch),/different chain genesis/);
});
test('reject same hostname, non-HTTPS and credentials embedded in URL',async()=>{
  const {mockFetch,calls}=fixture();
  await assert.rejects(inspectFreshIndependentMints(A,'https://rpc-a.example/other',mockFetch),/different RPC/);
  await assert.rejects(inspectFreshIndependentMints('http://rpc-a.example',B,mockFetch),/HTTPS/);
  await assert.rejects(inspectFreshIndependentMints('https://user:pass@rpc-a.example',B,mockFetch),/HTTPS/);
  assert.equal(calls.length,0);
});
test('reject malformed finalized heads or missing genesis',async()=>{
  const x=fixture({headA:0});
  await assert.rejects(inspectFreshIndependentMints(A,B,x.mockFetch),/invalid finalized slot head/);
  const y=fixture({genesisA:''});
  await assert.rejects(inspectFreshIndependentMints(A,B,y.mockFetch),/invalid chain genesis/);
});
test('reject conflicting mint supply and authorities despite fresh RPC heads',async()=>{
  let x=fixture({replyB:mintReply(MINT_SLOT+5,{supply:'1000000000000001'})});
  await assert.rejects(inspectFreshIndependentMints(A,B,x.mockFetch),/disagree on supplyRaw/);
  x=fixture({replyB:mintReply(MINT_SLOT+5,{mintAuthority:'11111111111111111111111111111111'})});
  await assert.rejects(inspectFreshIndependentMints(A,B,x.mockFetch),/disagree on mintAuthority/);
});
test('reject HTTP failures with sanitized error, without revealing network URLs',async()=>{
  const x=fixture({failMethod:'getAccountInfo'});
  await assert.rejects(inspectFreshIndependentMints(A,B,x.mockFetch),/NO_GO: unavailable/);
});
test('reject missing or unparseable observation timestamp',()=>{
  const x={head:HEAD_SLOT,genesis:GENESIS,reply:mintReply()};
  assert.throws(()=>compareFreshSamples(x,x,'not-a-timestamp'),/timestamp/);
});
test('sample uses a context minimum floor and no token signing methods',async()=>{
  const {mockFetch,calls}=fixture();
  const result=await sampleFinalizedMint(A,mockFetch);
  assert.equal(result.head,HEAD_SLOT);
  assert.equal(result.mint.supplyRaw,'1000000000000000');
  assert(calls.every(c=>!['sendTransaction','signTransaction','requestAirdrop'].includes(c.method)));
});
