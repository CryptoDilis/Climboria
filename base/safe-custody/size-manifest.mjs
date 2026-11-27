// Test-only template size evidence, no public deployment or gas estimate.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const specs=[
 ['Safe.sol','Safe',0],
 ['SafeProxy.sol','SafeProxy',1],
 ['SafeEpochGuardFixture.sol','SafeEpochGuardFixture',2],
 ['SafeEpochGuardFixture.sol','SafeGuardBootstrapFixture',0],
 ['SafeEpochGuardFixture.sol','GuardedSafeFactoryFixture',0],
 ['SafeReserveGuardFixture.sol','SafeReserveGuardFixture',3],
 ['SafeReserveGuardFixture.sol','SafeReserveFactoryFixture',0]
];
const bytes=x=>{assert.match(x,/^0x(?:[0-9a-fA-F]{2})+$/);return Buffer.from(x.slice(2),'hex');};
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.match(process.env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
const contracts=specs.map(([file,name,words])=>{
 const a=JSON.parse(readFileSync('out/'+file+'/'+name+'.json','utf8'));
 const init=bytes(a.bytecode.object),runtime=bytes(a.deployedBytecode.object);
 const args=a.abi.find(x=>x.type==='constructor')?.inputs??[];
 assert.equal(args.length,words,name+' constructor arity');
 assert.ok(args.every(x=>x.type==='address'),name+' static address constructor args');
 assert.equal(Object.keys(a.bytecode.linkReferences??{}).length,0);
 assert.equal(Object.keys(a.deployedBytecode.linkReferences??{}).length,0);
 const initcodeBytes=init.length+32*words;
 assert.ok(initcodeBytes<=49152,name+' initcode size');
 assert.ok(runtime.length<=24576,name+' runtime size');
 return {name,initcodeBytes,runtimeBytes:runtime.length,creationSha256:hash(init),runtimeTemplateSha256:hash(runtime)};
});
const manifest={status:'SAFE_TEST_ONLY_SIZE_OBSERVATION',sourceSha:process.env.GITHUB_SHA,safeSource:'bf943f80fec5ac647159d26161446ac5d716a294',openzeppelinSource:'dc44c9f1a4c3b10af99492eed84f83ed244203f6',contracts,caveat:'Compiled local templates only, not official deployed Safe runtime, actual deployment, gas or approval.'};
writeFileSync(process.argv[2],JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
