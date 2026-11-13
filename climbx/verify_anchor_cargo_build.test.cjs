'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyCargoBuild}=require('./verify_anchor_cargo_build.cjs');
test('successful offline Cargo check is compilation only, never deployment',()=>{
 const result=verifyCargoBuild((name,args,options)=>{
  assert.equal(name,'cargo');
  assert.deepEqual(args.slice(0,3),['check','--locked','--offline']);
  assert.equal(options.env.CARGO_NET_OFFLINE,'true');
  assert.equal(options.timeout,120000);
  return {status:0};
 });
 assert.deepEqual(result,{compiled:true,mayExecute:false,safeForDeployment:false,reason:'LOCAL_CARGO_CHECK_ONLY'});
});
test('missing Cargo fails closed',()=>assert.equal(verifyCargoBuild(()=>({error:Error('ENOENT'),status:null})).reason,'CARGO_CHECK_UNAVAILABLE'));
test('failed Cargo check fails closed',()=>assert.equal(verifyCargoBuild(()=>({status:101})).reason,'CARGO_CHECK_FAILED'));
test('killed Cargo check fails closed',()=>assert.equal(verifyCargoBuild(()=>({status:null,signal:'SIGTERM'})).compiled,false));
test('hostile runner throws fail closed',()=>assert.equal(verifyCargoBuild(()=>{throw Error('bad')}).compiled,false));
test('invalid runner fails closed',()=>assert.equal(verifyCargoBuild(null).reason,'INVALID_RUNNER'));
