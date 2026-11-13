#!/usr/bin/env node
/**
 * Read-only forensic comparison: pinned official LaunchLab SDK transaction
 * builder static AccountMeta prefixes vs matching pinned official IDL metas.
 * Never constructs or signs a transaction. Dynamic keys and bytecode semantics
 * remain unverified.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const OFFICIAL_SOURCE = Object.freeze({
  sdkCommit: '1cf5bb129dbbb1c76dab67819c3d478349c8ed25',
  idlCommit: 'e7e0c96fe77bcf6a020b84a44c47a722aac8e359',
  instrumentSha256: '177d418defd36a173d43fafb29a06019a8754c7abe599365885d0b46c1fd8274',
  idlSha256: '963189409945069409f32e345d4adf2892e0b3ca1be504372577fe34a23c6cdb'
});
const BUILDERS = Object.freeze({
  initialize_v2: 'initializeV2',
  initialize_with_token_2022: 'initializeWithToken2022',
  buy_exact_in: 'buyExactInInstruction',
  buy_exact_out: 'buyExactOutInstruction',
  sell_exact_in: 'sellExactInInstruction',
  sell_exact_out: 'sellExactOut',
  claim_platform_fee: 'claimPlatformFee',
  claim_platform_fee_from_vault: 'claimPlatformFeeFromVault',
  claim_creator_fee: 'claimCreatorFee'
});
const PROGRAM_IDS = Object.freeze({
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022_PROGRAM_ID: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  'SystemProgram.programId': '11111111111111111111111111111111',
  ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  RENT_PROGRAM_ID: 'SysvarRent111111111111111111111111111111111',
  METADATA_PROGRAM_ID: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function assertOfficialSources(instrument, idlRaw) {
  if (sha256(instrument) !== OFFICIAL_SOURCE.instrumentSha256)
    throw new Error('Official pinned SDK instrument source SHA-256 mismatch');
  if (sha256(idlRaw) !== OFFICIAL_SOURCE.idlSha256)
    throw new Error('Official pinned LaunchLab IDL source SHA-256 mismatch');
  return true;
}

/** Only accepts complete literal AccountMeta records from a known exported function. */
export function extractStaticBuilderMetas(instrumentText, functionName) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(functionName)) throw new Error('Invalid builder name');
  const startPattern = new RegExp('^export function ' + functionName + '\\s*\\(', 'm');
  const matched = startPattern.exec(instrumentText);
  if (!matched) throw new Error('Expected SDK builder not exported: ' + functionName);
  const start = matched.index;
  const next = instrumentText.slice(start + matched[0].length).search(/^export function \w+\s*\(/m);
  const block = next < 0 ? instrumentText.slice(start) :
    instrumentText.slice(start, start + matched[0].length + next);
  const match = /\bconst keys: Array<AccountMeta> = \[([\s\S]*?)\n\s*\];/.exec(block);
  if (!match) throw new Error('Missing literal AccountMeta keys array: ' + functionName);
  const lines = match[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
  const metas = [];
  for (const line of lines) {
    const parsed = /^\s*\{\s*pubkey:\s*(.+?),\s*isSigner:\s*(true|false),\s*isWritable:\s*(true|false)\s*\},?\s*$/.exec(line);
    if (!parsed) throw new Error('Unrecognized static account-meta line in ' + functionName + ': ' + line.trim());
    metas.push({ expression: parsed[1].trim(), signer: parsed[2] === 'true', writable: parsed[3] === 'true' });
  }
  if (!metas.length) throw new Error('Empty static AccountMeta prefix: ' + functionName);
  return { functionName, metas,
    hasDynamicPush: /\bkeys\.push\s*\(/.test(block),
    hasUnmodeledKeyMutation: /\bkeys\.(?:splice|unshift|shift|pop|reverse|sort)\s*\(|\bkeys\s*=\s*(?!\[)/.test(block) };
}

export function compareBuilderSourceToIdl(instrumentText, idl) {
  if (typeof instrumentText !== 'string' || !Array.isArray(idl?.instructions))
    throw new Error('SDK source and parsed official IDL instructions are required');
  const byName = new Map(idl.instructions.map(i => [i.name, i]));
  const builders = [];
  for (const [name, functionName] of Object.entries(BUILDERS)) {
    const instruction = byName.get(name);
    if (!instruction || !Array.isArray(instruction.accounts))
      throw new Error('Missing pinned official IDL instruction/account array: ' + name);
    const parsed = extractStaticBuilderMetas(instrumentText, functionName);
    if (parsed.hasUnmodeledKeyMutation) throw new Error('Unmodeled SDK key mutation: ' + functionName);
    if (parsed.metas.length > instruction.accounts.length && !parsed.hasDynamicPush)
      throw new Error('SDK static key count exceeds official IDL accounts: ' + name);
    const flagMismatches = [], addressMismatches = [], dynamicAddressConstraints = [];
    parsed.metas.forEach((meta, index) => {
      const expected = instruction.accounts[index];
      if (!expected) {
        flagMismatches.push({index, sdkExpression:meta.expression, reason:'SDK static account exceeds IDL declared accounts'});
        return;
      }
      if (meta.signer !== Boolean(expected.signer) || meta.writable !== Boolean(expected.writable))
        flagMismatches.push({index, idlAccount:expected.name, sdkExpression:meta.expression,
          sdkSigner:meta.signer, idlSigner:Boolean(expected.signer),
          sdkWritable:meta.writable, idlWritable:Boolean(expected.writable)});
      if (typeof expected.address === 'string') {
        const resolved = PROGRAM_IDS[meta.expression];
        if (!resolved) dynamicAddressConstraints.push({index, idlAccount:expected.name,
          sdkExpression:meta.expression, pinnedIdlAddress:expected.address});
        else if (resolved !== expected.address) addressMismatches.push({index,
          idlAccount:expected.name, sdkExpression:meta.expression,
          resolvedSdkAddress:resolved, pinnedIdlAddress:expected.address});
      }
    });
    builders.push({ name, sdkBuilder:functionName,
      sdkStaticAccountCount:parsed.metas.length, pinnedIdlAccountCount:instruction.accounts.length,
      dynamicKeysMayBeAppended:parsed.hasDynamicPush,
      flagMismatches, addressMismatches, dynamicAddressConstraints,
      sdkStaticPrefixOnly: true });
  }
  if (!byName.has('migrate_to_cpswap')) throw new Error('Pinned IDL missing migrate_to_cpswap');
  const migrationBuilderExports = [...instrumentText.matchAll(/^export function ([A-Za-z0-9_]*migrat[A-Za-z0-9_]*)\s*\(/gim)]
    .map(x => x[1]);
  const mismatchCount = builders.reduce((n,b)=>n+b.flagMismatches.length+b.addressMismatches.length,0);
  const dynamicConstraintCount = builders.reduce((n,b)=>n+b.dynamicAddressConstraints.length,0);
  return {
    sdkCommit:OFFICIAL_SOURCE.sdkCommit, idlCommit:OFFICIAL_SOURCE.idlCommit,
    sourceInspectionOnly:true, readOnly:true, transactionBuilt:false, transactionSubmitted:false,
    inspectedBuilderCount:builders.length,
    staticFlagOrAddressMismatchCount:mismatchCount,
    unresolvedDynamicAddressCount:dynamicConstraintCount,
    migrationInPinnedIdl:true, migrationBuilderExports,
    builders,
    sdkVersusDeployedLegacyIdlReconciled:false,
    migrationRecipientsAndLpCustodyVerified:false,
    approvalToLaunch:false
  };
}

export async function runSdkBuilderSourceReview(instrumentPath, idlPath) {
  const [instrument, idlRaw] = await Promise.all([readFile(instrumentPath),readFile(idlPath)]);
  assertOfficialSources(instrument, idlRaw);
  const report = compareBuilderSourceToIdl(instrument.toString('utf8'), JSON.parse(idlRaw.toString('utf8')));
  return { ...report, sourceSha256Verified:true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) throw new Error('Usage: node launchlab-sdk-builder-evidence.mjs <pinned instrument.ts> <pinned launchpad IDL.json>');
  const report = await runSdkBuilderSourceReview(process.argv[2],process.argv[3]);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  // Green source forensics do NOT mean live launch/execution is approved.
}
