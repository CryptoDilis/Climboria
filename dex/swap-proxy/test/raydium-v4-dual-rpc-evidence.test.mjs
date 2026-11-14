import test from "node:test";
import assert from "node:assert/strict";
import {
  compareRaydiumV4PublicViews,
  fetchRaydiumV4DualRpcPublicEvidence
} from "../src/raydium-v4-dual-rpc-evidence.mjs";

const NETWORK = "mainnet-beta";
const POOL = "PoolPublicAddressFixture";
const fields = {
  status: 6, nonce: 254, coinDecimals: 9, pcDecimals: 6,
  swapFeeNumerator: "25", swapFeeDenominator: "10000", poolOpenTime: "1700000000",
  coinVault: "CoinVault", pcVault: "PcVault", coinMint: "CoinMint",
  pcMint: "PcMint", lpMint: "LpMint", openOrders: "OpenOrders",
  market: "Market", marketProgram: "OpenBookProgram", targetOrders: "TargetOrders"
};

function view(slot = 120) {
  return {
    network: NETWORK, poolAddress: POOL, programId: "RaydiumV4Program",
    poolDiscoveryContextSlot: slot - 1, contextSlot: slot,
    expectedAuthority: "DerivedRaydiumAuthority",
    pool: { ...fields },
    coinVault: { mint: "CoinMint", owner: "DerivedRaydiumAuthority", native: false, amount: "100" },
    pcVault: { mint: "PcMint", owner: "DerivedRaydiumAuthority", native: false, amount: "500" },
    coinMint: { decimals: 9, mintAuthority: null, freezeAuthority: null, supply: "2000" },
    pcMint: { decimals: 6, mintAuthority: null, freezeAuthority: null, supply: "9000" },
    poolStateStableAcrossFinalizedReads: true,
    finalizedSnapshotRelationshipsChecked: true,
    ammAuthorityPdaIndependentlyVerified: true,
    approvedForJupiterCpi: false,
    rpcSourceIndependentlyAudited: false,
    poolAddressIndependentlyCorroborated: false
  };
}
const compare = (a, b) => compareRaydiumV4PublicViews(a, b, { network: NETWORK, poolAddress: POOL });

test("two distinct finalized contexts may agree on stable public relationships without trading approval", () => {
  const a = view(120);
  const b = view(125);
  // Trading can alter balances and mint supply between finalized contexts.
  b.coinVault.amount = "101";
  b.pcVault.amount = "499";
  b.coinMint.supply = "3000";
  const result = compare(a, b);
  assert.equal(result.matchingPublicPoolConfiguration, true);
  assert.equal(result.twoConfiguredRpcHostsCompared, true);
  assert.equal(result.primaryFinalizedContextSlot, 120);
  assert.equal(result.secondaryFinalizedContextSlot, 125);
  for (const flag of ["approvedForJupiterCpi","independentlyAuditedRpcSource",
    "poolAddressIndependentlyCorroborated","jupiterCpiAccountMappingVerified",
    "deployedProgramBytecodeVerified"]) assert.equal(result[flag], false);
});

test("cross-network, pool substitution, program and PDA disagreement fail closed", () => {
  for (const mutate of [
    x=>{x.network="devnet";}, x=>{x.poolAddress="OtherPool";},
    x=>{x.programId="UntrustedProgram";}, x=>{x.expectedAuthority="Attacker";},
    x=>{x.pool.market="OtherMarket";}, x=>{x.pool.coinMint="OtherMint";},
    x=>{x.pool.swapFeeNumerator="500";}
  ]) {
    const b=view(124);mutate(b);
    assert.throws(()=>compare(view(),b), /dual-RPC public evidence mismatch/);
  }
});

test("vault ownership, mint security options and mint decimals cannot differ", () => {
  for (const mutate of [
    x=>{x.coinVault.owner="BadVaultAuthority";},
    x=>{x.pcVault.mint="DifferentMint";},
    x=>{x.coinMint.freezeAuthority="FreezeAuthority";},
    x=>{x.pcMint.decimals=9;},
    x=>{delete x.coinMint.mintAuthority;}
  ]) {
    const b=view(124);mutate(b);
    assert.throws(()=>compare(view(),b), /dual-RPC public evidence mismatch/);
  }
});

test("fabricated success flags or stale/missing finalized observations are rejected", () => {
  for (const mutate of [
    x=>{x.approvedForJupiterCpi=true;},
    x=>{x.ammAuthorityPdaIndependentlyVerified=false;},
    x=>{x.finalizedSnapshotRelationshipsChecked=false;},
    x=>{x.poolStateStableAcrossFinalizedReads=false;},
    x=>{x.contextSlot=x.poolDiscoveryContextSlot-1;},
    x=>{x.contextSlot=Number.NaN;}
  ]) {
    const b=view(124);mutate(b);
    assert.throws(()=>compare(view(),b), /dual-RPC public evidence mismatch/);
  }
});

test("two separately configured operator hosts are required, not two API keys on one host", async () => {
  let calls=0;
  await assert.rejects(
    fetchRaydiumV4DualRpcPublicEvidence({
      network:NETWORK,poolAddress:POOL,
      primaryRpcUrl:"https://rpc.example.org/one?key=FIRST_SECRET",
      secondaryRpcUrl:"https://rpc.example.org/two?key=SECOND_SECRET",
      fetchEvidence:async()=>{calls++;return view();}
    }),
    /dual-RPC public evidence mismatch/
  );
  assert.equal(calls,0);
});

test("two operator RPC views are fetched sequentially, without reporting credential URLs", async () => {
  const urls=[];
  const result=await fetchRaydiumV4DualRpcPublicEvidence({
    network:NETWORK,poolAddress:POOL,minContextSlot:100,
    primaryRpcUrl:"https://provider-one.example/rpc?token=FIRST_SECRET",
    secondaryRpcUrl:"https://provider-two.example/rpc?token=SECOND_SECRET",
    fetchEvidence:async({network,poolAddress,rpcUrl,minContextSlot})=>{
      assert.equal(network,NETWORK);assert.equal(poolAddress,POOL);
      assert.equal(minContextSlot,100);urls.push(rpcUrl);
      return view(urls.length===1?120:124);
    }
  });
  assert.equal(urls.length,2);
  assert.notEqual(new URL(urls[0]).hostname,new URL(urls[1]).hostname);
  assert.equal(result.twoConfiguredRpcHostsCompared,true);
  assert.equal(result.secondaryFinalizedContextSlot,124);
  assert.equal(result.rpcSourceIndependentlyAudited,false);
  assert.equal(result.approvedForJupiterCpi,false);
  assert.doesNotMatch(JSON.stringify(result),/FIRST_SECRET|SECOND_SECRET|provider-one|provider-two/);
});

test("second source failure or mismatch never silently degrades to a single-witness report", async () => {
  for (const second of ["mismatch","unavailable"]) {
    let calls=0;
    await assert.rejects(
      fetchRaydiumV4DualRpcPublicEvidence({
        network:NETWORK,poolAddress:POOL,
        primaryRpcUrl:"https://provider-one.example",
        secondaryRpcUrl:"https://provider-two.example",
        fetchEvidence:async()=>{
          calls++;
          if (calls===1)return view(120);
          if (second==="unavailable")throw new Error("Provider unavailable");
          const other=view(125);other.pool.lpMint="DifferentLpMint";return other;
        }
      })
    );
    assert.equal(calls,2);
  }
});
