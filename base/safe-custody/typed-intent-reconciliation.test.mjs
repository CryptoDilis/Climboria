import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveTypedIntent,reconcileTypedIntent} from './typed-intent-reconciliation.mjs';
import {execFileSync} from 'node:child_process';
const h=n=>'0x'+BigInt(n).toString(16).padStart(64,'0'),a=n=>'0x'+BigInt(n).toString(16).padStart(40,'0'),w=n=>h(n).slice(2);
const encode=(selector,words)=>'0x'+selector+words.map(w).join('');
const expenseId='0xc0133a238870104d6261506aed1ba0b559361f5cc304a565cebd7588c5ef0739';
const liquidityId='0x8723669035fc0a7abfbf12628cbe09ed2389b82c757daa734e0f3bb555e2ff84';
function fixture(kind='expense'){
 const c={chainId:84532,blockNumber:'0x12',blockHash:h(1),timestamp:'0x493e0',transactionHash:h(2),safe:a(3),guard:a(4),safeTxHash:h(13),token:a(9),epoch:'0x1',expenseVaults:[a(5),a(14),a(15)],liquidityVault:a(6),quote:a(10),pool:a(12)};
 const t={to:c.guard,operation:0,value:'0x0',safeTxGas:'0x0',baseGas:'0x0',gasPrice:'0x0',gasToken:a(0),refundReceiver:a(0),data:kind==='expense'?encode('6e2e6b4c',[1,3,8,10,7,0,11,300000,303600]):encode('ae7b6095',[1,1000,500,50,900000,11,300000,303600])};
 return [c,t];
}
test('selectors agree with pinned ABI signatures',()=>{
 for(const [signature,expected] of [['proposeExpense(uint256,uint256,address,uint256,bytes32,uint256,bytes32,uint256,uint256)','0x6e2e6b4c'],['scheduleLiquidity(uint256,uint256,uint256,uint256,uint256,bytes32,uint256,uint256)','0xae7b6095']])assert.equal(execFileSync('cast',['sig',signature],{encoding:'utf8'}).trim(),expected);
});
for(const kind of ['expense','liquidity'])test(kind+' independently computed Keccak ID and full receipt match',()=>{
 const [c,t]=fixture(kind),e=deriveTypedIntent(c,t),id=kind==='expense'?expenseId:liquidityId;
 assert.equal(e.id,id);assert.equal(e.readyAt,'0x736e0');
 const log=(address,topics,data,index)=>({address,topics,data,logIndex:'0x'+index.toString(16),removed:false,blockHash:c.blockHash,blockNumber:c.blockNumber,transactionHash:c.transactionHash});
 const v=kind==='expense'?log(c.expenseVaults[0],['0xbb3008fd0e1e9abf493f893faa356efe69cb25543b747a2115d6444e6e0fc6af',id,h(1),h(7)],'0x'+w(8)+w(10)+w(472800),1):log(c.liquidityVault,['0x529206a38cfc533e67cb0fef5c9b6d2777642e3adbc4321abd1dcb9f193e23eb',id,h(1)],'0x'+w(1000)+w(500)+w(472800)+w(900000),1);
 const receipt={status:'0x1',to:c.safe,blockHash:c.blockHash,blockNumber:c.blockNumber,transactionHash:c.transactionHash,logs:[v,log(c.safe,['0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e',c.safeTxHash],h(0),2)]};
 assert.equal(reconcileTypedIntent(c,t,receipt).status,'RECEIPT_MATCH_ONLY_NO_GO');
 // An event cannot be accepted as evidence for different calldata.
 const altered=t.data.slice(0,-128-64)+w(99)+t.data.slice(-128);
 assert.throws(()=>reconcileTypedIntent(c,{...t,data:altered},receipt));
});
const setWord=(t,i,n)=>{const p=10+i*64;t.data=t.data.slice(0,p)+w(n)+t.data.slice(p+64);};
const cases=[
 ['wrong chain',(c,t)=>c.chainId=8453],
 ['wrong guard',(c,t)=>t.to=a(99)],
 ['delegatecall',(c,t)=>t.operation=1],
 ['nonzero native value',(c,t)=>t.value='0x1'],
 ['refund parameters',(c,t)=>t.gasPrice='0x1'],
 ['wrong selector',(c,t)=>t.data='0xdeadbeef'+t.data.slice(10)],
 ['trailing calldata',(c,t)=>t.data+=w(0)],
 ['truncated calldata',(c,t)=>t.data=t.data.slice(0,-2)],
 ['wrong epoch',(c,t)=>setWord(t,0,2)],
 ['wrong expense index',(c,t)=>setWord(t,1,2)],
 ['noncanonical address',(c,t)=>setWord(t,2,2n**160n+8n)],
 ['sentinel recipient',(c,t)=>setWord(t,2,1)],
 ['zero amount',(c,t)=>setWord(t,3,0)],
 ['zero evidence',(c,t)=>setWord(t,4,0)],
 ['invalid month',(c,t)=>setWord(t,5,60)],
 ['zero nonce',(c,t)=>setWord(t,6,0)],
 ['future window',(c,t)=>setWord(t,7,300001)],
 ['expired window',(c,t)=>setWord(t,8,300000)],
 ['overlong window',(c,t)=>setWord(t,8,386401)],
 ['duplicate vault',(c,t)=>c.expenseVaults[1]=c.expenseVaults[0]],
 ['mainnet timestamp overflow',(c,t)=>c.timestamp=h(2n**256n-1n)]
];
for(const [name,mutate] of cases)test('reject '+name,()=>{const [c,t]=fixture();mutate(c,t);assert.throws(()=>deriveTypedIntent(c,t));});
test('liquidity deadline and minimum shares fail closed',()=>{
 for(const [i,n] of [[3,0],[4,472800],[4,300000+2592001]]){const [c,t]=fixture('liquidity');setWord(t,i,n);assert.throws(()=>deriveTypedIntent(c,t));}
});
