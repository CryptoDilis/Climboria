// Loopback Anvil only. Exercise actual quorum transitions before local expense authorization.
// No change to contract policy; the reviewed #1125 context-zero artifact remains historical evidence.
import assert from 'node:assert/strict';
import {decodeFiveOwnerRoster} from './raw-safe-quorum.mjs';
const ZERO='0x'+'0'.repeat(40);
const h=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const aw=a=>'0x'+a.slice(2).padStart(64,'0');
const execSig='execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)';
const hashSig='getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)';
export async function verifyLocalRecipientLifecycle(x){
 const {rpc,call,number,record,cast,calldata,creator,wallet,guard,token,vaults,payee,signers}=x;
 assert.match(await rpc('web3_clientVersion'),/anvil/i);assert.equal(BigInt(await rpc('eth_chainId')),84532n);
 const owners=decodeFiveOwnerRoster((await call(wallet,'getOwners()')).toLowerCase());
 const old=owners[4],prev=owners[3];
 assert.equal(signers.length,3);assert.ok(signers.every(s=>owners.includes(s.address)&&s.address!==old));
 assert.equal(await number(guard,'expenseContext(address)',payee),0n);
 assert.equal(await number(guard,'expenseRecipientAllowed(address)',payee),1n);
 assert.equal(await number(wallet,'isOwner(address)',payee),0n);
 assert.equal(await rpc('eth_getCode',[payee,'latest']),'0x');
 const nonce0=await number(wallet,'nonce()'),epoch=await number(guard,'epoch()');
 const balances=await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address)));
 const topic=s=>cast('keccak','0x'+Buffer.from(s).toString('hex'));
 const contextTopic=topic('ExpenseContextChanged(address,uint256)'),successTopic=topic('ExecutionSuccess(bytes32,uint256)');
 const outer=async(data)=>{
  const nonce=await number(wallet,'nonce()');
  const digest=await call(wallet,hashSig,guard,0,data,0,0,0,0,ZERO,ZERO,nonce);
  const sigs=signers.map(({key})=>cast('wallet','sign','--no-hash','--private-key',key,digest));
  for(const s of sigs)assert.match(s,/^0x[0-9a-f]{128}(1b|1c)$/i);
  return {nonce,digest,input:calldata(execSig,guard,0,data,0,0,0,0,ZERO,ZERO,'0x'+sigs.map(s=>s.slice(2)).join(''))};
 };
 const latest=()=>rpc('eth_getBlockByNumber',['latest',false]);
 const window=async()=>{const t=BigInt((await latest()).timestamp);return [t,t+3600n]};
 const reject=async(data)=>{const s=await outer(data);await assert.rejects(rpc('eth_call',[{from:creator,to:wallet,data:s.input},'latest']));assert.equal(await number(wallet,'nonce()'),s.nonce);};
 const rows=[];
 async function step(name,data,beforeContext,afterContext,eligible,change){
  const parent=await latest(),s=await outer(data);
  const at=async(tag,sig,...args)=>BigInt(await rpc('eth_call',[{to:guard,data:calldata(sig,...args)},tag]));
  assert.equal(await at(parent.number,'expenseContext(address)',payee),beforeContext);
  const r=await record('recipient_lifecycle_'+name,{from:creator,to:wallet,data:s.input});
  const block=await rpc('eth_getBlockByHash',[r.blockHash,false]),tx=await rpc('eth_getTransactionByHash',[r.transactionHash]);
  assert.equal(block.parentHash,parent.hash);assert.equal(block.number,r.blockNumber);assert.deepEqual(block.transactions,[r.transactionHash]);
  assert.equal(tx.to,wallet);assert.equal(tx.input.toLowerCase(),s.input.toLowerCase());assert.equal(tx.blockHash,block.hash);
  const checkLog=l=>{assert.equal(l.removed,false);assert.equal(l.blockHash,r.blockHash);assert.equal(l.blockNumber,r.blockNumber);assert.equal(l.transactionHash,r.transactionHash)};
  const events=r.logs.filter(l=>l.address===guard&&l.topics[0]===contextTopic);
  assert.equal(events.length,change?1:0);
  if(change){const l=events[0];checkLog(l);assert.deepEqual(l.topics,[contextTopic,aw(payee)]);assert.equal(l.data,h(afterContext));}
  const successes=r.logs.filter(l=>l.address===wallet&&l.topics[0]===successTopic);
  assert.equal(successes.length,1);checkLog(successes[0]);assert.deepEqual(successes[0].topics,[successTopic,s.digest]);assert.equal(successes[0].data,h(0));
  if(change)assert.ok(BigInt(events[0].logIndex)<BigInt(successes[0].logIndex));
  assert.equal(await at(block.number,'expenseContext(address)',payee),afterContext);
  assert.equal(await at(block.number,'expenseRecipientAllowed(address)',payee),eligible?1n:0n);
  assert.equal(await number(wallet,'nonce()'),s.nonce+1n);assert.equal(await number(guard,'epoch()'),epoch);
  assert.equal(await number(guard,'transactionActive()'),0n);
  assert.equal((await rpc('eth_getBlockByNumber',[parent.number,false])).hash,parent.hash);
  rows.push({name,transactionHash:r.transactionHash,parentBlockHash:parent.hash,blockHash:block.hash,contextBefore:String(beforeContext),contextAfter:String(afterContext),eligible,contextEventMatched:true,safeSuccessMatched:true});
 }
 await step('nominate',calldata('scheduleRotation(uint256,address,address,address,uint256,uint256)',epoch,prev,old,payee,...await window()),0n,1n,false,true);
 const release=()=>window().then(w=>calldata('releaseExpenseRecipient(uint256,address,uint256,uint256,uint256)',epoch,payee,1,...w));
 await reject(await release());
 await step('cancel',calldata('cancelRotation(uint256,uint256)',epoch,await number(guard,'rotationSerial()')),1n,1n,false,false);
 await step('release',await release(),1n,2n,true,true);
 await reject(await release());
 // A valid current Safe nonce and current window cannot revive a context-zero expense.
 await reject(calldata('proposeExpense(uint256,uint256,address,uint256,bytes32,uint256,bytes32,uint256,uint256,uint256)',epoch,3,payee,10,h(203),0,h(103),0,...await window()));
 assert.equal(await number(wallet,'nonce()'),nonce0+3n);
 assert.deepEqual(decodeFiveOwnerRoster((await call(wallet,'getOwners()')).toLowerCase()),owners);
 assert.deepEqual(await Promise.all(vaults.map(v=>number(token,'balanceOf(address)',v.address))),balances);
 assert.equal(await number(token,'balanceOf(address)',payee),0n);
 return {status:'LOCAL_RECIPIENT_LIFECYCLE_ONLY_NO_GO',recipient:payee,context:'0x2',rows,activeNominationReleaseRejected:true,duplicateReleaseRejected:true,staleContextProposalRejected:true,unchangedOwnerRoster:true,unchangedVaultBalances:true,releaseAuthorized:false};
}
