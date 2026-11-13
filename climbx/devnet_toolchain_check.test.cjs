const test=require('node:test');
const assert=require('node:assert/strict');
const {REQUIRED,evaluateToolchain,checkToolchain}=require('./devnet_toolchain_check.cjs');
test('missing toolchain always blocks and never enables real funds',()=>{
 const result=evaluateToolchain({});
 assert.equal(result.status,'BLOCKED');
 assert.deepEqual(result.missing,REQUIRED);
 assert.equal(result.realFundsAllowed,false);
});
test('even fully installed toolchain is not verified chain authorization',()=>{
 const result=evaluateToolchain(Object.fromEntries(REQUIRED.map(k=>[k,{ok:true,version:'mock'}])));
 assert.equal(result.status,'TOOLCHAIN_PRESENT_NOT_CHAIN_VERIFIED');
 assert.deepEqual(result.missing,[]);
 assert.equal(result.realFundsAllowed,false);
});
test('nonzero command exit blocks readiness',()=>{
 const result=checkToolchain(()=>({status:127,stdout:'',stderr:'missing'}));
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.missing.length,REQUIRED.length);
});
test('spawn failure blocks readiness',()=>{
 const result=checkToolchain(()=>{throw new Error('missing executable')});
 assert.equal(result.status,'BLOCKED');
});
test('a successful probe reports versions but cannot authorize trading',()=>{
 const result=checkToolchain((name)=>({status:0,stdout:name+' version 1.0',stderr:''}));
 assert.equal(result.status,'TOOLCHAIN_PRESENT_NOT_CHAIN_VERIFIED');
 assert.equal(result.tools.solana.version,'solana version 1.0');
 assert.equal(result.realFundsAllowed,false);
});
