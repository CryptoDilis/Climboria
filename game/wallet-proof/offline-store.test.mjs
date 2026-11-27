import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {Wallet} from 'ethers';
import {SiweMessage} from 'siwe';
import {OfflineWalletProofStore} from './offline-store.mjs';
const alice={mode:'synthetic-test',registered:true,id:'11111111-1111-4111-8111-111111111111'};
const bob={...alice,id:'22222222-2222-4222-8222-222222222222'};
const now=Date.parse('2026-11-27T00:00:00Z');
const wallet=()=>Wallet.createRandom();
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'climb-wallet-proof-'));const path=join(dir,'proof.sqlite');const store=new OfflineWalletProofStore(path);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {store,path};}
test('actual signed SIWE message, fixed scope, restart and replay rejection',async t=>{
 const {store,path}=fixture(t),w=wallet(),c=store.issue(alice,w.address,8453,now);
 const parsed=new SiweMessage(c.message);
 assert.equal(parsed.domain,'climboria.fun');assert.equal(parsed.chainId,8453);assert.equal(parsed.requestId,c.id);
 assert.match(parsed.nonce,/^[a-f0-9]{32}$/);assert.ok(!c.message.includes(alice.id));assert.equal(c.authorization,false);
 assert.throws(()=>store.issue(alice,w.address,8453,now));
 const signed=await w.signMessage(c.message);
 const result=store.verify(alice,c.id,signed,now+1);assert.equal(result.address,w.address);assert.equal(result.keyProof,true);assert.equal(result.productionLink,false);assert.equal(result.authorization,false);
 const reopened=new OfflineWalletProofStore(path);try{assert.throws(()=>reopened.verify(alice,c.id,signed,now+2));}finally{reopened.close();}
});
test('reject guest, wrong chain, zero address, wrong UID, signer, altered message and expired proof',async t=>{
 const {store}=fixture(t),w=wallet(),other=wallet();
 assert.throws(()=>store.issue({...alice,registered:false},w.address,8453,now));
 assert.throws(()=>store.issue(alice,w.address,1,now));assert.throws(()=>store.issue(alice,'0x'+'0'.repeat(40),8453,now));
 const c=store.issue(alice,w.address,8453,now),sig=await w.signMessage(c.message);
 assert.throws(()=>store.verify(bob,c.id,sig,now+1));
 const wrong=await other.signMessage(c.message),altered=await w.signMessage(c.message.replace('8453','84532'));
 assert.throws(()=>store.verify(alice,c.id,wrong,now+1));assert.throws(()=>store.verify(alice,c.id,altered,now+1));assert.throws(()=>store.verify(alice,c.id,sig,now-1));assert.throws(()=>store.verify(alice,c.id,sig,c.expires));
 assert.equal(store.verify(alice,c.id,sig,now+1).keyProof,true);
});
test('cross-account conflict rolls back, same-account fresh proof retains evidence',async t=>{
 const {store}=fixture(t),w=wallet();const a=store.issue(alice,w.address,8453,now),b=store.issue(bob,w.address,8453,now);
 const first=store.verify(alice,a.id,await w.signMessage(a.message),now+1);
 const bs=await w.signMessage(b.message);
 assert.throws(()=>store.verify(bob,b.id,bs,now+2));assert.throws(()=>store.verify(bob,b.id,bs,now+3));
 const next=store.issue(alice,w.address.toLowerCase(),8453,now+2);
 const second=store.verify(alice,next.id,await w.signMessage(next.message),now+3);assert.equal(second.evidence,first.evidence);
});
test('two independent database connections race for one challenge; exactly one succeeds',async t=>{
 const {store,path}=fixture(t),w=wallet(),c=store.issue(alice,w.address,8453,now),sig=await w.signMessage(c.message);
 const moduleUrl=new URL('./offline-store.mjs',import.meta.url).href;
 const run=()=>new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {OfflineWalletProofStore}=await import(workerData.moduleUrl);const db=new OfflineWalletProofStore(workerData.path);try{db.verify(workerData.user,workerData.id,workerData.sig,workerData.now);parentPort.postMessage(true);}catch{parentPort.postMessage(false);}finally{db.close();}})().catch(e=>{throw e;});`,{eval:true,workerData:{moduleUrl,path,user:alice,id:c.id,sig,now:now+1}});
  worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code!==0)reject(Error('worker failed'));});
 });
 assert.deepEqual((await Promise.all([run(),run()])).sort(),[false,true]);
});

test('revocation freezes ownership evidence and all outstanding challenges across restart',async t=>{
 const {store,path}=fixture(t),w=wallet(),initial=store.issue(alice,w.address,8453,now);
 const linked=store.verify(alice,initial.id,await w.signMessage(initial.message),now+1);
 const a=store.issue(alice,w.address,8453,now+2),b=store.issue(bob,w.address,8453,now+2);
 const as=await w.signMessage(a.message),bs=await w.signMessage(b.message);
 assert.throws(()=>store.revoke(bob,w.address,8453,now+3));
 assert.throws(()=>store.revoke(alice,w.address,1,now+3));
 assert.throws(()=>store.revoke(alice,w.address,8453,now));
 const frozen=store.revoke(alice,w.address,8453,now+3);
 assert.equal(frozen.evidence,linked.evidence);assert.equal(frozen.revoked,true);assert.equal(frozen.productionLink,false);
 assert.deepEqual(store.revoke(alice,w.address,8453,now+4),frozen);
 const reopened=new OfflineWalletProofStore(path);
 try{
  assert.throws(()=>reopened.verify(alice,a.id,as,now+4));
  assert.throws(()=>reopened.verify(bob,b.id,bs,now+4));
  for(const user of [alice,bob])assert.throws(()=>reopened.issue(user,w.address.toLowerCase(),8453,now+5));
  assert.throws(()=>reopened.revoke(bob,w.address,8453,now+5));
  const other=wallet(),c=reopened.issue(alice,other.address,8453,now+5);
  assert.equal(reopened.verify(alice,c.id,await other.signMessage(c.message),now+6).keyProof,true);
 }finally{reopened.close();}
});
test('independent connection cannot verify after revocation commits',async t=>{
 const {store,path}=fixture(t),w=wallet(),initial=store.issue(alice,w.address,8453,now);
 store.verify(alice,initial.id,await w.signMessage(initial.message),now+1);
 const pending=store.issue(alice,w.address,8453,now+2),sig=await w.signMessage(pending.message);
 const peer=new OfflineWalletProofStore(path);
 try{store.revoke(alice,w.address,8453,now+3);assert.throws(()=>peer.verify(alice,pending.id,sig,now+4));}finally{peer.close();}
});
