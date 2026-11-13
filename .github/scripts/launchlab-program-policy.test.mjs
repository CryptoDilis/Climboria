import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PROGRAMS, LOADER, encodeBase58, decodeBase58 } from './launchlab-provenance.mjs';
import { CONFIG_TARGETS } from './launchlab-live-config.mjs';
import { WSOL } from './launchlab-curve-economics.mjs';
import { TOKEN_PROGRAMS, assertTokenProgram, assertPinnedWsolQuoteBinding, inspectMigrationPolicySnapshot, verifyClusterPolicy, runProgramPolicyCheck } from './launchlab-program-policy.mjs';

const b64 = b => [Buffer.from(b).toString('base64'), 'base64'];
const discriminator = name => createHash('sha256').update('account:' + name).digest().subarray(0,8);
const programDataKeyBytes = Buffer.alloc(32,7);
const programDataAddress = encodeBase58(programDataKeyBytes);
const cpConfigKeyBytes = Buffer.alloc(32,9);
const cpConfigAddress = encodeBase58(cpConfigKeyBytes);
function fixture(cluster = 'devnet') {
  const programs = PROGRAMS[cluster];
  const executable = () => ({ owner: LOADER, executable: true,
    data: b64(Buffer.concat([Buffer.from([2,0,0,0]),programDataKeyBytes])) });
  const platform = Buffer.alloc(944);
  discriminator('PlatformConfig').copy(platform);
  cpConfigKeyBytes.copy(platform,688);
  const cpmm = Buffer.alloc(16);
  discriminator('AmmConfig').copy(cpmm);
  const global = Buffer.alloc(371);
  discriminator('GlobalConfig').copy(global);
  Buffer.from(decodeBase58(WSOL)).copy(global,83);
  const mint = Buffer.alloc(82); mint[44]=9; mint[45]=1;
  const programData = Buffer.alloc(20); programData.writeUInt32LE(3,0); programData.writeBigUInt64LE(12n,4); programData[12] = 0;
  return {
    launchpad: executable(), cpmm: executable(),
    spl: { owner: LOADER, executable:true }, token2022: { owner:LOADER, executable:true },
    wsol: { owner:TOKEN_PROGRAMS.spl, executable:false, data:b64(mint) },
    global: { owner: programs.launchpad, executable:false, data:b64(global) },
    platform: { owner: programs.launchpad, executable:false, data:b64(platform) },
    cpmmConfig: { owner: programs.cpmm, executable:false, data:b64(cpmm) },
    programData: { owner:LOADER, executable:false, data:b64(programData) }
  };
}

test('Token-2022 program ID is the official solana-program/token-2022 interface address', () => {
  // Source: https://github.com/solana-program/token-2022/blob/e8ca680ca8aeb12f9598524b003c776c6a4168f2/interface/src/lib.rs
  assert.equal(TOKEN_PROGRAMS.token2022, 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  assert.notEqual(TOKEN_PROGRAMS.token2022, 'TokenzQdBNbLqP5VEhdkAS6EPFJGYtTLtqk9vuD7hJp');
});

test('cluster CPMM, Token/Token-2022 and WSOL are bound without granting launch approval', () => {
  for (const cluster of ['mainnet','devnet']) {
    const result = inspectMigrationPolicySnapshot(cluster, fixture(cluster));
    assert.equal(result.cpmm,PROGRAMS[cluster].cpmm);
    assert.equal(result.cpmmConfig,cpConfigAddress);
    assert.equal(result.wsolMint,WSOL);
    assert.equal(result.quoteMintBinding.configuredQuoteMint, WSOL);
    assert.equal(result.quoteMintBinding.resolvedQuoteTokenProgram, TOKEN_PROGRAMS.spl);
    assert.equal(result.quoteMintBinding.idlAndDeployedInstructionSemanticsApproved,false);
    assert.equal(result.sdkIdlCompatible,false);
    assert.equal(result.migrationCustodyVerified,false);
    assert.equal(result.approvalToLaunch,false);
  }
});

test('rejects wrong-CPMM ownership, cross-network config and malformed CPMM discriminator', () => {
  const snapshot = fixture('devnet');
  snapshot.cpmmConfig.owner = PROGRAMS.mainnet.cpmm;
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/not owned by cluster CPMM/);
  snapshot.cpmmConfig.owner = PROGRAMS.devnet.cpmm;
  snapshot.cpmmConfig.data = b64(Buffer.alloc(16));
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/AmmConfig discriminator/);
});

test('rejects wrong Token-2022 loader, nonexecutable token programs and invalid mint', () => {
  const snapshot=fixture('devnet');
  snapshot.token2022.owner = 'malicious-loader';
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/allowed loader/);
  snapshot.token2022.owner = LOADER;
  snapshot.spl.executable = false;
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/allowed loader/);
  snapshot.spl.executable = true;
  snapshot.wsol.owner = TOKEN_PROGRAMS.token2022;
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/WSOL mint owner/);
  snapshot.wsol.owner = TOKEN_PROGRAMS.spl;
  const badMint=Buffer.alloc(82);badMint[44]=6;badMint[45]=1;
  snapshot.wsol.data=b64(badMint);
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',snapshot),/finalized WSOL mint length/);
  assert.throws(()=>assertTokenProgram(snapshot.spl,'not-an-approved-token-program','test'),/unexpected token program ID/);
});

test('read-only RPC never requests a transaction or accepts missing finalized evidence', async () => {
  const accounts=fixture('devnet');
  const byAddress = {
    [PROGRAMS.devnet.launchpad]:accounts.launchpad, [PROGRAMS.devnet.cpmm]:accounts.cpmm,
    [TOKEN_PROGRAMS.spl]:accounts.spl, [TOKEN_PROGRAMS.token2022]:accounts.token2022,
    [WSOL]:accounts.wsol, [CONFIG_TARGETS.devnet.globalConfig]:accounts.global,
    [CONFIG_TARGETS.devnet.platformConfig]:accounts.platform,
    [cpConfigAddress]:accounts.cpmmConfig, [programDataAddress]:accounts.programData
  };
  const methods=[];
  const fetchImpl=async (url,init)=>{
    assert.equal(url,CONFIG_TARGETS.devnet.rpc);
    const body=JSON.parse(init.body);
    methods.push(body.method);
    assert.equal(body.method,'getAccountInfo');
    assert.equal(body.params[1].commitment,'finalized');
    return {ok:true,json:async()=>({result:{context:{slot:888},value:byAddress[body.params[0]]??null}})};
  };
  const result=await verifyClusterPolicy(fetchImpl,'devnet');
  assert.equal(result.pass,true);
  assert.equal(result.approvalToLaunch,false);
  assert.equal(result.quoteMintBinding.resolvedQuoteTokenProgram,TOKEN_PROGRAMS.spl);
  assert.ok(result.finalizedSlots.global);
  assert.equal(result.programData.cpmm.address,programDataAddress);
  assert.deepEqual([...new Set(methods)],['getAccountInfo']);
  await assert.rejects(verifyClusterPolicy(async()=>({ok:true,json:async()=>({result:{value:accounts.platform}})}),'devnet'),/finalized context slot/);
});

test('cluster failures stay red; no success is inferred for the other chain', async () => {
  const report=await runProgramPolicyCheck(async()=>({ok:false,status:503}));
  assert.equal(report.pass,false);
  assert.equal(report.readOnly,true);
  assert.equal(report.transactionSubmitted,false);
  assert.equal(report.approvalToLaunch,false);
  assert.deepEqual(report.results.map(x=>x.pass),[false,false]);
});


test('GlobalConfig quote mint owner binding rejects spoofed, wrong-cluster and uninitialized mint evidence', () => {
  for (const cluster of ['mainnet','devnet']) {
    const good = fixture(cluster);
    const ok = assertPinnedWsolQuoteBinding(cluster,good.global,good.wsol,TOKEN_PROGRAMS.spl);
    assert.equal(ok.configuredQuoteMint,WSOL);
    assert.equal(ok.observedMintOwner,TOKEN_PROGRAMS.spl);
    assert.equal(ok.sdkDynamicProgramArgumentMayBeTrustedWithoutOwnerCheck,false);

    assert.throws(()=>assertPinnedWsolQuoteBinding(cluster,good.global,good.wsol,TOKEN_PROGRAMS.token2022),
      /SDK quote token program differs from finalized mint owner/);
    const wrongProgram = structuredClone(good.global);
    wrongProgram.owner = PROGRAMS[cluster==='mainnet'?'devnet':'mainnet'].launchpad;
    assert.throws(()=>assertPinnedWsolQuoteBinding(cluster,wrongProgram,good.wsol,TOKEN_PROGRAMS.spl),
      /GlobalConfig not owned/);

    const wrongQuote=structuredClone(good.global);
    const raw=Buffer.from(wrongQuote.data[0],'base64');
    Buffer.alloc(32,8).copy(raw,83);
    wrongQuote.data=b64(raw);
    assert.throws(()=>assertPinnedWsolQuoteBinding(cluster,wrongQuote,good.wsol,TOKEN_PROGRAMS.spl),
      /quote mint differs/);

    const wrongCurve=structuredClone(good.global);
    const rawCurve=Buffer.from(wrongCurve.data[0],'base64');
    rawCurve[16]=2;
    wrongCurve.data=b64(rawCurve);
    assert.throws(()=>assertPinnedWsolQuoteBinding(cluster,wrongCurve,good.wsol,TOKEN_PROGRAMS.spl),
      /constant-product curve index zero/);

    const badMint=structuredClone(good.wsol);
    const mintRaw=Buffer.from(badMint.data[0],'base64');
    mintRaw[45]=0;
    badMint.data=b64(mintRaw);
    assert.throws(()=>assertPinnedWsolQuoteBinding(cluster,good.global,badMint,TOKEN_PROGRAMS.spl),
      /initialized state mismatch/);
  }
});

test('requires valid GlobalConfig discriminator and canonical data before reporting quote program binding', () => {
  const a=fixture('devnet');
  const changed=structuredClone(a.global);
  const raw=Buffer.from(changed.data[0],'base64');
  raw[0]^=0xff;
  changed.data=b64(raw);
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',{...a,global:changed}),
    /GlobalConfig length\/discriminator mismatch/);
  const missing={...a,global:null};
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',missing),/GlobalConfig not owned/);
  const notCanonical=structuredClone(a.global);notCanonical.data=['aaaa=','base64'];
  assert.throws(()=>inspectMigrationPolicySnapshot('devnet',{...a,global:notCanonical}),
    /invalid base64 account data/);
});
