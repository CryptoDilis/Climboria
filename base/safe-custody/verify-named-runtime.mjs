// Review-only exact immutable role binding. AST declaration IDs are derived from
// the same clean compiler build as the runtime artifact, never guessed or sorted.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const bytes=x=>{assert.match(x,/^0x(?:[0-9a-fA-F]{2})+$/);return Buffer.from(x.slice(2),'hex');};
const sha=b=>createHash('sha256').update(b).digest('hex');
export function verifyNamedRuntime(artifact,actualCode,sourceAsts,expected){
 const d=artifact.deployedBytecode;
 assert.equal(Object.keys(d.linkReferences??{}).length,0,'unresolved links');
 const template=bytes(d.object),actual=bytes(actualCode);
 assert.equal(template.length,actual.length,'runtime length');
 const names=new Map(),ids=new Set();
 assert.ok(Array.isArray(sourceAsts)&&sourceAsts.length>0);
 for(const ast of sourceAsts){
  assert.equal(ast?.nodeType,'SourceUnit');assert.ok(Array.isArray(ast.nodes));
  for(const c of ast.nodes.filter(n=>n.nodeType==='ContractDefinition')){
   for(const v of c.nodes.filter(n=>n.nodeType==='VariableDeclaration'&&n.mutability==='immutable')){
    assert.ok(Number.isSafeInteger(v.id)&&v.id>=0);
    const key=c.name+'.'+v.name;
    if(!Object.hasOwn(expected,key))continue;
    assert.ok(!names.has(key)&&!ids.has(String(v.id)),'ambiguous immutable declaration');
    names.set(key,String(v.id));ids.add(String(v.id));
   }
  }
 }
 const refs=d.immutableReferences??{};
 assert.equal(names.size,Object.keys(expected).length,'missing immutable declaration');
 assert.deepEqual(Object.keys(refs).sort(),[...ids].sort(),'unexpected immutable IDs');
 const normalized=Buffer.from(actual),occupied=new Set(),roleIds={};
 for(const [name,id] of names){
  const value=expected[name];assert.match(value,/^0x(?:[0-9a-f]{40}|[0-9a-f]{64})$/);
  assert.notEqual(BigInt(value),0n);
  const word=value.slice(2).padStart(64,'0');
  assert.ok(Array.isArray(refs[id])&&refs[id].length>0,'empty immutable group');
  for(const {start,length} of refs[id]){
   assert.ok(Number.isSafeInteger(start)&&start>=0&&length===32&&start+length<=template.length,'invalid immutable range');
   for(let i=start;i<start+length;i++){assert.ok(!occupied.has(i),'overlapping immutable');occupied.add(i);}
   assert.equal(template.subarray(start,start+length).toString('hex'),'0'.repeat(64),'nonzero template slot');
   assert.equal(actual.subarray(start,start+length).toString('hex'),word,'wrong immutable role '+name);
   template.copy(normalized,start,start,start+length);
  }
  roleIds[name]=id;
 }
 assert.deepEqual(normalized,template,'runtime differs outside immutable slots');
 return {runtimeSha256:sha(actual),runtimeTemplateSha256:sha(template),immutableGroups:names.size,immutableRoleIds:roleIds,namedImmutableRolesMatched:true};
}
