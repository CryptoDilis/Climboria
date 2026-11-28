import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {deriveDirectSafeDigest} from './canonical-safe-envelope.mjs';
import {decodeFiveOwnerRoster,verifyRawSafeQuorum} from './raw-safe-quorum.mjs';
const cast=(...args)=>execFileSync('cast',args,{encoding:'utf8'}).trim();
const a=n=>'0x'+BigInt(n).toString(16).padStart(40,'0'),w=n=>BigInt(n).toString(16).padStart(64,'0');
const key=n=>'0x'+w(n);
// Public disposable fixture keys; never use for funds.
const members=[0x12345,0x23456,0x34567,0x45678,0x56789].map(n=>({key:key(n),address:cast('wallet','address','--private-key',key(n)).toLowerCase()})).sort((a,b)=>a.address.localeCompare(b.address));
const owners=members.map(x=>x.address).reverse(),safe=a(3),nonce='0x1',threshold=3,chainId=84532;
const sig='execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)';
const data='0xbe61343e'+w(1).repeat(10),outer=(s,d=data)=>cast('calldata',sig,a(4),'0',d,'0','0','0','0',a(0),a(0),s);
const dummy='0x'+(w(1)+w(2)+'1b').repeat(3);
const digest=deriveDirectSafeDigest(outer(dummy),chainId,safe,nonce).safeTxHash;
const sign=k=>cast('wallet','sign','--no-hash','--private-key',k,digest).slice(2).toLowerCase();
const signatures=members.slice(0,3).map(x=>sign(x.key));
const pack=s=>'0x'+s.join('');
const fixture=()=>({input:outer(pack(signatures)),chainId,safe,nonce,threshold,owners:owners.slice()});
test('three distinct raw signatures match supplied unordered owner roster',()=>{
 const result=verifyRawSafeQuorum(fixture());
 assert.equal(result.status,'RAW_QUORUM_MATCH_ONLY_NO_GO');
 assert.equal(result.safeTxHash,digest);assert.equal(result.verifiedCount,3);
 assert.deepEqual(result.verifiedSigners,members.slice(0,3).map(x=>x.address));
});
test('canonical dynamic five owner ABI preserves roster order',()=>{
 const raw='0x'+w(32)+w(5)+owners.map(x=>w(BigInt(x))).join('');
 assert.deepEqual(decodeFiveOwnerRoster(raw),owners);
 for(const broken of [raw+w(0),raw.slice(0,-2),'0x'+w(64)+raw.slice(66),'0x'+w(32)+w(4)+raw.slice(130),'0x'+w(32)+w(5)+w(1)+raw.slice(194),'0x'+w(32)+w(5)+w(BigInt(owners[1]))+raw.slice(194)])assert.throws(()=>decodeFiveOwnerRoster(broken));
});
const cases=[
 ['wrong nonce',c=>c.nonce='0x2'],
 ['wrong Safe',c=>c.safe=a(8)],
 ['wrong chain',c=>c.chainId=8453],
 ['wrong threshold',c=>c.threshold=2],
 ['duplicate owner',c=>c.owners[0]=c.owners[1]],
 ['four owners',c=>c.owners.pop()],
 ['signer omitted',c=>c.owners=c.owners.map(x=>x===members[0].address?a(99):x)],
 ['duplicate signature',c=>c.input=outer(pack([signatures[0],signatures[0],signatures[2]]))],
 ['out of order',c=>c.input=outer(pack([signatures[1],signatures[0],signatures[2]]))],
 ['outsider signature',c=>c.input=outer(pack([signatures[0],signatures[1],sign(key(0x67890))]))],
 ['changed inner data',c=>c.input=outer(pack(signatures),data.slice(0,-64)+w(2))],
 ['two signatures',c=>c.input=outer(pack(signatures.slice(0,2)))],
 ['unsupported signature mode',c=>c.input=outer(pack([signatures[0].slice(0,-2)+'00',...signatures.slice(1)]))]
];
for(const [name,mutate] of cases)test('reject '+name,()=>{const c=fixture();mutate(c);assert.throws(()=>verifyRawSafeQuorum(c));});
