// Exact runtime template comparison, with only compiler-declared address immutables substituted.
// This is evidence relative to an independently authenticated compiler artifact, not an audit.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const bytes=x=>{assert.match(x,/^0x(?:[0-9a-fA-F]{2})+$/);return Buffer.from(x.slice(2),'hex');};
const sha=b=>createHash('sha256').update(b).digest('hex');
export function verifyRuntime(artifact,actualCode,expectedAddresses=[]){
 const d=artifact.deployedBytecode;
 assert.equal(Object.keys(d.linkReferences??{}).length,0,'unresolved links');
 const template=bytes(d.object),actual=bytes(actualCode);
 assert.equal(actual.length,template.length,'runtime length');
 const expected=new Set(expectedAddresses.map(x=>{assert.match(x,/^0x[0-9a-fA-F]{40}$/);assert.notEqual(BigInt(x),0n);return x.slice(2).toLowerCase().padStart(64,'0');}));
 assert.equal(expected.size,expectedAddresses.length,'duplicate expected address');
 const groups=Object.values(d.immutableReferences??{});
 assert.equal(groups.length,expected.size,'unexpected immutable groups');
 const normalized=Buffer.from(actual),occupied=new Set(),seen=new Set();
 for(const refs of groups){
  assert.ok(Array.isArray(refs)&&refs.length>0,'empty immutable group');
  let value;
  for(const {start,length} of refs){
   assert.ok(Number.isSafeInteger(start)&&start>=0&&length===32&&start+length<=template.length,'invalid immutable range');
   for(let i=start;i<start+length;i++){assert.ok(!occupied.has(i),'overlapping immutable');occupied.add(i);}
   assert.equal(template.subarray(start,start+length).toString('hex'),'0'.repeat(64),'nonzero template slot');
   const word=actual.subarray(start,start+length).toString('hex');
   assert.ok(expected.has(word),'unexpected immutable address');
   if(value===undefined)value=word;else assert.equal(word,value,'inconsistent immutable group');
   template.copy(normalized,start,start,start+length);
  }
  assert.ok(!seen.has(value),'duplicate immutable group value');seen.add(value);
 }
 assert.deepEqual(normalized,template,'runtime differs outside immutable slots');
 return {runtimeSha256:sha(actual),runtimeTemplateSha256:sha(template),immutableGroups:groups.length};
}
