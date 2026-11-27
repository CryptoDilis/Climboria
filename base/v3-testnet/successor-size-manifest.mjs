// Test-only successor build size evidence; no deployment or gas estimate.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const specs=[
 ['V3AtomicSuccessorFixture.sol','V3AtomicSuccessorFixture',0],
 ['V3AtomicSuccessorFixture.sol','V3SuccessorTestToken',0],
 ['V3AtomicSuccessorFixture.sol','V3SuccessorCoreDeployer',0],
 ['V3AtomicSuccessorFixture.sol','V3SuccessorConditionalDeployer',0],
 ['ClimbV3TestToken.sol','V3FounderVesting',3],
 ['V3GameRewardFixture.sol','V3GameRewardFixture',5],
 ['V3EpochSpendFixture.sol','V3EpochPolicyFactory',4],
 ['V3EpochSpendFixture.sol','V3EpochSpendFixture',7],
 ['V3SharedExpenseFixture.sol','V3SharedExpenseRegistry',0],
 ['V3DeferredLiquidityFixture.sol','V3DeferredLiquidityFixture',6],
 ['V3LiquidityPolicyFixture.sol','V3SyntheticLPLock',3],
 ['V3DeferredLegacyFixture.sol','V3DeferredLegacyFixture',2]
];
const digest=x=>createHash('sha256').update(x).digest('hex');
const bytes=x=>{assert.match(x,/^0x(?:[0-9a-fA-F]{2})+$/);return Buffer.from(x.slice(2),'hex');};
assert.match(process.env.V3_SOURCE_SHA??'',/^[a-f0-9]{40}$/);
const contracts=specs.map(([file,name,words])=>{
 const a=JSON.parse(readFileSync('out/'+file+'/'+name+'.json','utf8'));
 const init=bytes(a.bytecode.object), runtime=bytes(a.deployedBytecode.object);
 const args=a.abi.find(x=>x.type==='constructor')?.inputs??[];
 assert.equal(args.length,words,name+' constructor arity');
 assert.ok(args.every(x=>['address','bytes32','uint256'].includes(x.type)),name+' static constructor arguments');
 assert.equal(Object.keys(a.bytecode.linkReferences??{}).length,0);
 assert.equal(Object.keys(a.deployedBytecode.linkReferences??{}).length,0);
 const initcodeBytes=init.length+32*words;
 assert.ok(initcodeBytes<=49152,name+' initcode size');
 assert.ok(runtime.length<=24576,name+' runtime size');
 return {name,initcodeBytes,runtimeBytes:runtime.length,creationSha256:digest(init),runtimeTemplateSha256:digest(runtime)};
});
const manifest={status:'SUCCESSOR_TEST_ONLY_SIZE_OBSERVATION',sourceSha:process.env.V3_SOURCE_SHA,chainId:84532,contracts,caveat:'Compiler template sizes plus static constructor arguments; not a gas estimate, actual deployment, audit or production approval. External synthetic pool and custody dependencies are not included.'};
writeFileSync(process.argv[2],JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
