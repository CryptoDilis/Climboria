import test from 'node:test';
import assert from 'node:assert/strict';
import {collectRawInventoryCandidate} from './legacy-raw-inventory-collector.mjs';
import {CLIMB_SOLANA_MINT,TOKEN_2022_PROGRAM} from './mint-inspect.mjs';
import {pubkey} from './mint-raw-evidence.mjs';
const GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const A='https://rpc-a.invalid',B='https://rpc-b.invalid';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
let n=0n;for(const c of CLIMB_SOLANA_MINT)n=n*58n+BigInt(alphabet.indexOf(c));
const mintKey=Buffer.from(n.toString(16).padStart(64,'0'),'hex');
const key=n=>pubkey(Buffer.alloc(32,n));
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const str=s=>Buffer.concat([u32(Buffer.byteLength(s)),Buffer.from(s)]);
const tlv=(t,v)=>{const h=Buffer.alloc(4);h.writeUInt16LE(t);h.writeUInt16LE(v.length,2);return Buffer.concat([h,v]);};
const envelope=b=>({owner:TOKEN_2022_PROGRAM,executable:false,data:[b.toString('base64'),'base64']});
function fixture(){
 const mint=Buffer.alloc(166);mint.writeBigUInt64LE(1000n,36);mint[44]=6;mint[45]=1;mint[165]=1;
 const raw=Buffer.concat([mint,tlv(18,Buffer.concat([Buffer.alloc(32),mintKey])),
  tlv(19,Buffer.concat([Buffer.alloc(32),mintKey,str('CLIMB'),str('CLIMB'),str('https://fixture.invalid'),u32(0)]))]);
 const account=Buffer.alloc(170);mintKey.copy(account);Buffer.alloc(32,8).copy(account,32);
 account.writeBigUInt64LE(1000n,64);account[108]=1;account[165]=2;account.writeUInt16LE(7,166);
 const context={slot:123};
 return {1:GENESIS,2:123,3:{context,value:{owner:TOKEN_2022_PROGRAM,executable:false,data:{program:'spl-token-2022',parsed:{type:'mint',info:{isInitialized:true,decimals:6,supply:'1000',mintAuthority:null,freezeAuthority:null,extensions:[{extension:'metadataPointer'},{extension:'tokenMetadata'}]}}}}},
  4:{context,value:envelope(raw)},5:{context,value:[{pubkey:key(3),account:envelope(account)}]},6:{blockhash:key(2)},7:124};
}
function mock(mutate=()=>{}){
 const calls=[];
 const fetchFn=async(url,options)=>{
  const req=JSON.parse(options.body);calls.push({url,req});
  assert.equal(options.redirect,'error');
  const reply={jsonrpc:'2.0',id:req.id,result:structuredClone(fixture()[req.id])};
  mutate(reply,req,url);
  return new Response(JSON.stringify(reply),{status:200});
 };
 return {calls,fetchFn};
}
const run=fetchFn=>collectRawInventoryCandidate(A,B,{expectedGenesis:GENESIS,fetchFn});
test('only seven read-only calls per provider, exact context, sanitized candidate',async()=>{
 const {calls,fetchFn}=mock();const r=await run(fetchFn);
 assert.equal(r.supplyRaw,'1000');assert.equal(r.authorization,false);
 assert.equal(r.bridgeRelease,'NO_GO');assert.equal(r.collectionStatus,'READ_ONLY_RPC_CANDIDATE');
 assert.equal(r.providerIndependence,'NOT_VERIFIED');assert.equal(calls.length,14);
 for(const url of [A,B]){
  const reqs=calls.filter(c=>c.url===url).map(c=>c.req);
  assert.deepEqual(reqs.map(x=>x.method),['getGenesisHash','getSlot','getAccountInfo','getAccountInfo','getProgramAccounts','getBlock','getSlot']);
  assert.deepEqual(reqs[4].params,[TOKEN_2022_PROGRAM,{commitment:'finalized',minContextSlot:123,encoding:'base64',withContext:true,filters:[{memcmp:{offset:0,bytes:CLIMB_SOLANA_MINT}}]}]);
  assert.equal(reqs[5].params[0],123);
 }
 assert(!JSON.stringify(r).includes('rpc-a.invalid'));assert(!JSON.stringify(r).includes(key(3)));
});
test('reject wrong genesis config and same provider without network calls',async()=>{
 const {calls,fetchFn}=mock();
 await assert.rejects(collectRawInventoryCandidate(A,B,{expectedGenesis:key(1),fetchFn}),/genesis/);
 await assert.rejects(collectRawInventoryCandidate(A,A,{expectedGenesis:GENESIS,fetchFn}),/different RPC/);
 assert.equal(calls.length,0);
});
test('reject mismatched slots, stale head, wrong block and uncontextualized account list',async()=>{
 for(const change of [
  (r,q)=>{if(q.id===3)r.result.context.slot++},
  (r,q)=>{if(q.id===7)r.result=300},
  (r,q,url)=>{if(q.id===6&&url===B)r.result.blockhash=key(7)},
  (r,q)=>{if(q.id===5)r.result=r.result.value},
  (r,q)=>{if(q.id===1)r.result=key(1)}
 ])await assert.rejects(run(mock(change).fetchFn),/NO_GO/);
});
test('reject RPC errors, mismatched ids and redact transport failures',async()=>{
 for(const change of [(r,q)=>{if(q.id===3)r.error={message:'secret URL'}},(r,q)=>{if(q.id===4)r.id=999}]){
  await assert.rejects(run(mock(change).fetchFn),e=>/NO_GO/.test(e.message)&&!e.message.includes('secret'));
 }
 await assert.rejects(run(async()=>{throw Error('https://private.invalid/SECRET')}),e=>/NO_GO/.test(e.message)&&!e.message.includes('SECRET'));
});

import {inventoryFailureCode} from './legacy-raw-inventory-diagnostics.mjs';
test('diagnostic codes distinguish exact context and RPC failures without exposing payloads',async()=>{
 await assert.rejects(run(mock((r,q)=>{if(q.id===3)r.result.context.slot++}).fetchFn),e=>inventoryFailureCode(e)==='SAME_SLOT_UNAVAILABLE');
 await assert.rejects(run(mock((r,q,url)=>{if(q.id===5&&url===B)r.error={message:'secret URL'}}).fetchFn),e=>inventoryFailureCode(e)==='RPC_B_getProgramAccounts_RPC_ERROR_OTHER');
 await assert.rejects(collectRawInventoryCandidate(A,B,{expectedGenesis:key(1),fetchFn:mock().fetchFn}),e=>inventoryFailureCode(e)==='GENESIS_CONFIG_MISMATCH');
 for(const e of [Error('https://private.invalid/SECRET'),Error('NO_GO: wrong source genesis SECRET'),{message:'NO_GO: wrong source genesis'},null])assert.equal(inventoryFailureCode(e),'UNCLASSIFIED_FAILURE');
});

test('provider-specific fixed diagnostics distinguish HTTP rate limits and RPC index exclusion',async()=>{
 for(const [target,status,expected] of [[A,429,'RPC_A_getProgramAccounts_HTTP_429'],[B,403,'RPC_B_getProgramAccounts_HTTP_403']]){
  const {fetchFn}=mock();
  await assert.rejects(run(async(url,options)=>{
   if(url===target&&JSON.parse(options.body).id===5)return new Response('secret URL',{status});
   return fetchFn(url,options);
  }),e=>inventoryFailureCode(e)===expected&&!e.message.includes('secret'));
 }
 await assert.rejects(run(mock((r,q,url)=>{if(q.id===5&&url===B)r.error={code:-32010,message:'secret URL',data:{secret:'private'}}}).fetchFn),e=>inventoryFailureCode(e)==='RPC_B_getProgramAccounts_RPC_INDEX_EXCLUDED'&&!e.message.includes('secret'));
});
test('unknown provider error codes and malformed envelopes never become diagnostic text',async()=>{
 await assert.rejects(run(mock((r,q,url)=>{if(q.id===5&&url===A)r.error={code:'SECRET',message:'private'}}).fetchFn),e=>inventoryFailureCode(e)==='RPC_A_getProgramAccounts_RPC_ERROR_OTHER'&&!e.message.includes('SECRET'));
 await assert.rejects(run(mock((r,q,url)=>{if(q.id===5&&url===B)r.id='SECRET'}).fetchFn),e=>inventoryFailureCode(e)==='RPC_B_getProgramAccounts_INVALID_ENVELOPE');
});
