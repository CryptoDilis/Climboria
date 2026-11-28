// Local-only same-build provenance for the seven reserve vaults and four
// supporting contracts. Fixture configuration is not a production trust root.
import assert from 'node:assert/strict';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const textWord=s=>'0x'+Buffer.from(s,'utf8').toString('hex').padEnd(64,'0');
const prefix=(name,fields)=>Object.fromEntries(Object.entries(fields).map(([k,v])=>[name+'.'+k,v]));
export async function verifyLocalVaultRuntime(x){
 const {verifyNamed,verify,ast,cast,call,address,number,requireCode,successor,token,guard,quote,lp,founder,distributor,start,vaults,amounts,contracts}=x;
 const [vesting,gaming,liquidity,ecosystem,community,treasury,legacy]=vaults.map(v=>v.address);
 const guardHash=contracts.guard.runtimeKeccak256;
 const verified={};
 const named=async(label,file,name,at,fields,extraAsts=[],extraFields={})=>{
  const result=await verifyNamed(file,name,at,[ast(file,name),...extraAsts],{...prefix(name,fields),...extraFields});
  assert.equal(result.namedImmutableRolesMatched,true);verified[label]=result;
 };
 await named('founder','ClimbV3TestToken.sol','V3FounderVesting',vesting,{token,beneficiary:founder,start:word(start)});
 const rewardName='CLIMB V3 Governed Synthetic Game Rewards',version='2';
 assert.ok(Buffer.byteLength(rewardName)>31);
 const utfHash=s=>cast('keccak','0x'+Buffer.from(s,'utf8').toString('hex'));
 const hashedName=utfHash(rewardName),hashedVersion=utfHash(version);
 const domainType=utfHash('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
 const domain=cast('keccak',cast('abi-encode','f(bytes32,bytes32,bytes32,uint256,address)',domainType,hashedName,hashedVersion,'84532',gaming));
 const shortVersion='0x'+Buffer.from(version).toString('hex').padEnd(62,'0')+'01';
 await named('gaming','V3GovernedGameRewardFixture.sol','V3GovernedGameRewardFixture',gaming,{token,custody:guard,custodyHash:guardHash,excludedFounder:founder,start:word(start),walletMonthlyCap:word(1000)},[ast('EIP712.sol','EIP712')],prefix('EIP712',{_cachedDomainSeparator:domain,_cachedChainId:word(84532),_cachedThis:gaming,_hashedName:hashedName,_hashedVersion:hashedVersion,_name:word(255),_version:shortVersion}));
 assert.equal(await address(gaming,'distributor()'),distributor);
 const expectedDomain=cast('abi-encode','f(bytes1,string,string,uint256,address,bytes32,uint256[])','0x0f',rewardName,version,'84532',gaming,word(0),'[]');
 assert.equal(await call(gaming,'eip712Domain()'),expectedDomain);
 const pool=await address(liquidity,'pool()'),poolCode=await requireCode(pool);
 await named('syntheticPool','SafeReserveGuard.t.sol','ReservePool',pool,{asset:token,quote});
 await named('liquidity','V3DeferredLiquidityFixture.sol','V3DeferredLiquidityFixture',liquidity,{asset:token,quote,pool,custody:guard,lpCustody:lp,poolCodeHash:poolCode.runtimeKeccak256,custodyCodeHash:guardHash,lpCustodyCodeHash:contracts.syntheticLPDestination.runtimeKeccak256,trancheCap:word(1000)});
 const factory=await address(successor,'expenses()'),registry=await address(factory,'registry()');
 await named('expenseFactory','V3EpochSpendFixture.sol','V3EpochPolicyFactory',factory,{registry,ecosystem,community,treasury});
 await named('expenseRegistry','V3SharedExpenseFixture.sol','V3SharedExpenseRegistry',registry,{binder:factory});
 assert.equal(await number(registry,'isSealed()'),1n);
 for(const [i,label,at] of [[3,'ECOSYSTEM',ecosystem],[4,'COMMUNITY',community],[5,'TREASURY',treasury]]){
  await named(label.toLowerCase(),'V3EpochSpendFixture.sol','V3EpochSpendFixture',at,{token,custody:guard,registry,custodyCodeHash:guardHash,budget:word(amounts[i]),start:word(start),excludedFounder:founder,purpose:textWord(label)});
  assert.equal(await number(registry,'consumer(address)',at),1n);
 }
 const verifier=await address(legacy,'verifier()'),verifierCode=await requireCode(verifier);
 verified.legacyVerifier=await verify('V3LegacyProofVerifierFixture.sol','V3LegacyProofVerifierFixture',verifier);
 await named('legacy','V3LegacyProofClaimFixture.sol','V3LegacyProofClaimFixture',legacy,{token,custody:guard,verifier,custodyHash:guardHash,verifierHash:verifierCode.runtimeKeccak256});
 assert.equal(new Set([...vaults.map(v=>v.address),pool,factory,registry,verifier]).size,11);
 assert.equal(Object.keys(verified).length,11);
 // Re-run an actual expense runtime against a deliberately altered budget.
 await assert.rejects(()=>verifyNamed('V3EpochSpendFixture.sol','V3EpochSpendFixture',ecosystem,[ast('V3EpochSpendFixture.sol','V3EpochSpendFixture')],prefix('V3EpochSpendFixture',{token,custody:guard,registry,custodyCodeHash:guardHash,budget:word(amounts[3]+1n),start:word(start),excludedFounder:founder,purpose:textWord('ECOSYSTEM')})),/wrong immutable role/);
 return {status:'LOCAL_VAULT_RUNTIME_PROVENANCE_ONLY_NO_GO',verifiedCount:11,sevenVaultsMatched:true,rewardDomainMatched:true,wrongBudgetRejected:true,verified};
}
