import test from 'node:test';
import assert from 'node:assert/strict';
import {projectBudget} from './observe-fee-budget.mjs';
import {expected} from '../v3-testnet/verify-creation.mjs';
const sha='a'.repeat(40);
const build={status:'FROZEN_ARTIFACTS_MATCH_NO_APPROVAL',sourceSha:sha,contracts:[{creationSha256:'b'.repeat(64)}]};
const obs=()=>({status:'DUAL_RPC_HISTORICAL_AND_CHAIN_OBSERVATION_ONLY_NO_GO',sourceSha:sha,chainId:84532,commonFinalizedBlock:{gasLimit:'0x7270e00'},indicativeGasPriceWei:['5','6'],priorFixture:{previousRoles:[{role:'priorDeployer',address:expected.payer,balanceWei:'100000',codeState:'EMPTY'},...expected.signers.map((a,i)=>({role:'priorSigner'+(i+1),address:a,balanceWei:'0',codeState:'EMPTY'}))]}});
const local=()=>({status:'LOCAL_ANVIL_REHEARSAL_ONLY',sourceSha:sha,chainId:84532,testOnly:true,signatureMode:'ECDSA_ONLY',totalSupplyRaw:'888888888000000',localBlockGasLimit:30000000,transactions:['setupFactory','successorFactory','syntheticQuote','syntheticPoolBuilder','syntheticLPDestination','initializeSafeAndGuard','quorumAtomicIssuance'].map((name,i)=>({name,blockNumber:i+1,status:'success',gasUsed:100}))});
test('uses higher gas and price, rounds 25 percent buffer up and uses only submitting payer costs for offchain signatures',()=>{
 const r=projectBudget(local(),obs(),[101n,102n],build);
 assert.equal(r.status,'TESTNET_FEE_OBSERVATION_ONLY_NO_GO');
 assert.equal(r.stages[0].bufferedGas,'128');
 assert.equal(r.illustrativeDeployerL2FeeWei,'5268');
 assert.equal(r.illustrativeThreeApprovalL2FeeWei,'0');
 assert.equal(r.illustrativeTotalL2FeeWei,'5268');
 assert.equal(r.priorDeployerCoversIllustrativeL2Only,true);
 assert.equal(r.priorOwners.length,5);
});
test('rejects inconsistent pinned source and malformed local sequence',()=>{
 const o=obs();o.sourceSha='c'.repeat(40);assert.throws(()=>projectBudget(local(),o,[100n,100n],build),/OBSERVATION_SOURCE_MISMATCH/);
 const l=local();l.transactions[2].name='wrong';assert.throws(()=>projectBudget(l,obs(),[100n,100n],build),/REHEARSAL_STEP_MISMATCH/);
});
test('rejects prior approved-hash rehearsal format',()=>{
 const l=local();delete l.signatureMode;assert.throws(()=>projectBudget(l,obs(),[100n,100n],build),/INVALID_REHEARSAL/);
});
test('rejects missing or invalid public estimates',()=>{
 for(const a of [[0n,100n],[100n],[999999999n,100n]])assert.throws(()=>projectBudget(local(),obs(),a,build),/INVALID_ESTIMATES/);
});
test('does not confuse L2 coverage with funding approval; insufficient balance explicitly shown',()=>{
 const o=obs();o.priorFixture.previousRoles[0].balanceWei='0';
 const r=projectBudget(local(),o,[100n,100n],build);
 assert.equal(r.priorDeployerCoversIllustrativeL2Only,false);
 assert.ok(r.limitations.some(x=>x.includes('Excludes L1')));
 assert.match(r.status,/NO_GO$/);
});
test('rejects prior payer with code',()=>{
 const o=obs();o.priorFixture.previousRoles[0].codeState='DELEGATED';
 assert.throws(()=>projectBudget(local(),o,[100n,100n],build),/PRIOR_PAYER_CODE/);
});
