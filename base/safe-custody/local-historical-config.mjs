// Review-only local historical configuration evidence. Not a public RPC trust root.
// The expected runtime hashes come from the preceding isolated deployment rehearsal,
// not from an independently approved production manifest.
import assert from 'node:assert/strict';
const GUARD='0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8';
const FALLBACK='0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5';
const word=n=>BigInt(n).toString(16).padStart(64,'0');
const encodedAddress=a=>'0x'+word(a);
const ZERO='0x'+word(0);
export async function verifyLocalHistoricalConfig(x,block){
 const {rpc,cast,calldata,wallet,guard,token,quote,vaults,contracts}=x;
 assert.match(block.hash,/^0x[0-9a-f]{64}$/);
 assert.match(block.number,/^0x(?:0|[1-9a-f][0-9a-f]*)$/);
 const tag=block.number;
 const at=async(to,sig,...args)=>rpc('eth_call',[{to,data:calldata(sig,...args)},tag]);
 const expectAddress=async(to,sig,expected,...args)=>assert.equal(await at(to,sig,...args),encodedAddress(expected));
 const expectHash=async(to,sig,expected,...args)=>assert.equal(await at(to,sig,...args),expected);
 const expectCode=async manifest=>{
  assert.match(manifest.address,/^0x[0-9a-f]{40}$/);assert.match(manifest.runtimeKeccak256,/^0x[0-9a-f]{64}$/);
  const raw=await rpc('eth_getCode',[manifest.address,tag]);
  assert.match(raw,/^0x(?:[0-9a-f]{2})+$/);
  assert.equal((raw.length-2)/2,manifest.runtimeBytes);
  assert.equal(cast('keccak',raw),manifest.runtimeKeccak256);
 };
 assert.equal((await rpc('eth_getBlockByNumber',[tag,false])).hash,block.hash);
 assert.equal(contracts.wallet.address,wallet);assert.equal(contracts.guard.address,guard);assert.equal(contracts.token.address,token);
 assert.equal(contracts.syntheticQuote.address,quote);
 assert.equal(vaults.length,7);
 const selected=[contracts.wallet,contracts.guard,contracts.singleton,contracts.token,contracts.successorFactory,contracts.syntheticQuote,contracts.setupFactory,contracts.bootstrap,contracts.guardDeployer,contracts.conditionalHelper,contracts.legacyDeployer,contracts.coreDeployer,...vaults];
 assert.equal(new Set(selected.map(v=>v.address)).size,selected.length);
 for(const m of selected)await expectCode(m);
 const singleton=contracts.singleton.address,successor=contracts.successorFactory.address;
 assert.equal(await rpc('eth_getStorageAt',[wallet,'0x0',tag]),encodedAddress(singleton));
 assert.equal(await rpc('eth_getStorageAt',[wallet,GUARD,tag]),encodedAddress(guard));
 assert.equal(await rpc('eth_getStorageAt',[wallet,FALLBACK,tag]),ZERO);
 await expectAddress(wallet,'masterCopy()',singleton);
 // ABI return (address[] empty, address next=sentinel): offset, next, array length.
 assert.equal(await at(wallet,'getModulesPaginated(address,uint256)','0x0000000000000000000000000000000000000001',1),'0x'+word(64)+word(1)+word(0));
 assert.equal(await at(guard,'validateConfig()'),'0x');
 await expectAddress(guard,'wallet()',wallet);
 await expectAddress(guard,'singleton()',singleton);
 await expectHash(guard,'proxyHash()',contracts.wallet.runtimeKeccak256);
 await expectHash(guard,'singletonHash()',contracts.singleton.runtimeKeccak256);
 await expectAddress(guard,'successor()',successor);
 await expectHash(guard,'successorHash()',contracts.successorFactory.runtimeKeccak256);
 await expectAddress(guard,'asset()',token);
 const setup=contracts.setupFactory.address,helper=contracts.conditionalHelper.address;
 await expectAddress(setup,'singleton()',singleton);
 await expectAddress(setup,'bootstrap()',contracts.bootstrap.address);
 await expectAddress(setup,'guardDeployer()',contracts.guardDeployer.address);
 await expectHash(setup,'guardDeployerHash()',contracts.guardDeployer.runtimeKeccak256);
 await expectAddress(contracts.guardDeployer.address,'factory()',setup);
 await expectAddress(successor,'guardFactory()',setup);
 await expectHash(successor,'guardFactoryHash()',contracts.setupFactory.runtimeKeccak256);
 await expectAddress(successor,'configuredGuard()',guard);
 await expectHash(successor,'configuredGuardHash()',contracts.guard.runtimeKeccak256);
 await expectAddress(successor,'conditional()',helper);
 await expectHash(successor,'conditionalHash()',contracts.conditionalHelper.runtimeKeccak256);
 await expectAddress(successor,'core()',contracts.coreDeployer.address);
 await expectAddress(helper,'legacyDeployer()',contracts.legacyDeployer.address);
 await expectHash(helper,'legacyDeployerHash()',contracts.legacyDeployer.runtimeKeccak256);
 await expectAddress(contracts.legacyDeployer.address,'factory()',helper);
 await expectAddress(successor,'token()',token);
 await expectAddress(token,'issuer()',successor);
 assert.equal(await at(successor,'used()'),'0x'+word(1));
 assert.equal(await at(token,'issued()'),'0x'+word(1));
 assert.equal(await at(guard,'bound()'),'0x'+word(1));
 assert.equal(await at(guard,'transactionActive()'),ZERO);
 for(let i=0;i<7;i++){
  await expectAddress(guard,'destinations(uint256)',vaults[i].address,i);
  await expectHash(guard,'destinationHashes(uint256)',vaults[i].runtimeKeccak256,i);
  await expectAddress(successor,'vaults(uint256)',vaults[i].address,i);
 }
 for(const i of [3,4,5]){
  const v=vaults[i].address;
  await expectAddress(v,'token()',token);await expectAddress(v,'custody()',guard);
  await expectHash(v,'custodyCodeHash()',contracts.guard.runtimeKeccak256);
 }
 const liquidity=vaults[2].address;
 await expectAddress(liquidity,'asset()',token);await expectAddress(liquidity,'quote()',quote);
 await expectAddress(liquidity,'custody()',guard);
 await expectHash(liquidity,'custodyCodeHash()',contracts.guard.runtimeKeccak256);
 assert.equal((await rpc('eth_getBlockByNumber',[tag,false])).hash,block.hash);
 return {status:'LOCAL_CONFIG_MATCH_ONLY_NO_GO',blockHash:block.hash,blockNumber:tag,checkedRuntimeCount:selected.length,guardSlotMatched:true,fallbackDisabled:true,modulesEmpty:true,vaultBindingsMatched:true,helperBindingsMatched:true};
}
