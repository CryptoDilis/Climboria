import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertOfficialSources, extractStaticBuilderMetas, compareBuilderSourceToIdl, OFFICIAL_SOURCE
} from './launchlab-sdk-builder-evidence.mjs';

const builders = {
  initialize_v2:'initializeV2', initialize_with_token_2022:'initializeWithToken2022',
  buy_exact_in:'buyExactInInstruction', buy_exact_out:'buyExactOutInstruction',
  sell_exact_in:'sellExactInInstruction', sell_exact_out:'sellExactOut',
  claim_platform_fee:'claimPlatformFee', claim_platform_fee_from_vault:'claimPlatformFeeFromVault',
  claim_creator_fee:'claimCreatorFee'
};
function fixture({mutableSystem=false, useDynamicToken=false}={}) {
  const ids = Object.entries(builders);
  const src = ids.map(([idl,fn]) => [
    'export function '+fn+'() {',
    '  const keys: Array<AccountMeta> = [',
    '    { pubkey: payer, isSigner: true, isWritable: true },',
    '    { pubkey: '+(useDynamicToken?'tokenProgramB':'TOKEN_PROGRAM_ID')+', isSigner: false, isWritable: false },',
    '    { pubkey: SystemProgram.programId, isSigner: false, isWritable: '+(mutableSystem?'true':'false')+' },',
    '  ];',
    '  if (optional) keys.push({ pubkey: extra, isSigner: false, isWritable: false });',
    '  return new TransactionInstruction({keys,programId, data:anchorDataBuf.x});',
    '}'
  ].join('\n')).join('\n');
  const acc = [
    {name:'payer',signer:true,writable:true},
    {name:'token_program',address:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'},
    {name:'system_program',address:'11111111111111111111111111111111'}
  ];
  const idl={ instructions: [
    ...ids.map(([name])=>({name,accounts:structuredClone(acc)})),
    {name:'migrate_to_cpswap',accounts:[{name:'payer'}]}
  ]};
  return {src,idl};
}
test('official source SHA-256 changes are rejected before any source claims',()=>{
  assert.throws(()=>assertOfficialSources(Buffer.from('tampered'),Buffer.from('tampered')),/SDK instrument/);
  assert.equal(OFFICIAL_SOURCE.sdkCommit.length,40);
});
test('deterministic static AccountMeta parsing finds flags and conditional dynamic pushes',()=>{
  const {src}=fixture();
  const rows=extractStaticBuilderMetas(src,'initializeV2');
  assert.equal(rows.metas.length,3);
  assert.equal(rows.metas[0].signer,true);
  assert.equal(rows.metas[1].writable,false);
  assert.equal(rows.hasDynamicPush,true);
  assert.equal(rows.hasUnmodeledKeyMutation,false);
});
test('matches static prefix but never approves launch or claims migration custody',()=>{
  const {src,idl}=fixture();
  const report=compareBuilderSourceToIdl(src,idl);
  assert.equal(report.inspectedBuilderCount,9);
  assert.equal(report.staticFlagOrAddressMismatchCount,0);
  assert.equal(report.unresolvedDynamicAddressCount,0);
  assert.deepEqual(report.migrationBuilderExports,[]);
  assert.equal(report.approvalToLaunch,false);
  assert.equal(report.sdkVersusDeployedLegacyIdlReconciled,false);
  assert.equal(report.transactionBuilt,false);
  assert.ok(report.builders.every(x=>x.sdkStaticPrefixOnly&&x.dynamicKeysMayBeAppended));
});
test('signer and writable drift is reported rather than normalized away',()=>{
  const {src,idl}=fixture({mutableSystem:true});
  const report=compareBuilderSourceToIdl(src,idl);
  assert.equal(report.staticFlagOrAddressMismatchCount,9);
  assert.equal(report.builders[0].flagMismatches[0].idlAccount,'system_program');
  assert.equal(report.builders[0].flagMismatches[0].sdkWritable,true);
  assert.equal(report.approvalToLaunch,false);
});
test('dynamic token program cannot satisfy fixed address constraints without runtime proof',()=>{
  const {src,idl}=fixture({useDynamicToken:true});
  const report=compareBuilderSourceToIdl(src,idl);
  assert.equal(report.unresolvedDynamicAddressCount,9);
  assert.equal(report.builders[0].dynamicAddressConstraints[0].sdkExpression,'tokenProgramB');
});
test('missing or renamed builder and unmodeled key mutation fail closed',()=>{
  const {src,idl}=fixture();
  assert.throws(()=>compareBuilderSourceToIdl(src.replace('export function initializeV2','export function initializeV3'),idl),/not exported/);
  assert.throws(()=>compareBuilderSourceToIdl(src.replace('keys.push','keys.unshift'),idl),/Unmodeled SDK key mutation/);
  assert.throws(()=>compareBuilderSourceToIdl(src.replace('isSigner: true','isSigner: dynamicSigner'),idl),/Unrecognized static account-meta/);
});
test('migration instruction existence is mandatory; unknown IDL and source shapes are rejected',()=>{
  const {src,idl}=fixture();
  idl.instructions=idl.instructions.filter(x=>x.name!=='migrate_to_cpswap');
  assert.throws(()=>compareBuilderSourceToIdl(src,idl),/missing migrate_to_cpswap/);
  assert.throws(()=>compareBuilderSourceToIdl(src,{}),/instructions are required/);
});
