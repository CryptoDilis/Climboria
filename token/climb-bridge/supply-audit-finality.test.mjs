// All fixtures are synthetic and run offline. This is not an on-chain proof or funds release.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditLive, inspectFinalizedSolanaPair, inspectBaseFinalizedBlock} from './supply-audit.mjs';

const ESCROW = '11111111111111111111111111111111'; // mock-only, NOT a bridge escrow
const TOKEN = '0x1234567890123456789012345678901234567890'; // mock-only, NOT a deployed Base CA
const SUPPLY = '1000000000000000';
const BLOCK = {number:'0xdeadbeef',hash:'0x'+'a'.repeat(64)};
const config = JSON.parse(readFileSync(new URL('./config.json',import.meta.url),'utf8'));
config.status = 'READY_FOR_READ_ONLY_AUDIT'; // only mock schema validation, not a real provider check
config.solana.escrowTokenAccount = ESCROW;
config.solana.escrowAuthority = ESCROW;
config.base.wrappedTokenContract = TOKEN;
config.bridge.protocol = 'MOCK_UNVERIFIED_ONLY';
config.bridge.configuredManagerAddresses = true;
config.bridge.securityReviewUrl = 'https://example.org/not-a-security-review';

function mintInfo(){
  return {
    owner:config.solana.tokenProgram,
    data:{program:'spl-token',parsed:{type:'mint',info:{
      isInitialized:true,decimals:6,supply:SUPPLY,mintAuthority:null,freezeAuthority:null
    }}}
  };
}
function escrowInfo(){
  return {
    owner:config.solana.tokenProgram,
    data:{program:'spl-token',parsed:{type:'account',info:{
      mint:config.solana.mint,owner:ESCROW,state:'initialized',
      tokenAmount:{amount:'100000000',decimals:6}
    }}}
  };
}
function solanaPair(){
  return {context:{slot:471014649},value:[mintInfo(),escrowInfo()]};
}
function hex256(num){return '0x'+BigInt(num).toString(16).padStart(64,'0');}
function harness(custom = {}){
  const calls=[];
  const fakeFetch = async (url,opts)=>{
    const body=JSON.parse(opts.body);
    calls.push({url,body,opts});
    let result;
    if(body.method==='eth_chainId') result = custom.chainId ?? '0x2105';
    else if(body.method==='eth_getBlockByNumber') result = custom.block ?? BLOCK;
    else if(body.method==='getMultipleAccounts') result = custom.solana ?? solanaPair();
    else if(body.method==='eth_getCode') result = custom.code ?? '0x60006000';
    else if(body.method==='eth_call' && body.params[0].data==='0x313ce567') result = custom.decimals ?? hex256(6);
    else if(body.method==='eth_call' && body.params[0].data==='0x18160ddd') result = custom.wrapped ?? hex256(100000000);
    else throw new Error('Unexpected mock RPC method '+body.method);
    return {ok:true, json:async()=>({jsonrpc:'2.0',id:1,result})};
  };
  return {calls,fakeFetch};
}
const solUrl='https://mock-solana-provider.invalid/rpc';
const baseUrl='https://mock-base-provider.invalid/rpc';
test('one Solana finalized context slot and one pinned Base finalized block for every read',async()=>{
  const {calls,fakeFetch}=harness();
  const s=await auditLive(config,solUrl,baseUrl,fakeFetch);
  assert.equal(s.verdict,'PASS_ACCOUNTING_ONLY_NOT_RELEASE_AUTHORIZATION');
  assert.equal(s.solanaFinalizedSlot,471014649);
  assert.equal(s.baseFinalizedBlockNumber,BLOCK.number);
  assert.equal(s.baseFinalizedBlockHash,BLOCK.hash);
  assert.equal(s.observedMintAuthority,null);
  assert.equal(s.economicallyClaimableRaw,SUPPLY);
  assert.equal(calls.filter(c=>c.body.method==='getMultipleAccounts').length,1);
  assert.equal(calls.filter(c=>c.body.method==='getAccountInfo').length,0);
  const accountCall=calls.find(c=>c.body.method==='getMultipleAccounts');
  assert.deepEqual(accountCall.body.params[0],[config.solana.mint,ESCROW]);
  assert.equal(accountCall.body.params[1].commitment,'finalized');
  const finalizedCall=calls.find(c=>c.body.method==='eth_getBlockByNumber');
  assert.deepEqual(finalizedCall.body.params,['finalized',false]);
  for(const c of calls.filter(c=>['eth_getCode','eth_call'].includes(c.body.method))){
    assert.equal(c.body.params[1],BLOCK.number);
    assert.equal(c.opts.redirect,'error');
  }
  assert(!calls.some(c=>c.body.params?.includes('latest')||c.body.params?.includes('pending')));
});
test('reject absent, uninitialized, non-token mint and invalid finalized Solana result',()=>{
  const s=solanaPair();
  assert.equal(inspectFinalizedSolanaPair(s,config).originalSupplyRaw,SUPPLY);
  assert.throws(()=>inspectFinalizedSolanaPair({value:s.value},config),/finalized/);
  assert.throws(()=>inspectFinalizedSolanaPair({context:{slot:2},value:[s.value[0]]},config),/multi-account/);
  const notMint=solanaPair(); notMint.value[0].data.parsed.type='account';
  assert.throws(()=>inspectFinalizedSolanaPair(notMint,config),/SPL mint/);
  const wrongProgram=solanaPair(); wrongProgram.value[0].owner='another-program';
  assert.throws(()=>inspectFinalizedSolanaPair(wrongProgram,config),/SPL mint/);
  const uninitialized=solanaPair(); uninitialized.value[0].data.parsed.info.isInitialized=false;
  assert.throws(()=>inspectFinalizedSolanaPair(uninitialized,config),/metadata/);
});
test('reject missing mint/freeze authority, invalid supply, invalid mint authority',()=>{
  let s=solanaPair(); delete s.value[0].data.parsed.info.freezeAuthority;
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/authority/);
  s=solanaPair(); s.value[0].data.parsed.info.supply='1e15';
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/decimal/);
  s=solanaPair(); s.value[0].data.parsed.info.mintAuthority='invalid';
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/authority/);
});
test('reject wrong escrow mint, owner, delegated escrow and frozen escrow',()=>{
  let s=solanaPair(); s.value[1].data.parsed.info.mint='wrong';
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/escrow/);
  s=solanaPair(); s.value[1].data.parsed.info.owner='wrong';
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/escrow/);
  s=solanaPair(); s.value[1].data.parsed.info.delegate=ESCROW;
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/delegate/);
  s=solanaPair(); s.value[1].data.parsed.info.closeAuthority=ESCROW;
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/close authority/);
  s=solanaPair(); s.value[1].data.parsed.info.state='frozen';
  assert.throws(()=>inspectFinalizedSolanaPair(s,config),/escrow/);
});
test('no Base finalized state is accepted from missing/null/hashless block',()=>{
  assert.throws(()=>inspectBaseFinalizedBlock(null),/finalized/);
  assert.throws(()=>inspectBaseFinalizedBlock({number:'0x1',hash:'0x'}),/finalized/);
  assert.throws(()=>inspectBaseFinalizedBlock({number:'0x0',hash:BLOCK.hash}),/finalized/);
});
test('wrong Base chain or unavailable finalized block is NO_GO',async()=>{
  let h=harness({chainId:'0x1'});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/not Base/);
  h=harness({block:{number:'0x3',hash:'0x0'}});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/finalized block/);
});
test('Base bytecode absent or wrapped supply outgrowing escrow fails closed',async()=>{
  let h=harness({code:'0x'});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/bytecode/);
  h=harness({wrapped:hex256(100000001)});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/unbacked/);
});
test('Base ERC-20 wrong decimals, malformed contract ABI result fail closed',async()=>{
  let h=harness({decimals:hex256(18)});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/decimals/);
  h=harness({wrapped:'0x1'});
  await assert.rejects(auditLive(config,solUrl,baseUrl,h.fakeFetch),/uint256/);
});
test('single Solana finalized snapshot has consistent response with no independent provider claims',async()=>{
  const h=harness();
  const result=await auditLive(config,solUrl,baseUrl,h.fakeFetch);
  assert.match(result.caveat,/non-atomic/);
  assert.match(result.caveat,/not evidence/);
});
test('unconfigured production mainnet status prevents any network calls',async()=>{
  const h=harness();
  const original=JSON.parse(readFileSync(new URL('./config.json',import.meta.url),'utf8'));
  await assert.rejects(auditLive(original,solUrl,baseUrl,h.fakeFetch),/NO_GO/);
  assert.equal(h.calls.length,0);
});
