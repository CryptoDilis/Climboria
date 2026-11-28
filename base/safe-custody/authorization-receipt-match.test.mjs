import test from 'node:test';
import assert from 'node:assert/strict';
import {matchAuthorizationReceipt} from './authorization-receipt-match.mjs';
const h=n=>'0x'+n.toString(16).padStart(64,'0'),a=n=>'0x'+n.toString(16).padStart(40,'0'),w=n=>h(n).slice(2);
const success='0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e';
const failure='0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23';
const expense='0xbb3008fd0e1e9abf493f893faa356efe69cb25543b747a2115d6444e6e0fc6af';
const liquidity='0x529206a38cfc533e67cb0fef5c9b6d2777642e3adbc4321abd1dcb9f193e23eb';
function fixture(kind='expense'){
 const e={kind,chainId:84532,blockNumber:'0x12',blockHash:h(1),transactionHash:h(2),safe:a(3),safeTxHash:h(4),vault:a(5),id:h(6),epoch:'0x1',readyAt:'0x100'};
 if(kind==='expense')Object.assign(e,{evidence:h(7),recipient:a(8),amount:'0xa'});
 else Object.assign(e,{assetAmount:'0xa',quoteAmount:'0xb',deadline:'0x200'});
 const log=(address,topics,data,index)=>({address,topics,data,logIndex:'0x'+index.toString(16),removed:false,blockHash:e.blockHash,blockNumber:e.blockNumber,transactionHash:e.transactionHash});
 const v=kind==='expense'?log(e.vault,[expense,e.id,h(1),e.evidence],'0x'+w(8)+w(10)+w(256),1):log(e.vault,[liquidity,e.id,h(1)],'0x'+w(10)+w(11)+w(256)+w(512),1);
 return [e,{status:'0x1',to:e.safe,blockNumber:e.blockNumber,blockHash:e.blockHash,transactionHash:e.transactionHash,logs:[v,log(e.safe,[success,e.safeTxHash],h(0),2)]}];
}
for(const kind of ['expense','liquidity'])test(kind+' exact typed event and direct Safe success',()=>{
 const [e,r]=fixture(kind),out=matchAuthorizationReceipt(e,r);
 assert.equal(out.status,'RECEIPT_MATCH_ONLY_NO_GO');assert.equal(out.id,e.id);assert.equal(out.logIndex,'0x1');
});
const cases=[
 ['wrong chain',(e,r)=>e.chainId=8453],
 ['wrong receipt target',(e,r)=>r.to=a(99)],
 ['outer failure',(e,r)=>r.status='0x0'],
 ['wrong block',(e,r)=>r.blockHash=h(99)],
 ['wrong transaction',(e,r)=>r.transactionHash=h(99)],
 ['removed log',(e,r)=>r.logs[0].removed=true],
 ['log block mismatch',(e,r)=>r.logs[0].blockHash=h(99)],
 ['wrong emitter',(e,r)=>r.logs[0].address=a(99)],
 ['wrong topic',(e,r)=>r.logs[0].topics[0]=liquidity],
 ['wrong proposal ID',(e,r)=>r.logs[0].topics[1]=h(99)],
 ['wrong epoch',(e,r)=>r.logs[0].topics[2]=h(99)],
 ['wrong evidence',(e,r)=>r.logs[0].topics[3]=h(99)],
 ['wrong payload',(e,r)=>r.logs[0].data='0x'+w(8)+w(11)+w(256)],
 ['duplicate vault event',(e,r)=>{r.logs.splice(1,0,{...r.logs[0],logIndex:'0x2'});r.logs[2].logIndex='0x3';}],
 ['duplicate log index',(e,r)=>r.logs[1].logIndex='0x1'],
 ['missing vault event',(e,r)=>r.logs.shift()],
 ['missing Safe success',(e,r)=>r.logs.pop()],
 ['inner Safe failure',(e,r)=>r.logs[1].topics[0]=failure],
 ['wrong Safe tx hash',(e,r)=>r.logs[1].topics[1]=h(99)],
 ['unexpected refund',(e,r)=>r.logs[1].data=h(1)],
 ['duplicate Safe success',(e,r)=>r.logs.push({...r.logs[1],logIndex:'0x3'})],
 ['Safe success before vault',(e,r)=>{r.logs.reverse();r.logs[0].logIndex='0x1';r.logs[1].logIndex='0x2';}],
 ['noncanonical quantity',(e,r)=>e.amount='0x0a'],
 ['invalid deadline',(e,r)=>{e.kind='liquidity';delete e.evidence;delete e.recipient;delete e.amount;e.assetAmount='0xa';e.quoteAmount='0xb';e.deadline=e.readyAt;}]
];
for(const [name,mutate] of cases)test('reject '+name,()=>{const [e,r]=fixture();mutate(e,r);assert.throws(()=>matchAuthorizationReceipt(e,r));});
