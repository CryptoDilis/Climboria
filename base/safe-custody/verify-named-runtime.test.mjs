import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyNamedRuntime} from './verify-named-runtime.mjs';
const a=n=>'0x'+BigInt(n).toString(16).padStart(40,'0'),w=n=>BigInt(n).toString(16).padStart(64,'0');
const artifact=()=>({deployedBytecode:{object:'0x60'+w(0)+'61'+w(0)+'62'+w(0)+'63',immutableReferences:{'10':[{start:1,length:32},{start:67,length:32}],'21':[{start:34,length:32}]},linkReferences:{}}});
const ast=()=>[{nodeType:'SourceUnit',nodes:[{nodeType:'ContractDefinition',name:'Base',nodes:[{nodeType:'VariableDeclaration',mutability:'immutable',name:'wallet',id:10}]},{nodeType:'ContractDefinition',name:'Child',nodes:[{nodeType:'VariableDeclaration',mutability:'immutable',name:'hash',id:21}]}]}];
const runtime=(a=2,b=3,c=2)=>'0x60'+w(a)+'61'+w(b)+'62'+w(c)+'63';
const expected=()=>({'Base.wallet':a(2),'Child.hash':'0x'+w(3)});
test('bind inherited address and hash by declaration ID and repeated offsets',()=>{
 const out=verifyNamedRuntime(artifact(),runtime(),ast(),expected());
 assert.equal(out.namedImmutableRolesMatched,true);assert.deepEqual(out.immutableRoleIds,{'Base.wallet':'10','Child.hash':'21'});
});
for(const [name,mutate] of [
 ['swapped roles',x=>x.runtime=runtime(3,2,3)],
 ['inconsistent repeated role',x=>x.runtime=runtime(2,3,4)],
 ['unexpected runtime byte',x=>x.runtime=x.runtime.slice(0,-2)+'64'],
 ['missing AST declaration',x=>x.ast[0].nodes.pop()],
 ['duplicate AST declaration',x=>x.ast.push(structuredClone(x.ast[0]))],
 ['unknown compiler ID',x=>{x.artifact.deployedBytecode.immutableReferences['22']=x.artifact.deployedBytecode.immutableReferences['21'];delete x.artifact.deployedBytecode.immutableReferences['21'];}],
 ['missing expected role',x=>delete x.expected['Child.hash']],
 ['overlapping slot',x=>x.artifact.deployedBytecode.immutableReferences['21'][0].start=1],
 ['nonzero template slot',x=>x.artifact.deployedBytecode.object='0x60'+w(1)+x.artifact.deployedBytecode.object.slice(68)],
 ['invalid expected value',x=>x.expected['Child.hash']='0x1234']
])test('reject '+name,()=>{const x={artifact:artifact(),runtime:runtime(),ast:ast(),expected:expected()};mutate(x);assert.throws(()=>verifyNamedRuntime(x.artifact,x.runtime,x.ast,x.expected));});
