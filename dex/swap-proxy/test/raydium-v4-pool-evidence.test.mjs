import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase58, decodeBase58 } from "../src/transaction-validation.mjs";
import { RAYDIUM_V4_PROGRAM_IDS, RAYDIUM_V4_CLASSIC_TOKEN_PROGRAM } from "../src/raydium-v4-direct-evidence.mjs";
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
  const expectedAuthority = pk(9);
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
  assert.equal(r.coinVault.owner, pk(9));
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
