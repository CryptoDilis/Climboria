import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=process.env.V3_SOURCE_SHA;
assert.match(source??'',/^[a-f0-9]{40}$/);
const specs=[
 ['ClimbV3IntegratedTestToken.sol','ClimbV3IntegratedTestToken'],
 ['ClimbV3TestToken.sol','V3FounderVesting'],
 ['ClimbV3TestToken.sol','V3GamingVault'],
 ['ClimbV3TestToken.sol','V3InactiveReserve'],
 ['V3RestrictedSpend.sol','V3RestrictedSpend']
];
function bytes(obj){
 assert.match(obj,/^0x(?:[a-fA-F0-9]{2})+$/);
 return Buffer.from(obj.slice(2),'hex');
}
function inspect(file,name){
 const a=JSON.parse(readFileSync('out/'+file+'/'+name+'.json','utf8'));
 const creation=bytes(a.bytecode.object), runtime=bytes(a.deployedBytecode.object);
 assert.equal(Object.keys(a.bytecode.linkReferences??{}).length,0);
 assert.equal(Object.keys(a.deployedBytecode.linkReferences??{}).length,0);
 assert.ok(creation.length<=49152&&runtime.length<=24576);
 const refs=Object.values(a.deployedBytecode.immutableReferences??{}).flat().sort((a,b)=>a.start-b.start);
 let end=0;
 for(const ref of refs){
   assert.ok(Number.isSafeInteger(ref.start)&&Number.isSafeInteger(ref.length));
   assert.ok(ref.start>=end&&ref.length>0&&ref.start+ref.length<=runtime.length);
   end=ref.start+ref.length;
 }
 if(name==='ClimbV3IntegratedTestToken'){
   const constructors=a.abi.filter(x=>x.type==='constructor');
   assert.equal(constructors.length,1);
   assert.deepEqual(constructors[0].inputs.map(x=>x.type),['address','address','uint256','address[5]']);
   const funcs=a.abi.filter(x=>x.type==='function').map(x=>x.name).sort();
   assert.deepEqual(funcs,['INITIAL_SUPPLY','allowance','approve','balanceOf','burn','communityReserve','decimals','decreaseAllowance','ecosystemReserve','founderVault','gamingVault','increaseAllowance','legacyReserve','liquidityReserve','name','symbol','totalSupply','transfer','transferFrom','treasuryReserve'].sort());
   assert.ok(refs.length>0,'runtime must retain immutable reference locations');
   assert.ok(creation.length+8*32<=49152,'constructor arguments exceed initcode limit');
 }
 return {name,creationBytes:creation.length,creationSha256:sha(creation),
   runtimeTemplateBytes:runtime.length,runtimeTemplateSha256:sha(runtime),
   immutableReferenceLocations:refs};
}
const files=[...new Set(specs.map(x=>'src/'+x[0])),'foundry.toml'];
const manifest={status:'TEST_ONLY_BUILD_TEMPLATE_NO_DEPLOYMENT',sourceSha:source,chainId:84532,
  compiler:'0.8.19',foundry:'v1.5.0',openzeppelinCommit:'dc44c9f1a4c3b10af99492eed84f83ed244203f6',
  sourceFiles:Object.fromEntries(files.map(f=>[f,sha(readFileSync(f))])),
  contracts:specs.map(x=>inspect(...x)),constructorArguments:null,
  warning:'Runtime hashes are compiler templates, NOT deployed bytecode hashes. Immutable values and constructor arguments must be independently checked. No signed or unsigned transaction included.'};
writeFileSync(process.argv[2]??'v3-build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
