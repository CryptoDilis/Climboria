// Use the actual compiler source-unit key, not a flattened Foundry basename.
// Source aliases can have identical instructions but different metadata hashes.
import assert from 'node:assert/strict';
export function exactBuildUnit(builds,source,name,{astOnly=false}={}){
 const matches=builds.filter(b=>Object.hasOwn(b.output?.contracts?.[source]??{},name));
 assert.equal(matches.length,1,'missing or ambiguous compiler source unit '+source+'::'+name);
 const b=matches[0],c=b.output.contracts[source][name],ast=b.output.sources[source]?.ast;
 assert.equal(ast?.nodeType,'SourceUnit');assert.equal(ast.absolutePath,source);
 assert.ok(ast.nodes.some(n=>n.nodeType==='ContractDefinition'&&n.name===name),'missing declaration');
 if(astOnly)return {ast,source};
 const d=c.evm?.deployedBytecode;
 assert.match(d?.object??'',/^(?:0x)?(?:[0-9a-fA-F]{2})+$/,'missing runtime');
 return {artifact:{deployedBytecode:{...d,object:d.object.startsWith('0x')?d.object:'0x'+d.object}},ast,source};
}
