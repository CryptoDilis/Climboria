#!/usr/bin/env node
/**
 * Read-only network binding evidence for Raydium LaunchLab -> CPMM migration.
 * Finalized getAccountInfo ONLY. No transaction construction or approval to launch.
 * SDK/legacy on-chain IDL schema drift is independently checked and remains a hard blocker.
 */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROGRAMS, LOADER, encodeBase58, parseProgramDataAddress, parseProgramDataAccount } from './launchlab-provenance.mjs';
import { CONFIG_TARGETS } from './launchlab-live-config.mjs';
import { WSOL } from './launchlab-curve-economics.mjs';

export const TOKEN_PROGRAMS = Object.freeze({
  spl: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022: 'TokenzQdBNbLqP5VEhdkAS6EPFJGYtTLtqk9vuD7hJp'
});
export const LEGACY_BPF_LOADER = 'BPFLoader2111111111111111111111111111111111';
const allowedTokenLoaders = new Set([LOADER, LEGACY_BPF_LOADER]);
const accountDiscriminator = name => createHash('sha256').update('account:' + name).digest().subarray(0, 8);

function bytes(account, label) {
  const data = account?.data;
  if (!Array.isArray(data) || data.length !== 2 || data[1] !== 'base64' || typeof data[0] !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data[0]))
    throw new Error(label + ': invalid base64 account data');
  const decoded = Buffer.from(data[0], 'base64');
  if (decoded.toString('base64') !== data[0]) throw new Error(label + ': noncanonical base64');
  return decoded;
}

export function assertTokenProgram(program, expectedId, label) {
  if (!Object.values(TOKEN_PROGRAMS).includes(expectedId)) throw new Error(label + ': unexpected token program ID');
  if (!program || program.executable !== true || !allowedTokenLoaders.has(program.owner))
    throw new Error(label + ': not an executable SPL/Token-2022 program owned by an allowed loader');
  return { id: expectedId, owner: program.owner, executable: true };
}

export function inspectMigrationPolicySnapshot(cluster, accounts) {
  const programs = PROGRAMS[cluster], target = CONFIG_TARGETS[cluster];
  if (!programs || !target || !accounts) throw new Error('Unsupported cluster/snapshot');
  for (const kind of ['launchpad', 'cpmm']) {
    const program = accounts[kind];
    if (!program || program.owner !== LOADER || program.executable !== true)
      throw new Error(cluster + ': ' + kind + ' must be executable and owned by the Upgradeable Loader');
    // The caller independently inspects ProgramData and its upgrade authority.
    parseProgramDataAddress(program);
  }
  const tokenPrograms = {
    spl: assertTokenProgram(accounts.spl, TOKEN_PROGRAMS.spl, 'SPL Token'),
    token2022: assertTokenProgram(accounts.token2022, TOKEN_PROGRAMS.token2022, 'Token-2022')
  };
  if (accounts.wsol?.owner !== TOKEN_PROGRAMS.spl || accounts.wsol.executable !== false)
    throw new Error(cluster + ': WSOL mint owner is not classic SPL Token');
  const mint = bytes(accounts.wsol, 'WSOL mint');
  if (mint.length !== 82 || mint[44] !== 9 || mint[45] !== 1)
    throw new Error(cluster + ': WSOL mint layout/decimals/initialized state differs');
  const platform = accounts.platform;
  if (!platform || platform.owner !== programs.launchpad || platform.executable !== false)
    throw new Error(cluster + ': PlatformConfig is not LaunchLab-owned data');
  const platformData = bytes(platform, 'PlatformConfig');
  if (platformData.length !== 944 || !platformData.subarray(0,8).equals(accountDiscriminator('PlatformConfig')))
    throw new Error(cluster + ': PlatformConfig discriminator/length mismatch');
  const configuredCpmmConfig = encodeBase58(platformData.subarray(688,720));
  const cpConfig = accounts.cpmmConfig;
  if (!cpConfig || cpConfig.owner !== programs.cpmm || cpConfig.executable !== false)
    throw new Error(cluster + ': configured CPMM config account is absent or not owned by cluster CPMM');
  const cpmmBytes = bytes(cpConfig, 'CPMM config');
  if (cpmmBytes.length < 8 || !cpmmBytes.subarray(0,8).equals(accountDiscriminator('AmmConfig')))
    throw new Error(cluster + ': configured CPMM AmmConfig discriminator invalid');
  return {
    cluster,
    launchpad: programs.launchpad,
    cpmm: programs.cpmm,
    platformConfig: target.platformConfig,
    cpmmConfig: configuredCpmmConfig,
    cpmmConfigOwner: cpConfig.owner,
    wsolMint: WSOL,
    wsolOwner: accounts.wsol.owner,
    tokenPrograms,
    // An owner/executable check cannot prove a transaction builder, migration
    // recipient, signer graph or deployed bytecode/IDL is compatible.
    sdkIdlCompatible: false,
    migrationCustodyVerified: false,
    approvalToLaunch: false
  };
}

async function readFinalized(fetchImpl, rpc, address) {
  const response = await fetchImpl(rpc, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'climboria-launch-policy-readonly', method: 'getAccountInfo',
      params: [address, { encoding: 'base64', commitment: 'finalized' }] }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error('Solana RPC HTTP ' + response.status);
  const json = await response.json();
  if (json.error) throw new Error('Solana RPC error: ' + (json.error.message || 'unknown'));
  if (!Number.isSafeInteger(json.result?.context?.slot)) throw new Error('Missing finalized context slot');
  if (!json.result?.value) throw new Error('Finalized account missing: ' + address);
  return { account: json.result.value, slot: json.result.context.slot };
}

export async function verifyClusterPolicy(fetchImpl, cluster) {
  const programs = PROGRAMS[cluster], target = CONFIG_TARGETS[cluster];
  if (!programs || !target) throw new Error('Unsupported cluster');
  const bindings = {
    launchpad: programs.launchpad, cpmm: programs.cpmm,
    spl: TOKEN_PROGRAMS.spl, token2022: TOKEN_PROGRAMS.token2022,
    wsol: WSOL, platform: target.platformConfig
  };
  const accounts = {}, slots = {};
  for (const [name, address] of Object.entries(bindings)) {
    const result = await readFinalized(fetchImpl, target.rpc, address);
    accounts[name] = result.account; slots[name] = result.slot;
  }
  // Read the CPMM config ID from the finalized LaunchLab PlatformConfig.
  // The snapshot validator checks that this address belongs to cluster CPMM.
  const platformData = bytes(accounts.platform, 'PlatformConfig');
  if (platformData.length !== 944 || !platformData.subarray(0,8).equals(accountDiscriminator('PlatformConfig')))
    throw new Error(cluster + ': invalid PlatformConfig before CPMM address derivation');
  const cpmmConfigAddress = encodeBase58(platformData.subarray(688,720));
  const cpmmResult = await readFinalized(fetchImpl, target.rpc, cpmmConfigAddress);
  accounts.cpmmConfig = cpmmResult.account;
  slots.cpmmConfig = cpmmResult.slot;
  const report = inspectMigrationPolicySnapshot(cluster, accounts);
  const programData = {};
  for (const kind of ['launchpad', 'cpmm']) {
    const address = parseProgramDataAddress(accounts[kind]);
    const result = await readFinalized(fetchImpl, target.rpc, address);
    if (result.account.owner !== LOADER || result.account.executable !== false)
      throw new Error(cluster + ': ' + kind + ' ProgramData owner/executable mismatch');
    const decoded = parseProgramDataAccount(result.account);
    programData[kind] = { address, slot: decoded.slot, upgradeAuthority: decoded.upgradeAuthority,
      sha256: decoded.programDataPayloadSha256, immutable: decoded.immutable };
    slots[kind + 'ProgramData'] = result.slot;
  }
  return { ...report, pass: true, readOnly: true, transactionSubmitted: false,
    finalizedRpc: target.rpc, finalizedSlots: slots, programData,
    note: 'Candidate read-only ownership evidence only. Strict SDK/legacy IDL mismatch gate remains RED; no signature, launch or custody approval.' };
}

export async function runProgramPolicyCheck(fetchImpl = fetch) {
  const results = [];
  for (const cluster of ['mainnet', 'devnet']) {
    try { results.push(await verifyClusterPolicy(fetchImpl, cluster)); }
    catch (error) { results.push({ cluster, pass: false, blockers: [String(error?.message || error)] }); }
  }
  return { checkedAt: new Date().toISOString(), pass: results.every(x => x.pass),
    readOnly: true, transactionSubmitted: false, approvalToLaunch: false,
    sdkIdlCompatible: false, results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await runProgramPolicyCheck();
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.pass) process.exitCode = 1;
}
