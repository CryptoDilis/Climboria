import test from 'node:test';
import assert from 'node:assert/strict';
import {buildManifest} from './build-manifest.mjs';
import {prepareHandoff} from './unsigned-handoff.mjs';
const sigs=['INITIAL_TEST_SUPPLY()','allowance(address,address)','approve(address,uint256)','balanceOf(address)','burn(uint256)','decimals()','decreaseAllowance(address,uint256)','increaseAllowance(address,uint256)','name()','symbol()','totalBurned()','totalSupply()','transfer(address,uint256)','transferFrom(address,address,uint256)'];
const a=()=>({abi:[{type:'constructor',inputs:[],stateMutability:'nonpayable'},...sigs.map(s=>{const [name,v]=s.slice(0,-1).split('(');return {type:'function',name,inputs:v?v.split(',').map(type=>({type})):[]};})],bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001'}});
const payer='0x'+'1'.repeat(40),commit='a'.repeat(40),source='fixture';
function fixture(){const artifact=a(),m=buildManifest(artifact,source,commit);return {artifact,estimate:{status:'TEST_ONLY_CREATION_ESTIMATE_NO_GO',chainId:84532,sourceCommit:commit,payer,creationSha256:m.creationSha256,runtimeSha256:m.runtimeSha256,observedBlock:'0x10',blockHash:'0x'+'2'.repeat(64),executionGas:'256',gasPriceWei:'2',illustrativeL2FeeWei:'512',balanceWei:'1000',coversIllustrativeL2Fee:true}};}
const run=({artifact,estimate})=>prepareHandoff(artifact,source,commit,estimate,payer);
test('unsigned exact creation only, no fee or nonce assignment',()=>{const r=run(fixture());assert.deepEqual(r.transaction,{chainId:84532,from:payer,to:null,value:'0x0',data:'0x6000'});assert.equal(r.status,'UNSIGNED_TEST_ONLY_REVIEW_REQUIRED_NO_GO');});
test('reject wrong chain, payer, commit or compiler digest',()=>{for(const [k,v] of [['chainId',8453],['payer','0x'+'3'.repeat(40)],['sourceCommit','b'.repeat(40)],['creationSha256','0'.repeat(64)],['runtimeSha256','0'.repeat(64)]]){const f=fixture();f.estimate[k]=v;assert.throws(()=>run(f),/NO_GO/);}});
test('reject insufficient balance or inconsistent fee',()=>{for(const [k,v] of [['balanceWei','511'],['illustrativeL2FeeWei','1'],['coversIllustrativeL2Fee',false],['executionGas','0'],['observedBlock','0x0']]){const f=fixture();f.estimate[k]=v;assert.throws(()=>run(f),/NO_GO/);}});
