import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkConfig,checkFrozenArtifacts,prepareStageOne,isDisposableRole} from './testnet-preflight.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const pin=read('./frozen-testnet-candidate.json'),example=read('./testnet-preflight.example.json');
const now=1795820000;
const addr=n=>'0x'+(0x100000n+BigInt(n)).toString(16).padStart(40,'0');
const cfg=()=>({...example,deployer:addr(1),owners:[2,3,4,5,6].map(addr),founder:addr(7),distributor:addr(8),startTimestamp:now+86400*7,gamingWalletMonthlyCapRaw:'1000',liquidityTrancheCapRaw:'1000',maxTotalFeeWei:'1000000000000000',signerControlEvidenceSha256:'1'.repeat(64),independentReviewEvidenceSha256:'2'.repeat(64),recoveryAcceptanceEvidenceSha256:'3'.repeat(64),configurationApprovalEvidenceSha256:'4'.repeat(64)});
const artifacts=()=>pin.contracts.map(x=>read('./out/SafeQuorumIssuanceFixture.sol/'+x.name+'.json'));
test('rejects all newly used deterministic rehearsal signer identities',()=>{
 for(const a of ['0x6c45cac6f23b5c34a2a403022bd3613a532a2c27','0xae0478140036d14e93a7b7482512e1d91745b650','0xc2c2173833e552e94246afeecc152f28c0b7fe40'])assert.equal(isDisposableRole(a),true);
});
if(pin.status==='RETIRED_PENDING_VERIFIED_REPIN'){
 test('retired pin rejects even structurally complete config and actual compiled artifacts',()=>{
  assert.throws(()=>checkConfig(cfg(),now),/retired candidate/);
  assert.throws(()=>checkFrozenArtifacts(artifacts()),/retired candidate/);
  assert.throws(()=>prepareStageOne(artifacts(),cfg(),now),/retired candidate/);
 });
}else{
 test('empty checked-in config is blocked',()=>assert.throws(()=>checkConfig(example,now)));
test('mainnet, retired source, wrong source and mode rejected',()=>{for(const patch of [{chainId:8453},{sourceSha:pin.supersedes?.sourceSha??'b'.repeat(40)},{sourceSha:'a'.repeat(40)},{testOnly:false}])assert.throws(()=>checkConfig({...cfg(),...patch},now));});
test('duplicate case-insensitive role or owner rejected',()=>{const c=cfg();c.founder=c.owners[0].toUpperCase().replace('0X','0x');assert.throws(()=>checkConfig(c,now));});
test('known disposable local account and zero rejected',()=>{for(const deployer of ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266','0x'+'0'.repeat(40)])assert.throws(()=>checkConfig({...cfg(),deployer},now));});
test('invalid caps, time, fee or evidence rejected',()=>{for(const patch of [{startTimestamp:now},{liquidityTrancheCapRaw:'222222222000001'},{gamingWalletMonthlyCapRaw:'0'},{maxTotalFeeWei:'0'},{independentReviewEvidenceSha256:null},{recoveryAcceptanceEvidenceSha256:'0'.repeat(64)}])assert.throws(()=>checkConfig({...cfg(),...patch},now));});
test('unknown fields rejected without reading secrets',()=>assert.throws(()=>checkConfig({...cfg(),privateKey:'not-a-real-key'},now)));
test('structurally valid references remain NO_GO',()=>{const x=checkConfig(cfg(),now);assert.equal(x.status,'STRUCTURE_ONLY_NO_GO');assert.equal(x.remaining.length,6);assert.match(x.configSha256,/^[a-f0-9]{64}$/);});
test('frozen build accepts actual compiled three artifacts',()=>assert.equal(checkFrozenArtifacts(artifacts()).sourceSha,pin.sourceSha));
test('mutated creation, runtime and constructor rejected',()=>{for(const mutate of [a=>a.bytecode.object+='00',a=>a.deployedBytecode.object+='00',a=>a.abi.push({type:'constructor',inputs:[{type:'address'}]})]){const a=artifacts();mutate(a[0]);assert.throws(()=>checkFrozenArtifacts(a));}});
test('stage one produces only review data and never transaction approval',()=>{const a=prepareStageOne(artifacts(),cfg(),now);assert.equal(a.status,'UNSIGNED_SETUP_CREATION_REVIEW_NO_GO');assert.equal(a.creationDataSha256,pin.contracts[0].creationSha256);assert.equal(a.transaction,undefined);assert.throws(()=>prepareStageOne(artifacts(),example,now));});

}
