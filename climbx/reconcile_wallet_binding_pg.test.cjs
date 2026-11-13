const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileWalletBinding}=require('./reconcile_wallet_binding_pg.cjs');
const userId='00000000-0000-4000-8000-000000000001',wallet='wallet',nonce='nonce';
function setup({challenge={user_id:userId,wallet_address:wallet,consumed_at:new Date()},binding={user_id:userId},fail=false}={}){
 const calls=[];
 const client={query:async(sql)=>{calls.push(sql);if(fail&&sql.startsWith('SELECT user_id'))throw Error('db failure');if(sql.includes('FROM climbx.wallet_challenges'))return {rows:challenge?[challenge]:[]};if(sql.includes('FROM climbx.wallet_bindings'))return {rows:binding?[binding]:[]};return {rows:[]};},release:()=>calls.push('RELEASE')};
 return {pool:{connect:async()=>client},calls};
}
async function check(opts){const f=setup(opts);return {result:await reconcileWalletBinding({pool:f.pool,userId,wallet,nonce}),calls:f.calls};}
test('confirmed consumed challenge and same-owner binding',async()=>assert.equal((await check({})).result.status,'BOUND_CONFIRMED'));
test('unconsumed challenge is indeterminate, never safe retry',async()=>{const x=await check({challenge:{user_id:userId,wallet_address:wallet,consumed_at:null}});assert.deepEqual(x.result,{status:'INDETERMINATE',safeToRetry:false});});
test('missing binding remains indeterminate even if challenge consumed',async()=>assert.equal((await check({binding:null})).result.status,'INDETERMINATE'));
test('missing challenge requires review',async()=>assert.equal((await check({challenge:null})).result.status,'REVIEW_REQUIRED'));
test('foreign owner is not confirmed',async()=>assert.equal((await check({binding:{user_id:'other'}})).result.status,'OWNED_BY_OTHER_USER'));
test('foreign challenge requires review',async()=>assert.equal((await check({challenge:{user_id:'other',wallet_address:wallet,consumed_at:null}})).result.status,'REVIEW_REQUIRED'));
test('database read error requires review',async()=>assert.equal((await check({fail:true})).result.status,'REVIEW_REQUIRED'));
test('uses read-only transaction and timeouts',async()=>{const x=await check({});assert.equal(x.calls[0],'BEGIN READ ONLY');assert.match(x.calls[1],/statement_timeout/);assert.equal(x.calls.at(-2),'COMMIT');assert.equal(x.calls.at(-1),'RELEASE');});
test('rejects invalid pool',async()=>await assert.rejects(()=>reconcileWalletBinding({pool:null,userId,wallet,nonce})));
test('rejects missing nonce',async()=>assert.equal((await reconcileWalletBinding({pool:setup().pool,userId,wallet,nonce:''})).status,'INVALID'));

test('missing consumed timestamp cannot confirm wallet ownership',async()=>{
 const x=await check({challenge:{user_id:userId,wallet_address:wallet}});
 assert.deepEqual(x.result,{status:'INDETERMINATE',safeToRetry:false});
});
test('invalid consumed timestamp cannot confirm wallet ownership',async()=>{
 for(const value of ['', 'not-a-date', new Date(NaN), 1]){
  const x=await check({challenge:{user_id:userId,wallet_address:wallet,consumed_at:value}});
  assert.deepEqual(x.result,{status:'INDETERMINATE',safeToRetry:false});
 }
});
test('unrelated wallet cannot be confirmed even with matching user',async()=>{
 const x=await check({challenge:{user_id:userId,wallet_address:'another-wallet',consumed_at:new Date()}});
 assert.equal(x.result.status,'REVIEW_REQUIRED');
});
