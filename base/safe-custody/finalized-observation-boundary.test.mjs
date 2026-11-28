import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFinalizedObservations} from './finalized-observation-boundary.mjs';
const h=n=>'0x'+BigInt(n).toString(16).padStart(64,'0'),a=n=>'0x'+BigInt(n).toString(16).padStart(40,'0');
function fixture(){
 const e={chainId:84532,blockNumber:'0x9',blockHash:h(9),transactionHash:h(20),safe:a(3)};
 const header=(n,parent)=>({number:'0x'+n.toString(16),hash:h(n),parentHash:h(parent),stateRoot:h(100+n),receiptsRoot:h(200+n),transactionsRoot:h(300+n),timestamp:'0x'+(1000+n).toString(16)});
 const block={...header(9,8),transactions:[e.transactionHash]},parent=header(8,7),finalized=header(10,9);
 const transaction={hash:e.transactionHash,blockHash:e.blockHash,blockNumber:e.blockNumber,transactionIndex:'0x0',to:e.safe,value:'0x0',input:'0x12345678'};
 const receipt={transactionHash:e.transactionHash,blockHash:e.blockHash,blockNumber:e.blockNumber,transactionIndex:'0x0',to:e.safe,status:'0x1',logs:[{address:a(4),blockHash:e.blockHash,blockNumber:e.blockNumber,transactionHash:e.transactionHash,transactionIndex:'0x0',removed:false,logIndex:'0x0',topics:[h(42)],data:'0x'}]};
 const o={provider:'provider_a',chainId:'0x14a34',block,parent,finalized,transaction,receipt,blockRecheck:structuredClone(block),parentRecheck:structuredClone(parent),finalizedRecheck:structuredClone(finalized)};
 return [e,[o,{...structuredClone(o),provider:'provider_b'}]];
}
test('matching reports remain untrusted and no-go',()=>{
 const [e,o]=fixture(),r=compareFinalizedObservations(e,o);
 assert.equal(r.status,'DUAL_REPORTED_FINALIZED_OBSERVATION_ONLY_NO_GO');assert.equal(r.authenticatedFinality,false);assert.equal(r.authenticatedPrestate,false);assert.equal(r.releaseAuthorized,false);
});
const cases=[
 ['wrong chain',(e,o)=>o[1].chainId='0x2105'],
 ['same provider label',(e,o)=>o[1].provider=o[0].provider],
 ['one provider',(e,o)=>o.pop()],
 ['changed anchor',(e,o)=>o[0].blockRecheck.hash=h(99)],
 ['changed parent',(e,o)=>o[0].parentRecheck.hash=h(99)],
 ['changed finalized',(e,o)=>o[0].finalizedRecheck.hash=h(99)],
 ['different finalized reports',(e,o)=>{o[1].finalized.hash=h(99);o[1].finalizedRecheck.hash=h(99);}],
 ['behind finality',(e,o)=>{o[0].finalized.number='0x8';o[0].finalizedRecheck.number='0x8';}],
 ['wrong parent link',(e,o)=>{o[0].parent.hash=h(99);o[0].parentRecheck.hash=h(99);}],
 ['state root disagreement',(e,o)=>{o[1].block.stateRoot=h(99);o[1].blockRecheck.stateRoot=h(99);}],
 ['extra transaction',(e,o)=>{o[0].block.transactions.push(h(99));o[0].blockRecheck.transactions.push(h(99));}],
 ['transaction list changed',(e,o)=>o[0].blockRecheck.transactions.push(h(99))],
 ['wrong transaction index',(e,o)=>o[0].transaction.transactionIndex='0x1'],
 ['wrong receipt status',(e,o)=>o[0].receipt.status='0x0'],
 ['wrong safe target',(e,o)=>o[0].transaction.to=a(99)],
 ['removed log',(e,o)=>o[0].receipt.logs[0].removed=true],
 ['different log data',(e,o)=>o[1].receipt.logs[0].data='0x01'],
 ['different calldata',(e,o)=>o[1].transaction.input='0xabcdef12'],
 ['wrong receipt block',(e,o)=>o[0].receipt.blockHash=h(99)],
 ['different transaction',(e,o)=>o[0].transaction.hash=h(99)]
];
for(const [name,mutate] of cases)test('reject '+name,()=>{const [e,o]=fixture();mutate(e,o);assert.throws(()=>compareFinalizedObservations(e,o));});
