import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58, decodeBase58 } from "../src/transaction-validation.mjs";
import { RAYDIUM_V4_PROGRAM_IDS, RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM } from "../src/raydium-v4-direct-evidence.mjs";
import { fetchRaydiumV4EvidenceFromPoolAddress } from "../src/raydium-v4-pool-discovery.mjs";
import {
  inspectRaydiumV4FinalizedPoolSnapshot,
  fetchRaydiumV4FinalizedPoolEvidence
} from "../src/raydium-v4-pool-evidence.mjs";

const pk = byte => encodeBase58(new Uint8Array(32).fill(byte));
const asBase64 = bytes => [Buffer.from(bytes).toString("base64"), "base64"];
const u64 = (bytes, offset, n) => new DataView(bytes.buffer).setBigUint64(offset, BigInt(n), true);
const pubkey = (bytes, offset, address) => bytes.set(decodeBase58(address), offset);
function sample() {
  const addresses = {
    pool: pk(1), coinVault: pk(2), pcVault: pk(3), coinMint: pk(4),
    pcMint: pk(5), openOrders: pk(6), market: pk(7), marketProgram: pk(8)
  };
  // Independent cross-check vector: Raydium V4 mainnet processor seed
  // "amm authority" with program ID 675k... and nonce 254.
  const expectedAuthority = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
  const poolBytes = new Uint8Array(752);
  u64(poolBytes, 0, 6);
  u64(poolBytes, 8, 254);
  u64(poolBytes, 32, 6);
  u64(poolBytes, 40, 9);
  u64(poolBytes, 176, 25);
  u64(poolBytes, 184, 10_000);
  u64(poolBytes, 224, 1_700_000_000);
  for (const [field, offset] of Object.entries({
    coinVault: 336, pcVault: 368, coinMint: 400, pcMint: 432,
    lpMint: 464, openOrders: 496, market: 528, marketProgram: 560,
    targetOrders: 592
  })) pubkey(poolBytes, offset, addresses[field] || (field === "lpMint" ? pk(10) : pk(11)));
  const token = mint => {
    const b = new Uint8Array(165);
    pubkey(b, 0, mint);
    pubkey(b, 32, expectedAuthority);
    u64(b, 64, 42_000_000);
    b[108] = 1;
    return b;
  };
  const mint = decimals => {
    const b = new Uint8Array(82);
    b[44] = decimals;
    b[45] = 1;
    return b;
  };
  const tokenAccount = b => ({
    owner: RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM, executable: false, data: asBase64(b)
  });
  const marketAccount = { owner: addresses.marketProgram, executable: false, data: asBase64(new Uint8Array(128).fill(3)) };
  const accounts = [
    { owner: RAYDIUM_V4_PROGRAM_IDS["mainnet-beta"], executable: false, data: asBase64(poolBytes) },
    tokenAccount(token(addresses.coinMint)),
    tokenAccount(token(addresses.pcMint)),
    tokenAccount(mint(6)),
    tokenAccount(mint(9)),
    { ...marketAccount },
    { ...marketAccount },
    { owner: "BPFLoaderUpgradeab1e11111111111111111111111", executable: true, data: asBase64(new Uint8Array([1])) }
  ];
  return { network: "mainnet-beta", addresses, expectedAuthority, accounts, contextSlot: 120 };
}
function mutateRaw(model, roleIndex, fn) {
  const bytes = Uint8Array.from(Buffer.from(model.accounts[roleIndex].data[0], "base64"));
  fn(bytes);
  model.accounts[roleIndex].data = asBase64(bytes);
}
function fails(change, pattern) {
  const v = sample();
  change(v);
  assert.throws(() => inspectRaydiumV4FinalizedPoolSnapshot(v), pattern);
}

test("valid raw 752-byte Raydium V4 AMM plus classic SPL vault/mint and market evidence stays unapproved", () => {
  const r = inspectRaydiumV4FinalizedPoolSnapshot(sample());
  assert.equal(r.contextSlot, 120);
  assert.equal(r.pool.status, 6);
  assert.equal(r.pool.nonce, 254);
  assert.equal(r.pool.swapFeeNumerator, "25");
  assert.equal(r.pool.swapFeeDenominator, "10000");
  assert.equal(r.pool.coinVault, pk(2));
  assert.equal(r.pool.pcVault, pk(3));
  assert.equal(r.coinVault.owner, "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
  assert.equal(r.pcVault.mint, pk(5));
  assert.equal(r.coinMint.decimals, 6);
  assert.equal(r.pcMint.decimals, 9);
  assert.equal(r.finalizedSnapshotRelationshipsChecked, true);
  for (const k of [
    "ammAuthorityPdaIndependentlyVerified", "deployedProgramBytecodeVerified",
    "marketOrderbookStateDecoded", "jupiterCpiAccountMappingVerified",
    "feeRecipientAndTokenMovementsVerified", "approvedForJupiterCpi"
  ]) assert.equal(r[k], false, k + " must stay unverified");
});

test("rejects stale, missing, duplicate or untrusted pool snapshots and network substitutions", () => {
  fails(v => { v.contextSlot = -1; }, /context slot/i);
  fails(v => { v.contextSlot = null; }, /context slot/i);
  fails(v => { v.network = "testnet"; }, /network/i);
  fails(v => { v.network = "devnet"; }, /pool has wrong program ownership|pool.*ownership/i);
  fails(v => { v.accounts.pop(); }, /all eight/i);
  fails(v => { v.addresses.pcVault = v.addresses.coinVault; }, /duplicate account addresses/i);
  fails(v => { v.accounts[0].owner = RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM; }, /pool.*ownership/i);
  fails(v => { v.accounts[0].executable = true; }, /pool.*executable/i);
  fails(v => { delete v.addresses.pool; }, /missing pool public key/i);
});

test("rejects malformed AMM byte layout, disabled pool, nonce, decimals and swap fees", () => {
  fails(v => { mutateRaw(v, 0, b => u64(b, 0, 3)); }, /SwapOnly status/i);
  fails(v => { mutateRaw(v, 0, b => u64(b, 0, 7)); }, /SwapOnly status/i);
  fails(v => { mutateRaw(v, 0, b => u64(b, 8, 256)); }, /authority nonce/i);
  fails(v => { mutateRaw(v, 0, b => u64(b, 32, 19)); }, /mint decimals/i);
  fails(v => { mutateRaw(v, 0, b => u64(b, 184, 0)); }, /swap fee/i);
  fails(v => { mutateRaw(v, 0, b => u64(b, 176, 10000)); }, /swap fee/i);
  fails(v => { v.accounts[0].data = asBase64(new Uint8Array(751)); }, /752 bytes/i);
  fails(v => { mutateRaw(v, 0, b => pubkey(b, 336, pk(15))); }, /binding mismatch for coinVault/i);
  fails(v => { mutateRaw(v, 0, b => pubkey(b, 560, pk(15))); }, /binding mismatch for marketProgram/i);
  fails(v => { mutateRaw(v, 0, b => pubkey(b, 400, pk(5))); }, /binding mismatch for coinMint|coin\/pc vaults and mints/i);
});

test("rejects hostile vault metadata, wrong authority, mint mismatch, frozen and delegated SPL accounts", () => {
  fails(v => { mutateRaw(v, 1, b => pubkey(b, 32, pk(15))); }, /vault token authorities/i);
  fails(v => { mutateRaw(v, 2, b => pubkey(b, 0, pk(16))); }, /vault token mints/i);
  fails(v => { v.accounts[1].owner = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; }, /coinVault.*ownership/i);
  fails(v => { mutateRaw(v, 1, b => { b[108] = 2; }); }, /frozen, delegated/i);
  fails(v => { mutateRaw(v, 1, b => { b[72] = 1; }); }, /frozen, delegated/i);
  fails(v => { mutateRaw(v, 1, b => { u64(b, 121, 4); }); }, /frozen, delegated/i);
  fails(v => { mutateRaw(v, 1, b => { b[129] = 1; }); }, /frozen, delegated/i);
  fails(v => { mutateRaw(v, 1, b => { b[109] = 1; }); }, /native-SOL metadata/i);
  fails(v => { v.accounts[1].data = asBase64(new Uint8Array(182)); }, /165-byte/i);
});

test("rejects incorrect SPL mint decimals, mint ownership and uninitialized states", () => {
  fails(v => { mutateRaw(v, 3, b => { b[44] = 9; }); }, /decimal settings/i);
  fails(v => { mutateRaw(v, 4, b => { b[45] = 0; }); }, /initialized classic.*mint/i);
  fails(v => { v.accounts[3].owner = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"; }, /coinMint.*ownership/i);
  fails(v => { v.accounts[3].data = asBase64(new Uint8Array(90)); }, /82-byte/i);
});

test("rejects hostile or missing market/open-orders/program ownership evidence", () => {
  fails(v => { v.accounts[5].owner = pk(31); }, /openOrders.*ownership/i);
  fails(v => { v.accounts[6].owner = pk(31); }, /market.*ownership/i);
  fails(v => { v.accounts[7].executable = false; }, /market program must be executable/i);
  fails(v => { v.accounts[6].data = asBase64(new Uint8Array()); }, /market or open-orders account has no data/i);
});

test("one finalized context RPC call for eight accounts; preserve slot and never approve CPI", async () => {
  const v = sample();
  const request = [];
  const result = await fetchRaydiumV4FinalizedPoolEvidence({
    network: v.network, addresses: v.addresses, expectedAuthority: v.expectedAuthority,
    rpcUrl: "https://solana-rpc.example", minContextSlot: 119,
    fetchImpl: async (url, init) => {
      request.push({url, init});
      return new Response(JSON.stringify({
        jsonrpc: "2.0", id: "climboria-raydium-v4-finalized-evidence",
        result: {context: {slot: 120}, value: v.accounts}
      }), {status: 200, headers: {"content-type":"application/json"}});
    }
  });
  assert.equal(request.length, 1);
  const args = JSON.parse(request[0].init.body);
  assert.equal(args.method, "getMultipleAccounts");
  assert.deepEqual(args.params[0], Object.values(v.addresses));
  assert.equal(args.params[1].commitment, "finalized");
  assert.equal(args.params[1].encoding, "base64");
  assert.equal(args.params[1].minContextSlot, 119);
  assert.equal(request[0].init.redirect, "error");
  assert.equal(result.contextSlot, 120);
  assert.equal(result.rpcFinalizedAccountSnapshotRead, true);
  assert.equal(result.ammAuthorityPdaIndependentlyVerified, true);
  assert.equal(result.expectedAuthority, v.expectedAuthority);
  assert.equal(result.approvedForJupiterCpi, false);
});

test("finalized RPC transport rejects stale slot, wrong ids, missing accounts and unsafe hosts", async () => {
  const v = sample();
  const query = async (modify = x => x, rpcUrl = "https://solana-rpc.example") =>
    fetchRaydiumV4FinalizedPoolEvidence({
      network: v.network, addresses: v.addresses, expectedAuthority: v.expectedAuthority,
      rpcUrl, minContextSlot: 120, fetchImpl: async () => new Response(
        JSON.stringify(modify({
          jsonrpc: "2.0", id: "climboria-raydium-v4-finalized-evidence",
          result: {context: {slot: 120}, value: v.accounts}
        })), {status:200})
    });
  await assert.rejects(() => query(x => { x.result.context.slot = 119; return x; }), /stale finalized/i);
  await assert.rejects(() => query(x => { x.id = "unexpected"; return x; }), /mismatched or stale/i);
  await assert.rejects(() => query(x => { x.result.value = x.result.value.slice(0,7); return x; }), /incomplete/i);
  await assert.rejects(() => query(x => { x.error = {code:-1,message:"failed"}; return x; }), /incomplete/i);
  await assert.rejects(() => query(x => x,"http://127.0.0.1:8899"), /public HTTPS endpoint/i);
  await assert.rejects(() => query(x => x,"https://localhost"), /public HTTPS endpoint/i);
});


test("rejects a forged but internally consistent pool/vault authority not matching the Raydium PDA", async () => {
  const v = sample();
  const claimed = pk(9);
  v.expectedAuthority = claimed;
  for (const index of [1, 2]) mutateRaw(v, index, b => pubkey(b, 32, claimed));
  // The older synchronous inspector can only establish the claim matches
  // the vault fields, NOT that the claim is the actual program-derived PDA.
  assert.equal(inspectRaydiumV4FinalizedPoolSnapshot(v).ammAuthorityPdaIndependentlyVerified, false);
  await assert.rejects(
    () => fetchRaydiumV4FinalizedPoolEvidence({
      network: v.network, addresses: v.addresses, expectedAuthority: claimed,
      rpcUrl: "https://solana-rpc.example",
      fetchImpl: async () => new Response(JSON.stringify({
        jsonrpc: "2.0", id: "climboria-raydium-v4-finalized-evidence",
        result: { context: { slot: v.contextSlot }, value: v.accounts }
      }), { status: 200 })
    }),
    /independently derived PDA/i,
    "Internal consistency with a caller claim must not impersonate AMM PDA proof"
  );
});

test("rejects wrong on-chain nonce even when pool and claimed vault authority remain consistent", async () => {
  const v = sample();
  mutateRaw(v, 0, b => u64(b, 8, 255));
  assert.equal(inspectRaydiumV4FinalizedPoolSnapshot(v).pool.nonce, 255);
  await assert.rejects(
    () => fetchRaydiumV4FinalizedPoolEvidence({
      network: v.network, addresses: v.addresses, expectedAuthority: v.expectedAuthority,
      rpcUrl: "https://solana-rpc.example",
      fetchImpl: async () => new Response(JSON.stringify({
        jsonrpc: "2.0", id: "climboria-raydium-v4-finalized-evidence",
        result: { context: { slot: v.contextSlot }, value: v.accounts }
      }), { status: 200 })
    }),
    /on-curve or ambiguous address/i,
    "A nonce with an on-curve hash cannot yield a valid Solana PDA"
  );
});


function mockedDiscovery({ first = x => x, second = x => x } = {}) {
  const fixture = sample(), calls = [];
  const fetchImpl = async (url, options) => {
    const request = JSON.parse(options.body);
    calls.push({ url, options, request });
    const response = calls.length === 1 ? first({
      jsonrpc: "2.0", id: "climboria-raydium-v4-pool-bootstrap",
      result: { context: { slot: 120 }, value: fixture.accounts[0] }
    }) : second({
      jsonrpc: "2.0", id: "climboria-raydium-v4-finalized-evidence",
      result: { context: { slot: 121 }, value: fixture.accounts }
    });
    return new Response(JSON.stringify(response), { status: 200 });
  };
  const run = (args = {}) => fetchRaydiumV4EvidenceFromPoolAddress({
    network: fixture.network, poolAddress: fixture.addresses.pool,
    rpcUrl: "https://configured-solana-rpc.example", fetchImpl, ...args
  });
  return { fixture, calls, run };
}

test("operator-only pool discovery starts from ONE address and re-fetches 8 raw accounts in one finalized context", async () => {
  const { fixture, calls, run } = mockedDiscovery();
  const result = await run({ minContextSlot: 119 });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(c => c.request.method), ["getAccountInfo", "getMultipleAccounts"]);
  assert.deepEqual(calls[0].request.params, [
    fixture.addresses.pool, { encoding: "base64", commitment: "finalized", minContextSlot: 119 }
  ]);
  assert.deepEqual(calls[1].request.params, [
    Object.values(fixture.addresses), { encoding: "base64", commitment: "finalized", minContextSlot: 120 }
  ]);
  assert.equal(calls[0].url, calls[1].url, "same configured operator RPC must be used for both reads");
  for (const c of calls) assert.equal(c.options.redirect, "error");
  assert.equal(result.poolDiscoveryContextSlot, 120);
  assert.equal(result.contextSlot, 121);
  assert.equal(result.poolStateStableAcrossFinalizedReads, true);
  assert.equal(result.ammAuthorityPdaIndependentlyVerified, true);
  assert.equal(result.poolAddressIndependentlyCorroborated, false);
  assert.equal(result.rpcSourceIndependentlyAudited, false);
  assert.equal(result.approvedForJupiterCpi, false);
});

test("discovery rejects stale/missing first snapshot and substitute wrong-program AMM", async () => {
  await assert.rejects(
    () => mockedDiscovery({ first: p => { p.result.context.slot = 118; return p; } }).run({ minContextSlot: 119 }),
    /bootstrap returned missing, stale or mismatched/i
  );
  await assert.rejects(
    () => mockedDiscovery({ first: p => { p.id = "bad id"; return p; } }).run(),
    /bootstrap returned missing, stale or mismatched/i
  );
  await assert.rejects(
    () => mockedDiscovery({ first: p => { p.result.value = null; return p; } }).run(),
    /bootstrap returned missing, stale or mismatched/i
  );
  await assert.rejects(
    () => mockedDiscovery({ first: p => { p.result.value = { ...p.result.value, owner: pk(33) }; return p; } }).run(),
    /pool has wrong program ownership/i
  );
  await assert.rejects(
    () => mockedDiscovery().run({ network: "devnet" }),
    /pool has wrong program ownership/i
  );
});

test("discovery rejects cross-slot state swaps including unparsed bytes", async () => {
  const stale = mockedDiscovery({ second: p => { p.result.context.slot = 119; return p; } });
  await assert.rejects(() => stale.run(), /incomplete, mismatched or stale/i);

  const differentRaw = mockedDiscovery({ second: p => {
    const clone = [...p.result.value];
    const image = Buffer.from(clone[0].data[0], "base64");
    // This offset is deliberately NOT among the AMM fields we currently
    // interpret. A parsed-key comparison would miss this state mutation.
    image[280] ^= 1;
    clone[0] = { ...clone[0], data: asBase64(image) };
    p.result.value = clone;
    return p;
  } });
  await assert.rejects(
    () => differentRaw.run(),
    /raw account bytes changed between finalized reads/i,
    "Never combine finalized snapshots whose full pool byte images differ"
  );
});

test("discovery rejects a later pool nonce, vault reassignment or mismatched market program", async () => {
  const newNonce = mockedDiscovery({ second: p => {
    const clone = [...p.result.value];
    const image = Buffer.from(clone[0].data[0], "base64");
    u64(image, 8, 255);
    clone[0] = { ...clone[0], data: asBase64(image) };
    p.result.value = clone;
    return p;
  } });
  await assert.rejects(() => newNonce.run(), /raw account bytes changed between finalized reads/i);

  const vaultAttack = mockedDiscovery({ second: p => {
    const clone = [...p.result.value];
    clone[1] = { ...clone[1], owner: pk(49) };
    p.result.value = clone;
    return p;
  } });
  await assert.rejects(() => vaultAttack.run(), /coinVault has wrong program ownership/i);

  const badMarket = mockedDiscovery({ second: p => {
    const clone = [...p.result.value];
    clone[7] = { ...clone[7], executable: false };
    p.result.value = clone;
    return p;
  } });
  await assert.rejects(() => badMarket.run(), /market program must be executable/i);
});

test("operator discovery rejects malformed pool keys and unsafe RPC configuration before fetching", async () => {
  for (const { input, error } of [
    { input: { poolAddress: "1" }, error: /canonical 32-byte/i },
    { input: { network: "testnet" }, error: /unsupported or unspecified Raydium network/i },
    { input: { minContextSlot: -1 }, error: /minimum finalized context slot/i },
    { input: { rpcUrl: "http://127.0.0.1:8899" }, error: /public HTTPS endpoint/i }
  ]) {
    const { run, calls } = mockedDiscovery();
    await assert.rejects(() => run(input), error);
    assert.equal(calls.length, 0, "invalid discovery must not contact any RPC");
  }
});
