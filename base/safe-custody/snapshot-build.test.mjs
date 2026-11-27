import test from 'node:test';
import assert from 'node:assert/strict';
import {artifactDigest} from './snapshot-build.mjs';
const sample=()=>({abi:[],bytecode:{object:'0x6000'},deployedBytecode:{object:'0x6001',immutableReferences:{}},metadata:{compiler:{version:'0.8.19+commit.7dd6d404'},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris'}}});
test('deterministic hash and canonical object order',()=>{const a=sample(),b=sample();b.metadata.settings={evmVersion:'paris',optimizer:{runs:200,enabled:true}};assert.deepEqual(artifactDigest(a),artifactDigest(b));});
test('different bytecode, ABI, metadata or immutable ranges changes hash',()=>{const a=sample(),h=artifactDigest(a).sha256;for(const mutate of [b=>b.bytecode.object='0x6002',b=>b.abi.push({type:'function',name:'x'}),b=>b.metadata.settings.evmVersion='london',b=>b.deployedBytecode.immutableReferences={'1':[{start:0,length:32}]}]){const b=sample();mutate(b);assert.notEqual(artifactDigest(b).sha256,h);}});
test('rejects wrong compiler or optimizer and malformed artifacts',()=>{for(const mutate of [b=>b.metadata.compiler.version='0.8.20',b=>b.metadata.settings.optimizer.runs=201,b=>delete b.metadata,b=>b.bytecode.object='0x__',b=>delete b.abi]){const b=sample();mutate(b);assert.throws(()=>artifactDigest(b));}});
