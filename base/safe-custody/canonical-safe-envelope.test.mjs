import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {decodeDirectSafeEnvelope,deriveDirectSafeDigest} from './canonical-safe-envelope.mjs';
const cast=(...args)=>execFileSync('cast',args,{encoding:'utf8'}).trim();
const a=n=>'0x'+BigInt(n).toString(16).padStart(40,'0'),w=n=>BigInt(n).toString(16).padStart(64,'0');
const sig='execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)';
const fake='0x'+(w(1)+w(2)+'1b').repeat(3);
const make=(kind='expense')=>{
 const data=kind==='expense'?'0x6e2e6b4c'+w(1).repeat(9):'0xae7b6095'+w(1).repeat(8);
 return {data,input:cast('calldata',sig,a(4),'0',data,'0','0','0','0',a(0),a(0),fake)};
};
for(const kind of ['expense','liquidity'])test('canonical '+kind+' envelope and EIP712 digest',()=>{
 const {data,input}=make(kind),out=deriveDirectSafeDigest(input,84532,a(3),'0x1');
 assert.equal(out.intent.data,data);assert.equal(out.intent.to,a(4));
 const domain=cast('keccak',cast('abi-encode','f(bytes32,uint256,address)','0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218','84532',a(3)));
 const struct=cast('keccak',cast('abi-encode','f(bytes32,address,uint256,bytes32,uint8,uint256,uint256,uint256,address,address,uint256)','0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8',a(4),'0',cast('keccak',data),'0','0','0','0',a(0),a(0),'1'));
 assert.equal(out.safeTxHash,cast('keccak','0x1901'+domain.slice(2)+struct.slice(2)));
 assert.notEqual(out.safeTxHash,deriveDirectSafeDigest(input,84532,a(3),'0x2').safeTxHash);
 assert.notEqual(out.safeTxHash,deriveDirectSafeDigest(input,84532,a(8),'0x1').safeTxHash);
});
const set=(x,i,n)=>x.slice(0,10+i*64)+w(n)+x.slice(10+(i+1)*64);
const byte=(x,p,s)=>x.slice(0,10+p*2)+s+x.slice(12+p*2);
for(const [name,mutate] of [
 ['selector',x=>'0xdeadbeef'+x.slice(10)],
 ['trailing word',x=>x+w(0)],
 ['truncated',x=>x.slice(0,-2)],
 ['target upper bits',x=>set(x,0,2n**160n+4n)],
 ['zero target',x=>set(x,0,0)],
 ['value',x=>set(x,1,1)],
 ['data offset',x=>set(x,2,352)],
 ['delegatecall',x=>set(x,3,1)],
 ['safeTxGas',x=>set(x,4,1)],
 ['baseGas',x=>set(x,5,1)],
 ['gasPrice',x=>set(x,6,1)],
 ['gasToken',x=>set(x,7,1)],
 ['refundReceiver',x=>set(x,8,1)],
 ['signature offset',x=>set(x,9,640)],
 ['inner length',x=>set(x,10,291)],
 ['inner selector',x=>byte(x,352,'ff')],
 ['inner padding',x=>byte(x,644,'01')],
 ['signature length',x=>set(x,21,194)],
 ['signature mode',x=>byte(x,704+64,'00')],
 ['signature padding',x=>byte(x,704+195,'01')]
])test('reject noncanonical '+name,()=>assert.throws(()=>decodeDirectSafeEnvelope(mutate(make().input))));
test('reject wrong domain and malformed nonce',()=>{
 const {input}=make();
 for(const [chain,safe,nonce] of [[8453,a(3),'0x1'],[84532,a(0),'0x1'],[84532,a(3),'0x01']])assert.throws(()=>deriveDirectSafeDigest(input,chain,safe,nonce));
});
