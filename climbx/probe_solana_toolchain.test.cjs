'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {TOOLS,probeTool,probeAll}=require('./probe_solana_toolchain.cjs');
test('probe enumerates all required Solana tools',()=>assert.deepEqual(TOOLS,['rustc','cargo','solana','solana-test-validator','anchor']));
test('missing executable fails closed',()=>assert.deepEqual(probeTool('cargo',()=>({error:Error('ENOENT'),status:null,stdout:'',stderr:''})),{name:'cargo',available:false,version:null}));
test('nonzero tool status fails closed',()=>assert.deepEqual(probeTool('solana',()=>({status:1,stdout:'',stderr:'failed'})),{name:'solana',available:false,version:null}));
test('successful version output is captured',()=>assert.deepEqual(probeTool('rustc',()=>({status:0,stdout:'rustc 1.80.0\n',stderr:''})),{name:'rustc',available:true,version:'rustc 1.80.0'}));
test('all tools must pass independently',()=>{let count=0;const tools=probeAll(()=>{count++;return {status:0,stdout:'test version\n',stderr:''}});assert.equal(count,TOOLS.length);assert.equal(tools.length,TOOLS.length);assert.ok(tools.every(x=>x.available));});
test('thrown runner error fails closed',()=>assert.equal(probeTool('anchor',()=>{throw Error('runner failure')}).available,false));


test('zero exit without version output is not readiness evidence',()=>assert.deepEqual(probeTool('solana',()=>({status:0,stdout:'',stderr:''})),{name:'solana',available:false,version:null}));
test('whitespace-only output is not readiness evidence',()=>assert.deepEqual(probeTool('anchor',()=>({status:0,stdout:'  \n',stderr:''})),{name:'anchor',available:false,version:null}));
test('version command receives bounded timeout and no shell',()=>{
 let args;
 const result=probeTool('cargo',(name,argv,options)=>{args={name,argv,options};return {status:0,stdout:'cargo 1.80',stderr:''}});
 assert.equal(result.available,true);
 assert.equal(args.name,'cargo');
 assert.deepEqual(args.argv,['--version']);
 assert.equal(args.options.timeout,10000);
 assert.equal(args.options.shell,undefined);
});
