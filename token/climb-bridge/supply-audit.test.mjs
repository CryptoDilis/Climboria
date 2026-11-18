import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkSupply, rawAmount, requireConfigured} from './supply-audit.mjs';
const settings = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const baseline = {originalSupplyRaw:'1000000000000000',escrowBalanceRaw:'100000000000',wrappedSupplyRaw:'100000000000',solanaDecimals:6,baseDecimals:6};
test('unconfigured network remains NO-GO even if no RPC calls are made',()=>assert.throws(()=>requireConfigured(settings),/NO_GO/));
test('escrowed Solana + equal Base wrapped gives one total economic supply',()=>{
  const x=checkSupply(baseline);
  assert.equal(x.verdict,'PASS_ACCOUNTING_ONLY_NOT_RELEASE_AUTHORIZATION');
  assert.equal(x.economicallyClaimableRaw,'1000000000000000');
  assert.equal(x.backingSurplusRaw,'0');
});
test('additional escrow is not falsely counted as Base circulating',()=>{
  const x=checkSupply({...baseline,escrowBalanceRaw:'110000000000'});
  assert.equal(x.economicallyClaimableRaw,'999990000000000');
  assert.equal(x.backingSurplusRaw,'10000000000');
});
test('fails closed on unbacked wrapped supply',()=>assert.throws(()=>checkSupply({...baseline,wrappedSupplyRaw:'100000000001'}),/NO_GO/));
test('fails closed on impossible escrow',()=>assert.throws(()=>checkSupply({...baseline,escrowBalanceRaw:'1000000000000001'}),/NO_GO/));
test('fails closed on decimals mismatch',()=>assert.throws(()=>checkSupply({...baseline,baseDecimals:18}),/NO_GO/));
test('rejects imprecise, signed, fractional and exponential strings',()=>{
  for(const x of [1,1.1,'-1','1.1','1e6','01','',null,' 1']) assert.throws(()=>rawAmount(x));
});
test('rejects out-of-range Solana and EVM balances',()=>{
  assert.throws(()=>rawAmount('18446744073709551616'),/range/);
  assert.throws(()=>rawAmount((1n<<256n).toString(),256),/range/);
});
test('attestation/manager evidence and canonical chain binding required',()=>{
  const good=structuredClone(settings);
  good.status='READY_FOR_READ_ONLY_AUDIT';
  good.solana.escrowTokenAccount='11111111111111111111111111111111';
  good.solana.escrowAuthority='11111111111111111111111111111111';
  good.base.wrappedTokenContract='0x1234567890123456789012345678901234567890';
  good.bridge.protocol='EXAMPLE_UNVERIFIED';
  good.bridge.configuredManagerAddresses=true;
  good.bridge.securityReviewUrl='https://example.com';
  assert.equal(requireConfigured(good),true); // Pure schema check; not proof of security or actual counterpart.
  good.base.chainId=1;
  assert.throws(()=>requireConfigured(good),/NO_GO/);
});
