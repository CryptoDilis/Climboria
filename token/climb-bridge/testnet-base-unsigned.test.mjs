import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareUnsignedTestToken} from './testnet-base/prepare-unsigned.mjs';
const commit='a'.repeat(40);
function fixture(){
 const defs=[['bindManager',['address']],['mint',['address','uint256']],['burn',['uint256']],['decimals',[]],['totalSupply',[]],['binder',[]],['manager',[]]];
 return {abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'},...defs.map(([name,types])=>({type:'function',name,inputs:types.map(type=>({type}))}))],bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001'}};
}
test('artifact has no sender, signature or gas and is Base Sepolia only',()=>{
 const r=prepareUnsignedTestToken(fixture(),commit,'fixture');
 assert.deepEqual(r.unsigned,{chainId:84532,to:null,value:'0x0',data:'0x6000'});
 assert.equal(r.bridgeRelease,'NO_GO');assert.equal(r.creationBytes,2);
 assert.match(r.creationSha256,/^[0-9a-f]{64}$/);
});
test('reject missing bytecode, unresolved libraries, wrong constructor and missing mint interface',()=>{
 const a=fixture();a.bytecode.object='0x';assert.throws(()=>prepareUnsignedTestToken(a,commit,'fixture'));
 const b=fixture();b.bytecode.object='0x__$lib$__';assert.throws(()=>prepareUnsignedTestToken(b,commit,'fixture'));
 const c=fixture();c.abi[0].inputs=[{type:'address'}];assert.throws(()=>prepareUnsignedTestToken(c,commit,'fixture'));
 const d=fixture();d.abi=d.abi.filter(x=>x.name!=='mint');assert.throws(()=>prepareUnsignedTestToken(d,commit,'fixture'));
 assert.throws(()=>prepareUnsignedTestToken(fixture(),'main','fixture'));
});
